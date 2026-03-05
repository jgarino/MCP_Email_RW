"""IMAP email client for reading, searching, moving, and deleting messages."""

from __future__ import annotations

import email
import imaplib
import re
import ssl
from dataclasses import dataclass, field
from email.header import decode_header
from typing import Optional

from .config import AccountConfig


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class EmailSummary:
    """Lightweight representation of an email returned by list/search."""

    uid: str
    subject: str
    sender: str
    date: str
    is_read: bool
    size: int = 0


@dataclass
class EmailMessage:
    """Full email message content."""

    uid: str
    subject: str
    sender: str
    recipients: list[str]
    date: str
    body_text: str
    body_html: str
    is_read: bool
    attachments: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _decode_header_value(raw: str) -> str:
    """Decode a MIME-encoded email header value to a plain string."""
    parts = decode_header(raw or "")
    result = []
    for part, charset in parts:
        if isinstance(part, bytes):
            try:
                result.append(part.decode(charset or "utf-8", errors="replace"))
            except (LookupError, UnicodeDecodeError):
                result.append(part.decode("latin-1", errors="replace"))
        else:
            result.append(str(part))
    return "".join(result)


def _extract_body(msg: email.message.Message) -> tuple[str, str]:
    """Return ``(text_body, html_body)`` extracted from *msg*."""
    text_parts: list[str] = []
    html_parts: list[str] = []

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            if "attachment" in disp:
                continue
            charset = part.get_content_charset() or "utf-8"
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            text = payload.decode(charset, errors="replace")
            if ctype == "text/plain":
                text_parts.append(text)
            elif ctype == "text/html":
                html_parts.append(text)
    else:
        charset = msg.get_content_charset() or "utf-8"
        payload = msg.get_payload(decode=True)
        if payload:
            text = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html_parts.append(text)
            else:
                text_parts.append(text)

    return "\n".join(text_parts), "\n".join(html_parts)


