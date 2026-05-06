<!-- generated-by: gsd-doc-writer -->

# Contributing to CodeMap

Thank you for your interest in contributing to CodeMap. This guide covers the essentials for getting your changes merged.

## Development Setup

Set up your local environment for development:

```bash
git clone https://github.com/yuanyuanyuan/mycodemap.git
cd mycodemap
npm install
npm run build
```

**Prerequisites:** Node.js >= 20.0.0 (as specified in `package.json` `engines`).

After setup, verify everything is working:

```bash
npm run check:all
```

This runs typecheck, lint, tests, and documentation guardrails in one command. It is the single gate you must pass before requesting review.

For detailed development workflow, see `docs/DEVELOPMENT.md`. For testing conventions, see `docs/TESTING.md`.

## Coding Standards

- **Language:** TypeScript, ESM modules, strict mode, ES2022 target.
- **Linter:** ESLint with `@typescript-eslint` plugin. Configuration lives in `eslint.config.js`.
  - Run: `npm run lint`
  - Auto-fix: `npm run fix:all`
  - Blocking rules in CI include `no-duplicate-enum-values`; warnings include `no-explicit-any`, `no-non-null-assertion`, and `no-unused-vars`.
- **Type checking:** Enforced. Run `npm run typecheck` before pushing.
- **Documentation guardrails:** `npm run docs:check` validates that all referenced CLI commands and paths in documentation are real and runnable. This is enforced in CI.

## Commit Conventions

Use conventional commit prefixes. The CI `check-commits` step enforces format on PRs.

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `test:` | Adding or updating tests |
| `refactor:` | Code restructuring without behavior change |
| `chore:` | Build, tooling, or dependency changes |
| `perf:` | Performance improvements |

Examples from the project history:

```
test(59): complete UAT - 12 passed, 1 minor issue
docs(state): record phase 59 context session
```

CI also enforces commit size limits via `check-commit-size` and file header checks via `check-headers`.

## PR Guidelines

1. **Branch naming:** Use descriptive names prefixed by category, e.g., `feat/parser-enhancement`, `fix/cli-output-error`, `docs/api-reference`.
2. **All checks must pass:** Run `npm run check:all` locally before pushing. CI will run typecheck, lint, tests, docs:check, e2e tests, contract gate, commit format, and commit size checks.
3. **Tests required:** All new features and bug fixes must include corresponding tests. The project uses Vitest with 1300+ tests. Run `npm test` for unit tests and `npm run test:e2e` for integration tests.
4. **Evidence tags:** For feature and bugfix commits, include `[证据]` tags in commit messages pointing to real-world validation (file:line or command output). CI checks for these on PRs.
5. **Documentation updates:** If your change affects CLI commands, configuration options, or public APIs, update the relevant documentation and verify with `npm run docs:check`.
6. **One concern per PR:** Keep PRs focused on a single change. Large mixed-concern PRs are harder to review and slower to merge.

## Issue Reporting

Open an issue on [GitHub Issues](https://github.com/yuanyuanyuan/mycodemap/issues). When reporting a bug, include:

- Steps to reproduce the problem
- Expected behavior
- Actual behavior (including error output)
- Node.js version (`node --version`)
- CodeMap version (`mycodemap --version` or check `package.json`)
- Operating system

For feature requests, describe the use case and the problem it solves.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
