"""Tests for the POP3 client module (using mocks – no live server needed)."""

from __future__ import annotations

import poplib
from email.mime.text import MIMEText
from unittest.mock import MagicMock, patch

import pytest

from mcp_email_rw.config import AccountConfig
from mcp_email_rw.pop3_client import POP3Client, _decode_header_value, _extract_body


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_account(ssl=True):
    return AccountConfig(
        name="pop3test",
        protocol="pop3",
        host="pop.example.com",
        port=995,
        username="user@example.com",
        password="secret",
        ssl=ssl,
    )


def make_email_lines(subject="Hello", sender="alice@example.com", body="World"):
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = "bob@example.com"
    msg["Date"] = "Mon, 01 Jan 2024 12:00:00 +0000"
    raw = msg.as_bytes()
    return [line for line in raw.split(b"\r\n")]


def _mock_pop3_ssl():
    mock = MagicMock()
    mock.user.return_value = b"+OK user accepted"
    mock.pass_.return_value = b"+OK logged in"
    mock.quit.return_value = b"+OK bye"
    return mock


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_connect_ssl(mock_cls):
    mock_conn = _mock_pop3_ssl()
    mock_cls.return_value = mock_conn

    client = POP3Client(make_account(ssl=True))
    client.connect()
    mock_cls.assert_called_once()
    mock_conn.user.assert_called_once_with("user@example.com")
    mock_conn.pass_.assert_called_once_with("secret")
    client.disconnect()
    mock_conn.quit.assert_called_once()


@patch("mcp_email_rw.pop3_client.poplib.POP3")
def test_connect_no_ssl(mock_cls):
    mock_conn = MagicMock()
    mock_conn.user.return_value = b"+OK"
    mock_conn.pass_.return_value = b"+OK"
    mock_conn.quit.return_value = b"+OK"
    mock_cls.return_value = mock_conn

    client = POP3Client(make_account(ssl=False))
    client.connect()
    mock_cls.assert_called_once()
    client.disconnect()


def test_not_connected_raises():
    client = POP3Client(make_account())
    with pytest.raises(RuntimeError, match="Not connected"):
        _ = client._c


# ---------------------------------------------------------------------------
# get_mailbox_info
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_get_mailbox_info(mock_cls):
    mock_conn = _mock_pop3_ssl()
    mock_conn.stat.return_value = (5, 12345)
    mock_cls.return_value = mock_conn

    with POP3Client(make_account()) as client:
        count, size = client.get_mailbox_info()

    assert count == 5
    assert size == 12345


# ---------------------------------------------------------------------------
# list_emails
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_list_emails_empty(mock_cls):
    mock_conn = _mock_pop3_ssl()
    mock_conn.stat.return_value = (0, 0)
    mock_cls.return_value = mock_conn

    with POP3Client(make_account()) as client:
        result = client.list_emails()

    assert result == []


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_list_emails_returns_summaries(mock_cls):
    mock_conn = _mock_pop3_ssl()
    mock_conn.stat.return_value = (2, 1000)
    lines = make_email_lines(subject="Test Subject", sender="sender@example.com")
    mock_conn.top.return_value = (b"+OK", lines, 500)
    mock_cls.return_value = mock_conn

    with POP3Client(make_account()) as client:
        summaries = client.list_emails(limit=5)

    assert len(summaries) == 2
    assert summaries[0].message_num == 2
    assert summaries[1].message_num == 1


# ---------------------------------------------------------------------------
# read_email
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_read_email(mock_cls):
    mock_conn = _mock_pop3_ssl()
    lines = make_email_lines(subject="Hello POP3", body="Body content")
    mock_conn.retr.return_value = (b"+OK", lines, 500)
    mock_cls.return_value = mock_conn

    with POP3Client(make_account()) as client:
        msg = client.read_email(1)

    assert msg.message_num == 1
    assert msg.subject == "Hello POP3"
    assert "Body content" in msg.body_text


# ---------------------------------------------------------------------------
# delete_email
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_delete_email(mock_cls):
    mock_conn = _mock_pop3_ssl()
    mock_conn.dele.return_value = b"+OK deleted"
    mock_cls.return_value = mock_conn

    with POP3Client(make_account()) as client:
        result = client.delete_email(1)

    assert result is True
    mock_conn.dele.assert_called_once_with(1)


# ---------------------------------------------------------------------------
# _decode_header_value (shared helper)
# ---------------------------------------------------------------------------


def test_decode_header_value_plain():
    assert _decode_header_value("Simple") == "Simple"


def test_decode_header_value_none_like():
    assert _decode_header_value("") == ""


# ---------------------------------------------------------------------------
# Context manager
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.pop3_client.poplib.POP3_SSL")
def test_context_manager(mock_cls):
    mock_conn = _mock_pop3_ssl()
    mock_conn.stat.return_value = (0, 0)
    mock_cls.return_value = mock_conn

    with POP3Client(make_account()) as client:
        assert client._conn is not None
    assert client._conn is None