def _extract_attachments(msg: email.message.Message) -> list[str]:
    """Return a list of attachment filenames found in *msg*."""
    names: list[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            disp = str(part.get("Content-Disposition", ""))
            if "attachment" in disp:
                filename = part.get_filename()
                if filename:
                    names.append(_decode_header_value(filename))
    return names


# ---------------------------------------------------------------------------
# IMAP Client
# ---------------------------------------------------------------------------


class IMAPClient:
    """Thin wrapper around :mod:`imaplib` for common email operations."""

    def __init__(self, account: AccountConfig) -> None:
        self._account = account
        self._conn: Optional[imaplib.IMAP4] = None
        self._current_folder: Optional[str] = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    def connect(self) -> None:
        """Open an authenticated IMAP connection."""
        if self._account.ssl:
            ctx = ssl.create_default_context()
            self._conn = imaplib.IMAP4_SSL(
                self._account.host, self._account.port, ssl_context=ctx
            )
        else:
            self._conn = imaplib.IMAP4(self._account.host, self._account.port)

        self._conn.login(self._account.username, self._account.password)

    def disconnect(self) -> None:
        """Close the IMAP connection gracefully."""
        if self._conn is not None:
            try:
                self._conn.logout()
            except Exception:
                pass
            finally:
                self._conn = None
                self._current_folder = None

    def __enter__(self) -> "IMAPClient":
        self.connect()
        return self

    def __exit__(self, *_: object) -> None:
        self.disconnect()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _c(self) -> imaplib.IMAP4:
        if self._conn is None:
            raise RuntimeError("Not connected. Call connect() first.")
        return self._conn

    def _select_folder(self, folder: str) -> None:
        if self._current_folder != folder:
            typ, data = self._c.select(f'"{folder}"')
            if typ != "OK":
                raise ValueError(f"Cannot select folder '{folder}': {data}")
            self._current_folder = folder

    @staticmethod
    def _uid_list(data: list[bytes]) -> list[str]:
        """Parse a UID response byte string into a list of UID strings."""
        raw = b" ".join(d for d in data if d)
        return [uid.decode() for uid in raw.split() if uid]

    # ------------------------------------------------------------------
    # Public operations
    # ------------------------------------------------------------------

    def list_folders(self) -> list[str]:
        """Return a list of all mailbox folder names."""
        typ, data = self._c.list()
        if typ != "OK":
            return []
        folders: list[str] = []
        pattern = re.compile(r'\(.*?\) ".*?" (.*)')
        for item in data:
            if item is None:
                continue
            decoded = item.decode("utf-8", errors="replace")
            m = pattern.match(decoded)
            if m:
                name = m.group(1).strip().strip('"')
                folders.append(name)
        return folders

    def list_emails(
        self,
        folder: str = "INBOX",
        limit: int = 20,
        unread_only: bool = False,
    ) -> list[EmailSummary]:
        """Return a list of email summaries from *folder*.

        Parameters
        ----------
        folder:
            Mailbox folder name (e.g. ``"INBOX"``).
        limit:
            Maximum number of emails to return (most recent first).
        unread_only:
            When ``True``, only return unseen messages.
        """
        self._select_folder(folder)
        criteria = "UNSEEN" if unread_only else "ALL"
        typ, data = self._c.uid("SEARCH", None, criteria)
        if typ != "OK":
            return []

        uids = self._uid_list(data)
        # Most recent first, up to limit
        uids = uids[-limit:][::-1]
        if not uids:
            return []

        uid_set = ",".join(uids)
        typ, data = self._c.uid(
            "FETCH", uid_set, "(FLAGS ENVELOPE RFC822.SIZE)"
        )
        if typ != "OK":
            return []

        summaries: list[EmailSummary] = []
        # data comes back as pairs: (header, b")")
        for item in data:
            if not isinstance(item, tuple):
                continue
            body_bytes: bytes = item[1]
            # Parse flags and envelope with a simple regex approach
            flags_m = re.search(rb"FLAGS \(([^)]*)\)", body_bytes)
            flags = flags_m.group(1).decode() if flags_m else ""
            is_read = "\\Seen" in flags

            size_m = re.search(rb"RFC822\.SIZE (\d+)", body_bytes)
            size = int(size_m.group(1)) if size_m else 0

            uid_m = re.search(rb"UID (\d+)", body_bytes)
            uid = uid_m.group(1).decode() if uid_m else ""

            # Parse envelope for subject, sender, date
            msg = email.message_from_bytes(body_bytes)
            subject = _decode_header_value(msg.get("Subject", "(no subject)"))
            sender = _decode_header_value(msg.get("From", ""))
            date = msg.get("Date", "")

            if not uid:
                continue
            summaries.append(
                EmailSummary(
                    uid=uid,
                    subject=subject,
                    sender=sender,
                    date=date,
                    is_read=is_read,
                    size=size,
                )
            )
        return summaries

    def read_email(self, uid: str, folder: str = "INBOX") -> EmailMessage:
        """Fetch and return the full content of a single email by *uid*.

        Also marks the message as read (\\Seen).
        """
        self._select_folder(folder)
        typ, data = self._c.uid("FETCH", uid, "(FLAGS RFC822)")
        if typ != "OK" or not data or data[0] is None:
            raise ValueError(f"Email with UID {uid} not found in '{folder}'.")

        raw_msg: bytes = b""
        flags_str = ""
        for item in data:
            if isinstance(item, tuple):
                raw_msg = item[1]
            elif isinstance(item, bytes):
                flags_str += item.decode(errors="replace")

        # Also grab flags from the first tuple header
        if data and isinstance(data[0], tuple):
            flags_str = data[0][0].decode(errors="replace")

        is_read = "\\Seen" in flags_str

        msg = email.message_from_bytes(raw_msg)
        subject = _decode_header_value(msg.get("Subject", "(no subject)"))
        sender = _decode_header_value(msg.get("From", ""))
        date = msg.get("Date", "")

        # Recipients: To, Cc, Bcc
        recipients: list[str] = []
        for hdr in ("To", "Cc", "Bcc"):
            val = msg.get(hdr, "")
            if val:
                recipients.extend(r.strip() for r in val.split(","))

        body_text, body_html = _extract_body(msg)
        attachments = _extract_attachments(msg)

        # Mark as seen
        self._c.uid("STORE", uid, "+FLAGS", "\\Seen")

        return EmailMessage(
            uid=uid,
            subject=subject,
            sender=sender,
            recipients=recipients,
            date=date,
            body_text=body_text,
            body_html=body_html,
            is_read=is_read,
            attachments=attachments,
        )

    def search_emails(
        self,
        criteria: str,
        folder: str = "INBOX",
        limit: int = 20,
    ) -> list[EmailSummary]:
        """Search emails in *folder* using an IMAP search *criteria* string.

        Common criteria examples:
        - ``'FROM "alice@example.com"'``
        - ``'SUBJECT "hello"'``
        - ``'UNSEEN'``
        - ``'SINCE "01-Jan-2024"'``
        - ``'TEXT "invoice"'``
        """
        self._select_folder(folder)
        # Split criteria into separate arguments for imaplib
        parts = criteria.split()
        typ, data = self._c.uid("SEARCH", None, *parts)
        if typ != "OK":
            return []

        uids = self._uid_list(data)
        uids = uids[-limit:][::-1]
        if not uids:
            return []

        uid_set = ",".join(uids)
        typ, data = self._c.uid("FETCH", uid_set, "(FLAGS ENVELOPE RFC822.SIZE)")
        if typ != "OK":
            return []

        summaries: list[EmailSummary] = []
        for item in data:
            if not isinstance(item, tuple):
                continue
            body_bytes: bytes = item[1]
            flags_m = re.search(rb"FLAGS \(([^)]*)\)", body_bytes)
            flags = flags_m.group(1).decode() if flags_m else ""
            is_read = "\\Seen" in flags

            size_m = re.search(rb"RFC822\.SIZE (\d+)", body_bytes)
            size = int(size_m.group(1)) if size_m else 0

            uid_m = re.search(rb"UID (\d+)", body_bytes)
            uid_val = uid_m.group(1).decode() if uid_m else ""

            msg = email.message_from_bytes(body_bytes)
            subject = _decode_header_value(msg.get("Subject", "(no subject)"))
            sender = _decode_header_value(msg.get("From", ""))
            date = msg.get("Date", "")

            if not uid_val:
                continue
            summaries.append(
                EmailSummary(
                    uid=uid_val,
                    subject=subject,
                    sender=sender,
                    date=date,
                    is_read=is_read,
                    size=size,
                )
            )
        return summaries

    def delete_email(self, uid: str, folder: str = "INBOX") -> bool:
        """Delete an email by moving it to Trash and expunging.

        Returns ``True`` on success.
        """
        self._select_folder(folder)
        # Try to move to Trash first; if that fails, just mark deleted
        trash_folders = ["Trash", "[Gmail]/Trash", "Deleted Items", "Deleted Messages"]
        moved = False
        for trash in trash_folders:
            try:
                typ, _ = self._c.uid("COPY", uid, f'"{trash}"')
                if typ == "OK":
                    moved = True
                    break
            except Exception:
                continue

        self._c.uid("STORE", uid, "+FLAGS", "\\Deleted")
        self._c.expunge()
        return True

    def move_email(self, uid: str, source_folder: str, dest_folder: str) -> bool:
        """Move an email from *source_folder* to *dest_folder*.

        Returns ``True`` on success.
        """
        self._select_folder(source_folder)
        typ, _ = self._c.uid("COPY", uid, f'"{dest_folder}"')
        if typ != "OK":
            raise ValueError(
                f"Failed to copy email {uid} from '{source_folder}' to '{dest_folder}'."
            )
        self._c.uid("STORE", uid, "+FLAGS", "\\Deleted")
        self._c.expunge()
        return True

    def mark_email(self, uid: str, folder: str, flag: str) -> bool:
        """Set or unset a flag on an email.

        Parameters
        ----------
        uid:
            Email UID.
        folder:
            Folder containing the email.
        flag:
            One of ``"read"``, ``"unread"``, ``"flagged"``, ``"unflagged"``.
        """
        self._select_folder(folder)
        flag_map = {
            "read": ("+FLAGS", "\\Seen"),
            "unread": ("-FLAGS", "\\Seen"),
            "flagged": ("+FLAGS", "\\Flagged"),
            "unflagged": ("-FLAGS", "\\Flagged"),
        }
        flag_lower = flag.lower()
        if flag_lower not in flag_map:
            raise ValueError(
                f"Unknown flag '{flag}'. Use: read, unread, flagged, unflagged."
            )
        action, imap_flag = flag_map[flag_lower]
        self._c.uid("STORE", uid, action, imap_flag)
        return True
