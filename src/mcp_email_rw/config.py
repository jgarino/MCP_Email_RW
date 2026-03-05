"""Configuration management for MCP Email tool.

Reads account configurations from a JSON file.  The path to the config file
can be provided explicitly or resolved via the ``MCP_EMAIL_CONFIG`` environment
variable, falling back to ``~/.mcp_email_config.json``.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class SmtpConfig:
    """SMTP configuration used for sending email."""

    host: str
    port: int = 587
    ssl: bool = False
    tls: bool = True
    username: str = ""
    password: str = ""


@dataclass
class AccountConfig:
    """Configuration for a single email account."""

    name: str
    protocol: str  # "imap" or "pop3"
    host: str
    port: int
    username: str
    password: str
    ssl: bool = True
    smtp: Optional[SmtpConfig] = field(default=None)

    def __post_init__(self) -> None:
        protocol = self.protocol.lower()
        if protocol not in ("imap", "pop3"):
            raise ValueError(f"Unsupported protocol '{self.protocol}'. Use 'imap' or 'pop3'.")
        self.protocol = protocol


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------


def _parse_smtp(data: dict) -> Optional[SmtpConfig]:
    """Return a :class:`SmtpConfig` if SMTP keys are present in *data*."""
    if "smtp_host" not in data:
        return None
    return SmtpConfig(
        host=data["smtp_host"],
        port=int(data.get("smtp_port", 587)),
        ssl=bool(data.get("smtp_ssl", False)),
        tls=bool(data.get("smtp_tls", True)),
        username=data.get("smtp_username", data.get("username", "")),
        password=data.get("smtp_password", data.get("password", "")),
    )


def _parse_account(data: dict) -> AccountConfig:
    """Parse a single account entry from the configuration dict."""
    required = ("name", "host", "username", "password")
    for key in required:
        if key not in data:
            raise ValueError(f"Account configuration is missing required field: '{key}'")

    protocol = data.get("protocol", "imap")
    default_port = 993 if protocol.lower() == "imap" else 995
    return AccountConfig(
        name=data["name"],
        protocol=protocol,
        host=data["host"],
        port=int(data.get("port", default_port)),
        username=data["username"],
        password=data["password"],
        ssl=bool(data.get("ssl", True)),
        smtp=_parse_smtp(data),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def load_config(path: Optional[str] = None) -> list[AccountConfig]:
    """Load and return all account configurations.

    Resolution order for the config file:
    1. *path* argument (if given)
    2. ``MCP_EMAIL_CONFIG`` environment variable
    3. ``~/.mcp_email_config.json``

    Returns a list of :class:`AccountConfig` objects.
    Raises :class:`FileNotFoundError` if the file does not exist.
    Raises :class:`ValueError` for malformed configuration.
    """
    if path is None:
        path = os.environ.get(
            "MCP_EMAIL_CONFIG",
            str(Path.home() / ".mcp_email_config.json"),
        )

    config_path = Path(path)
    if not config_path.exists():
        raise FileNotFoundError(
            f"Email configuration file not found: {config_path}\n"
            "Create the file or set the MCP_EMAIL_CONFIG environment variable."
        )

    with config_path.open("r", encoding="utf-8") as fh:
        raw = json.load(fh)

    if not isinstance(raw, dict) or "accounts" not in raw:
        raise ValueError("Configuration file must be a JSON object with an 'accounts' array.")

    accounts_data = raw["accounts"]
    if not isinstance(accounts_data, list):
        raise ValueError("'accounts' must be a JSON array.")

    return [_parse_account(entry) for entry in accounts_data]


def get_account(accounts: list[AccountConfig], name: str) -> AccountConfig:
    """Return the account with the given *name*, or raise :class:`ValueError`."""
    for account in accounts:
        if account.name == name:
            return account
    available = ", ".join(a.name for a in accounts)
    raise ValueError(f"Account '{name}' not found. Available accounts: {available}")
