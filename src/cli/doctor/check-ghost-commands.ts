// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Ghost command detection — scans package.json scripts for echo stubs that advertise a command but don't actually run it

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DiagnosticResult } from './types.js';

/** Pattern matching echo stubs like: echo 'dependency-cruiser not installed, run: npm i -D dependency-cruiser' */
const ECHO_STUB_PATTERN = /^echo\s+['"].*not installed/i;

/** Extract the install command from echo stub text, e.g. "npm i -D dependency-cruiser" */
function extractInstallCommand(echoText: string): string | undefined {
  const runMatch = echoText.match(/run:\s*(npm\s+\S+(?:\s+\S+)*)/i);
  if (runMatch) {
    return runMatch[1].replace(/['"]\s*$/, '');
  }
  return undefined;
}

export function checkGhostCommands(rootDir: string): DiagnosticResult[] {
  const packageJsonPath = path.join(rootDir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return [
      {
        category: 'install',
        severity: 'warn',
        id: 'package-json-missing',
        message: 'No package.json found in project root',
        remediation: 'Run npm init to create a package.json, or run codemap doctor from the project root',
      },
    ];
  }

  let packageJson: Record<string, unknown>;
  try {
    const raw = readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [
      {
        category: 'install',
        severity: 'error',
        id: 'package-json-invalid',
        message: 'package.json exists but cannot be parsed as JSON',
        remediation: 'Fix the JSON syntax errors in package.json',
      },
    ];
  }

  const scripts = packageJson.scripts as Record<string, string> | undefined;
  if (!scripts || typeof scripts !== 'object') {
    return [
      {
        category: 'install',
        severity: 'ok',
        id: 'ghost-commands-ok',
        message: 'No scripts found in package.json',
        remediation: 'No action needed',
      },
    ];
  }

  const results: DiagnosticResult[] = [];

  for (const [scriptName, scriptValue] of Object.entries(scripts)) {
    if (typeof scriptValue !== 'string') {
      continue;
    }

    if (ECHO_STUB_PATTERN.test(scriptValue)) {
      const nextCommand = extractInstallCommand(scriptValue);
      results.push({
        category: 'install',
        severity: 'error',
        id: 'ghost-command-detected',
        message: `Script "${scriptName}" is an echo stub, not a real command`,
        remediation: 'Install the missing dependency or remove the script from package.json',
        nextCommand,
      });
    }
  }

  if (results.length === 0) {
    return [
      {
        category: 'install',
        severity: 'ok',
        id: 'ghost-commands-ok',
        message: 'No ghost commands detected in package.json scripts',
        remediation: 'No action needed',
      },
    ];
  }

  return results;
}
