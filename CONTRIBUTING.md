<!-- generated-by: gsd-doc-writer -->

# Contributing to CodeMap

Thanks for helping improve CodeMap. Keep changes focused, verified, and aligned with the existing repo rules.

## Development Setup

See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for prerequisites and first-run instructions, and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local development setup.

Before opening a PR, run:

```bash
npm run check:all
```

That is the repo's normal local gate for typecheck, lint, tests, and docs validation.

## Coding Standards

- Use TypeScript, ESM, and the existing strict style in `src/`.
- Preserve `[META]` and `[WHY]` headers in TypeScript source files when you touch them.
- Keep edits surgical. Do not refactor unrelated code while fixing a scoped issue.
- If you change CLI behavior, config, public API shapes, or release flow, update the matching docs in the same change.
- Run `npm run lint` to check code style. CI enforces this via `.github/workflows/ci-gateway.yml`.
- Run `npm run fix:all` to auto-fix lint issues.

## Documentation and Validation

- Run `npm run docs:check` when you touch docs, CLI output, or command contracts.
- Run `npm run docs:check:pre-release` for changes that affect publish or release behavior.
- Use real filesystem or subprocess validation when a change affects behavior that the repository already tests that way.

## Pull Requests

- Branch from `main` and use a descriptive name (e.g., `feat/description`, `bugfix/description`, `refactor/description`).
- Commit messages follow the repo policy:

  ```text
  [TAG] scope: message
  ```

  Valid tags are:

  - `BUGFIX`
  - `FEATURE`
  - `REFACTOR`
  - `CONFIG`
  - `DOCS`
  - `DELETE`

  For feature and bugfix work, include the appropriate `[证据]` trail in the commit message or PR description when you have real validation evidence.
- Keep each PR focused on one concern.
- Include tests for behavior changes.
- Mention any remaining risks or skipped verification explicitly.

## Issues

Report bugs and request features via [GitHub Issues](https://github.com/yuanyuanyuan/mycodemap/issues).

If you report a bug, include:

- the exact command you ran
- the observed output
- the expected behavior
- your Node.js version
- your operating system

## License

By contributing, you agree that your changes are licensed under MIT.
