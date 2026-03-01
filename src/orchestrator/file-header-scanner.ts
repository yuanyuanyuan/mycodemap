/**
 * 文件头注释扫描器
 * 检查 TypeScript/JavaScript 文件头是否包含 [META] 或 [WHY] 注释
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

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
  includeHighRisk?: boolean;
  highRiskPatterns?: RegExp[];
}

const DEFAULT_HIGH_RISK_PATTERNS = [
  /\/orchestrator\//,
  /\/core\//,
  /\/types\//,
  /\.test\.|\.spec\./,
];

/**
 * 扫描文件头注释
 * @param filePath - 文件路径
 * @param checkHighRisk - 是否检查高风险文件需要的 [WHY] 注释
 * @returns 扫描结果
 */
export function scanFileHeader(
  filePath: string,
  checkHighRisk: boolean = false,
  highRiskPatterns: RegExp[] = DEFAULT_HIGH_RISK_PATTERNS
): FileHeaderResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').slice(0, 20); // 只检查前 20 行

  const hasMeta = /\[META\]/i.test(lines.join('\n'));
  const hasWhy = /\[WHY\]/i.test(lines.join('\n'));

  const isHighRisk = highRiskPatterns.some((pattern) => pattern.test(filePath));

  // 通用检查：必须有 [META] 或 [WHY]
  if (!hasMeta && !hasWhy) {
    return {
      filePath,
      valid: false,
      errorCode: 'E0008',
      errorMessage: `File header missing [META] or [WHY] comment. Add a comment explaining the purpose of this file.`,
      hasMeta: false,
      hasWhy: false,
    };
  }

  // 高风险文件检查：必须有 [WHY]
  if (checkHighRisk && isHighRisk && !hasWhy) {
    return {
      filePath,
      valid: false,
      errorCode: 'E0009',
      errorMessage: `High-risk file "${filePath}" requires [WHY] comment explaining why this change is necessary.`,
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
  const { directory, includeHighRisk = true, highRiskPatterns = DEFAULT_HIGH_RISK_PATTERNS } = options;
  const results: FileHeaderResult[] = [];

  function walkDir(dir: string): void {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      // 跳过 node_modules, .git 等目录
      if (stat.isDirectory()) {
        if (entry.startsWith('.') && entry !== '.') continue;
        if (entry === 'node_modules') continue;
        if (entry === 'dist' || entry === 'build') continue;
        if (entry === '__tests__' || entry === 'test') continue;

        walkDir(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const result = scanFileHeader(fullPath, includeHighRisk, highRiskPatterns);
          results.push(result);
        }
      }
    }
  }

  walkDir(directory);
  return results;
}

/**
 * 验证并输出结果到控制台
 */
export function scanAndPrint(directory: string): void {
  const results = scanDirectory({ directory });
  let hasErrors = false;

  for (const result of results) {
    if (result.valid) {
      console.log(`✅ ${result.filePath}: OK [META: ${result.hasMeta}, WHY: ${result.hasWhy}]`);
    } else {
      console.error(`❌ ${result.errorCode}: ${result.filePath}`);
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
