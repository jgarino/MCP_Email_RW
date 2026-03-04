"""SMTP email client for sending messages."""

from __future__ import annotations

import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from .config import AccountConfig, SmtpConfig


class SMTPClient:
    """Thin wrapper around :mod:`smtplib` for sending email messages."""

    def __init__(self, smtp_config: SmtpConfig) -> None:
        self._cfg = smtp_config
        self._conn: Optional[smtplib.SMTP] = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    def connect(self) -> None:
        """Open an authenticated SMTP connection."""
        if self._cfg.ssl:
            ctx = ssl.create_default_context()
            self._conn = smtplib.SMTP_SSL(self._cfg.host, self._cfg.port, context=ctx)
        else:
            self._conn = smtplib.SMTP(self._cfg.host, self._cfg.port)
            if self._cfg.tls:
                ctx = ssl.create_default_context()
                self._conn.starttls(context=ctx)

        if self._cfg.username and self._cfg.password:
            self._conn.login(self._cfg.username, self._cfg.password)

    def disconnect(self) -> None:
        """Close the SMTP connection."""
        if self._conn is not None:
            try:
                self._conn.quit()
            except Exception:
                pass
            finally:
                self._conn = None

    def __enter__(self) -> "SMTPClient":
        self.connect()
        return self

    def __exit__(self, *_: object) -> None:
        self.disconnect()

    # ------------------------------------------------------------------
    # Public operations
    # ------------------------------------------------------------------

    def send_email(
        self,
        from_addr: str,
        to_addrs: list[str],
        subject: str,
        body: str,
        cc: Optional[list[str]] = None,
        bcc: Optional[list[str]] = None,
        html_body: Optional[str] = None,
        attachment_paths: Optional[list[str]] = None,
    ) -> None:
        """Compose and send an email message.

        Parameters
        ----------
        from_addr:
            Sender address (e.g. ``"Alice <alice@example.com>"``).
        to_addrs:
            List of primary recipient addresses.
        subject:
            Email subject line.
        body:
            Plain-text email body.
        cc:
            Optional list of CC recipient addresses.
        bcc:
            Optional list of BCC recipient addresses.
        html_body:
            Optional HTML alternative for the body.
        attachment_paths:
            Optional list of local file paths to attach.
        """
        if self._conn is None:
            raise RuntimeError("Not connected. Call connect() first.")

        cc = cc or []
        bcc = bcc or []
        attachment_paths = attachment_paths or []

        # Build MIME message
        if html_body:
            root = MIMEMultipart("alternative")
            root.attach(MIMEText(body, "plain", "utf-8"))
            root.attach(MIMEText(html_body, "html", "utf-8"))
            if attachment_paths:
                wrapper = MIMEMultipart("mixed")
                wrapper.attach(root)
                msg = wrapper
            else:
                msg = root
        else:
            if attachment_paths:
                msg = MIMEMultipart("mixed")
                msg.attach(MIMEText(body, "plain", "utf-8"))
            else:
                msg = MIMEText(body, "plain", "utf-8")  # type: ignore[assignment]

        msg["From"] = from_addr
        msg["To"] = ", ".join(to_addrs)
        if cc:
            msg["Cc"] = ", ".join(cc)
        msg["Subject"] = subject

        # Attach files
        for path_str in attachment_paths:
            path = Path(path_str)
            if not path.exists():
                raise FileNotFoundError(f"Attachment not found: {path}")
            with path.open("rb") as fh:
                part = MIMEApplication(fh.read(), Name=path.name)
            part["Content-Disposition"] = f'attachment; filename="{path.name}"'
            msg.attach(part)

        all_recipients = to_addrs + cc + bcc
        self._conn.sendmail(from_addr, all_recipients, msg.as_string())


def send_email_from_account(
    account: AccountConfig,
    to_addrs: list[str],
    subject: str,
    body: str,
    cc: Optional[list[str]] = None,
    bcc: Optional[list[str]] = None,
    html_body: Optional[str] = None,
    attachment_paths: Optional[list[str]] = None,
) -> None:
    """Convenience function: send an email using the SMTP config of *account*.

    Raises :class:`ValueError` if *account* has no SMTP configuration.
    """
    if account.smtp is None:
        raise ValueError(
            f"Account '{account.name}' has no SMTP configuration. "
            "Add 'smtp_host' and related keys to the account config."
        )
    with SMTPClient(account.smtp) as client:
        client.send_email(
            from_addr=account.username,
            to_addrs=to_addrs,
            subject=subject,
            body=body,
            cc=cc,
            bcc=bcc,
            html_body=html_body,
            attachment_paths=attachment_paths,
        )
