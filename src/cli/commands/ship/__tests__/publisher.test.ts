import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock, fileStore } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  fileStore: {} as Record<string, string>
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock
}));

vi.mock('fs', () => ({
  existsSync: (filePath: string) => Object.prototype.hasOwnProperty.call(fileStore, filePath),
  readFileSync: (filePath: string) => {
    if (!(filePath in fileStore)) {
      throw new Error(`ENOENT: ${filePath}`);
    }
    return fileStore[filePath];
  },
  writeFileSync: (filePath: string, content: string | Buffer) => {
    fileStore[filePath] = typeof content === 'string' ? content : content.toString('utf-8');
  }
}));

import { publish } from '../publisher.js';
import type { AnalyzeResult } from '../analyzer.js';

function writeJson(filePath: string, data: unknown): void {
  fileStore[filePath] = `${JSON.stringify(data, null, 2)}\n`;
}

describe('ship publisher', () => {
  const analyzeResult: AnalyzeResult = {
    commits: [
      { hash: 'abc1234', type: 'bugfix', message: 'ship: 修复 workflow 监控', isBreaking: false },
      { hash: 'def5678', type: 'docs', message: 'docs: 更新发布说明', isBreaking: false }
    ],
    summary: {
      features: 0,
      bugfixes: 1,
      refactors: 0,
      docs: 1,
      other: 0
    },
    versionType: 'patch',
    breakingChanges: false,
    changedFiles: ['src/cli/commands/ship/monitor.ts', 'docs/PUBLISHING.md'],
    lastTag: 'v0.4.0',
    commitsSinceTag: 2
  };

  beforeEach(() => {
    Object.keys(fileStore).forEach(key => delete fileStore[key]);

    writeJson('package.json', { name: '@mycodemap/mycodemap', version: '0.4.0' });
    writeJson('package-lock.json', { name: '@mycodemap/mycodemap', version: '0.4.0', lockfileVersion: 3 });
    fileStore['AI_GUIDE.md'] = '> 版本: 0.4.0 (MVP3)\n';
    fileStore['AI_DISCOVERY.md'] = '{\n  "version": "0.4.0"\n}\n';
    fileStore['llms.txt'] = '> 版本: 0.4.0 (MVP3)\n';
    fileStore['ai-document-index.yaml'] = 'project:\n  version: "0.4.0"\ncompatibility:\n  current: "0.4.0"\n  min_supported: "0.4.0"\n';
    fileStore['CHANGELOG.md'] = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';

    execSyncMock.mockReset();
    execSyncMock.mockImplementation((command: string, options?: { encoding?: string }) => {
      if (command.startsWith('npm version ')) {
        const version = command.replace('npm version ', '').replace(' --no-git-tag-version', '').trim();
        writeJson('package.json', { name: '@mycodemap/mycodemap', version });
        writeJson('package-lock.json', { name: '@mycodemap/mycodemap', version, lockfileVersion: 3 });
        return options?.encoding ? version : Buffer.from(version);
      }

      if (command === 'git rev-parse HEAD') {
        return options?.encoding ? 'abc123head\n' : Buffer.from('abc123head\n');
      }

      if (command === 'git remote get-url origin') {
        return options?.encoding
          ? 'git@github.com:yuanyuanyuan/mycodemap.git\n'
          : Buffer.from('git@github.com:yuanyuanyuan/mycodemap.git\n');
      }

      return options?.encoding ? '' : Buffer.from('');
    });
  });

  afterEach(() => {
    Object.keys(fileStore).forEach(key => delete fileStore[key]);
  });

  it('should prepare release commit and trigger remote workflow via tag push', async () => {
    const result = await publish('0.4.1', { analyzeResult });

    expect(result.success).toBe(true);
    expect(result.tagName).toBe('v0.4.1');
    expect(result.releaseUrl).toBe('https://github.com/yuanyuanyuan/mycodemap/releases/tag/v0.4.1');

    expect(fileStore['AI_DISCOVERY.md']).toContain('"version": "0.4.1"');
    expect(fileStore['ai-document-index.yaml']).toContain('version: "0.4.1"');
    expect(fileStore['CHANGELOG.md']).toContain('## [0.4.1]');
    expect(fileStore['CHANGELOG.md']).toContain('ship: 修复 workflow 监控');

    const commands = execSyncMock.mock.calls.map(call => call[0] as string);
    expect(commands.some(command => command.includes('npm publish'))).toBe(false);
    expect(commands).toContain('git push origin HEAD tag v0.4.1');
    expect(commands.some(command => command.includes('package-lock.json'))).toBe(true);
    expect(commands.some(command => command.includes('AI_DISCOVERY.md'))).toBe(true);
  });

  it('should fallback to HTTPS push when SSH port 22 is unavailable', async () => {
    execSyncMock.mockImplementation((command: string, options?: { encoding?: string }) => {
      if (command.startsWith('npm version ')) {
        const version = command.replace('npm version ', '').replace(' --no-git-tag-version', '').trim();
        writeJson('package.json', { name: '@mycodemap/mycodemap', version });
        writeJson('package-lock.json', { name: '@mycodemap/mycodemap', version, lockfileVersion: 3 });
        return options?.encoding ? version : Buffer.from(version);
      }

      if (command === 'git rev-parse HEAD') {
        return options?.encoding ? 'abc123head\n' : Buffer.from('abc123head\n');
      }

      if (command === 'git remote get-url origin') {
        return options?.encoding
          ? 'git@github.com:yuanyuanyuan/mycodemap.git\n'
          : Buffer.from('git@github.com:yuanyuanyuan/mycodemap.git\n');
      }

      if (command === 'git push origin HEAD tag v0.4.1') {
        const error = new Error('push failed');
        Object.assign(error, {
          stderr: Buffer.from('ssh: connect to host github.com port 22: Connection timed out\nfatal: Could not read from remote repository.\n')
        });
        throw error;
      }

      if (command.includes('http.extraheader="AUTHORIZATION: basic $BASIC" push https://github.com/yuanyuanyuan/mycodemap.git HEAD tag v0.4.1')) {
        return options?.encoding ? '' : Buffer.from('');
      }

      return options?.encoding ? '' : Buffer.from('');
    });

    const result = await publish('0.4.1', { analyzeResult });

    expect(result.success).toBe(true);
    const commands = execSyncMock.mock.calls.map(call => call[0] as string);
    expect(commands).toContain('git push origin HEAD tag v0.4.1');
    expect(commands.some(command => command.includes('https://github.com/yuanyuanyuan/mycodemap.git'))).toBe(true);
  });
});
