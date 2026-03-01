import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { scanFileHeader, scanDirectory } from '../file-header-scanner';

describe('file-header-scanner', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'codemap-header-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('accepts file when both [META] and [WHY] exist', () => {
    const file = join(root, 'valid.ts');
    writeFileSync(file, '// [META] since:2026-03 owner:core stable:false\n// [WHY] test\nexport const a = 1;\n');

    const result = scanFileHeader(file);
    expect(result.valid).toBe(true);
    expect(result.hasMeta).toBe(true);
    expect(result.hasWhy).toBe(true);
  });

  it('fails with E0008 when [META] is missing', () => {
    const file = join(root, 'missing-meta.ts');
    writeFileSync(file, '// [WHY] test\nexport const a = 1;\n');

    const result = scanFileHeader(file);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('E0008');
  });

  it('fails with E0009 when [WHY] is missing', () => {
    const file = join(root, 'missing-why.ts');
    writeFileSync(file, '// [META] since:2026-03 owner:core stable:false\nexport const a = 1;\n');

    const result = scanFileHeader(file);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('E0009');
  });

  it('scanDirectory reports invalid files when required headers are missing', () => {
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });

    writeFileSync(
      join(srcDir, 'ok.ts'),
      '// [META] since:2026-03 owner:core stable:false\n// [WHY] test\nexport const ok = true;\n'
    );
    writeFileSync(join(srcDir, 'bad.ts'), '// [META] since:2026-03 owner:core stable:false\nexport const bad = true;\n');

    const results = scanDirectory({ directory: srcDir });
    expect(results).toHaveLength(2);
    expect(results.some((r) => r.valid === false && r.errorCode === 'E0009')).toBe(true);
  });
});
