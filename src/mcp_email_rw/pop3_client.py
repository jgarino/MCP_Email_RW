"""POP3 email client for listing, reading, and deleting messages."""

from __future__ import annotations

import email
import poplib
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
    """Lightweight representation of a POP3 email."""

    message_num: int
    subject: str
    sender: str
    date: str
    size: int = 0


@dataclass
class EmailMessage:
    """Full POP3 email message content."""

    message_num: int
    subject: str
    sender: str
    recipients: list[str]
    date: str
    body_text: str
    body_html: str
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
    """Return ``(text_body, html_body)`` from *msg*."""
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
# POP3 Client
# ---------------------------------------------------------------------------


class POP3Client:
    """Thin wrapper around :mod:`poplib` for common email operations.

    .. note::
        POP3 does not support folders – all messages are in a single inbox.
        To avoid re-downloading messages on reconnect, use IMAP if your
        server supports it.
    """

    def __init__(self, account: AccountConfig) -> None:
        self._account = account
        self._conn: Optional[poplib.POP3] = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    def connect(self) -> None:
        """Open an authenticated POP3 connection."""
        if self._account.ssl:
            ctx = ssl.create_default_context()
            self._conn = poplib.POP3_SSL(
                self._account.host, self._account.port, context=ctx
            )
        else:
            self._conn = poplib.POP3(self._account.host, self._account.port)

        self._conn.user(self._account.username)
        self._conn.pass_(self._account.password)

    def disconnect(self) -> None:
        """Close the POP3 connection gracefully."""
        if self._conn is not None:
            try:
                self._conn.quit()
            except Exception:
                pass
            finally:
                self._conn = None

    def __enter__(self) -> "POP3Client":
        self.connect()
        return self

    def __exit__(self, *_: object) -> None:
        self.disconnect()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _c(self) -> poplib.POP3:
        if self._conn is None:
            raise RuntimeError("Not connected. Call connect() first.")
        return self._conn

    def _fetch_raw(self, message_num: int) -> bytes:
        """Return the raw bytes of message *message_num*."""
        _, lines, _ = self._c.retr(message_num)
        return b"\r\n".join(lines)

    # ------------------------------------------------------------------
    # Public operations
    # ------------------------------------------------------------------

    def get_mailbox_info(self) -> tuple[int, int]:
        """Return ``(message_count, total_size_bytes)``."""
        count, size = self._c.stat()
        return count, size

    def list_emails(self, limit: int = 20) -> list[EmailSummary]:
        """Return a list of email summaries (most recent first).

        Because POP3 does not provide server-side search, the method
        downloads only the message headers (``TOP 0``) to build summaries.

        Parameters
        ----------
        limit:
            Maximum number of emails to return.
        """
        count, _ = self._c.stat()
        # Most recent messages have the highest message numbers
        start = max(1, count - limit + 1)
        summaries: list[EmailSummary] = []
        for num in range(count, start - 1, -1):
            try:
                # Fetch 0 body lines (headers only)
                _, lines, octets = self._c.top(num, 0)
                raw_header = b"\r\n".join(lines)
                msg = email.message_from_bytes(raw_header)
                subject = _decode_header_value(msg.get("Subject", "(no subject)"))
                sender = _decode_header_value(msg.get("From", ""))
                date = msg.get("Date", "")
                summaries.append(
                    EmailSummary(
                        message_num=num,
                        subject=subject,
                        sender=sender,
                        date=date,
                        size=octets,
                    )
                )
            except poplib.error_proto:
                continue
        return summaries

    def read_email(self, message_num: int) -> EmailMessage:
        """Fetch and return the full content of message *message_num*."""
        raw = self._fetch_raw(message_num)
        msg = email.message_from_bytes(raw)

        subject = _decode_header_value(msg.get("Subject", "(no subject)"))
        sender = _decode_header_value(msg.get("From", ""))
        date = msg.get("Date", "")

        recipients: list[str] = []
        for hdr in ("To", "Cc", "Bcc"):
            val = msg.get(hdr, "")
            if val:
                recipients.extend(r.strip() for r in val.split(","))

        body_text, body_html = _extract_body(msg)
        attachments = _extract_attachments(msg)

        return EmailMessage(
            message_num=message_num,
            subject=subject,
            sender=sender,
            recipients=recipients,
            date=date,
            body_text=body_text,
            body_html=body_html,
            attachments=attachments,
        )

    def delete_email(self, message_num: int) -> bool:
        """Mark message *message_num* for deletion.

        The deletion takes effect when the connection is closed (``QUIT``).
        Returns ``True`` on success.
        """
        self._c.dele(message_num)
        return True
