// [META] since:2026-04-21 | owner:cli-team | stable:false
// [WHY] 提供可发布的内置通用 rules bundle 模板，避免把仓库私有规则直接复制到目标项目

export interface BuiltInRuleTemplate {
  category: 'commit' | 'test' | 'lint' | 'docs' | 'validation';
  fileName: string;
  content: string;
}

const RULES_BUNDLE_VERSION = 'rules-bundle-v1';

function templateHeader(title: string): string {
  return [
    `# ${title}`,
    '',
    '> Built-in mycodemap rules bundle',
    '',
  ].join('\n');
}

export function getRulesBundleVersion(): string {
  return RULES_BUNDLE_VERSION;
}

export function getBuiltInRuleTemplates(): BuiltInRuleTemplate[] {
  return [
    {
      category: 'commit',
      fileName: 'default.md',
      content: `${templateHeader('Commit Rules')}## Goal

- Keep commits focused, reviewable, and reversible.

## Rules

- One commit should represent one logical change.
- Use a clear value-first commit message format.
- Avoid bundling unrelated refactors with feature or bugfix work.
- Never commit secrets, tokens, or local machine credentials.
`,
    },
    {
      category: 'test',
      fileName: 'default.md',
      content: `${templateHeader('Testing Rules')}## Goal

- Every behavior change should come with evidence.

## Rules

- Add or update tests for new behavior and bug fixes.
- Reproduce the failure first when fixing a bug.
- Start with the smallest relevant test, then broaden coverage.
- Keep tests deterministic and independent from local state.
`,
    },
    {
      category: 'lint',
      fileName: 'default.md',
      content: `${templateHeader('Code Quality Rules')}## Goal

- Prefer simple, explicit, maintainable code.

## Rules

- Avoid \`any\` outside true boundary code; prefer specific types or \`unknown\`.
- Keep functions focused; split overly large functions before they become opaque.
- Remove unused imports and variables introduced by your change.
- Handle async work explicitly; do not leave floating promises.
`,
    },
    {
      category: 'docs',
      fileName: 'default.md',
      content: `${templateHeader('Docs & Config Rules')}## Goal

- Keep docs and user-facing configuration guidance aligned with shipped behavior.

## Rules

- Update docs when commands, flags, config keys, or output contracts change.
- Prefer concise entry docs that link to deeper references.
- Do not claim support for behavior that has not been verified in code.
- Record important migration notes when defaults or canonical paths change.
`,
    },
    {
      category: 'validation',
      fileName: 'default.md',
      content: `${templateHeader('Validation Rules')}## Goal

- Do not declare work complete without verification.

## Rules

- Run typecheck or equivalent structural validation after implementation.
- Run targeted tests for touched behavior before broader regression checks.
- Include at least one failure-mode check, not only the happy path.
- Surface remaining risks explicitly when you cannot verify them locally.
`,
    },
  ];
}

export function buildRulesSnippet(): string {
  return [
    '<!-- mycodemap-rules-bundle:start -->',
    '- `@.mycodemap/rules/commit/default.md`',
    '- `@.mycodemap/rules/test/default.md`',
    '- `@.mycodemap/rules/lint/default.md`',
    '- `@.mycodemap/rules/docs/default.md`',
    '- `@.mycodemap/rules/validation/default.md`',
    '<!-- mycodemap-rules-bundle:end -->',
  ].join('\n');
}
