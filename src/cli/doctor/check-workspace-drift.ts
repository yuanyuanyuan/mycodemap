// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Workspace drift detection — compares init-last.json receipt asset paths against actual filesystem state

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DiagnosticResult } from './types.js';

interface ReceiptAsset {
  key: string;
  label: string;
  status: string;
  ownership: string;
  path?: string;
}

interface InitReceipt {
  version: number;
  assets: ReceiptAsset[];
}

const RECEIPT_RELATIVE_PATH = '.mycodemap/status/init-last.json';

export function checkWorkspaceDrift(rootDir: string): DiagnosticResult[] {
  const receiptPath = path.join(rootDir, RECEIPT_RELATIVE_PATH);

  if (!existsSync(receiptPath)) {
    return [
      {
        category: 'config',
        severity: 'warn',
        id: 'workspace-not-initialized',
        message: 'No init receipt found — workspace has not been initialized',
        remediation: "Run 'codemap init' to create the workspace",
        nextCommand: 'mycodemap init',
      },
    ];
  }

  let receipt: InitReceipt;
  try {
    const raw = readFileSync(receiptPath, 'utf8');
    receipt = JSON.parse(raw) as InitReceipt;
  } catch {
    return [
      {
        category: 'config',
        severity: 'error',
        id: 'receipt-invalid',
        message: 'init-last.json exists but cannot be parsed',
        remediation: "Run 'codemap init' to regenerate the receipt",
        nextCommand: 'mycodemap init',
      },
    ];
  }

  if (!Array.isArray(receipt.assets)) {
    return [
      {
        category: 'config',
        severity: 'error',
        id: 'receipt-invalid',
        message: 'init-last.json has no assets array',
        remediation: "Run 'codemap init' to regenerate the receipt",
        nextCommand: 'mycodemap init',
      },
    ];
  }

  const driftResults: DiagnosticResult[] = [];

  for (const asset of receipt.assets) {
    if (!asset.path) {
      continue;
    }

    const absolutePath = path.resolve(rootDir, asset.path);
    if (!existsSync(absolutePath)) {
      const relativePath = path.relative(rootDir, absolutePath);
      const isToolOwned = asset.ownership === 'tool-owned';
      driftResults.push({
        category: 'config',
        severity: isToolOwned ? 'error' : 'warn',
        id: 'workspace-drift-detected',
        message: `Receipt asset "${asset.key}" (${asset.label}) not found at ${relativePath}`,
        remediation: isToolOwned
          ? "Run 'codemap init' to recreate missing tool-owned files"
          : 'Verify if the file was intentionally removed, or run codemap init to recreate it',
        nextCommand: isToolOwned ? 'mycodemap init' : undefined,
      });
    }
  }

  if (driftResults.length === 0) {
    return [
      {
        category: 'config',
        severity: 'ok',
        id: 'workspace-drift-ok',
        message: 'All receipt assets match the filesystem',
        remediation: 'No action needed',
      },
    ];
  }

  return driftResults;
}
