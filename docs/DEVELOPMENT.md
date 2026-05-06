<!-- generated-by: gsd-doc-writer -->

# Development Guide

## Setup

```bash
npm install
npm run build
```

The build emits compiled output into `dist/`, and the package ships the CLI from `dist/cli/index.js`.

## Core Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Watch TypeScript compilation |
| `npm run build` | Compile the project |
| `npm run typecheck` | Type-check without emitting files |
| `npm run lint` | Run ESLint on `src/` |
| `npm run fix:all` | Auto-fix lint issues |
| `npm test` | Run the Vitest suite |
| `npm run test:e2e` | Run workflow and integration-style tests |
| `npm run benchmark` | Run benchmark checks |
| `npm run docs:check` | Validate human and AI documentation |
| `npm run docs:check:pre-release` | Pre-release docs validation |
| `npm run check:all` | Full local gate |

## Working Rules

- Keep TypeScript files in ESM style with explicit exports.
- Preserve the file headers that carry `[META]` and `[WHY]` annotations in source files.
- Prefer small, surgical changes that match the surrounding code.
- If a change touches CLI behavior, configuration, or public APIs, update the corresponding docs in the same change.

## Local Feedback Loop

Recommended loop for most changes:

```bash
npm run typecheck
npm test
npm run docs:check
```

For agent-driven work, `npm run ai:pre-task` and `npm run ai:post-task` wrap the same validation gates used in CI.

## Release Notes

`npm run release` invokes the release script, and `prepublishOnly` runs the pre-release docs check, build, and tests before publish. Treat those flows as gated operations, not casual dev commands.

