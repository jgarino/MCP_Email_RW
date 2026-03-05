"""Tests for the IMAP client module (using mocks – no live server needed)."""

from __future__ import annotations

import email
import imaplib
from email.mime.text import MIMEText
from unittest.mock import MagicMock, patch, call

import pytest

from mcp_email_rw.config import AccountConfig
from mcp_email_rw.imap_client import (
    IMAPClient,
    EmailSummary,
    EmailMessage,
    _decode_header_value,
    _extract_body,
    _extract_attachments,
)


# ---------------------------------------------------------------------------
# Helper fixtures
# ---------------------------------------------------------------------------


def make_account(ssl=True):
    return AccountConfig(
        name="test",
        protocol="imap",
        host="imap.example.com",
        port=993,
        username="user@example.com",
        password="secret",
        ssl=ssl,
    )


def simple_email_bytes(subject="Test", sender="alice@example.com", body="Hello"):
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = "bob@example.com"
    msg["Date"] = "Mon, 01 Jan 2024 12:00:00 +0000"
    return msg.as_bytes()


# ---------------------------------------------------------------------------
# _decode_header_value
# ---------------------------------------------------------------------------


def test_decode_header_value_plain():
    assert _decode_header_value("Hello World") == "Hello World"


def test_decode_header_value_encoded():
    # UTF-8 encoded header
    encoded = "=?utf-8?b?SGVsbG8gV29ybGQ=?="
    assert _decode_header_value(encoded) == "Hello World"


def test_decode_header_value_empty():
    assert _decode_header_value("") == ""


# ---------------------------------------------------------------------------
# _extract_body
# ---------------------------------------------------------------------------


def test_extract_body_plain_text():
    raw = simple_email_bytes(body="plain text content")
    msg = email.message_from_bytes(raw)
    text, html = _extract_body(msg)
    assert "plain text content" in text
    assert html == ""


def test_extract_body_html():
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    root = MIMEMultipart("alternative")
    root.attach(MIMEText("plain", "plain", "utf-8"))
    root.attach(MIMEText("<b>html</b>", "html", "utf-8"))
    msg = email.message_from_bytes(root.as_bytes())
    text, html = _extract_body(msg)
    assert text == "plain"
    assert "<b>html</b>" in html


# ---------------------------------------------------------------------------
# _extract_attachments
# ---------------------------------------------------------------------------


def test_extract_attachments_none():
    msg = email.message_from_bytes(simple_email_bytes())
    assert _extract_attachments(msg) == []


def test_extract_attachments_one():
    from email.mime.multipart import MIMEMultipart
    from email.mime.application import MIMEApplication

    root = MIMEMultipart()
    root.attach(MIMEText("body", "plain"))
    part = MIMEApplication(b"data", Name="report.pdf")
    part["Content-Disposition"] = 'attachment; filename="report.pdf"'
    root.attach(part)

    msg = email.message_from_bytes(root.as_bytes())
    names = _extract_attachments(msg)
    assert names == ["report.pdf"]


# ---------------------------------------------------------------------------
# IMAPClient connection (mocked)
# ---------------------------------------------------------------------------


def _mock_imap4_ssl():
    """Return a fully mocked IMAP4_SSL instance."""
    mock = MagicMock()
    mock.login.return_value = ("OK", [b"Logged in"])
    mock.logout.return_value = ("BYE", [b"Bye"])
    return mock


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_connect_ssl(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_cls.return_value = mock_conn

    account = make_account(ssl=True)
    client = IMAPClient(account)
    client.connect()

    mock_cls.assert_called_once()
    mock_conn.login.assert_called_once_with("user@example.com", "secret")
    client.disconnect()
    mock_conn.logout.assert_called_once()


@patch("mcp_email_rw.imap_client.imaplib.IMAP4")
def test_connect_no_ssl(mock_cls):
    mock_conn = MagicMock()
    mock_conn.login.return_value = ("OK", [b"ok"])
    mock_conn.logout.return_value = ("BYE", [b"bye"])
    mock_cls.return_value = mock_conn

    account = make_account(ssl=False)
    client = IMAPClient(account)
    client.connect()
    mock_cls.assert_called_once()
    client.disconnect()


def test_not_connected_raises():
    client = IMAPClient(make_account())
    with pytest.raises(RuntimeError, match="Not connected"):
        _ = client._c


# ---------------------------------------------------------------------------
# list_folders
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_list_folders(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.list.return_value = (
        "OK",
        [
            b'(\\HasNoChildren) "/" "INBOX"',
            b'(\\HasNoChildren) "/" "Sent"',
            b'(\\HasNoChildren) "/" "Trash"',
        ],
    )
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        folders = client.list_folders()

    assert "INBOX" in folders
    assert "Sent" in folders
    assert "Trash" in folders


# ---------------------------------------------------------------------------
# list_emails
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_list_emails_empty_inbox(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"0"])
    mock_conn.uid.return_value = ("OK", [b""])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        result = client.list_emails()

    assert result == []


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_list_emails_unread_only(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"5"])
    # No unread messages
    mock_conn.uid.return_value = ("OK", [b""])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        result = client.list_emails(unread_only=True)

    assert result == []
    # Check UNSEEN was used in search
    uid_calls = mock_conn.uid.call_args_list
    assert any("UNSEEN" in str(c) for c in uid_calls)


# ---------------------------------------------------------------------------
# delete_email
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_delete_email(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"1"])
    mock_conn.uid.return_value = ("OK", [b""])
    mock_conn.expunge.return_value = ("OK", [b""])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        result = client.delete_email("42")

    assert result is True
    # Verify \Deleted flag was set
    uid_calls = [str(c) for c in mock_conn.uid.call_args_list]
    assert any("\\\\Deleted" in c or "Deleted" in c for c in uid_calls)


# ---------------------------------------------------------------------------
# mark_email
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_mark_email_read(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"1"])
    mock_conn.uid.return_value = ("OK", [b""])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        result = client.mark_email("42", "INBOX", "read")

    assert result is True


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_mark_email_invalid_flag_raises(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"1"])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        with pytest.raises(ValueError, match="Unknown flag"):
            client.mark_email("42", "INBOX", "invalid")


# ---------------------------------------------------------------------------
# move_email
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_move_email_success(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"1"])
    mock_conn.uid.return_value = ("OK", [b""])
    mock_conn.expunge.return_value = ("OK", [b""])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        result = client.move_email("42", "INBOX", "Archive")

    assert result is True


@patch("mcp_email_rw.imap_client.imaplib.IMAP4_SSL")
def test_move_email_copy_failure_raises(mock_cls):
    mock_conn = _mock_imap4_ssl()
    mock_conn.select.return_value = ("OK", [b"1"])
    # COPY fails
    mock_conn.uid.return_value = ("NO", [b"Copy failed"])
    mock_cls.return_value = mock_conn

    with IMAPClient(make_account()) as client:
        with pytest.raises(ValueError, match="Failed to copy"):
            client.move_email("42", "INBOX", "Archive")
