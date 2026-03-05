# MCP Email RW

<!-- Badges -->
[![CI](https://github.com/jgarino/MCP_Email_RW/actions/workflows/ci.yml/badge.svg)](https://github.com/jgarino/MCP_Email_RW/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/mcp-email-rw.svg)](https://www.npmjs.com/package/mcp-email-rw)

A full-featured **Model Context Protocol (MCP)** server for complete email management. Read, write, search, organize, and analyze emails from any AI assistant that supports MCP — including GitHub Copilot in VS Code and Claude Desktop.

## Features

- **Multi-account support** — manage multiple email accounts simultaneously
- **Auto-detection** — automatically identifies providers and optimal settings
- **Full IMAP/SMTP** — read, send, reply, forward, draft, and manage emails
- **Advanced search** — multi-criteria search across folders
- **Bulk operations** — delete, move, archive, and mark emails in batch
- **Statistics & insights** — inbox summaries, storage info, sender analytics
- **Security-first** — OAuth2, app passwords, credential isolation
- **Provider presets** — Gmail, Outlook, Yahoo, iCloud, OVH, Ionos, and custom servers

## Quick Start

### Using npx (no install required)

```bash
npx mcp-email-rw
```

### Install globally

```bash
npm install -g mcp-email-rw
mcp-email-rw
```

### From source

```bash
git clone https://github.com/jgarino/MCP_Email_RW.git
cd MCP_Email_RW
npm install
npm run build
npm start
```

## Configuration

The server stores account configuration in `~/.mcp-email/accounts.json`. Accounts are created via the `setup_account` tool.

### Configuration file structure

```json
{
  "accounts": [
    {
      "id": "unique-id",
      "name": "My Gmail",
      "email": "user@gmail.com",
      "provider": "gmail",
      "enabled": true,
      "auth": {
        "type": "app-password",
        "password": "xxxx-xxxx-xxxx-xxxx"
      },
      "imap": {
        "host": "imap.gmail.com",
        "port": 993,
        "tls": true
      },
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 465,
        "tls": true
      }
    }
  ]
}
```

### Authentication methods

| Method | Description | Recommended for |
|--------|-------------|-----------------|
| `password` | Plain password (IMAP/SMTP login) | Private servers |
| `app-password` | App-specific password | Gmail, Yahoo, iCloud |
| `oauth2` | OAuth 2.0 with refresh tokens | Google, Microsoft |

See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for detailed setup instructions.

## Usage with VS Code (GitHub Copilot)

A `.vscode/mcp.json` file is included for direct integration:

```json
{
  "servers": {
    "mcp-email-rw": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

Once configured, use Copilot Chat in **Agent mode** and ask it to manage your emails.

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-email-rw": {
      "command": "npx",
      "args": ["mcp-email-rw"]
    }
  }
}
```

## Available MCP Tools

### Auth Tools (6)

| Tool | Description |
|------|-------------|
| `detect_auth` | Detect email provider and authentication settings |
| `setup_account` | Set up a new email account |
| `test_connection` | Test IMAP/SMTP connection for an account |
| `list_accounts` | List all configured email accounts |
| `remove_account` | Remove an email account |
| `update_account` | Update account settings |

### Read Tools (8)

| Tool | Description |
|------|-------------|
| `list_emails` | List emails from a folder with pagination |
| `read_email` | Read full email content by UID |
| `search_emails` | Multi-criteria email search |
| `count_emails` | Count emails in a folder (all/unseen/seen/flagged) |
| `count_new_emails` | Count emails received since a given date |
| `list_folders` | List all IMAP folders/mailboxes |
| `get_attachment` | Download an attachment by index |
| `get_email_headers` | Get raw email headers |

### Write Tools (6)

| Tool | Description |
|------|-------------|
| `send_email` | Send a new email |
| `reply_to_email` | Reply to an existing email |
| `forward_email` | Forward an email to another recipient |
| `save_draft` | Save a draft without sending |
| `send_draft` | Send an existing draft |
| `compose_email` | Preview/compose an email before sending |

### Manage Tools (8)

| Tool | Description |
|------|-------------|
| `delete_emails` | Delete emails by UIDs |
| `delete_emails_filtered` | Delete emails matching filter criteria (with dry-run) |
| `purge_old_emails` | Delete emails older than N days (with dry-run) |
| `move_emails` | Move emails between folders |
| `archive_emails` | Archive emails |
| `mark_emails` | Mark emails as read/unread or flagged/unflagged |
| `create_folder` | Create a new IMAP folder |
| `delete_folder` | Delete an IMAP folder |

### Stats Tools (6)

| Tool | Description |
|------|-------------|
| `inbox_summary` | Get inbox overview (total, unread, recent) |
| `email_stats` | Get email statistics by period with top senders |
| `storage_info` | Get storage quota information |
| `list_important_emails` | List flagged/important emails |
| `summarize_unread` | Summarize unread emails |
| `list_deletable_emails` | Suggest deletion candidates by criteria |

See [docs/TOOLS_REFERENCE.md](docs/TOOLS_REFERENCE.md) for complete parameter details and examples.

## Available MCP Resources

| URI | Description |
|-----|-------------|
| `email://accounts` | List of configured accounts (id, name, email, provider, status) |
| `email://capabilities` | Server capabilities (protocols, features, tool list) |

## Available MCP Prompts

| Prompt | Description |
|--------|-------------|
| `summarize-inbox` | Summarize unread emails in the inbox |
| `draft-reply` | Draft a reply to a specific email with configurable tone |
| `cleanup-suggestions` | Suggest email cleanup actions |
| `important-emails` | Identify and list flagged/important emails |
| `daily-briefing` | Generate a daily email briefing |
| `compose-email` | Help compose a new email on a given topic |

## Security Principles

- **No credentials in code** — all secrets stored in user config or environment variables
- **OAuth2 preferred** — supports token refresh for Google and Microsoft
- **App passwords** — recommended over plain passwords for major providers
- **Local-only storage** — configuration stays on your machine (`~/.mcp-email`)
- **Dry-run by default** — destructive bulk operations default to preview mode
- **TLS required** — all connections use TLS/SSL by default

## Provider Support

| Provider | IMAP | SMTP | App Passwords | OAuth2 |
|----------|------|------|---------------|--------|
| Gmail | ✅ | ✅ | ✅ | ✅ |
| Outlook / Microsoft 365 | ✅ | ✅ | ❌ | ✅ |
| Yahoo | ✅ | ✅ | ✅ | ❌ |
| iCloud | ✅ | ✅ | ✅ | ❌ |
| OVH | ✅ | ✅ | ❌ | ❌ |
| Ionos | ✅ | ✅ | ❌ | ❌ |
| Custom IMAP/SMTP | ✅ | ✅ | — | — |

See [docs/PROVIDERS.md](docs/PROVIDERS.md) for provider-specific setup guides.

## Documentation

- [Setup Guide](docs/SETUP.md) — installation and first-run instructions
- [Authentication Guide](docs/AUTHENTICATION.md) — credential and OAuth2 setup
- [Tools Reference](docs/TOOLS_REFERENCE.md) — complete tool parameter reference
- [Providers Guide](docs/PROVIDERS.md) — provider-specific configuration
- [Contributing](docs/CONTRIBUTING.md) — how to contribute
- [Changelog](CHANGELOG.md) — release history

## Contributing

Contributions are welcome! Please see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/jgarino/MCP_Email_RW.git
cd MCP_Email_RW
npm install
npm run build
npm test
```

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
