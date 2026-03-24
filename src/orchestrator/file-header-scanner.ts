/**
 * [META] 文件头注释扫描器
 * [WHY] 为 pre-commit 与 CI 提供统一的 [META]/[WHY] 校验逻辑
 */

import { readFileSync } from 'fs';
import { extname } from 'path';
import {
  DEFAULT_DISCOVERY_EXCLUDES,
  createScopedIncludePatterns,
  discoverProjectFilesSync,
  resolveDiscoveryRoot
} from '../core/file-discovery.js';

export const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export interface FileHeaderResult {
  filePath: string;
  valid: boolean;
  errorCode?: 'E0008' | 'E0009';
  errorMessage?: string;
  hasMeta: boolean;
  hasWhy: boolean;
}

export interface ScanOptions {
  directory: string;
}

const DEFAULT_HIGH_RISK_PATTERNS = [
  /\/orchestrator\//,
  /\/core\//,
  /\/types\//,
  /\.test\.|\.spec\./,
];

const HEADER_SCAN_EXCLUDES = [
  ...DEFAULT_DISCOVERY_EXCLUDES,
  '**/__tests__/**',
  '**/test/**'
] as const;

function createSupportedExtensionsPattern(): string {
  const extensions = SUPPORTED_EXTENSIONS.map((extension) => extension.replace(/^\./, ''));
  return `**/*.{${extensions.join(',')}}`;
}

/**
 * 扫描文件头注释
 * @param filePath - 文件路径
 * @returns 扫描结果
 */
export function scanFileHeader(
  filePath: string
): FileHeaderResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').slice(0, 20); // 只检查前 20 行

  const hasMeta = /\[META\]/i.test(lines.join('\n'));
  const hasWhy = /\[WHY\]/i.test(lines.join('\n'));

  // 通用检查：必须有 [META]
  if (!hasMeta) {
    return {
      filePath,
      valid: false,
      errorCode: 'E0008',
      errorMessage: 'File header missing [META] comment. Add [META] metadata in the first 20 lines.',
      hasMeta: false,
      hasWhy,
    };
  }

  // 通用检查：必须有 [WHY]
  if (!hasWhy) {
    return {
      filePath,
      valid: false,
      errorCode: 'E0009',
      errorMessage: 'File header missing [WHY] comment. Explain why this file exists in the first 20 lines.',
      hasMeta,
      hasWhy: false,
    };
  }

  return {
    filePath,
    valid: true,
    hasMeta,
    hasWhy,
  };
}

/**
 * 扫描目录下的所有支持的文件
 * @param options - 扫描选项
 * @returns 扫描结果数组
 */
export function scanDirectory(options: ScanOptions): FileHeaderResult[] {
  const { directory } = options;
  const discoveryRoot = resolveDiscoveryRoot(directory);
  const includePatterns = createScopedIncludePatterns(
    discoveryRoot,
    directory,
    [createSupportedExtensionsPattern()]
  );
  const files = discoverProjectFilesSync({
    rootDir: discoveryRoot,
    include: includePatterns,
    exclude: HEADER_SCAN_EXCLUDES
  });

  return files
    .filter((filePath) => SUPPORTED_EXTENSIONS.includes(extname(filePath)))
    .map((filePath) => scanFileHeader(filePath));
}

/**
 * 验证并输出结果到控制台
 */
export function scanAndPrint(directory: string): void {
  const results = scanDirectory({ directory });
  let hasErrors = false;

  for (const result of results) {
    if (result.valid) {
      console.log(`PASS ${result.filePath}: OK [META: ${result.hasMeta}, WHY: ${result.hasWhy}]`);
    } else {
      console.error(`ERROR ${result.errorCode}: ${result.filePath}`);
      console.error(`   ${result.errorMessage}`);
      hasErrors = true;
    }
  }

  const total = results.length;
  const valid = results.filter((r) => r.valid).length;
  console.log(`\nTotal: ${total}, Valid: ${valid}, Invalid: ${total - valid}`);

  if (hasErrors) {
    process.exit(1);
  }
}

/**
 * 评估危险置信度
 * 基于代码变更的风险级别进行评估
 */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: string[];
}

/**
 * 评估代码变更的风险
 * @param changedFiles - 变更的文件列表
 * @returns 风险评估结果
 */
export function assessRisk(changedFiles: string[]): RiskAssessment {
  const factors: string[] = [];
  let riskScore = 0;

  for (const file of changedFiles) {
    // 检查是否是高风险文件
    if (DEFAULT_HIGH_RISK_PATTERNS.some((p) => p.test(file))) {
      riskScore += 2;
      factors.push(`High-risk file modified: ${file}`);
    }

    // 检查是否是测试文件
    if (/\.test\.|\.spec\./.test(file)) {
      riskScore += 1;
      factors.push(`Test file modified: ${file}`);
    }

    // 检查是否是配置文件
    if (/config|\.json$|\.yaml$|\.yml$/.test(file)) {
      riskScore += 1;
      factors.push(`Config file modified: ${file}`);
    }
  }

  let level: RiskAssessment['level'];
  let confidence: number;

  if (riskScore >= 10) {
    level = 'critical';
    confidence = 0.95;
  } else if (riskScore >= 5) {
    level = 'high';
    confidence = 0.8;
  } else if (riskScore >= 2) {
    level = 'medium';
    confidence = 0.6;
  } else {
    level = 'low';
    confidence = 0.3;
  }

  return { level, confidence, factors };
}
