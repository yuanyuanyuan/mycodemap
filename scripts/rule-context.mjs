#!/usr/bin/env node

import path from 'node:path';

const USAGE = 'Usage: node scripts/rule-context.mjs --files <path> [<path>...] --format json|prompt';
const DEFAULT_VERIFY_COMMANDS = ['python3 scripts/validate-rules.py code --report-only'];

const ROUTES = [
  {
    matches: filePath => filePath.endsWith('.test.ts'),
    rules: ['docs/rules/testing.md'],
  },
  {
    matches: filePath => /^src\/interface\//.test(filePath),
    rules: ['docs/rules/architecture-guardrails.md'],
  },
  {
    matches: filePath => /^src\/(?:cli|domain|server|infrastructure)\//.test(filePath),
    rules: [
      'docs/rules/code-quality-redlines.md',
      'docs/rules/architecture-guardrails.md',
    ],
  },
  {
    matches: filePath =>
      /^(?:docs\/|\.githooks\/|\.github\/workflows\/)/.test(filePath),
    rules: [
      'docs/rules/validation.md',
      'docs/rules/engineering-with-codex-openai.md',
    ],
  },
];

function normalizeFilePath(filePath) {
  const resolved = path.isAbsolute(filePath)
    ? path.relative(process.cwd(), filePath)
    : filePath;

  return resolved.replace(/\\/g, '/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const files = [];
  let format = 'json';

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--files') {
      index += 1;
      while (index < argv.length && !argv[index].startsWith('--')) {
        files.push(argv[index]);
        index += 1;
      }
      index -= 1;
      continue;
    }

    if (current === '--format') {
      format = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (current === '--help' || current === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
  }

  if (files.length === 0 || (format !== 'json' && format !== 'prompt')) {
    console.error(USAGE);
    process.exit(1);
  }

  return {
    files: files.map(normalizeFilePath),
    format,
  };
}

function inferScopedRules(files) {
  const matchedRules = [];
  const matchedFiles = [];

  for (const filePath of files) {
    const route = ROUTES.find(candidate => candidate.matches(filePath));
    if (!route) {
      continue;
    }

    matchedFiles.push(filePath);

    for (const rulePath of route.rules) {
      if (!matchedRules.includes(rulePath)) {
        matchedRules.push(rulePath);
      }

      if (matchedRules.length === 2) {
        return matchedRules.length === 0
          ? { files, matchedFiles: [], matchedRules: [], verifyCommands: [] }
          : {
              files,
              matchedFiles,
              matchedRules,
              verifyCommands: DEFAULT_VERIFY_COMMANDS,
            };
      }
    }
  }

  return matchedRules.length === 0
    ? { files, matchedFiles: [], matchedRules: [], verifyCommands: [] }
    : {
        files,
        matchedFiles,
        matchedRules,
        verifyCommands: DEFAULT_VERIFY_COMMANDS,
      };
}

function formatPrompt(result) {
  if (result.matchedRules.length === 0) {
    return 'No scoped rules inferred';
  }

  return [
    'Only inject matched rules:',
    ...result.matchedRules.map(rulePath => `- ${rulePath}`),
    '',
    'Verify after edits:',
    ...result.verifyCommands.map(command => `- ${command}`),
  ].join('\n');
}

const args = parseArgs(process.argv.slice(2));
const result = inferScopedRules(args.files);

if (args.format === 'prompt') {
  console.log(formatPrompt(result));
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      files: result.files,
      matchedFiles: result.matchedFiles,
      matchedRules: result.matchedRules,
      verifyCommands: result.verifyCommands,
    },
    null,
    2,
  ),
);
