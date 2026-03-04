"""MCP server exposing email read/write tools via IMAP, POP3, and SMTP.

Start with::

    python -m mcp_email_rw.server

or, if installed::

    mcp-email-rw

The server reads account configuration from ``~/.mcp_email_config.json`` by
default. Set the ``MCP_EMAIL_CONFIG`` environment variable to override the
path.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import mcp.server.stdio
import mcp.types as types
from mcp.server import Server

from .config import AccountConfig, get_account, load_config
from .imap_client import IMAPClient
from .pop3_client import POP3Client
from .smtp_client import send_email_from_account

# ---------------------------------------------------------------------------
# Server initialisation
# ---------------------------------------------------------------------------

server = Server("mcp-email-rw")

# Accounts are loaded lazily on first use so that import errors do not
# prevent the module from loading in test environments.
_accounts: Optional[list[AccountConfig]] = None


def _get_accounts() -> list[AccountConfig]:
    global _accounts
    if _accounts is None:
        _accounts = load_config()
    return _accounts


def _get_account(name: str) -> AccountConfig:
    return get_account(_get_accounts(), name)


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS = [
    types.Tool(
        name="list_accounts",
        description=(
            "List all configured email accounts with their protocol, host, and username."
        ),
        inputSchema={
            "type": "object",
            "properties": {},
            "required": [],
        },
    ),
    types.Tool(
        name="list_folders",
        description=(
            "List all mailbox folders/labels available on an IMAP account. "
            "Not supported for POP3 accounts."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
            },
            "required": ["account"],
        },
    ),
    types.Tool(
        name="list_emails",
        description=(
            "List emails from a mailbox folder. Returns subject, sender, date, "
            "read status, and a unique identifier for each message."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
                "folder": {
                    "type": "string",
                    "description": "Folder/mailbox name (default: INBOX). IMAP only.",
                    "default": "INBOX",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of emails to return (default: 20).",
                    "default": 20,
                    "minimum": 1,
                    "maximum": 200,
                },
                "unread_only": {
                    "type": "boolean",
                    "description": "When true, only return unread messages. IMAP only.",
                    "default": False,
                },
            },
            "required": ["account"],
        },
    ),
    types.Tool(
        name="read_email",
        description=(
            "Read the full content of a single email, including body text and attachment names."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
                "uid": {
                    "type": "string",
                    "description": (
                        "Email unique identifier. For IMAP this is the UID; "
                        "for POP3 this is the message number."
                    ),
                },
                "folder": {
                    "type": "string",
                    "description": "Folder containing the email (IMAP only, default: INBOX).",
                    "default": "INBOX",
                },
            },
            "required": ["account", "uid"],
        },
    ),
    types.Tool(
        name="search_emails",
        description=(
            "Search emails using IMAP search criteria. "
            "Examples: 'FROM \"alice@example.com\"', 'SUBJECT \"invoice\"', "
            "'UNSEEN', 'SINCE \"01-Jan-2024\"', 'TEXT \"budget\"'."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
                "criteria": {
                    "type": "string",
                    "description": "IMAP search criteria string.",
                },
                "folder": {
                    "type": "string",
                    "description": "Folder to search in (default: INBOX).",
                    "default": "INBOX",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 20).",
                    "default": 20,
                    "minimum": 1,
                    "maximum": 200,
                },
            },
            "required": ["account", "criteria"],
        },
    ),
    types.Tool(
        name="send_email",
        description="Compose and send an email via SMTP using a configured account.",
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name to send from.",
                },
                "to": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of recipient email addresses.",
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject.",
                },
                "body": {
                    "type": "string",
                    "description": "Plain-text email body.",
                },
                "cc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of CC recipients.",
                    "default": [],
                },
                "bcc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of BCC recipients.",
                    "default": [],
                },
                "html_body": {
                    "type": "string",
                    "description": "Optional HTML version of the body.",
                },
            },
            "required": ["account", "to", "subject", "body"],
        },
    ),
    types.Tool(
        name="delete_email",
        description=(
            "Delete an email from a mailbox. "
            "For IMAP, the message is moved to Trash and expunged. "
            "For POP3, the message is marked for deletion on disconnect."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
                "uid": {
                    "type": "string",
                    "description": "Email UID (IMAP) or message number (POP3).",
                },
                "folder": {
                    "type": "string",
                    "description": "Folder containing the email (IMAP only, default: INBOX).",
                    "default": "INBOX",
                },
            },
            "required": ["account", "uid"],
        },
    ),
    types.Tool(
        name="move_email",
        description="Move an email from one folder to another. IMAP only.",
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
                "uid": {
                    "type": "string",
                    "description": "Email UID.",
                },
                "source_folder": {
                    "type": "string",
                    "description": "Source folder name.",
                },
                "dest_folder": {
                    "type": "string",
                    "description": "Destination folder name.",
                },
            },
            "required": ["account", "uid", "source_folder", "dest_folder"],
        },
    ),
    types.Tool(
        name="mark_email",
        description=(
            "Mark an email with a flag. Supported flags: read, unread, flagged, unflagged. "
            "IMAP only."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "account": {
                    "type": "string",
                    "description": "Account name as defined in the configuration.",
                },
                "uid": {
                    "type": "string",
                    "description": "Email UID.",
                },
                "folder": {
                    "type": "string",
                    "description": "Folder containing the email (default: INBOX).",
                    "default": "INBOX",
                },
                "flag": {
                    "type": "string",
                    "description": "Flag to set: read, unread, flagged, unflagged.",
                    "enum": ["read", "unread", "flagged", "unflagged"],
                },
            },
            "required": ["account", "uid", "flag"],
        },
    ),
]


# ---------------------------------------------------------------------------
# MCP handlers
# ---------------------------------------------------------------------------


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return TOOLS


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any]
) -> list[types.TextContent]:
    try:
        result = await _dispatch(name, arguments)
        return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
    except Exception as exc:
        error_payload = {"error": str(exc)}
        return [types.TextContent(type="text", text=json.dumps(error_payload))]


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------


async def _dispatch(name: str, args: dict[str, Any]) -> Any:
    if name == "list_accounts":
        return _tool_list_accounts()
    if name == "list_folders":
        return _tool_list_folders(args["account"])
    if name == "list_emails":
        return _tool_list_emails(
            account=args["account"],
            folder=args.get("folder", "INBOX"),
            limit=int(args.get("limit", 20)),
            unread_only=bool(args.get("unread_only", False)),
        )
    if name == "read_email":
        return _tool_read_email(
            account=args["account"],
            uid=str(args["uid"]),
            folder=args.get("folder", "INBOX"),
        )
    if name == "search_emails":
        return _tool_search_emails(
            account=args["account"],
            criteria=args["criteria"],
            folder=args.get("folder", "INBOX"),
            limit=int(args.get("limit", 20)),
        )
    if name == "send_email":
        return _tool_send_email(
            account=args["account"],
            to_addrs=args["to"],
            subject=args["subject"],
            body=args["body"],
            cc=args.get("cc"),
            bcc=args.get("bcc"),
            html_body=args.get("html_body"),
        )
    if name == "delete_email":
        return _tool_delete_email(
            account=args["account"],
            uid=str(args["uid"]),
            folder=args.get("folder", "INBOX"),
        )
    if name == "move_email":
        return _tool_move_email(
            account=args["account"],
            uid=str(args["uid"]),
            source_folder=args["source_folder"],
            dest_folder=args["dest_folder"],
        )
    if name == "mark_email":
        return _tool_mark_email(
            account=args["account"],
            uid=str(args["uid"]),
            folder=args.get("folder", "INBOX"),
            flag=args["flag"],
        )
    raise ValueError(f"Unknown tool: {name}")


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


def _tool_list_accounts() -> list[dict]:
    accounts = _get_accounts()
    return [
        {
            "name": a.name,
            "protocol": a.protocol,
            "host": a.host,
            "port": a.port,
            "username": a.username,
            "ssl": a.ssl,
            "smtp_configured": a.smtp is not None,
        }
        for a in accounts
    ]


def _tool_list_folders(account_name: str) -> list[str]:
    account = _get_account(account_name)
    if account.protocol != "imap":
        raise ValueError(f"list_folders is only supported for IMAP accounts (got '{account.protocol}').")
    with IMAPClient(account) as client:
        return client.list_folders()


def _tool_list_emails(
    account: str,
    folder: str,
    limit: int,
    unread_only: bool,
) -> list[dict]:
    acc = _get_account(account)
    if acc.protocol == "imap":
        with IMAPClient(acc) as client:
            summaries = client.list_emails(folder=folder, limit=limit, unread_only=unread_only)
        return [
            {
                "uid": s.uid,
                "subject": s.subject,
                "sender": s.sender,
                "date": s.date,
                "is_read": s.is_read,
                "size_bytes": s.size,
            }
            for s in summaries
        ]
    else:  # pop3
        with POP3Client(acc) as client:
            summaries = client.list_emails(limit=limit)
        return [
            {
                "uid": str(s.message_num),
                "subject": s.subject,
                "sender": s.sender,
                "date": s.date,
                "size_bytes": s.size,
            }
            for s in summaries
        ]


def _tool_read_email(account: str, uid: str, folder: str) -> dict:
    acc = _get_account(account)
    if acc.protocol == "imap":
        with IMAPClient(acc) as client:
            msg = client.read_email(uid=uid, folder=folder)
        return {
            "uid": msg.uid,
            "subject": msg.subject,
            "sender": msg.sender,
            "recipients": msg.recipients,
            "date": msg.date,
            "body_text": msg.body_text,
            "body_html": msg.body_html,
            "is_read": msg.is_read,
            "attachments": msg.attachments,
        }
    else:  # pop3
        with POP3Client(acc) as client:
            msg = client.read_email(message_num=int(uid))
        return {
            "uid": str(msg.message_num),
            "subject": msg.subject,
            "sender": msg.sender,
            "recipients": msg.recipients,
            "date": msg.date,
            "body_text": msg.body_text,
            "body_html": msg.body_html,
            "attachments": msg.attachments,
        }


def _tool_search_emails(
    account: str,
    criteria: str,
    folder: str,
    limit: int,
) -> list[dict]:
    acc = _get_account(account)
    if acc.protocol != "imap":
        raise ValueError("search_emails is only supported for IMAP accounts.")
    with IMAPClient(acc) as client:
        summaries = client.search_emails(criteria=criteria, folder=folder, limit=limit)
    return [
        {
            "uid": s.uid,
            "subject": s.subject,
            "sender": s.sender,
            "date": s.date,
            "is_read": s.is_read,
            "size_bytes": s.size,
        }
        for s in summaries
    ]


def _tool_send_email(
    account: str,
    to_addrs: list[str],
    subject: str,
    body: str,
    cc: Optional[list[str]],
    bcc: Optional[list[str]],
    html_body: Optional[str],
) -> dict:
    acc = _get_account(account)
    send_email_from_account(
        account=acc,
        to_addrs=to_addrs,
        subject=subject,
        body=body,
        cc=cc,
        bcc=bcc,
        html_body=html_body,
    )
    return {"status": "sent", "to": to_addrs, "subject": subject}


def _tool_delete_email(account: str, uid: str, folder: str) -> dict:
    acc = _get_account(account)
    if acc.protocol == "imap":
        with IMAPClient(acc) as client:
            client.delete_email(uid=uid, folder=folder)
    else:
        with POP3Client(acc) as client:
            client.delete_email(message_num=int(uid))
    return {"status": "deleted", "uid": uid}


def _tool_move_email(
    account: str,
    uid: str,
    source_folder: str,
    dest_folder: str,
) -> dict:
    acc = _get_account(account)
    if acc.protocol != "imap":
        raise ValueError("move_email is only supported for IMAP accounts.")
    with IMAPClient(acc) as client:
        client.move_email(uid=uid, source_folder=source_folder, dest_folder=dest_folder)
    return {"status": "moved", "uid": uid, "to": dest_folder}


def _tool_mark_email(account: str, uid: str, folder: str, flag: str) -> dict:
    acc = _get_account(account)
    if acc.protocol != "imap":
        raise ValueError("mark_email is only supported for IMAP accounts.")
    with IMAPClient(acc) as client:
        client.mark_email(uid=uid, folder=folder, flag=flag)
    return {"status": "marked", "uid": uid, "flag": flag}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    """Run the MCP server over stdio."""
    import asyncio

    asyncio.run(mcp.server.stdio.stdio_server(server))


if __name__ == "__main__":
    main()
