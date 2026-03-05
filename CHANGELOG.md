# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2025-03-05

### Added

- Initial MCP server implementation with stdio transport
- Configuration management (ConfigManager) with JSON validation
- Authentication system with basic, app-password, and OAuth2 strategies
- Auth detection for automatic provider identification
- IMAP service for email reading and management (via imapflow)
- SMTP service for email sending (via nodemailer)
- Email parser service for MIME parsing (via mailparser)
- Unified EmailManagerService facade
- 34 MCP tools across 5 categories:
  - **Auth tools (6):** detect_auth, setup_account, test_connection, list_accounts, remove_account, update_account
  - **Read tools (8):** list_emails, read_email, search_emails, count_emails, count_new_emails, list_folders, get_attachment, get_email_headers
  - **Write tools (6):** send_email, reply_to_email, forward_email, save_draft, send_draft, compose_email
  - **Manage tools (8):** delete_emails, delete_emails_filtered, purge_old_emails, move_emails, archive_emails, mark_emails, create_folder, delete_folder
  - **Stats tools (6):** inbox_summary, email_stats, storage_info, list_important_emails, summarize_unread, list_deletable_emails
- 2 MCP resources: email://accounts, email://capabilities
- 6 MCP prompts: summarize-inbox, draft-reply, cleanup-suggestions, important-emails, daily-briefing, compose-email
- Provider configurations for Gmail, Outlook, Yahoo, iCloud, OVH, Ionos
- 233 unit tests with full coverage
- Complete documentation (README, setup guide, authentication guide, tools reference, providers guide, contributing guide)
- VS Code MCP integration configuration
- GitHub Actions CI workflow
