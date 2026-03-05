# Tools Reference

Complete reference for all 34 MCP tools provided by MCP Email RW, organized by category.

---

## Auth Tools (6)

### `detect_auth`

Detect email provider and recommended authentication settings for an email address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | ✅ | Email address to detect settings for |

**Returns**: Provider name, IMAP/SMTP settings, supported auth methods.

**Example**:
```
detect_auth(email: "user@gmail.com")
→ { provider: "gmail", imap: { host: "imap.gmail.com", port: 993 }, ... }
```

---

### `setup_account`

Set up a new email account with auto-detected or manual settings.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `email` | string | ✅ | — | Email address |
| `name` | string | ❌ | — | Display name for the account |
| `provider` | string | ❌ | auto-detected | Provider identifier |
| `password` | string | ❌ | — | Password or app-specific password |

**Returns**: Account ID and configuration summary.

**Example**:
```
setup_account(email: "user@gmail.com", name: "My Gmail", password: "xxxx-xxxx-xxxx-xxxx")
```

---

### `test_connection`

Test IMAP and/or SMTP connection for a configured account.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID to test |
| `protocol` | enum | ❌ | all | Protocol to test: `imap`, `smtp`, or `pop3` |

**Returns**: Connection status for each protocol tested.

---

### `list_accounts`

List all configured email accounts.

*No parameters.*

**Returns**: Array of accounts with id, name, email, provider, and enabled status.

---

### `remove_account`

Remove a configured email account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID to remove |

**Returns**: Confirmation of removal.

---

### `update_account`

Update settings for an existing account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID to update |
| `name` | string | ❌ | New display name |
| `email` | string | ❌ | New email address |
| `enabled` | boolean | ❌ | Enable or disable the account |
| `password` | string | ❌ | New password |

**Returns**: Updated account configuration.

---

## Read Tools (8)

### `list_emails`

List emails from a folder with pagination support.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to list from |
| `limit` | number | ❌ | `20` | Maximum emails to return |
| `offset` | number | ❌ | `0` | Number of emails to skip |

**Returns**: Array of email summaries (uid, from, to, subject, date, flags).

---

### `read_email`

Read the full content of an email by its UID.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ✅ | — | Folder containing the email |
| `uid` | number | ✅ | — | Email UID |
| `markAsRead` | boolean | ❌ | `true` | Mark the email as read |

**Returns**: Full email content including headers, body (text/html), and attachment list.

---

### `search_emails`

Search emails with multiple criteria.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `query` | string | ❌ | — | General search query |
| `folder` | string | ❌ | `INBOX` | Folder to search in |
| `from` | string | ❌ | — | Filter by sender |
| `to` | string | ❌ | — | Filter by recipient |
| `subject` | string | ❌ | — | Filter by subject |
| `since` | string | ❌ | — | Emails since date (ISO 8601) |
| `before` | string | ❌ | — | Emails before date (ISO 8601) |
| `hasAttachment` | boolean | ❌ | — | Filter by attachment presence |
| `seen` | boolean | ❌ | — | Filter by read status |
| `flagged` | boolean | ❌ | — | Filter by flagged status |
| `limit` | number | ❌ | `20` | Maximum results |

**Returns**: Array of matching email summaries.

---

### `count_emails`

Count emails in a folder with optional filter.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to count |
| `filter` | enum | ❌ | `all` | Filter: `all`, `unseen`, `seen`, `flagged` |

**Returns**: Email count matching the filter.

---

### `count_new_emails`

Count emails received since a given date.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `since` | string | ❌ | 24 hours ago | ISO 8601 date |

**Returns**: Count of new emails since the specified date.

---

### `list_folders`

List all IMAP folders/mailboxes for an account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |

**Returns**: Array of folder names with attributes (path, delimiter, flags).

---

### `get_attachment`

Download an email attachment by its index.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |
| `folder` | string | ✅ | Folder containing the email |
| `uid` | number | ✅ | Email UID |
| `attachmentIndex` | number | ✅ | 0-based attachment index |

**Returns**: Attachment content (base64-encoded), filename, and MIME type.

---

### `get_email_headers`

Get raw headers of an email.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |
| `folder` | string | ✅ | Folder containing the email |
| `uid` | number | ✅ | Email UID |

**Returns**: Raw email headers as key-value pairs.

---

## Write Tools (6)

### `send_email`

Send a new email.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `to` | string | ✅ | — | Recipient email address(es) |
| `subject` | string | ✅ | — | Email subject |
| `body` | string | ✅ | — | Email body content |
| `cc` | string | ❌ | — | CC recipients |
| `bcc` | string | ❌ | — | BCC recipients |
| `html` | boolean | ❌ | `false` | Whether body is HTML |
| `replyTo` | string | ❌ | — | Reply-to address |

**Returns**: Send confirmation with message ID.

---

### `reply_to_email`

Reply to an existing email. Automatically quotes the original message.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ✅ | — | Folder of the original email |
| `uid` | number | ✅ | — | UID of the email to reply to |
| `body` | string | ✅ | — | Reply body |
| `replyAll` | boolean | ❌ | `false` | Reply to all recipients |
| `html` | boolean | ❌ | `false` | Whether body is HTML |

**Returns**: Send confirmation with message ID.

---

