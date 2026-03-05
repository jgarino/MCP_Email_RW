# Setup Guide

Complete guide for installing and configuring MCP Email RW.

## Prerequisites

- **Node.js** >= 20.0.0 ([download](https://nodejs.org))
- **npm** (included with Node.js)
- An email account with IMAP/SMTP access enabled

## Installation

### Option 1: npx (no installation)

```bash
npx mcp-email-rw
```

### Option 2: Global install

```bash
npm install -g mcp-email-rw
mcp-email-rw
```

### Option 3: From source

```bash
git clone https://github.com/jgarino/MCP_Email_RW.git
cd MCP_Email_RW
npm install
npm run build
npm start
```

## Configuration File

The server stores configuration in `~/.mcp-email/accounts.json`. This file is created automatically when you set up your first account.

### Manual configuration

You can also create the file manually:

```bash
mkdir -p ~/.mcp-email
```

Create `~/.mcp-email/accounts.json`:

```json
{
  "accounts": []
}
```

## First Account Setup

The easiest way to add an account is through the `setup_account` MCP tool from your AI assistant:

1. Start the MCP server (via VS Code, Claude Desktop, or directly)
2. Ask your AI assistant: *"Set up my email account user@gmail.com"*
3. The `setup_account` tool will:
   - Auto-detect your email provider
   - Configure IMAP and SMTP settings
   - Store credentials securely

### Manual setup with the tool

You can also provide parameters directly:

```
setup_account(
  email: "user@gmail.com",
  name: "My Gmail",
  password: "xxxx-xxxx-xxxx-xxxx"
)
```

## Testing the Connection

After setup, verify your account works:

1. Ask your assistant: *"Test my email connection"*
2. The `test_connection` tool will check IMAP and SMTP connectivity
3. On success, you'll see confirmation for each protocol

## Environment Variables

You can configure the server with environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |
| `MCP_CONFIG_DIR` | Custom config directory | `~/.mcp-email` |

## Troubleshooting

### "Authentication failed"

- **Gmail**: Enable 2FA and create an [App Password](https://myaccount.google.com/apppasswords)
- **Yahoo**: Create an [App Password](https://login.yahoo.com/account/security)
- **iCloud**: Create an [App-Specific Password](https://appleid.apple.com/account/manage)
- Verify IMAP is enabled in your email provider settings

### "Connection refused" or timeout

- Check your firewall allows outbound connections on ports 993 (IMAP) and 465/587 (SMTP)
- Some corporate networks block these ports
- Try using a VPN if your ISP restricts IMAP/SMTP

### "Certificate error"

- Ensure your system clock is accurate
- For self-signed certificates on private servers, you may need to configure TLS settings

### Server won't start

- Verify Node.js >= 20: `node --version`
- Rebuild: `npm run build`
- Check for port conflicts if running multiple MCP servers

### No emails returned

- Confirm the account is enabled: use `list_accounts` to check
- Verify the folder name — use `list_folders` to see available folders
- Some providers use localized folder names (e.g., "Envoyés" instead of "Sent")
