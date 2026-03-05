"""Tests for the MCP server tool dispatch logic (no live connections)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from mcp_email_rw.config import AccountConfig, SmtpConfig
from mcp_email_rw.imap_client import EmailSummary as IMAPSummary, EmailMessage as IMAPMessage
from mcp_email_rw.pop3_client import EmailSummary as POP3Summary, EmailMessage as POP3Message


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


IMAP_ACCOUNT = AccountConfig(
    name="imap_acc",
    protocol="imap",
    host="imap.example.com",
    port=993,
    username="user@example.com",
    password="secret",
    smtp=SmtpConfig(
        host="smtp.example.com",
        port=587,
        username="user@example.com",
        password="secret",
    ),
)

POP3_ACCOUNT = AccountConfig(
    name="pop3_acc",
    protocol="pop3",
    host="pop.example.com",
    port=995,
    username="user@example.com",
    password="secret",
)


def _patch_accounts(accounts):
    """Return a context manager that patches _get_accounts in the server module."""
    return patch(
        "mcp_email_rw.server._get_accounts",
        return_value=accounts,
    )


# ---------------------------------------------------------------------------
# list_accounts
# ---------------------------------------------------------------------------


def test_tool_list_accounts():
    from mcp_email_rw.server import _tool_list_accounts

    with _patch_accounts([IMAP_ACCOUNT, POP3_ACCOUNT]):
        result = _tool_list_accounts()

    assert len(result) == 2
    names = [r["name"] for r in result]
    assert "imap_acc" in names
    assert "pop3_acc" in names
    assert result[0]["smtp_configured"] is True
    assert result[1]["smtp_configured"] is False


# ---------------------------------------------------------------------------
# list_folders
# ---------------------------------------------------------------------------


def test_tool_list_folders_imap():
    from mcp_email_rw.server import _tool_list_folders

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_client.list_folders.return_value = ["INBOX", "Sent", "Trash"]
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_list_folders("imap_acc")

    assert "INBOX" in result


def test_tool_list_folders_pop3_raises():
    from mcp_email_rw.server import _tool_list_folders

    with _patch_accounts([POP3_ACCOUNT]):
        with pytest.raises(ValueError, match="IMAP"):
            _tool_list_folders("pop3_acc")


# ---------------------------------------------------------------------------
# list_emails - IMAP
# ---------------------------------------------------------------------------


def test_tool_list_emails_imap():
    from mcp_email_rw.server import _tool_list_emails

    summaries = [
        IMAPSummary(uid="1", subject="Hello", sender="alice@example.com", date="Mon", is_read=True),
        IMAPSummary(uid="2", subject="World", sender="bob@example.com", date="Tue", is_read=False),
    ]

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_client.list_emails.return_value = summaries
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_list_emails("imap_acc", "INBOX", 20, False)

    assert len(result) == 2
    assert result[0]["uid"] == "1"
    assert result[1]["is_read"] is False


# ---------------------------------------------------------------------------
# list_emails - POP3
# ---------------------------------------------------------------------------


def test_tool_list_emails_pop3():
    from mcp_email_rw.server import _tool_list_emails

    summaries = [
        POP3Summary(message_num=1, subject="POP3 mail", sender="s@example.com", date="Mon"),
    ]

    with _patch_accounts([POP3_ACCOUNT]):
        with patch("mcp_email_rw.server.POP3Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.list_emails.return_value = summaries
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_list_emails("pop3_acc", "INBOX", 20, False)

    assert len(result) == 1
    assert result[0]["uid"] == "1"
    assert result[0]["subject"] == "POP3 mail"


# ---------------------------------------------------------------------------
# read_email - IMAP
# ---------------------------------------------------------------------------


def test_tool_read_email_imap():
    from mcp_email_rw.server import _tool_read_email

    msg = IMAPMessage(
        uid="5",
        subject="Test",
        sender="alice@example.com",
        recipients=["bob@example.com"],
        date="Mon",
        body_text="Hello",
        body_html="",
        is_read=False,
    )

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_client.read_email.return_value = msg
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_read_email("imap_acc", "5", "INBOX")

    assert result["uid"] == "5"
    assert result["body_text"] == "Hello"


# ---------------------------------------------------------------------------
# read_email - POP3
# ---------------------------------------------------------------------------


def test_tool_read_email_pop3():
    from mcp_email_rw.server import _tool_read_email

    msg = POP3Message(
        message_num=3,
        subject="POP3 subject",
        sender="sender@example.com",
        recipients=["recv@example.com"],
        date="Tue",
        body_text="POP3 body",
        body_html="",
    )

    with _patch_accounts([POP3_ACCOUNT]):
        with patch("mcp_email_rw.server.POP3Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.read_email.return_value = msg
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_read_email("pop3_acc", "3", "INBOX")

    assert result["uid"] == "3"
    assert result["body_text"] == "POP3 body"


# ---------------------------------------------------------------------------
# search_emails
# ---------------------------------------------------------------------------


def test_tool_search_emails_imap():
    from mcp_email_rw.server import _tool_search_emails

    summaries = [
        IMAPSummary(uid="7", subject="Invoice", sender="x@example.com", date="Wed", is_read=False),
    ]

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_client.search_emails.return_value = summaries
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_search_emails("imap_acc", 'SUBJECT "Invoice"', "INBOX", 10)

    assert len(result) == 1
    assert result[0]["subject"] == "Invoice"


def test_tool_search_emails_pop3_raises():
    from mcp_email_rw.server import _tool_search_emails

    with _patch_accounts([POP3_ACCOUNT]):
        with pytest.raises(ValueError, match="IMAP"):
            _tool_search_emails("pop3_acc", "ALL", "INBOX", 10)


# ---------------------------------------------------------------------------
# send_email
# ---------------------------------------------------------------------------


def test_tool_send_email():
    from mcp_email_rw.server import _tool_send_email

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.send_email_from_account") as mock_send:
            result = _tool_send_email(
                account="imap_acc",
                to_addrs=["to@example.com"],
                subject="Hi",
                body="Hello",
                cc=None,
                bcc=None,
                html_body=None,
            )

    mock_send.assert_called_once()
    assert result["status"] == "sent"
    assert result["subject"] == "Hi"


# ---------------------------------------------------------------------------
# delete_email
# ---------------------------------------------------------------------------


def test_tool_delete_email_imap():
    from mcp_email_rw.server import _tool_delete_email

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_delete_email("imap_acc", "10", "INBOX")

    mock_client.delete_email.assert_called_once_with(uid="10", folder="INBOX")
    assert result["status"] == "deleted"


def test_tool_delete_email_pop3():
    from mcp_email_rw.server import _tool_delete_email

    with _patch_accounts([POP3_ACCOUNT]):
        with patch("mcp_email_rw.server.POP3Client") as mock_cls:
            mock_client = MagicMock()
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_delete_email("pop3_acc", "2", "INBOX")

    mock_client.delete_email.assert_called_once_with(message_num=2)
    assert result["status"] == "deleted"


# ---------------------------------------------------------------------------
# move_email
# ---------------------------------------------------------------------------


def test_tool_move_email_imap():
    from mcp_email_rw.server import _tool_move_email

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_move_email("imap_acc", "10", "INBOX", "Archive")

    mock_client.move_email.assert_called_once_with(
        uid="10", source_folder="INBOX", dest_folder="Archive"
    )
    assert result["status"] == "moved"
    assert result["to"] == "Archive"


def test_tool_move_email_pop3_raises():
    from mcp_email_rw.server import _tool_move_email

    with _patch_accounts([POP3_ACCOUNT]):
        with pytest.raises(ValueError, match="IMAP"):
            _tool_move_email("pop3_acc", "1", "INBOX", "Sent")


# ---------------------------------------------------------------------------
# mark_email
# ---------------------------------------------------------------------------


def test_tool_mark_email_imap():
    from mcp_email_rw.server import _tool_mark_email

    with _patch_accounts([IMAP_ACCOUNT]):
        with patch("mcp_email_rw.server.IMAPClient") as mock_cls:
            mock_client = MagicMock()
            mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = _tool_mark_email("imap_acc", "5", "INBOX", "read")

    mock_client.mark_email.assert_called_once_with(uid="5", folder="INBOX", flag="read")
    assert result["status"] == "marked"


def test_tool_mark_email_pop3_raises():
    from mcp_email_rw.server import _tool_mark_email

    with _patch_accounts([POP3_ACCOUNT]):
        with pytest.raises(ValueError, match="IMAP"):
            _tool_mark_email("pop3_acc", "1", "INBOX", "read")


# ---------------------------------------------------------------------------
# handle_list_tools (async)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_handle_list_tools():
    from mcp_email_rw.server import handle_list_tools, TOOLS

    result = await handle_list_tools()
    assert result == TOOLS
    tool_names = [t.name for t in result]
    assert "list_accounts" in tool_names
    assert "send_email" in tool_names
    assert "read_email" in tool_names


# ---------------------------------------------------------------------------
# handle_call_tool – error wrapping (async)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_handle_call_tool_unknown_tool_returns_error():
    from mcp_email_rw.server import handle_call_tool

    with _patch_accounts([IMAP_ACCOUNT]):
        result = await handle_call_tool("nonexistent_tool", {})

    assert len(result) == 1
    payload = json.loads(result[0].text)
    assert "error" in payload


@pytest.mark.asyncio
async def test_handle_call_tool_list_accounts():
    from mcp_email_rw.server import handle_call_tool

    with _patch_accounts([IMAP_ACCOUNT]):
        result = await handle_call_tool("list_accounts", {})

    assert len(result) == 1
    payload = json.loads(result[0].text)
    assert isinstance(payload, list)
    assert payload[0]["name"] == "imap_acc"
