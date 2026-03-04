# MCP_Email_RW

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that enables AI agents to **read and write email** via IMAP, POP3, and SMTP protocols.

Configure multiple email accounts so your AI assistant can search, list, read, send, delete, and organise messages across several mailboxes.

---

## Features

| Tool | Description |
|---|---|
| `list_accounts` | List all configured email accounts |
| `list_folders` | List mailbox folders / labels (IMAP) |
| `list_emails` | List emails in a folder (IMAP & POP3) |
| `read_email` | Read the full content of a message |
| `search_emails` | Search messages using IMAP criteria |
| `send_email` | Send a message via SMTP |
| `delete_email` | Delete a message (IMAP & POP3) |
| `move_email` | Move a message to another folder (IMAP) |
| `mark_email` | Mark as read / unread / flagged (IMAP) |

---

## Installation

```bash
pip install mcp-email-rw
```

Or directly from the repository:

```bash
git clone https://github.com/jgarino/MCP_Email_RW.git
cd MCP_Email_RW
pip install -e .
```

---

## Configuration

Create a JSON configuration file (default path: `~/.mcp_email_config.json`) containing one or more account definitions.  Copy `config.example.json` as a starting point:

```json
{
  "accounts": [
    {
      "name": "gmail-work",
      "protocol": "imap",
      "host": "imap.gmail.com",
      "port": 993,
      "ssl": true,
      "username": "you@gmail.com",
      "password": "your-app-password",
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587,
      "smtp_ssl": false,
      "smtp_tls": true
    },
    {
      "name": "personal-pop3",
      "protocol": "pop3",
      "host": "pop.example.com",
      "port": 995,
      "ssl": true,
      "username": "you@example.com",
      "password": "your-password",
      "smtp_host": "smtp.example.com",
      "smtp_port": 465,
      "smtp_ssl": true,
      "smtp_tls": false
    }
  ]
}
```

### Account fields

| Field | Required | Default | Description |
|---|---|---|---|
| `name` | ✅ | — | Unique account identifier used in tool calls |
| `protocol` | | `"imap"` | `"imap"` or `"pop3"` |
| `host` | ✅ | — | IMAP / POP3 server hostname |
| `port` | | 993 (IMAP) / 995 (POP3) | Server port |
| `ssl` | | `true` | Use SSL/TLS for the incoming connection |
| `username` | ✅ | — | Login username |
| `password` | ✅ | — | Login password (use an app-specific password where supported) |
| `smtp_host` | | — | SMTP server hostname (required for `send_email`) |
| `smtp_port` | | `587` | SMTP server port |
| `smtp_ssl` | | `false` | Use SSL/TLS directly (port 465) |
| `smtp_tls` | | `true` | Upgrade to TLS via STARTTLS (port 587) |
| `smtp_username` | | same as `username` | SMTP username if different |
| `smtp_password` | | same as `password` | SMTP password if different |

### Overriding the config path

Set the `MCP_EMAIL_CONFIG` environment variable:

```bash
export MCP_EMAIL_CONFIG=/path/to/my_email_config.json
```

---

## Running the server

```bash
# Via the installed script
mcp-email-rw

# Or via Python module
python -m mcp_email_rw.server
```

The server communicates over **stdio** following the MCP specification.

---

## Integrating with an MCP client

Add the server to your MCP client configuration (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "email": {
      "command": "mcp-email-rw",
      "env": {
        "MCP_EMAIL_CONFIG": "/path/to/your/email_config.json"
      }
    }
  }
}
```

---

## Tool reference

### `list_accounts`
Returns metadata for every configured account (no arguments required).

### `list_folders`
```json
{ "account": "gmail-work" }
```
Returns a list of folder/label names. IMAP only.

### `list_emails`
```json
{
  "account": "gmail-work",
  "folder": "INBOX",
  "limit": 20,
  "unread_only": false
}
```

### `read_email`
```json
{ "account": "gmail-work", "uid": "1234", "folder": "INBOX" }
```
Returns subject, sender, recipients, date, plain-text body, HTML body, and attachment names. Also marks the message as read.

### `search_emails`
```json
{
  "account": "gmail-work",
  "criteria": "FROM \"alice@example.com\"",
  "folder": "INBOX",
  "limit": 10
}
```
Accepts standard IMAP search criteria: `UNSEEN`, `FROM "..."`, `SUBJECT "..."`, `SINCE "01-Jan-2024"`, `TEXT "..."`, etc.

### `send_email`
```json
{
  "account": "gmail-work",
  "to": ["bob@example.com"],
  "subject": "Hello",
  "body": "Hi Bob!",
  "cc": [],
  "bcc": [],
  "html_body": "<b>Hi Bob!</b>"
}
```

### `delete_email`
```json
{ "account": "gmail-work", "uid": "1234", "folder": "INBOX" }
```

### `move_email`
```json
{
  "account": "gmail-work",
  "uid": "1234",
  "source_folder": "INBOX",
  "dest_folder": "Archive"
}
```
IMAP only.

### `mark_email`
```json
{
  "account": "gmail-work",
  "uid": "1234",
  "folder": "INBOX",
  "flag": "read"
}
```
Supported flags: `read`, `unread`, `flagged`, `unflagged`. IMAP only.

---

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

---

## Security notes

* Store passwords as **app-specific passwords** wherever your provider supports them (Gmail, Outlook, etc.).
* Keep your `config.json` outside version control – it is already listed in `.gitignore`.
* The server runs locally over stdio; it does not expose any network port.

