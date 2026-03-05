# MCP_Email_RW — Complete Project Instructions

> **MCP_Email_RW** is an MCP (Model Context Protocol) server that enables an AI to fully manage one or more email accounts via POP3, IMAP, and SMTP protocols, with support for all common authentication methods.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Overall Architecture](#2-overall-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Supported Email Protocols](#5-supported-email-protocols)
6. [Authentication — Supported Methods](#6-authentication--supported-methods)
7. [JSON Account Configuration](#7-json-account-configuration)
8. [Authentication Assistant](#8-authentication-assistant)
9. [Exposed MCP Tools](#9-exposed-mcp-tools)
   - 9.1 [Authentication & Configuration](#91-authentication--configuration)
   - 9.2 [Reading & Search](#92-reading--search)
   - 9.3 [Writing & Sending](#93-writing--sending)
   - 9.4 [Management & Organization](#94-management--organization)
   - 9.5 [Statistics & Summaries](#95-statistics--summaries)
   - 9.6 [Protocol-Level Commands (Low-Level MCP Tools)](#96-protocol-level-commands-low-level-mcp-tools)
10. [Exposed MCP Resources](#10-exposed-mcp-resources)
11. [Predefined MCP Prompts](#11-predefined-mcp-prompts)
12. [Security](#12-security)
13. [Phased Implementation Plan](#13-phased-implementation-plan)
14. [Tests](#14-tests)
15. [GitHub Distribution](#15-github-distribution)
16. [VS Code / MCP Extension Distribution](#16-vs-code--mcp-extension-distribution)
17. [CI/CD](#17-cicd)
18. [Future Roadmap](#18-future-roadmap)

---

## 1. Project Vision

The goal is to provide an **MCP server** that any compatible AI (GitHub Copilot, Claude Desktop, etc.) can use to:

- Connect to any email account (Gmail, Outlook, Yahoo, private servers, self-hosted…)
- Read, search, sort, summarize, delete, archive emails
- Compose and send emails (with AI review before sending)
- Manage attachments
- Provide statistics and reports on the mailbox
- Guide the user through configuration and authentication

All through **natural dialogue with the AI**, without the user needing to know the underlying protocols.

---

## 2. Overall Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client IA                        │
│         (VS Code / Claude Desktop / etc.)           │
└──────────────────┬──────────────────────────────────┘
                   │  MCP Protocol (stdio / SSE)
                   ▼
┌─────────────────────────────────────────────────────┐
│              MCP_Email_RW Server                    │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Tools Layer │  │ Resources    │  │ Prompts   │  │
│  │ (actions)   │  │ (data)       │  │ (models)  │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼─────┐  │
│  │           Email Service Layer                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │  IMAP    │ │  POP3    │ │    SMTP      │  │  │
│  │  │  Client  │ │  Client  │ │    Client    │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │         Auth Manager                         │  │
│  │  ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐ │  │
│  │  │ Basic  │ │ OAuth2 │ │ XOAUTH│ │App Pass│ │  │
│  │  └────────┘ └────────┘ └───────┘ └────────┘ │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐  │
│  │       Config Manager (JSON)                  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Component | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js ≥ 20 | Official MCP ecosystem, broad support |
| **Language** | TypeScript / JavaScript (TypeScript 5.x) | Strong typing, maintainability, standard for native MCP projects |
| **SDK MCP** | `@modelcontextprotocol/sdk` | Official MCP SDK |
| **Transport** | stdio (default) + SSE (optional) | stdio for VS Code, SSE for remote deployment |
| **IMAP** | `imapflow` | Modern IMAP client, supports IDLE, OAuth2 |
| **POP3** | `node-pop3` or custom implementation | Full POP3 support |
| **SMTP** | `nodemailer` | De facto standard, native OAuth2 |
| **OAuth2** | `googleapis` / custom | Google, Microsoft, Yahoo |
| **Email Parsing** | `mailparser` | Full MIME parsing |
| **Keychain** | `keytar` | Secure credential storage |
| **Config** | Native JSON + `ajv` (validation) | Strict JSON schema |
| **Tests** | `vitest` | Fast, TypeScript compatible |
| **Build** | `tsup` or `esbuild` | Fast bundling |
| **Linter** | `eslint` + `prettier` | Code quality |

---

## 4. Project Structure

```
MCP_Email_RW/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI : lint, tests, build
│   │   └── release.yml               # Publication npm + GitHub Releases
│   └── ISSUE_TEMPLATE/
├── src/
│   ├── index.ts                      # MCP server entry point
│   ├── server.ts                     # Server configuration and startup
│   │
│   ├── tools/                        # MCP tools (actions)
│   │   ├── index.ts                  # Registry of all tools
│   │   ├── auth/
│   │   │   ├── detect-auth.tool.ts   # Auth type detection
│   │   │   ├── setup-account.tool.ts # Account setup
│   │   │   ├── test-connection.tool.ts
│   │   │   └── oauth-flow.tool.ts    # Interactive OAuth2 flow
│   │   ├── read/
│   │   │   ├── list-emails.tool.ts   # List emails (filters, sorting)
│   │   │   ├── read-email.tool.ts    # Read a complete email
│   │   │   ├── search-emails.tool.ts # Advanced search
│   │   │   ├── count-emails.tool.ts  # Count with filters
│   │   │   ├── list-folders.tool.ts  # List folders/labels
│   │   │   └── get-attachments.tool.ts
│   │   ├── write/
│   │   │   ├── send-email.tool.ts    # Compose and send
│   │   │   ├── reply-email.tool.ts   # Reply to an email
│   │   │   ├── forward-email.tool.ts # Forward
│   │   │   ├── draft-email.tool.ts   # Save a draft
│   │   │   └── send-draft.tool.ts    # Send a draft
│   │   ├── manage/
│   │   │   ├── delete-emails.tool.ts # Delete (single/bulk)
│   │   │   ├── move-emails.tool.ts   # Move between folders
│   │   │   ├── mark-emails.tool.ts   # Mark read/unread/important
│   │   │   ├── archive-emails.tool.ts
│   │   │   └── purge-old.tool.ts     # Purge by age
│   │   ├── stats/
│   │   │   ├── inbox-summary.tool.ts # Mailbox summary
│   │   │   ├── new-since.tool.ts     # New since date/last visit
│   │   │   └── storage-info.tool.ts  # Storage/quota info
│   │   └── protocol/                 # Low-level protocol command tools
│   │       ├── index.ts              # Registry of all protocol tools
│   │       ├── imap/
│   │       │   ├── read/
│   │       │   │   ├── IMAP_Read_Capability.tool.ts
│   │       │   │   ├── IMAP_Read_Noop.tool.ts
│   │       │   │   ├── IMAP_Read_Login.tool.ts
│   │       │   │   ├── IMAP_Read_Authenticate.tool.ts
│   │       │   │   ├── IMAP_Read_Starttls.tool.ts
│   │       │   │   ├── IMAP_Read_List.tool.ts
│   │       │   │   ├── IMAP_Read_Lsub.tool.ts
│   │       │   │   ├── IMAP_Read_Select.tool.ts
│   │       │   │   ├── IMAP_Read_Examine.tool.ts
│   │       │   │   ├── IMAP_Read_Status.tool.ts
│   │       │   │   ├── IMAP_Read_Search.tool.ts
│   │       │   │   ├── IMAP_Read_Sort.tool.ts
│   │       │   │   ├── IMAP_Read_Thread.tool.ts
│   │       │   │   ├── IMAP_Read_Fetch.tool.ts
│   │       │   │   ├── IMAP_Read_UidFetch.tool.ts
│   │       │   │   ├── IMAP_Read_UidSearch.tool.ts
│   │       │   │   ├── IMAP_Read_Namespace.tool.ts
│   │       │   │   ├── IMAP_Read_GetQuota.tool.ts
│   │       │   │   ├── IMAP_Read_GetQuotaRoot.tool.ts
│   │       │   │   ├── IMAP_Read_Idle.tool.ts
│   │       │   │   └── IMAP_Read_Id.tool.ts
│   │       │   └── write/
│   │       │       ├── IMAP_Write_Logout.tool.ts
│   │       │       ├── IMAP_Write_Close.tool.ts
│   │       │       ├── IMAP_Write_Expunge.tool.ts
│   │       │       ├── IMAP_Write_Store.tool.ts
│   │       │       ├── IMAP_Write_UidStore.tool.ts
│   │       │       ├── IMAP_Write_Copy.tool.ts
│   │       │       ├── IMAP_Write_UidCopy.tool.ts
│   │       │       ├── IMAP_Write_Move.tool.ts
│   │       │       ├── IMAP_Write_UidMove.tool.ts
│   │       │       ├── IMAP_Write_Append.tool.ts
│   │       │       ├── IMAP_Write_Create.tool.ts
│   │       │       ├── IMAP_Write_Delete.tool.ts
│   │       │       ├── IMAP_Write_Rename.tool.ts
│   │       │       ├── IMAP_Write_Subscribe.tool.ts
│   │       │       ├── IMAP_Write_Unsubscribe.tool.ts
│   │       │       └── IMAP_Write_SetQuota.tool.ts
│   │       ├── pop3/
│   │       │   ├── read/
│   │       │   │   ├── POP3_Read_User.tool.ts
│   │       │   │   ├── POP3_Read_Pass.tool.ts
│   │       │   │   ├── POP3_Read_Apop.tool.ts
│   │       │   │   ├── POP3_Read_Auth.tool.ts
│   │       │   │   ├── POP3_Read_Stat.tool.ts
│   │       │   │   ├── POP3_Read_List.tool.ts
│   │       │   │   ├── POP3_Read_Retr.tool.ts
│   │       │   │   ├── POP3_Read_Top.tool.ts
│   │       │   │   ├── POP3_Read_Uidl.tool.ts
│   │       │   │   ├── POP3_Read_Capa.tool.ts
│   │       │   │   ├── POP3_Read_Noop.tool.ts
│   │       │   │   └── POP3_Read_Stls.tool.ts
│   │       │   └── write/
│   │       │       ├── POP3_Write_Dele.tool.ts
│   │       │       ├── POP3_Write_Rset.tool.ts
│   │       │       └── POP3_Write_Quit.tool.ts
│   │       └── smtp/
│   │           ├── read/
│   │           │   ├── SMTP_Read_Ehlo.tool.ts
│   │           │   ├── SMTP_Read_Helo.tool.ts
│   │           │   ├── SMTP_Read_Noop.tool.ts
│   │           │   ├── SMTP_Read_Help.tool.ts
│   │           │   ├── SMTP_Read_Vrfy.tool.ts
│   │           │   └── SMTP_Read_Expn.tool.ts
│   │           └── write/
│   │               ├── SMTP_Write_Auth.tool.ts
│   │               ├── SMTP_Write_Starttls.tool.ts
│   │               ├── SMTP_Write_MailFrom.tool.ts
│   │               ├── SMTP_Write_RcptTo.tool.ts
│   │               ├── SMTP_Write_Data.tool.ts
│   │               ├── SMTP_Write_Bdat.tool.ts
│   │               ├── SMTP_Write_Rset.tool.ts
│   │               └── SMTP_Write_Quit.tool.ts
│   │
│   ├── resources/                    # MCP resources (data)
│   │   ├── index.ts
│   │   ├── account-list.resource.ts  # List of configured accounts
│   │   └── server-capabilities.resource.ts
│   │
│   ├── prompts/                      # Predefined MCP prompts
│   │   ├── index.ts
│   │   ├── summarize-inbox.prompt.ts
│   │   ├── draft-reply.prompt.ts
│   │   ├── cleanup-suggestions.prompt.ts
│   │   └── important-emails.prompt.ts
│   │
│   ├── services/                     # Business layer
│   │   ├── imap.service.ts           # IMAP client (connection, commands)
│   │   ├── pop3.service.ts           # POP3 client
│   │   ├── smtp.service.ts           # SMTP client (sending)
│   │   ├── email-parser.service.ts   # Email parsing and normalization
│   │   └── email-manager.service.ts  # Unified facade over all 3 protocols
│   │
│   ├── auth/                         # Authentication management
│   │   ├── auth-manager.ts           # Auth orchestrator
│   │   ├── auth-detector.ts          # Automatic auth type detection
│   │   ├── strategies/
│   │   │   ├── basic.strategy.ts     # LOGIN / PLAIN
│   │   │   ├── oauth2.strategy.ts    # OAuth2 (Google, Microsoft, etc.)
│   │   │   ├── xoauth2.strategy.ts   # XOAUTH2 for IMAP/SMTP
│   │   │   ├── app-password.strategy.ts # Application-specific passwords
│   │   │   └── ntlm.strategy.ts      # NTLM (Exchange on-premise)
│   │   ├── token-store.ts            # Secure token storage
│   │   ├── oauth-providers/
│   │   │   ├── google.provider.ts
│   │   │   ├── microsoft.provider.ts
│   │   │   └── yahoo.provider.ts
│   │   └── types.ts
│   │
│   ├── config/                       # Configuration management
│   │   ├── config-manager.ts         # Config read/write/validation
│   │   ├── config-schema.ts          # JSON Schema (AJV)
│   │   ├── defaults.ts               # Default configurations per provider
│   │   └── types.ts                  # TypeScript config types
│   │
│   ├── utils/
│   │   ├── logger.ts                 # Structured logging
│   │   ├── errors.ts                 # Custom error classes
│   │   ├── validators.ts             # Input validation
│   │   └── date-utils.ts             # Date utilities
│   │
│   └── types/                        # Global types
│       ├── email.types.ts
│       ├── mcp.types.ts
│       └── protocol.types.ts
│
├── config/                           # Example configuration files
│   ├── accounts.example.json         # Account config template
│   ├── schema/
│   │   └── accounts.schema.json      # JSON Schema for validation
│   └── providers/                    # Pre-filled configs per provider
│       ├── gmail.json
│       ├── outlook.json
│       ├── yahoo.json
│       ├── icloud.json
│       ├── ovh.json
│       ├── ionos.json
│       └── custom.json
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── auth/
│   │   ├── config/
│   │   └── tools/
│   ├── integration/
│   │   ├── imap.integration.test.ts
│   │   ├── smtp.integration.test.ts
│   │   └── pop3.integration.test.ts
│   └── mocks/
│       ├── email-fixtures.ts
│       └── imap-mock.ts
│
├── docs/
│   ├── SETUP.md                      # Installation guide
│   ├── AUTHENTICATION.md             # Complete authentication guide
│   ├── TOOLS_REFERENCE.md            # Reference for all MCP tools
│   ├── PROVIDERS.md                  # Guide per email provider
│   └── CONTRIBUTING.md               # Contribution guide
│
├── .vscode/
│   └── mcp.json                      # MCP configuration for VS Code
│
├── package.json
├── tsconfig.json
├── tsup.config.ts                    # Bundler configuration
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── .env.example                      # Environment variables (OAuth client IDs)
├── LICENSE                           # GPL-3.0
├── README.md
├── INSTRUCTIONS.md                   # This file
└── CHANGELOG.md
```

---

## 5. Supported Email Protocols

### 5.1 IMAP (Internet Message Access Protocol)

**Role**: Read/write access to emails on the server side (synchronization).

#### 5.1.1 IMAP Read Commands

| Command | MCP Tool Name | Description |
|---|---|---|
| `CAPABILITY` | `IMAP_Read_Capability` | List server capabilities and supported extensions |
| `NOOP` | `IMAP_Read_Noop` | Keep connection alive / poll for new updates |
| `LOGIN` | `IMAP_Read_Login` | Authenticate with username and password |
| `AUTHENTICATE` | `IMAP_Read_Authenticate` | Authenticate with a SASL mechanism (PLAIN, XOAUTH2…) |
| `STARTTLS` | `IMAP_Read_Starttls` | Negotiate TLS encryption on a plain connection |
| `LIST` | `IMAP_Read_List` | List available mailboxes/folders |
| `LSUB` | `IMAP_Read_Lsub` | List subscribed mailboxes |
| `SELECT` | `IMAP_Read_Select` | Open a mailbox in read-write mode |
| `EXAMINE` | `IMAP_Read_Examine` | Open a mailbox in read-only mode |
| `STATUS` | `IMAP_Read_Status` | Get mailbox statistics (MESSAGES, UNSEEN, RECENT, UIDNEXT…) |
| `SEARCH` | `IMAP_Read_Search` | Search messages by criteria (FROM, SUBJECT, DATE, BODY, FLAGS…) |
| `SORT` | `IMAP_Read_Sort` | Sort search results by a given criterion (extension RFC 5256) |
| `THREAD` | `IMAP_Read_Thread` | Thread messages by subject or references (extension RFC 5256) |
| `FETCH` | `IMAP_Read_Fetch` | Retrieve message data (headers, body, flags, envelope…) |
| `UID FETCH` | `IMAP_Read_UidFetch` | Retrieve message data using persistent UIDs |
| `UID SEARCH` | `IMAP_Read_UidSearch` | Search messages and return UIDs |
| `NAMESPACE` | `IMAP_Read_Namespace` | Discover folder hierarchy separator and namespaces |
| `GETQUOTA` | `IMAP_Read_GetQuota` | Get quota usage for a named resource |
| `GETQUOTAROOT` | `IMAP_Read_GetQuotaRoot` | Get quota roots for a mailbox |
| `IDLE` | `IMAP_Read_Idle` | Subscribe to real-time server notifications (new mail, flag changes) |
| `ID` | `IMAP_Read_Id` | Exchange client/server identity information (extension RFC 2971) |

#### 5.1.2 IMAP Write Commands

| Command | MCP Tool Name | Description |
|---|---|---|
| `LOGOUT` | `IMAP_Write_Logout` | Gracefully disconnect from the server |
| `CLOSE` | `IMAP_Write_Close` | Close selected mailbox with implicit expunge of \Deleted messages |
| `EXPUNGE` | `IMAP_Write_Expunge` | Permanently remove all messages flagged \Deleted |
| `STORE` | `IMAP_Write_Store` | Set, add, or remove flags on one or more messages |
| `UID STORE` | `IMAP_Write_UidStore` | Set, add, or remove flags using persistent UIDs |
| `COPY` | `IMAP_Write_Copy` | Copy messages to another mailbox |
| `UID COPY` | `IMAP_Write_UidCopy` | Copy messages to another mailbox using UIDs |
| `MOVE` | `IMAP_Write_Move` | Atomically move messages to another mailbox (extension RFC 6851) |
| `UID MOVE` | `IMAP_Write_UidMove` | Atomically move messages using UIDs (extension RFC 6851) |
| `APPEND` | `IMAP_Write_Append` | Append a message to a mailbox (drafts, sent items…) |
| `CREATE` | `IMAP_Write_Create` | Create a new mailbox |
| `DELETE` | `IMAP_Write_Delete` | Delete a mailbox and all its contents |
| `RENAME` | `IMAP_Write_Rename` | Rename a mailbox |
| `SUBSCRIBE` | `IMAP_Write_Subscribe` | Subscribe to a mailbox |
| `UNSUBSCRIBE` | `IMAP_Write_Unsubscribe` | Unsubscribe from a mailbox |
| `SETQUOTA` | `IMAP_Write_SetQuota` | Set quota limit for a named resource |

**Supported IMAP extensions**: CONDSTORE, QRESYNC, SPECIAL-USE, MOVE, SORT, THREAD, ID, COMPRESS.

**Ports**: 993 (SSL/TLS), 143 (STARTTLS)

### 5.2 POP3 (Post Office Protocol v3)

**Role**: Simple email download (no server-side synchronization).

#### 5.2.1 POP3 Read Commands

| Command | MCP Tool Name | Description |
|---|---|---|
| `USER` | `POP3_Read_User` | Send username for authentication |
| `PASS` | `POP3_Read_Pass` | Send password for authentication |
| `APOP` | `POP3_Read_Apop` | Hash-based (MD5 challenge-response) authentication |
| `AUTH` | `POP3_Read_Auth` | SASL-based authentication (PLAIN, LOGIN, CRAM-MD5, XOAUTH2) |
| `STAT` | `POP3_Read_Stat` | Get total number of messages and total mailbox size |
| `LIST` | `POP3_Read_List` | List messages with their individual sizes |
| `RETR` | `POP3_Read_Retr` | Retrieve a complete message by number |
| `TOP` | `POP3_Read_Top` | Retrieve message headers and first N body lines |
| `UIDL` | `POP3_Read_Uidl` | Get unique persistent identifiers for messages |
| `CAPA` | `POP3_Read_Capa` | List server capabilities |
| `NOOP` | `POP3_Read_Noop` | Keep connection alive (no-operation) |
| `STLS` | `POP3_Read_Stls` | Negotiate TLS encryption on a plain connection |

#### 5.2.2 POP3 Write Commands

| Command | MCP Tool Name | Description |
|---|---|---|
| `DELE` | `POP3_Write_Dele` | Mark a message for deletion (applied at QUIT) |
| `RSET` | `POP3_Write_Rset` | Cancel all pending deletions in the current session |
| `QUIT` | `POP3_Write_Quit` | Disconnect and apply all pending deletions |

**Ports**: 995 (SSL/TLS), 110 (STARTTLS)

### 5.3 SMTP (Simple Mail Transfer Protocol)

**Role**: Sending emails.

#### 5.3.1 SMTP Read Commands

| Command | MCP Tool Name | Description |
|---|---|---|
| `EHLO` | `SMTP_Read_Ehlo` | Extended greeting — identify client and discover server capabilities |
| `HELO` | `SMTP_Read_Helo` | Basic greeting (legacy, no capability discovery) |
| `NOOP` | `SMTP_Read_Noop` | Keep connection alive (no-operation) |
| `HELP` | `SMTP_Read_Help` | Request help information about available commands |
| `VRFY` | `SMTP_Read_Vrfy` | Verify that an email address is valid (often disabled by servers) |
| `EXPN` | `SMTP_Read_Expn` | Expand a mailing list alias into its members (often disabled) |

#### 5.3.2 SMTP Write Commands

| Command | MCP Tool Name | Description |
|---|---|---|
| `AUTH` | `SMTP_Write_Auth` | Authenticate to the server (PLAIN, LOGIN, CRAM-MD5, XOAUTH2) |
| `STARTTLS` | `SMTP_Write_Starttls` | Upgrade a plain connection to TLS encryption |
| `MAIL FROM` | `SMTP_Write_MailFrom` | Set the sender address and begin a new mail transaction |
| `RCPT TO` | `SMTP_Write_RcptTo` | Add a recipient to the current mail transaction |
| `DATA` | `SMTP_Write_Data` | Transmit the message body (headers + MIME body) |
| `BDAT` | `SMTP_Write_Bdat` | Transmit a binary data chunk (CHUNKING extension RFC 3030) |
| `RSET` | `SMTP_Write_Rset` | Abort the current mail transaction without closing the connection |
| `QUIT` | `SMTP_Write_Quit` | Close the SMTP connection gracefully |

**Ports**: 465 (SSL/TLS, submission), 587 (STARTTLS, submission), 25 (relay, rarely used)

---

## 6. Authentication — Supported Methods

### 6.1 Methods Matrix

| Method | Description | Typical Providers | Protocols |
|---|---|---|---|
| **PLAIN / LOGIN** | Username + password in clear text (over TLS) | Private servers, OVH, Ionos | IMAP, POP3, SMTP |
| **CRAM-MD5** | Challenge-response, avoids clear text password | Legacy servers | IMAP, POP3, SMTP |
| **OAuth2 / XOAUTH2** | Access token obtained via OAuth2 flow | Gmail, Outlook, Yahoo | IMAP, POP3, SMTP |
| **OAuth2 + PKCE** | OAuth2 for public applications (no secret) | Gmail, Microsoft | IMAP, SMTP |
| **App Password** | Application-specific password (2FA enabled) | Gmail, Yahoo, iCloud, Outlook | IMAP, POP3, SMTP |
| **NTLM** | Windows integrated authentication | Exchange On-Premise | IMAP, SMTP |
| **GSSAPI / Kerberos** | Enterprise SSO | Exchange, Zimbra | IMAP, SMTP |
| **Client Certificate** | Client TLS certificate | High-security servers | IMAP, SMTP |

### 6.2 Detailed OAuth2 Flow

```
┌──────────┐     1. Auth URL request         ┌─────────────┐
│  MCP     │ ──────────────────────────────► │  AI/Client  │
│  Server  │                                 │             │
│          │ ◄────────────────────────────── │  User       │
│          │     2. User visits URL           │  opens URL  │
│          │        & authorizes              └──────┬──────┘
│          │                                         │
│          │     3. Callback with code               │
│          │ ◄───────────────────────────────────────┘
│          │
│          │     4. Exchange code → tokens
│          │ ────────────────────────────────► OAuth Provider
│          │ ◄──────────────────────────────── (Google/MS)
│          │     5. access_token + refresh_token
│          │
│          │     6. IMAP/SMTP connection with XOAUTH2
│          │ ────────────────────────────────► Email Server
└──────────┘
```

### 6.3 OAuth2 Configurations per Provider

**Google Gmail**:
- Scopes: `https://mail.google.com/`
- Auth URL: `https://accounts.google.com/o/oauth2/v2/auth`
- Token URL: `https://oauth2.googleapis.com/token`
- Requires: Google Cloud Console project + OAuth consent screen

**Microsoft Outlook/365**:
- Scopes: `https://outlook.office365.com/IMAP.AccessAsUser.All`, `SMTP.Send`
- Auth URL: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Token URL: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- Requires: Azure AD App Registration

**Yahoo**:
- Uses proprietary OAuth2 or App Password
- Auth URL: `https://api.login.yahoo.com/oauth2/request_auth`

---

## 7. JSON Account Configuration

### 7.1 `accounts.json` File Schema

```jsonc
{
  "$schema": "./schema/accounts.schema.json",
  "version": "1.0.0",
  "accounts": [
    {
      "id": "my-gmail",
      "name": "Personal Gmail",
      "email": "user@gmail.com",
      "enabled": true,
      "provider": "gmail",
      
      "auth": {
        "method": "oauth2",
        "oauth2": {
          "clientId": "xxxx.apps.googleusercontent.com",
          "clientSecret": "GOCSPX-xxxx",
          "redirectUri": "http://localhost:3000/oauth/callback",
          "scopes": ["https://mail.google.com/"],
          "accessToken": null,
          "refreshToken": null,
          "tokenExpiry": null
        }
      },

      "imap": {
        "host": "imap.gmail.com",
        "port": 993,
        "secure": true,
        "starttls": false
      },
      
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 465,
        "secure": true,
        "starttls": false
      },

      "pop3": {
        "host": "pop.gmail.com",
        "port": 995,
        "secure": true,
        "enabled": false
      },

      "preferences": {
        "defaultProtocol": "imap",
        "maxEmailsPerFetch": 50,
        "syncFolders": ["INBOX", "[Gmail]/Sent Mail", "[Gmail]/Drafts"],
        "autoExpunge": false
      }
    },
    {
      "id": "my-outlook",
      "name": "Pro Outlook",
      "email": "user@outlook.com",
      "enabled": true,
      "provider": "outlook",
      
      "auth": {
        "method": "oauth2",
        "oauth2": {
          "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "clientSecret": "xxxxx",
          "redirectUri": "http://localhost:3000/oauth/callback",
          "scopes": [
            "https://outlook.office365.com/IMAP.AccessAsUser.All",
            "https://outlook.office365.com/SMTP.Send",
            "offline_access"
          ],
          "tenantId": "common"
        }
      },

      "imap": {
        "host": "outlook.office365.com",
        "port": 993,
        "secure": true
      },
      
      "smtp": {
        "host": "smtp.office365.com",
        "port": 587,
        "secure": false,
        "starttls": true
      }
    },
    {
      "id": "my-ovh",
      "name": "OVH Email",
      "email": "contact@mydomain.com",
      "enabled": true,
      "provider": "custom",
      
      "auth": {
        "method": "password",
        "credentials": {
          "username": "contact@mydomain.com",
          "passwordRef": "keychain:my-ovh-password"
        }
      },

      "imap": {
        "host": "ssl0.ovh.net",
        "port": 993,
        "secure": true
      },
      
      "smtp": {
        "host": "ssl0.ovh.net",
        "port": 465,
        "secure": true
      }
    }
  ],

  "global": {
    "configDir": "~/.mcp-email-rw",
    "logLevel": "info",
    "timeout": 30000,
    "maxConnections": 5,
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

### 7.2 Configuration Location

| OS | Default Path |
|---|---|
| Windows | `%APPDATA%\mcp-email-rw\accounts.json` |
| macOS | `~/Library/Application Support/mcp-email-rw/accounts.json` |
| Linux | `~/.config/mcp-email-rw/accounts.json` |

Sensitive tokens and passwords are stored in the **system keychain** via `keytar`, never in plain text in the JSON.

---

## 8. Authentication Assistant

The authentication assistant is an **interactive MCP tool** that guides the user step by step.

### 8.1 Automatic Detection Flow

```
1. The user provides their email address
                    │
2. Domain extraction ──► MX records lookup (DNS)
                    │
3. Provider identification
   ├── gmail.com / googlemail.com → Google
   ├── outlook.com / hotmail.com / live.com → Microsoft
   ├── yahoo.com / ymail.com → Yahoo
   ├── icloud.com / me.com / mac.com → Apple iCloud
   └── other → Automatic server detection
                    │
4. Test known ports (993, 995, 465, 587, 143, 110, 25)
                    │
5. Test connection + CAPABILITY / CAPA / EHLO
   → List of supported AUTH mechanisms
                    │
6. Best mechanism recommendation
   ├── OAuth2 available? → Recommend OAuth2
   ├── App Password possible? → Recommend App Password
   └── Otherwise → Propose LOGIN/PLAIN over TLS
                    │
7. Interactive guidance for configuring chosen auth
   ├── OAuth2: Open URL, authorize, retrieve code
   ├── App Password: Instructions for generating one
   └── Password: Secure input + keychain storage
                    │
8. Final connection test → Validation ✓
```

### 8.2 Server Detection for Unknown Domains

For non-standard domains, the system performs:

1. **DNS MX lookup**: Resolves MX servers to infer the provider
2. **DNS SRV lookup**: Looks for `_imap._tcp.domain`, `_submission._tcp.domain`
3. **Mozilla Autoconfig**: Tries `https://autoconfig.domain/mail/config-v1.1.xml`
4. **Microsoft Autodiscover**: Tries `https://autodiscover.domain/autodiscover/autodiscover.xml`
5. **Smart brute-force**: Tests common patterns (`imap.domain`, `mail.domain`, `pop.domain`, `smtp.domain`)

---

## 9. Exposed MCP Tools

Each tool is a function callable by the AI with typed parameters.

### 9.1 Authentication & Configuration

| Tool | Description | Main Parameters |
|---|---|---|
| `detect_auth` | Detects the required auth type for an email address | `email: string` |
| `setup_account` | Configures a new account (guided) | `email: string, name?: string` |
| `test_connection` | Tests the connection to an account | `accountId: string, protocol?: enum` |
| `start_oauth_flow` | Starts an OAuth2 flow | `accountId: string, provider: enum` |
| `complete_oauth_flow` | Completes OAuth2 with the received code | `accountId: string, code: string` |
| `list_accounts` | Lists configured accounts | _(none)_ |
| `remove_account` | Removes an account | `accountId: string` |
| `update_account` | Updates an account's config | `accountId: string, updates: object` |

### 9.2 Reading & Search

| Tool | Description | Main Parameters |
|---|---|---|
| `list_emails` | Lists emails with filters | `accountId, folder?, limit?, offset?, filter?` |
| `read_email` | Reads the full content of an email | `accountId, emailId, markAsRead?` |
| `search_emails` | Advanced search | `accountId, query, folder?, from?, to?, subject?, dateRange?, hasAttachment?` |
| `count_emails` | Counts emails | `accountId, folder?, filter?` |
| `count_new_emails` | Emails received since a date/last visit | `accountId, since?` |
| `list_folders` | Lists folders/labels | `accountId` |
| `get_attachment` | Downloads an attachment | `accountId, emailId, attachmentId, savePath?` |
| `get_email_headers` | Retrieves headers only | `accountId, emailId` |

### 9.3 Writing & Sending

| Tool | Description | Main Parameters |
|---|---|---|
| `compose_email` | Prepares a draft (without sending) | `accountId, to, subject, body, cc?, bcc?, attachments?, html?` |
| `send_email` | Sends an email | `accountId, to, subject, body, cc?, bcc?, attachments?, html?, replyTo?` |
| `reply_to_email` | Replies to an email | `accountId, emailId, body, replyAll?, attachments?` |
| `forward_email` | Forwards an email | `accountId, emailId, to, body?` |
| `save_draft` | Saves a draft | `accountId, to, subject, body, ...` |
| `send_draft` | Sends an existing draft | `accountId, draftId` |
| `review_before_send` | Previews an email before sending (AI confirmation) | `accountId, draftId` |

### 9.4 Management & Organization

| Tool | Description | Main Parameters |
|---|---|---|
| `delete_emails` | Deletes one or more emails | `accountId, emailIds: string[], permanent?` |
| `delete_emails_filtered` | Filtered deletion | `accountId, filter: object` |
| `purge_old_emails` | Deletes emails older than X | `accountId, olderThan: string, folder?, dryRun?` |
| `move_emails` | Moves emails | `accountId, emailIds, targetFolder` |
| `mark_emails` | Changes flags | `accountId, emailIds, flags: {read?, flagged?, important?}` |
| `archive_emails` | Archives emails | `accountId, emailIds` |
| `create_folder` | Creates a folder | `accountId, folderName, parent?` |
| `delete_folder` | Deletes a folder | `accountId, folderName` |

### 9.5 Statistics & Summaries

| Tool | Description | Main Parameters |
|---|---|---|
| `inbox_summary` | Mailbox summary (unread count, important, etc.) | `accountId` |
| `email_stats` | Detailed statistics | `accountId, period?` |
| `storage_info` | Quota/storage information | `accountId` |
| `list_important_emails` | Lists important/flagged emails | `accountId, limit?` |
| `summarize_unread` | AI summary of unread emails | `accountId, limit?` |
| `list_deletable_emails` | Suggests deletable emails | `accountId, criteria?` |

### 9.6 Protocol-Level Commands (Low-Level MCP Tools)

These tools expose individual protocol commands directly to the AI. Each tool maps to a single RFC-defined command and is named according to the convention `{PROTOCOL}_{OperationType}_{CommandName}`.

> **Naming convention**: `{PROTOCOL}_{Read|Write}_{CommandName}`
> - **Read** — retrieves data, queries state, or negotiates a connection (non-destructive).
> - **Write** — modifies server state, sends data, or performs a destructive action.

#### 9.6.1 IMAP Read Commands

| Tool | Protocol Command | Description | Main Parameters |
|---|---|---|---|
| `IMAP_Read_Capability` | `CAPABILITY` | List server capabilities and extensions | `accountId` |
| `IMAP_Read_Noop` | `NOOP` | Keep connection alive / poll for updates | `accountId` |
| `IMAP_Read_Login` | `LOGIN` | Authenticate with username/password | `accountId, username, password` |
| `IMAP_Read_Authenticate` | `AUTHENTICATE` | Authenticate with a SASL mechanism | `accountId, mechanism, credentials` |
| `IMAP_Read_Starttls` | `STARTTLS` | Negotiate TLS on a plain connection | `accountId` |
| `IMAP_Read_List` | `LIST` | List available mailboxes/folders | `accountId, reference?, pattern?` |
| `IMAP_Read_Lsub` | `LSUB` | List subscribed mailboxes | `accountId, reference?, pattern?` |
| `IMAP_Read_Select` | `SELECT` | Open a mailbox in read-write mode | `accountId, mailbox` |
| `IMAP_Read_Examine` | `EXAMINE` | Open a mailbox in read-only mode | `accountId, mailbox` |
| `IMAP_Read_Status` | `STATUS` | Get mailbox statistics | `accountId, mailbox, items` |
| `IMAP_Read_Search` | `SEARCH` | Search messages by criteria | `accountId, criteria` |
| `IMAP_Read_Sort` | `SORT` | Sort search results (RFC 5256) | `accountId, sortCriteria, searchCriteria` |
| `IMAP_Read_Thread` | `THREAD` | Thread messages (RFC 5256) | `accountId, algorithm, searchCriteria` |
| `IMAP_Read_Fetch` | `FETCH` | Fetch message data | `accountId, sequenceSet, dataItems` |
| `IMAP_Read_UidFetch` | `UID FETCH` | Fetch message data by UID | `accountId, uidSet, dataItems` |
| `IMAP_Read_UidSearch` | `UID SEARCH` | Search messages and return UIDs | `accountId, criteria` |
| `IMAP_Read_Namespace` | `NAMESPACE` | Discover folder namespaces | `accountId` |
| `IMAP_Read_GetQuota` | `GETQUOTA` | Get quota for a named resource | `accountId, quotaRoot` |
| `IMAP_Read_GetQuotaRoot` | `GETQUOTAROOT` | Get quota roots for a mailbox | `accountId, mailbox` |
| `IMAP_Read_Idle` | `IDLE` | Subscribe to real-time server notifications | `accountId` |
| `IMAP_Read_Id` | `ID` | Exchange client/server identity (RFC 2971) | `accountId, clientInfo?` |

#### 9.6.2 IMAP Write Commands

| Tool | Protocol Command | Description | Main Parameters |
|---|---|---|---|
| `IMAP_Write_Logout` | `LOGOUT` | Gracefully disconnect from the server | `accountId` |
| `IMAP_Write_Close` | `CLOSE` | Close mailbox with implicit expunge of \Deleted | `accountId` |
| `IMAP_Write_Expunge` | `EXPUNGE` | Permanently remove \Deleted messages | `accountId` |
| `IMAP_Write_Store` | `STORE` | Modify flags on messages | `accountId, sequenceSet, flagOperation, flags` |
| `IMAP_Write_UidStore` | `UID STORE` | Modify flags by UID | `accountId, uidSet, flagOperation, flags` |
| `IMAP_Write_Copy` | `COPY` | Copy messages to another mailbox | `accountId, sequenceSet, targetMailbox` |
| `IMAP_Write_UidCopy` | `UID COPY` | Copy messages by UID | `accountId, uidSet, targetMailbox` |
| `IMAP_Write_Move` | `MOVE` | Atomically move messages (RFC 6851) | `accountId, sequenceSet, targetMailbox` |
| `IMAP_Write_UidMove` | `UID MOVE` | Atomically move messages by UID (RFC 6851) | `accountId, uidSet, targetMailbox` |
| `IMAP_Write_Append` | `APPEND` | Append a message to a mailbox | `accountId, mailbox, message, flags?, date?` |
| `IMAP_Write_Create` | `CREATE` | Create a new mailbox | `accountId, mailboxName` |
| `IMAP_Write_Delete` | `DELETE` | Delete a mailbox and all its contents | `accountId, mailboxName` |
| `IMAP_Write_Rename` | `RENAME` | Rename a mailbox | `accountId, existingName, newName` |
| `IMAP_Write_Subscribe` | `SUBSCRIBE` | Subscribe to a mailbox | `accountId, mailboxName` |
| `IMAP_Write_Unsubscribe` | `UNSUBSCRIBE` | Unsubscribe from a mailbox | `accountId, mailboxName` |
| `IMAP_Write_SetQuota` | `SETQUOTA` | Set quota limit for a resource | `accountId, quotaRoot, limits` |

#### 9.6.3 POP3 Read Commands

| Tool | Protocol Command | Description | Main Parameters |
|---|---|---|---|
| `POP3_Read_User` | `USER` | Send username for authentication | `accountId, username` |
| `POP3_Read_Pass` | `PASS` | Send password for authentication | `accountId, password` |
| `POP3_Read_Apop` | `APOP` | MD5 challenge-response authentication | `accountId, username, digest` |
| `POP3_Read_Auth` | `AUTH` | SASL-based authentication | `accountId, mechanism, credentials` |
| `POP3_Read_Stat` | `STAT` | Get total message count and mailbox size | `accountId` |
| `POP3_Read_List` | `LIST` | List messages with their sizes | `accountId, msgNumber?` |
| `POP3_Read_Retr` | `RETR` | Retrieve a complete message | `accountId, msgNumber` |
| `POP3_Read_Top` | `TOP` | Retrieve message headers + first N body lines | `accountId, msgNumber, lineCount` |
| `POP3_Read_Uidl` | `UIDL` | Get unique persistent identifiers | `accountId, msgNumber?` |
| `POP3_Read_Capa` | `CAPA` | List server capabilities | `accountId` |
| `POP3_Read_Noop` | `NOOP` | Keep connection alive | `accountId` |
| `POP3_Read_Stls` | `STLS` | Negotiate TLS on a plain connection | `accountId` |

#### 9.6.4 POP3 Write Commands

| Tool | Protocol Command | Description | Main Parameters |
|---|---|---|---|
| `POP3_Write_Dele` | `DELE` | Mark a message for deletion (applied at QUIT) | `accountId, msgNumber` |
| `POP3_Write_Rset` | `RSET` | Cancel all pending deletions in the session | `accountId` |
| `POP3_Write_Quit` | `QUIT` | Disconnect and apply all pending deletions | `accountId` |

#### 9.6.5 SMTP Read Commands

| Tool | Protocol Command | Description | Main Parameters |
|---|---|---|---|
| `SMTP_Read_Ehlo` | `EHLO` | Extended greeting and capability discovery | `accountId, clientHostname` |
| `SMTP_Read_Helo` | `HELO` | Basic greeting (legacy, no capabilities) | `accountId, clientHostname` |
| `SMTP_Read_Noop` | `NOOP` | Keep connection alive | `accountId` |
| `SMTP_Read_Help` | `HELP` | Request help about available commands | `accountId, command?` |
| `SMTP_Read_Vrfy` | `VRFY` | Verify that an email address is deliverable | `accountId, address` |
| `SMTP_Read_Expn` | `EXPN` | Expand a mailing list alias into its members | `accountId, listName` |

#### 9.6.6 SMTP Write Commands

| Tool | Protocol Command | Description | Main Parameters |
|---|---|---|---|
| `SMTP_Write_Auth` | `AUTH` | Authenticate to the SMTP server | `accountId, mechanism, credentials` |
| `SMTP_Write_Starttls` | `STARTTLS` | Upgrade connection to TLS encryption | `accountId` |
| `SMTP_Write_MailFrom` | `MAIL FROM` | Set the sender and begin a mail transaction | `accountId, senderAddress, size?` |
| `SMTP_Write_RcptTo` | `RCPT TO` | Add a recipient to the current transaction | `accountId, recipientAddress` |
| `SMTP_Write_Data` | `DATA` | Transmit the full message (headers + MIME body) | `accountId, messageContent` |
| `SMTP_Write_Bdat` | `BDAT` | Transmit a binary data chunk (RFC 3030 CHUNKING) | `accountId, chunk, last?` |
| `SMTP_Write_Rset` | `RSET` | Abort the current mail transaction | `accountId` |
| `SMTP_Write_Quit` | `QUIT` | Close the SMTP connection gracefully | `accountId` |

---

## 10. Exposed MCP Resources

Resources allow the AI to access contextual data.

| URI | Description |
|---|---|
| `email://accounts` | List of configured accounts with their status |
| `email://account/{id}/folders` | Folder tree of an account |
| `email://account/{id}/inbox/summary` | Inbox summary |
| `email://capabilities` | List of supported features and protocols |
| `email://providers` | Known provider configurations |

---

## 11. Predefined MCP Prompts

Prompts provide ready-to-use conversation templates.

| Prompt | Description | Arguments |
|---|---|---|
| `summarize-inbox` | Summarizes unread emails in the inbox | `accountId, maxEmails?` |
| `draft-reply` | Proposes a reply to an email | `accountId, emailId, tone?, language?` |
| `cleanup-suggestions` | Suggests emails to delete/archive | `accountId, olderThanDays?` |
| `important-emails` | Identifies and summarizes important emails | `accountId, criteria?` |
| `daily-briefing` | Daily email briefing | `accountId` |
| `compose-email` | Helps compose an email on a topic | `accountId, topic, recipient?, tone?` |

---

## 12. Security

### 12.1 Core Principles

1. **No plaintext passwords** in configuration files
2. **Secure storage** via the system keychain (`keytar`)
3. **OAuth2 tokens** stored encrypted locally
4. **Automatic refresh** of expired tokens
5. **Mandatory TLS** for all email connections
6. **Strict validation** of all inputs (JSON schema with AJV)
7. **User confirmation** before any destructive action (deletion, sending)
8. **No sensitive data in logs** (no passwords or tokens in logs)
9. **Timeout** on all connections
10. **Rate limiting** on bulk operations

### 12.2 Secrets Management

```
┌──────────────────────────────────────────────┐
│ accounts.json                                │
│  "passwordRef": "keychain:my-ovh-password"  ─┼──► OS Keychain
│  "oauth2.refreshToken": null                ─┼──► Token Store (encrypted)
│  "clientSecret" in .env or keychain         ─┼──► .env (local dev)
└──────────────────────────────────────────────┘
```

### 12.3 Dry-run Mode

Destructive operations offer a `dryRun: true` mode that lists actions without executing them, allowing the AI to show what would be done before confirmation.

---

## 13. Phased Implementation Plan

### Phase 1 — Foundations (Weeks 1-2)

- [ ] Initialize Node.js + TypeScript project
- [ ] Configure tsup, eslint, prettier, vitest
- [ ] Install the MCP SDK (`@modelcontextprotocol/sdk`)
- [ ] Create the base MCP server with stdio transport
- [ ] Implement `ConfigManager` (JSON read/write/validation)
- [ ] Define JSON schemas for accounts
- [ ] Create pre-filled provider config files
- [ ] First unit tests on config

### Phase 2 — Authentication (Weeks 3-4)

- [ ] Implement `AuthManager` and the Strategy pattern
- [ ] `BasicAuth` strategy (PLAIN, LOGIN)
- [ ] `AppPassword` strategy
- [ ] `OAuth2` strategy (with interactive HTTP callback flow)
- [ ] Google OAuth2 provider
- [ ] Microsoft OAuth2 provider
- [ ] `AuthDetector`: automatic detection via DNS MX + CAPABILITY
- [ ] Secure token storage (`keytar`)
- [ ] MCP tools: `detect_auth`, `setup_account`, `test_connection`
- [ ] Auth unit tests

### Phase 3 — Email Protocols (Weeks 5-7)

- [ ] `ImapService`: connection, LIST, SELECT, SEARCH, FETCH, STORE, MOVE, DELETE, IDLE
- [ ] `Pop3Service`: connection, STAT, LIST, RETR, TOP, DELE
- [ ] `SmtpService`: connection, sending (text, HTML, attachments)
- [ ] `EmailParserService`: MIME parsing, attachment extraction
- [ ] `EmailManagerService`: unified facade over all 3 protocols
- [ ] Service unit tests
- [ ] Integration tests (with test email server GreenMail / MailHog)

### Phase 4 — MCP Read Tools (Weeks 8-9)

- [ ] `list_emails` with all filters
- [ ] `read_email` (text + HTML + attachments)
- [ ] `search_emails` (advanced multi-criteria search)
- [ ] `count_emails`, `count_new_emails`
- [ ] `list_folders`
- [ ] `get_attachment`
- [ ] Read tools tests

### Phase 5 — MCP Write Tools (Weeks 10-11)

- [ ] `send_email` (text + HTML + attachments)
- [ ] `reply_to_email`, `forward_email`
- [ ] `save_draft`, `send_draft`
- [ ] `compose_email` + `review_before_send` (review flow)
- [ ] Write tools tests

### Phase 6 — MCP Management Tools (Week 12)

- [ ] `delete_emails`, `delete_emails_filtered`
- [ ] `purge_old_emails` with dry-run
- [ ] `move_emails`, `archive_emails`
- [ ] `mark_emails` (read, unread, important)
- [ ] `create_folder`, `delete_folder`
- [ ] Management tools tests

### Phase 7 — Statistics, Resources & Prompts (Week 13)

- [ ] `inbox_summary`, `email_stats`
- [ ] `storage_info`, `list_important_emails`
- [ ] `summarize_unread`, `list_deletable_emails`
- [ ] All MCP resources
- [ ] All predefined MCP prompts
- [ ] Tests

### Phase 7b — Protocol-Level Command Tools (Week 14)

Expose all individual protocol commands as dedicated MCP tools following the `{PROTOCOL}_{Read|Write}_{CommandName}` naming convention (see Section 9.6).

**IMAP Read tools** (21 commands):
- [ ] `IMAP_Read_Capability`, `IMAP_Read_Noop`, `IMAP_Read_Login`, `IMAP_Read_Authenticate`, `IMAP_Read_Starttls`
- [ ] `IMAP_Read_List`, `IMAP_Read_Lsub`, `IMAP_Read_Select`, `IMAP_Read_Examine`, `IMAP_Read_Status`
- [ ] `IMAP_Read_Search`, `IMAP_Read_Sort`, `IMAP_Read_Thread`
- [ ] `IMAP_Read_Fetch`, `IMAP_Read_UidFetch`, `IMAP_Read_UidSearch`
- [ ] `IMAP_Read_Namespace`, `IMAP_Read_GetQuota`, `IMAP_Read_GetQuotaRoot`
- [ ] `IMAP_Read_Idle`, `IMAP_Read_Id`

**IMAP Write tools** (16 commands):
- [ ] `IMAP_Write_Logout`, `IMAP_Write_Close`, `IMAP_Write_Expunge`
- [ ] `IMAP_Write_Store`, `IMAP_Write_UidStore`
- [ ] `IMAP_Write_Copy`, `IMAP_Write_UidCopy`, `IMAP_Write_Move`, `IMAP_Write_UidMove`
- [ ] `IMAP_Write_Append`
- [ ] `IMAP_Write_Create`, `IMAP_Write_Delete`, `IMAP_Write_Rename`
- [ ] `IMAP_Write_Subscribe`, `IMAP_Write_Unsubscribe`
- [ ] `IMAP_Write_SetQuota`

**POP3 Read tools** (12 commands):
- [ ] `POP3_Read_User`, `POP3_Read_Pass`, `POP3_Read_Apop`, `POP3_Read_Auth`
- [ ] `POP3_Read_Stat`, `POP3_Read_List`, `POP3_Read_Retr`, `POP3_Read_Top`, `POP3_Read_Uidl`
- [ ] `POP3_Read_Capa`, `POP3_Read_Noop`, `POP3_Read_Stls`

**POP3 Write tools** (3 commands):
- [ ] `POP3_Write_Dele`, `POP3_Write_Rset`, `POP3_Write_Quit`

**SMTP Read tools** (6 commands):
- [ ] `SMTP_Read_Ehlo`, `SMTP_Read_Helo`, `SMTP_Read_Noop`
- [ ] `SMTP_Read_Help`, `SMTP_Read_Vrfy`, `SMTP_Read_Expn`

**SMTP Write tools** (8 commands):
- [ ] `SMTP_Write_Auth`, `SMTP_Write_Starttls`
- [ ] `SMTP_Write_MailFrom`, `SMTP_Write_RcptTo`, `SMTP_Write_Data`, `SMTP_Write_Bdat`
- [ ] `SMTP_Write_Rset`, `SMTP_Write_Quit`

- [ ] Protocol command unit tests (mocked services)
- [ ] Integration tests with GreenMail for all 66 protocol command tools

### Phase 8 — Polish & Distribution (Weeks 15-16)

- [ ] Complete documentation (README, SETUP, AUTHENTICATION, TOOLS_REFERENCE, PROVIDERS)
- [ ] CI/CD GitHub Actions
- [ ] npm publication
- [ ] `.vscode/mcp.json` configuration
- [ ] Full end-to-end test with VS Code + GitHub Copilot
- [ ] CHANGELOG and GitHub release
- [ ] Submission to MCP registry / VS Code Marketplace

---

## 14. Tests

### 14.1 Test Strategy

| Type | Tool | Target Coverage |
|---|---|---|
| **Unit** | vitest | Services, Auth, Config, Utils |
| **Integration** | vitest + MailHog/GreenMail | Real protocol connections |
| **MCP** | vitest + MCP Inspector | Tools/resources/prompts validation |
| **E2E** | Manual + scripts | Complete workflow with VS Code |

### 14.2 Test Email Server

Use **MailHog** or **GreenMail** in Docker for integration tests:

```yaml
# docker-compose.test.yml
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web interface
  greenmail:
    image: greenmail/standalone
    ports:
      - "3025:3025"   # SMTP
      - "3110:3110"   # POP3
      - "3143:3143"   # IMAP
      - "3465:3465"   # SMTPS
      - "3993:3993"   # IMAPS
      - "3995:3995"   # POP3S
```

### 14.3 MCP Inspector

Use the official **MCP Inspector** tool to test tools interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 15. GitHub Distribution

### 15.1 `package.json`

```jsonc
{
  "name": "mcp-email-rw",
  "version": "0.1.0",
  "description": "MCP server for complete email management — read, write, search, delete via IMAP/POP3/SMTP",
  "license": "GPL-3.0",
  "author": "Your name",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USER/MCP_Email_RW"
  },
  "keywords": ["mcp", "email", "imap", "pop3", "smtp", "ai", "copilot", "claude"],
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mcp-email-rw": "dist/index.js"
  },
  "files": ["dist", "config/providers", "config/schema"],
  "scripts": {
    "build": "tsup",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "inspect": "npx @modelcontextprotocol/inspector node dist/index.js",
    "prepare": "npm run build"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 15.2 npm Publication

```bash
npm login
npm publish --access public
```

Users can install via:
```bash
npx mcp-email-rw          # Direct execution
npm install -g mcp-email-rw   # Global installation
```

### 15.3 GitHub Release

- Semantic tags: `v0.1.0`, `v1.0.0`
- Auto-generated release notes from the CHANGELOG
- Bundled binary included in assets

---

## 16. VS Code / MCP Extension Distribution

### 16.1 MCP Configuration for VS Code (`.vscode/mcp.json`)

Users add this configuration in their VS Code:

```jsonc
{
  "servers": {
    "mcp-email-rw": {
      "command": "npx",
      "args": ["-y", "mcp-email-rw"],
      "env": {
        "MCP_EMAIL_CONFIG": "${userHome}/.config/mcp-email-rw/accounts.json"
      }
    }
  }
}
```

Or with a local installation:

```jsonc
{
  "servers": {
    "mcp-email-rw": {
      "command": "node",
      "args": ["${workspaceFolder}/node_modules/mcp-email-rw/dist/index.js"]
    }
  }
}
```

### 16.2 Configuration for Claude Desktop (`claude_desktop_config.json`)

```jsonc
{
  "mcpServers": {
    "mcp-email-rw": {
      "command": "npx",
      "args": ["-y", "mcp-email-rw"],
      "env": {
        "MCP_EMAIL_CONFIG": "/Users/you/.config/mcp-email-rw/accounts.json"
      }
    }
  }
}
```

### 16.3 Publishing as a VS Code Extension (optional, future)

If you wish to publish as a native VS Code extension with UI:

1. Create a `vscode-mcp-email-rw` wrapper with the `vscode` API
2. Integrate the MCP server as a dependency
3. Add a view in the side panel (account list, status)
4. Publish on the Visual Studio Marketplace via `vsce`

```bash
npm install -g @vscode/vsce
vsce package
vsce publish
```

---

## 17. CI/CD

### 17.1 CI — `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

### 17.2 Release — `.github/workflows/release.yml`

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

---

## 18. Future Roadmap

| Version | Feature |
|---|---|
| **v0.1.0** | MVP: Basic IMAP + password auth + list/read/send |
| **v0.2.0** | OAuth2 Google + Microsoft |
| **v0.3.0** | POP3 + all auth methods |
| **v0.4.0** | Management tools (delete, move, archive, purge) |
| **v0.5.0** | Statistics, summaries, AI prompts |
| **v0.6.0** | Full protocol-level MCP tools: all 66 commands prefixed with `IMAP_Read_`, `IMAP_Write_`, `POP3_Read_`, `POP3_Write_`, `SMTP_Read_`, `SMTP_Write_` (see Section 9.6) |
| **v1.0.0** | Production-ready, complete documentation, npm publication |
| **v1.1.0** | IDLE support (real-time notifications via `IMAP_Read_Idle`) |
| **v1.2.0** | Simultaneous multi-account |
| **v1.5.0** | Native VS Code extension with UI |
| **v2.0.0** | Calendar support (CalDAV), contacts (CardDAV) |

### Protocol Command Coverage Summary (v0.6.0 target)

| Protocol | Read Commands | Write Commands | Total |
|---|---|---|---|
| IMAP | 21 | 16 | 37 |
| POP3 | 12 | 3 | 15 |
| SMTP | 6 | 8 | 14 |
| **Total** | **39** | **27** | **66** |

---

## Quick Start Commands Summary

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USER/MCP_Email_RW.git
cd MCP_Email_RW

# 2. Initialize the project
npm init -y
npm install typescript @modelcontextprotocol/sdk imapflow nodemailer mailparser keytar ajv zod
npm install -D tsup vitest eslint prettier @types/node @types/nodemailer tsx

# 3. Configure TypeScript
npx tsc --init

# 4. Develop
npm run dev

# 5. Test
npm test

# 6. Test with MCP Inspector
npm run inspect

# 7. Build
npm run build

# 8. Publish
npm publish --access public
```

---

*Document generated on March 4, 2026 — Updated March 5, 2026 (protocol command list, Section 5, 9.6, project structure, phases, roadmap) — GPL-3.0 License*
