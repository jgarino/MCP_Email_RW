"""Tests for the configuration module."""

from __future__ import annotations

import json
import os
import pytest
from pathlib import Path

from mcp_email_rw.config import (
    AccountConfig,
    SmtpConfig,
    get_account,
    load_config,
    _parse_account,
    _parse_smtp,
)


# ---------------------------------------------------------------------------
# _parse_smtp
# ---------------------------------------------------------------------------


def test_parse_smtp_returns_none_without_smtp_host():
    assert _parse_smtp({}) is None
    assert _parse_smtp({"host": "imap.example.com"}) is None


def test_parse_smtp_defaults():
    cfg = _parse_smtp({"smtp_host": "smtp.example.com", "username": "u", "password": "p"})
    assert cfg is not None
    assert cfg.host == "smtp.example.com"
    assert cfg.port == 587
    assert cfg.ssl is False
    assert cfg.tls is True
    assert cfg.username == "u"
    assert cfg.password == "p"


def test_parse_smtp_full():
    data = {
        "smtp_host": "smtp.example.com",
        "smtp_port": "465",
        "smtp_ssl": True,
        "smtp_tls": False,
        "smtp_username": "smtp_user",
        "smtp_password": "smtp_pass",
    }
    cfg = _parse_smtp(data)
    assert cfg is not None
    assert cfg.port == 465
    assert cfg.ssl is True
    assert cfg.tls is False
    assert cfg.username == "smtp_user"
    assert cfg.password == "smtp_pass"


# ---------------------------------------------------------------------------
# _parse_account
# ---------------------------------------------------------------------------


def test_parse_account_imap_defaults():
    data = {
        "name": "work",
        "host": "imap.example.com",
        "username": "user@example.com",
        "password": "secret",
    }
    acc = _parse_account(data)
    assert acc.name == "work"
    assert acc.protocol == "imap"
    assert acc.host == "imap.example.com"
    assert acc.port == 993
    assert acc.ssl is True
    assert acc.smtp is None


def test_parse_account_pop3_defaults():
    data = {
        "name": "personal",
        "protocol": "pop3",
        "host": "pop.example.com",
        "username": "user@example.com",
        "password": "secret",
    }
    acc = _parse_account(data)
    assert acc.protocol == "pop3"
    assert acc.port == 995


def test_parse_account_custom_port():
    data = {
        "name": "custom",
        "host": "imap.example.com",
        "port": "1234",
        "username": "u",
        "password": "p",
    }
    acc = _parse_account(data)
    assert acc.port == 1234


def test_parse_account_with_smtp():
    data = {
        "name": "work",
        "host": "imap.example.com",
        "username": "user@example.com",
        "password": "secret",
        "smtp_host": "smtp.example.com",
    }
    acc = _parse_account(data)
    assert acc.smtp is not None
    assert acc.smtp.host == "smtp.example.com"


def test_parse_account_missing_required_raises():
    with pytest.raises(ValueError, match="missing required field"):
        _parse_account({"host": "imap.example.com", "username": "u", "password": "p"})


def test_parse_account_invalid_protocol_raises():
    with pytest.raises(ValueError, match="Unsupported protocol"):
        _parse_account(
            {"name": "x", "protocol": "ftp", "host": "h", "username": "u", "password": "p"}
        )


# ---------------------------------------------------------------------------
# load_config
# ---------------------------------------------------------------------------


def test_load_config_file_not_found_raises(tmp_path):
    with pytest.raises(FileNotFoundError, match="not found"):
        load_config(str(tmp_path / "nonexistent.json"))


def test_load_config_missing_accounts_key_raises(tmp_path):
    cfg_file = tmp_path / "config.json"
    cfg_file.write_text(json.dumps({"foo": "bar"}))
    with pytest.raises(ValueError, match="'accounts' array"):
        load_config(str(cfg_file))


def test_load_config_accounts_not_list_raises(tmp_path):
    cfg_file = tmp_path / "config.json"
    cfg_file.write_text(json.dumps({"accounts": "not-a-list"}))
    with pytest.raises(ValueError, match="JSON array"):
        load_config(str(cfg_file))


def test_load_config_single_account(tmp_path):
    cfg_file = tmp_path / "config.json"
    cfg_file.write_text(
        json.dumps(
            {
                "accounts": [
                    {
                        "name": "test",
                        "host": "imap.example.com",
                        "username": "u",
                        "password": "p",
                    }
                ]
            }
        )
    )
    accounts = load_config(str(cfg_file))
    assert len(accounts) == 1
    assert accounts[0].name == "test"


def test_load_config_multiple_accounts(tmp_path):
    cfg_file = tmp_path / "config.json"
    cfg_file.write_text(
        json.dumps(
            {
                "accounts": [
                    {"name": "a", "host": "h1", "username": "u1", "password": "p1"},
                    {
                        "name": "b",
                        "protocol": "pop3",
                        "host": "h2",
                        "username": "u2",
                        "password": "p2",
                    },
                ]
            }
        )
    )
    accounts = load_config(str(cfg_file))
    assert len(accounts) == 2
    assert accounts[0].protocol == "imap"
    assert accounts[1].protocol == "pop3"


def test_load_config_uses_env_variable(tmp_path, monkeypatch):
    cfg_file = tmp_path / "config.json"
    cfg_file.write_text(
        json.dumps(
            {"accounts": [{"name": "env", "host": "h", "username": "u", "password": "p"}]}
        )
    )
    monkeypatch.setenv("MCP_EMAIL_CONFIG", str(cfg_file))
    accounts = load_config()
    assert accounts[0].name == "env"


# ---------------------------------------------------------------------------
# get_account
# ---------------------------------------------------------------------------


def test_get_account_found():
    accounts = [
        AccountConfig(name="a", protocol="imap", host="h", port=993, username="u", password="p"),
        AccountConfig(name="b", protocol="pop3", host="h", port=995, username="u", password="p"),
    ]
    acc = get_account(accounts, "b")
    assert acc.name == "b"


def test_get_account_not_found_raises():
    accounts = [
        AccountConfig(name="a", protocol="imap", host="h", port=993, username="u", password="p"),
    ]
    with pytest.raises(ValueError, match="Account 'z' not found"):
        get_account(accounts, "z")
