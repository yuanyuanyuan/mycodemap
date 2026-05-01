// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Ghost command detection — verify echo stubs are detected and current project has none

import { describe, it, expect } from 'vitest';
import { checkGhostCommands } from '../check-ghost-commands.js';
import type { DiagnosticResult } from '../types.js';

describe('checkGhostCommands', () => {
  it('detects echo stubs in package.json scripts', () => {
    const results = checkGhostCommands('src/cli/doctor/__tests__/fixtures/stub-project');

    const ghostResults = results.filter((r: DiagnosticResult) => r.id === 'ghost-command-detected');
    expect(ghostResults).toHaveLength(2);
    expect(ghostResults[0].message).toContain('check:architecture');
    expect(ghostResults[1].message).toContain('check:unused');
    expect(ghostResults[0].severity).toBe('error');
    expect(ghostResults[0].nextCommand).toBeDefined();
  });

  it('returns ok when no echo stubs found', () => {
    const results = checkGhostCommands(process.cwd());

    const ghostErrors = results.filter((r: DiagnosticResult) => r.id === 'ghost-command-detected');
    expect(ghostErrors).toHaveLength(0);

    const okResult = results.find((r: DiagnosticResult) => r.id === 'ghost-commands-ok');
    if (okResult) {
      expect(okResult.severity).toBe('ok');
    }
  });

  it('returns error for missing package.json', () => {
    const results = checkGhostCommands('/nonexistent/path');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('package-json-missing');
    expect(results[0].severity).toBe('warn');
  });

  it('returns error for invalid package.json', () => {
    const results = checkGhostCommands('src/cli/doctor/__tests__/fixtures/invalid-json');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('package-json-invalid');
    expect(results[0].severity).toBe('error');
  });
});
