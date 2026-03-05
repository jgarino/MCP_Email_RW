# Email Providers Guide

Configuration guides for each supported email provider.

---

## Gmail

### IMAP/SMTP Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `imap.gmail.com` | 993 | TLS/SSL |
| SMTP | `smtp.gmail.com` | 465 | TLS/SSL |

### Prerequisites

1. Enable IMAP in Gmail: **Settings → See all settings → Forwarding and POP/IMAP → Enable IMAP**
2. Enable 2-Step Verification on your Google Account

### App Password Setup (Recommended)

1. Go to [Google Account → Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", select **App passwords**
3. Select **Mail** and your device type
4. Click **Generate**
5. Use the 16-character password in your account setup

### OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Gmail API** under APIs & Services
4. Create OAuth 2.0 credentials (Desktop application)
5. Configure the consent screen with scope: `https://mail.google.com/`
6. Use the Client ID and Client Secret in your configuration

### Special Folders

| Folder | Gmail Path |
|--------|-----------|
| Sent | `[Gmail]/Sent Mail` |
| Drafts | `[Gmail]/Drafts` |
| Trash | `[Gmail]/Trash` |
| Spam | `[Gmail]/Spam` |
| Archive | `[Gmail]/All Mail` |

---

## Outlook / Microsoft 365

### IMAP/SMTP Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `outlook.office365.com` | 993 | TLS/SSL |
| SMTP | `smtp.office365.com` | 587 | STARTTLS |

For personal Outlook.com accounts:

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `outlook.office365.com` | 993 | TLS/SSL |
| SMTP | `smtp-mail.outlook.com` | 587 | STARTTLS |

### OAuth2 Setup (Required for Microsoft 365)

Microsoft requires OAuth2 for most configurations:

1. Go to [Azure Portal → App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Name: "MCP Email RW"
4. Supported account types: choose as appropriate
5. Redirect URI: `http://localhost:3000/callback` (Web)
6. Go to **API Permissions** → **Add a permission** → **Microsoft Graph**:
   - `IMAP.AccessAsUser.All`
   - `SMTP.Send`
   - `offline_access`
7. Go to **Certificates & secrets** → **New client secret**
8. Note the Application (client) ID and secret value

### Special Folders

| Folder | Outlook Path |
|--------|-------------|
| Sent | `Sent Items` |
| Drafts | `Drafts` |
| Trash | `Deleted Items` |
| Spam | `Junk Email` |
| Archive | `Archive` |

---

## Yahoo Mail

### IMAP/SMTP Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `imap.mail.yahoo.com` | 993 | TLS/SSL |
| SMTP | `smtp.mail.yahoo.com` | 465 | TLS/SSL |

### App Password Setup

1. Go to [Yahoo Account Security](https://login.yahoo.com/account/security)
2. Enable **Two-step verification**
3. Click **Generate app password**
4. Select **Other App**, enter name "MCP Email"
5. Use the generated password in your setup

### Special Folders

| Folder | Yahoo Path |
|--------|-----------|
| Sent | `Sent` |
| Drafts | `Draft` |
| Trash | `Trash` |
| Spam | `Bulk Mail` |
| Archive | `Archive` |

---

## iCloud Mail

### IMAP/SMTP Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `imap.mail.me.com` | 993 | TLS/SSL |
| SMTP | `smtp.mail.me.com` | 587 | STARTTLS |

### App-Specific Password Setup

1. Go to [Apple ID Account](https://appleid.apple.com/account/manage)
2. Sign in with your Apple ID
3. Go to **Sign-In and Security** → **App-Specific Passwords**
4. Click **+** or **Generate an app-specific password**
5. Enter a label: "MCP Email"
6. Use the generated password

> **Note**: Use your `@icloud.com`, `@me.com`, or `@mac.com` email address as the username.

### Special Folders

| Folder | iCloud Path |
|--------|------------|
| Sent | `Sent Messages` |
| Drafts | `Drafts` |
| Trash | `Deleted Messages` |
| Spam | `Junk` |
| Archive | `Archive` |

---

## OVH Mail

### IMAP/SMTP Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `ssl0.ovh.net` | 993 | TLS/SSL |
| SMTP | `ssl0.ovh.net` | 465 | TLS/SSL |

### Authentication

OVH uses standard password authentication. Use your full email address as the username and your OVH email password.

### Setup

```
setup_account(
  email: "user@yourdomain.com",
  provider: "ovh",
  password: "your-password"
)
```

---

## Ionos (1&1)

### IMAP/SMTP Settings

| Protocol | Host | Port | Security |
|----------|------|------|----------|
| IMAP | `imap.ionos.com` | 993 | TLS/SSL |
| SMTP | `smtp.ionos.com` | 465 | TLS/SSL |

### Authentication

Ionos uses standard password authentication. Use your full email address as the username.

### Setup

```
setup_account(
  email: "user@yourdomain.com",
  provider: "ionos",
  password: "your-password"
)
```

---

## Custom / Private Servers

For self-hosted or non-standard email servers, you can configure settings manually.

### Auto-Detection

The `detect_auth` tool will attempt to discover IMAP/SMTP settings using:
- MX record lookup
- Well-known service discovery
- Common port scanning

```
detect_auth(email: "user@custom-domain.com")
```

### Manual Configuration

If auto-detection fails, create the account with explicit settings by editing `~/.mcp-email/accounts.json`:

```json
{
  "accounts": [
    {
      "id": "custom-server",
      "name": "Custom Mail",
      "email": "user@custom-domain.com",
      "provider": "custom",
      "enabled": true,
      "auth": {
        "type": "password",
        "password": "your-password"
      },
      "imap": {
        "host": "mail.custom-domain.com",
        "port": 993,
        "tls": true
      },
      "smtp": {
        "host": "mail.custom-domain.com",
        "port": 465,
        "tls": true
      }
    }
  ]
}
```

### Common Ports

| Port | Protocol | Security |
|------|----------|----------|
| 993 | IMAP | TLS/SSL (preferred) |
| 143 | IMAP | STARTTLS or plaintext |
| 465 | SMTP | TLS/SSL (preferred) |
| 587 | SMTP | STARTTLS |
| 25 | SMTP | Plaintext (not recommended) |

### Self-Signed Certificates

If your server uses a self-signed certificate, you may need to set the `NODE_TLS_REJECT_UNAUTHORIZED` environment variable (not recommended for production):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 mcp-email-rw
```
