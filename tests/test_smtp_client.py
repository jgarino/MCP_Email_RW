"""Tests for the SMTP client module (using mocks – no live server needed)."""

from __future__ import annotations

import smtplib
import ssl
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest

from mcp_email_rw.config import AccountConfig, SmtpConfig
from mcp_email_rw.smtp_client import SMTPClient, send_email_from_account


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_smtp_config(
    ssl_enabled=False,
    tls_enabled=True,
    port=587,
    host="smtp.example.com",
    username="user@example.com",
    password="secret",
):
    return SmtpConfig(
        host=host,
        port=port,
        ssl=ssl_enabled,
        tls=tls_enabled,
        username=username,
        password=password,
    )


def make_account(with_smtp=True):
    acc = AccountConfig(
        name="test",
        protocol="imap",
        host="imap.example.com",
        port=993,
        username="user@example.com",
        password="secret",
        smtp=make_smtp_config() if with_smtp else None,
    )
    return acc


def _mock_smtp():
    mock = MagicMock()
    mock.starttls.return_value = (220, b"ready")
    mock.login.return_value = (235, b"ok")
    mock.sendmail.return_value = {}
    mock.quit.return_value = (221, b"bye")
    return mock


def _mock_smtp_ssl():
    mock = MagicMock()
    mock.login.return_value = (235, b"ok")
    mock.sendmail.return_value = {}
    mock.quit.return_value = (221, b"bye")
    return mock


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_connect_starttls(mock_cls):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    cfg = make_smtp_config(ssl_enabled=False, tls_enabled=True)
    client = SMTPClient(cfg)
    client.connect()

    mock_cls.assert_called_once_with(cfg.host, cfg.port)
    mock_conn.starttls.assert_called_once()
    mock_conn.login.assert_called_once_with(cfg.username, cfg.password)
    client.disconnect()
    mock_conn.quit.assert_called_once()


@patch("mcp_email_rw.smtp_client.smtplib.SMTP_SSL")
def test_connect_ssl(mock_cls):
    mock_conn = _mock_smtp_ssl()
    mock_cls.return_value = mock_conn

    cfg = make_smtp_config(ssl_enabled=True, tls_enabled=False, port=465)
    client = SMTPClient(cfg)
    client.connect()

    mock_cls.assert_called_once()
    mock_conn.login.assert_called_once_with(cfg.username, cfg.password)
    client.disconnect()


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_connect_no_auth_when_no_credentials(mock_cls):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    cfg = SmtpConfig(host="smtp.example.com", port=25, ssl=False, tls=False, username="", password="")
    client = SMTPClient(cfg)
    client.connect()

    mock_conn.login.assert_not_called()
    client.disconnect()


def test_send_without_connect_raises():
    client = SMTPClient(make_smtp_config())
    with pytest.raises(RuntimeError, match="Not connected"):
        client.send_email(
            from_addr="from@example.com",
            to_addrs=["to@example.com"],
            subject="Test",
            body="Hello",
        )


# ---------------------------------------------------------------------------
# send_email
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_send_plain_text(mock_cls):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    with SMTPClient(make_smtp_config()) as client:
        client.send_email(
            from_addr="from@example.com",
            to_addrs=["to@example.com"],
            subject="Hello",
            body="World",
        )

    mock_conn.sendmail.assert_called_once()
    args = mock_conn.sendmail.call_args
    assert args[0][0] == "from@example.com"
    assert args[0][1] == ["to@example.com"]


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_send_with_cc_bcc(mock_cls):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    with SMTPClient(make_smtp_config()) as client:
        client.send_email(
            from_addr="from@example.com",
            to_addrs=["to@example.com"],
            subject="Hello",
            body="World",
            cc=["cc@example.com"],
            bcc=["bcc@example.com"],
        )

    args = mock_conn.sendmail.call_args
    all_recipients = args[0][1]
    assert "cc@example.com" in all_recipients
    assert "bcc@example.com" in all_recipients


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_send_with_html_body(mock_cls):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    with SMTPClient(make_smtp_config()) as client:
        client.send_email(
            from_addr="from@example.com",
            to_addrs=["to@example.com"],
            subject="Hello",
            body="plain text",
            html_body="<b>html</b>",
        )

    mock_conn.sendmail.assert_called_once()
    raw_message = mock_conn.sendmail.call_args[0][2]
    assert "html" in raw_message.lower()


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_send_with_attachment(mock_cls, tmp_path):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    attachment = tmp_path / "file.txt"
    attachment.write_text("file content")

    with SMTPClient(make_smtp_config()) as client:
        client.send_email(
            from_addr="from@example.com",
            to_addrs=["to@example.com"],
            subject="Hello",
            body="body",
            attachment_paths=[str(attachment)],
        )

    mock_conn.sendmail.assert_called_once()
    raw_message = mock_conn.sendmail.call_args[0][2]
    assert "file.txt" in raw_message


@patch("mcp_email_rw.smtp_client.smtplib.SMTP")
def test_send_missing_attachment_raises(mock_cls):
    mock_conn = _mock_smtp()
    mock_cls.return_value = mock_conn

    with SMTPClient(make_smtp_config()) as client:
        with pytest.raises(FileNotFoundError, match="Attachment not found"):
            client.send_email(
                from_addr="from@example.com",
                to_addrs=["to@example.com"],
                subject="Subject",
                body="body",
                attachment_paths=["/nonexistent/path/file.txt"],
            )


# ---------------------------------------------------------------------------
# send_email_from_account
# ---------------------------------------------------------------------------


@patch("mcp_email_rw.smtp_client.SMTPClient")
def test_send_email_from_account(mock_cls):
    mock_client = MagicMock()
    mock_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
    mock_cls.return_value.__exit__ = MagicMock(return_value=False)

    account = make_account(with_smtp=True)
    send_email_from_account(
        account=account,
        to_addrs=["to@example.com"],
        subject="Hi",
        body="Hello",
    )

    mock_client.send_email.assert_called_once()


def test_send_email_from_account_no_smtp_raises():
    account = make_account(with_smtp=False)
    with pytest.raises(ValueError, match="no SMTP configuration"):
        send_email_from_account(
            account=account,
            to_addrs=["to@example.com"],
            subject="Hi",
            body="Hello",
        )