### `forward_email`

Forward an email to another recipient.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ✅ | — | Folder of the email to forward |
| `uid` | number | ✅ | — | UID of the email to forward |
| `to` | string | ✅ | — | Recipient to forward to |
| `body` | string | ❌ | — | Additional message to prepend |

**Returns**: Send confirmation with message ID.

---

### `save_draft`

Save an email as a draft without sending.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `to` | string | ✅ | — | Recipient email address(es) |
| `subject` | string | ✅ | — | Email subject |
| `body` | string | ✅ | — | Email body |
| `cc` | string | ❌ | — | CC recipients |
| `bcc` | string | ❌ | — | BCC recipients |
| `html` | boolean | ❌ | `false` | Whether body is HTML |

**Returns**: Draft UID and folder location.

---

### `send_draft`

Send an existing draft from the Drafts folder.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `Drafts` | Folder containing the draft |
| `uid` | number | ✅ | — | UID of the draft to send |

**Returns**: Send confirmation with message ID.

---

### `compose_email`

Preview an email composition without sending. Useful for review before sending.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `to` | string | ✅ | — | Recipient email address(es) |
| `subject` | string | ✅ | — | Email subject |
| `body` | string | ✅ | — | Email body |
| `cc` | string | ❌ | — | CC recipients |
| `bcc` | string | ❌ | — | BCC recipients |
| `html` | boolean | ❌ | `false` | Whether body is HTML |

**Returns**: Preview of the composed email for review.

---

## Manage Tools (8)

### `delete_emails`

Delete emails by their UIDs.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ✅ | — | Folder containing the emails |
| `uids` | number[] | ✅ | — | Array of email UIDs to delete |
| `permanent` | boolean | ❌ | `false` | Permanently delete (skip trash) |

**Returns**: Number of emails deleted.

---

### `delete_emails_filtered`

Delete emails matching filter criteria. Defaults to dry-run mode for safety.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to filter |
| `from` | string | ❌ | — | Filter by sender |
| `subject` | string | ❌ | — | Filter by subject |
| `before` | string | ❌ | — | Emails before this date |
| `seen` | boolean | ❌ | — | Filter by read status |
| `dryRun` | boolean | ❌ | `true` | Preview without deleting |

**Returns**: List of matching emails (dry-run) or deletion confirmation.

---

### `purge_old_emails`

Delete emails older than a specified number of days. Defaults to dry-run mode.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `olderThanDays` | number | ✅ | — | Delete emails older than N days |
| `folder` | string | ❌ | `INBOX` | Folder to purge |
| `dryRun` | boolean | ❌ | `true` | Preview without deleting |

**Returns**: List of affected emails (dry-run) or purge confirmation.

---

### `move_emails`

Move emails from one folder to another.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |
| `uids` | number[] | ✅ | Array of email UIDs to move |
| `fromFolder` | string | ✅ | Source folder |
| `toFolder` | string | ✅ | Destination folder |

**Returns**: Number of emails moved.

---

### `archive_emails`

Archive emails (moves to Archive or provider-specific archive folder).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `uids` | number[] | ✅ | — | Array of email UIDs to archive |
| `folder` | string | ❌ | `INBOX` | Source folder |

**Returns**: Number of emails archived and destination folder.

---

### `mark_emails`

Mark emails as read/unread or flagged/unflagged.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `uids` | number[] | ✅ | — | Array of email UIDs |
| `folder` | string | ✅ | — | Folder containing the emails |
| `read` | boolean | ❌ | — | Set read/unread status |
| `flagged` | boolean | ❌ | — | Set flagged status |
| `action` | enum | ❌ | `add` | `add` or `remove` flags |

**Returns**: Confirmation of updated flags.

---

### `create_folder`

Create a new IMAP folder.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |
| `folderName` | string | ✅ | Name of the folder to create |

**Returns**: Confirmation of folder creation.

---

### `delete_folder`

Delete an IMAP folder.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |
| `folderName` | string | ✅ | Name of the folder to delete |

**Returns**: Confirmation of folder deletion.

---

## Stats Tools (6)

### `inbox_summary`

Get an overview of the inbox.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |

**Returns**: Total emails, unread count, recent emails count.

---

### `email_stats`

Get email statistics for a time period, including top senders.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to analyze |
| `period` | enum | ❌ | `week` | Time period: `day`, `week`, or `month` |

**Returns**: Email count for the period and top 5 senders.

---

### `storage_info`

Get storage quota information for the account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ | Account ID |

**Returns**: Storage usage, limit, and percentage used.

---

### `list_important_emails`

List flagged/important emails.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to search |
| `limit` | number | ❌ | `10` | Maximum results |

**Returns**: Array of flagged email summaries.

---

### `summarize_unread`

Get a summary of unread emails.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to summarize |
| `limit` | number | ❌ | `10` | Maximum emails to include |

**Returns**: Summary of unread emails with senders, subjects, and dates.

---

### `list_deletable_emails`

Suggest emails that could be deleted based on criteria.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `accountId` | string | ✅ | — | Account ID |
| `folder` | string | ❌ | `INBOX` | Folder to analyze |
| `criteria` | enum | ❌ | `old` | Criteria: `old`, `read`, or `large` |

**Returns**: List of emails matching the deletion criteria with details.
