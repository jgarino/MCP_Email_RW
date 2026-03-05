# Contributing to MCP Email RW

Thank you for your interest in contributing! This guide will help you get started.

## How to Contribute

1. **Report bugs** — open an [issue](https://github.com/jgarino/MCP_Email_RW/issues) with reproduction steps
2. **Suggest features** — open an issue describing the use case
3. **Submit code** — fork the repo and open a pull request
4. **Improve docs** — fix typos, add examples, clarify instructions

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm (included with Node.js)
- Git

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/your-username/MCP_Email_RW.git
cd MCP_Email_RW

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── config/               # Configuration management
├── auth/                 # Authentication strategies
├── services/             # IMAP, SMTP, parser services
├── tools/                # MCP tool definitions
│   ├── auth-tools.ts     # Account management tools
│   ├── read-tools.ts     # Email reading tools
│   ├── write-tools.ts    # Email composition tools
│   ├── manage-tools.ts   # Email management tools
│   └── stats-tools.ts    # Statistics tools
├── resources/            # MCP resource definitions
└── prompts/              # MCP prompt definitions

tests/
├── unit/                 # Unit tests
config/
├── providers.json        # Provider presets
docs/                     # Documentation
```

## Code Style

- **TypeScript** — all source code is written in TypeScript
- **Formatting** — use Prettier (config in `.prettierrc`)
- **Linting** — ESLint is configured for the project
- **Language** — all code, comments, and documentation must be in English

### Format and lint before committing

```bash
npm run format
npm run lint
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run tests/unit/some-test.test.ts
```

All tests use [Vitest](https://vitest.dev/) and should be placed in the `tests/` directory.

### Writing Tests

- Place unit tests in `tests/unit/`
- Name test files with the `.test.ts` suffix
- Mock external dependencies (IMAP, SMTP connections)
- Aim for meaningful coverage, not 100% line coverage

## Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** — keep commits focused and well-described

3. **Ensure quality**:
   ```bash
   npm run build    # Verify it compiles
   npm test         # All tests pass
   npm run lint     # No linting errors
   ```

4. **Open a pull request**:
   - Provide a clear title and description
   - Reference any related issues
   - Describe what was changed and why

5. **Address feedback** — reviewers may request changes

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Include tests for new functionality
- Update documentation if behavior changes
- Do not include unrelated changes

## Adding a New Tool

To add a new MCP tool:

1. Determine the category (auth, read, write, manage, stats)
2. Add the tool definition in the appropriate `src/tools/*-tools.ts` file
3. Register it in `src/tools/index.ts`
4. Add unit tests in `tests/unit/`
5. Document in `docs/TOOLS_REFERENCE.md`

## Adding a Provider

To add a new email provider preset:

1. Add the provider configuration to `config/providers.json`
2. Test with a real account if possible
3. Document in `docs/PROVIDERS.md`

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0 License](../LICENSE).
