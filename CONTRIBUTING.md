<!-- generated-by: gsd-doc-writer -->

# Contributing to CodeMap

Thanks for helping improve CodeMap. Keep changes focused, verified, and aligned with the existing repo rules.

## Start Here

```bash
git clone https://github.com/yuanyuanyuan/mycodemap.git
cd mycodemap
npm install
npm run build
```

Before opening a PR, run:

```bash
npm run check:all
```

That is the repo's normal local gate for typecheck, lint, tests, and docs validation.

## Code Standards

- Use TypeScript, ESM, and the existing strict style in `src/`.
- Preserve `[META]` and `[WHY]` headers in TypeScript source files when you touch them.
- Keep edits surgical. Do not refactor unrelated code while fixing a scoped issue.
- If you change CLI behavior, config, public API shapes, or release flow, update the matching docs in the same change.

## Documentation and Validation

- Run `npm run docs:check` when you touch docs, CLI output, or command contracts.
- Run `npm run docs:check:pre-release` for changes that affect publish or release behavior.
- Use real filesystem or subprocess validation when a change affects behavior that the repository already tests that way.

## Commit Format

Commit messages follow the repo policy:

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

## Pull Requests

- Keep each PR focused on one concern.
- Include tests for behavior changes.
- Mention any remaining risks or skipped verification explicitly.

## Issues

If you report a bug, include:

- the exact command you ran
- the observed output
- the expected behavior
- your Node.js version
- your operating system

## License

By contributing, you agree that your changes are licensed under MIT.
