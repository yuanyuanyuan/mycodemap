#!/usr/bin/env tsx
/**
 * 任务质量门禁脚本
 * 验证任务四件套完整性和规范符合性
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

interface GateResult {
  taskId: string;
  taskPath: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface GateSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  warnings: number;
}

const TRIAD_FILES = [
  'TRIAD_ROLES.yaml',
  'TRIAD_WORKFLOW.md',
  'TRIAD_ACCEPTANCE.md',
  'SUPERVISOR_SEMANTIC_REVIEW.md',
];

// 检查文件是否存在
function checkFileExists(taskPath: string, filename: string): boolean {
  return existsSync(join(taskPath, filename));
}

// 检查 SCORING.md 总分是否为 100
function checkScoringTotal(taskPath: string): { valid: boolean; total: number; errors: string[] } {
  const scoringPath = join(taskPath, 'SCORING.md');
  if (!existsSync(scoringPath)) {
    return { valid: false, total: 0, errors: ['SCORING.md 不存在'] };
  }

  const content = readFileSync(scoringPath, 'utf-8');
  // 匹配表格中的分值行，格式: | L1-1 | desc | 20 | method | 自动 |
  const matches = content.match(/\|\s*L\d+-\d+\s*\|[^|]+\|\s*(\d+)\s*\|[^|]+\|\s*自动\s*\|/g);
  
  if (!matches) {
    return { valid: false, total: 0, errors: ['无法解析分值'] };
  }

  let total = 0;
  for (const match of matches) {
    // 从匹配中提取分值（第三个 | 后面的数字）
    const parts = match.split('|');
    if (parts.length >= 4) {
      const value = parseInt(parts[3].trim());
      if (!isNaN(value)) {
        total += value;
      }
    }
  }

  const errors: string[] = [];
  if (total !== 100) {
    errors.push(`SCORING.md 总分 ${total} ≠ 100`);
  }

  return { valid: total === 100, total, errors };
}

// 检查 PROMPT.md 是否包含必要章节
function checkPromptStructure(taskPath: string): { valid: boolean; errors: string[] } {
  const promptPath = join(taskPath, 'PROMPT.md');
  if (!existsSync(promptPath)) {
    return { valid: false, errors: ['PROMPT.md 不存在'] };
  }

  const content = readFileSync(promptPath, 'utf-8');
  const requiredSections = [
    '## 背景',
    '## 要求',
    '## 初始状态',
    '## 约束条件',
    '## 验收标准',
    '## 用户价值',
    '## 反例场景',
  ];

  const errors: string[] = [];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`PROMPT.md 缺少章节: ${section}`);
    }
  }

  // 检查是否包含关键词
  if (!content.includes('Prefer retrieval-led reasoning')) {
    errors.push('PROMPT.md 缺少 "Prefer retrieval-led reasoning" 提示');
  }

  return { valid: errors.length === 0, errors };
}

// 检查 EVAL.ts 是否包含分层检查点
function checkEvalStructure(taskPath: string): { valid: boolean; errors: string[] } {
  const evalPath = join(taskPath, 'EVAL.ts');
  if (!existsSync(evalPath)) {
    return { valid: false, errors: ['EVAL.ts 不存在'] };
  }

  const content = readFileSync(evalPath, 'utf-8');
  const requiredLevels = ['L0', 'L1', 'L2', 'L3', 'L4'];

  const errors: string[] = [];
  for (const level of requiredLevels) {
    // L4 可以是 [L4] 或 [L4-xxx] 格式
    const pattern = level === 'L4' 
      ? new RegExp(`\\[${level}[^\\]]*\\]`)
      : new RegExp(`\\[${level}[^\\]]*\\]`);
    if (!pattern.test(content)) {
      errors.push(`EVAL.ts 缺少 ${level} 级别检查点`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// 检查 task-metadata.yaml 是否有效
function checkMetadata(taskPath: string): { valid: boolean; errors: string[] } {
  const metadataPath = join(taskPath, 'task-metadata.yaml');
  if (!existsSync(metadataPath)) {
    return { valid: false, errors: ['task-metadata.yaml 不存在'] };
  }

  const content = readFileSync(metadataPath, 'utf-8');
  const requiredFields = [
    'task_id:',
    'task_name:',
    'version:',
    'difficulty:',
    'workflow:',
    'triad:',
    'generator:',
    'qa:',
    'supervisor:',
    'agent_definition:',
    'semantic_review:',
    'prompt_template:',
    'report_file:',
    'critical_failures:',
    'approved:',
  ];

  const errors: string[] = [];
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      errors.push(`task-metadata.yaml 缺少字段: ${field}`);
    }
  }

  const requestedCountMatch = content.match(/^\s*requested_count:\s*(\d+)\s*$/m);
  if (!requestedCountMatch) {
    errors.push('task-metadata.yaml 缺少 workflow.batch.requested_count');
  } else {
    const requestedCount = Number(requestedCountMatch[1]);
    if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
      errors.push('workflow.batch.requested_count 必须是正整数');
    } else if (requestedCount > 5) {
      errors.push(`workflow.batch.requested_count 超过上限 5（实际: ${requestedCount}）`);
    }
  }

  if (!/^\s*max_allowed:\s*5\s*$/m.test(content)) {
    errors.push('workflow.batch.max_allowed 必须为 5');
  }

  for (const role of ['generator', 'qa', 'supervisor']) {
    const rolePattern = new RegExp(`^\\s*${role}:\\s*$`, 'm');
    if (!rolePattern.test(content)) {
      errors.push(`workflow.triad.${role} 缺失`);
      continue;
    }

    const statusPattern = new RegExp(
      `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+status:\\s*(?:["']?completed["']?)\\b`,
      'm',
    );
    if (!statusPattern.test(content)) {
      errors.push(`workflow.triad.${role}.status 必须为 completed`);
    }

    const evidencePattern = new RegExp(
      `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+evidence:\\s*.+`,
      'm',
    );
    if (!evidencePattern.test(content)) {
      errors.push(`workflow.triad.${role}.evidence 必须非空`);
    }
  }

  if (!/^\s*approved:\s*true\s*$/m.test(content)) {
    errors.push('workflow.approved 必须为 true');
  }

  for (const role of ['generator', 'qa', 'supervisor']) {
    const agentDefPattern = new RegExp(
      `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+agent_definition:\\s*.+`,
      'm',
    );
    if (!agentDefPattern.test(content)) {
      errors.push(`workflow.triad.${role}.agent_definition 必须存在`);
    }
  }

  const semanticScoreMatch = content.match(
    /\n\s*semantic_review:\s*\n(?:\s+.*\n)*?\s+score:\s*(\d+)\s*$/m,
  );
  const semanticThresholdMatch = content.match(
    /\n\s*semantic_review:\s*\n(?:\s+.*\n)*?\s+threshold:\s*(\d+)\s*$/m,
  );
  const semanticStatusMatch = content.match(
    /\n\s*semantic_review:\s*\n(?:\s+.*\n)*?\s+status:\s*["']?(completed|failed|pending)["']?\s*$/m,
  );
  if (!semanticScoreMatch) {
    errors.push('workflow.triad.supervisor.semantic_review.score 缺失');
  }
  if (!semanticThresholdMatch) {
    errors.push('workflow.triad.supervisor.semantic_review.threshold 缺失');
  }
  if (!semanticStatusMatch) {
    errors.push('workflow.triad.supervisor.semantic_review.status 缺失');
  }

  if (semanticScoreMatch && semanticThresholdMatch) {
    const score = Number(semanticScoreMatch[1]);
    const threshold = Number(semanticThresholdMatch[1]);
    if (Number.isFinite(score) && Number.isFinite(threshold) && score < threshold) {
      errors.push(`supervisor 语义评分未达阈值（score=${score}, threshold=${threshold}）`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function parseRoleAgent(metadataContent: string, role: string): string | null {
  const pattern = new RegExp(
    `\\n\\s*${role}:\\s*\\n(?:\\s+.*\\n)*?\\s+agent:\\s*["']?([^"\\n']+)`,
    'm',
  );
  const matched = metadataContent.match(pattern);
  return matched ? matched[1].trim() : null;
}

function checkAgentDefinitions(
  taskPath: string,
  metadataContent: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const projectRoot = resolve(taskPath, '..', '..');
  const agentsDir = join(projectRoot, '.agents');

  if (!existsSync(agentsDir)) {
    return {
      valid: false,
      errors: [`缺少 .agents 目录: ${agentsDir}`],
    };
  }

  const roleNames = ['generator', 'qa', 'supervisor'];
  for (const role of roleNames) {
    const agentName = parseRoleAgent(metadataContent, role);
    if (!agentName) {
      errors.push(`无法从 metadata 解析 workflow.triad.${role}.agent`);
      continue;
    }
    const agentDefinition = join(agentsDir, `${agentName}.agent.md`);
    if (!existsSync(agentDefinition)) {
      errors.push(`缺少 ${role} agent 定义: ${agentDefinition}`);
    }
  }

  const supervisorName = parseRoleAgent(metadataContent, 'supervisor');
  if (supervisorName) {
    const semanticPrompt = join(agentsDir, `${supervisorName}.semantic.prompt.md`);
    if (!existsSync(semanticPrompt)) {
      errors.push(`缺少 supervisor 语义引擎模板: ${semanticPrompt}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkSupervisorSemanticReport(taskPath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const reportPath = join(taskPath, 'SUPERVISOR_SEMANTIC_REVIEW.md');
  if (!existsSync(reportPath)) {
    errors.push('缺少文件: SUPERVISOR_SEMANTIC_REVIEW.md');
    return { valid: false, errors };
  }

  const content = readFileSync(reportPath, 'utf-8');
  for (const marker of ['## Semantic Dimensions', '## Critical Failure Modes', '## Decision']) {
    if (!content.includes(marker)) {
      errors.push(`SUPERVISOR_SEMANTIC_REVIEW.md 缺少章节: ${marker}`);
    }
  }

  const scoreMatch = content.match(/^- score:\s*(\d+)\s*$/m);
  const thresholdMatch = content.match(/^- threshold:\s*(\d+)\s*$/m);
  const passedMatch = content.match(/^- passed:\s*(true|false)\s*$/m);

  if (!scoreMatch || !thresholdMatch || !passedMatch) {
    errors.push('SUPERVISOR_SEMANTIC_REVIEW.md 缺少 score/threshold/passed 结果');
  } else {
    const score = Number(scoreMatch[1]);
    const threshold = Number(thresholdMatch[1]);
    const passed = passedMatch[1] === 'true';
    if (score < threshold) {
      errors.push(`SUPERVISOR_SEMANTIC_REVIEW 分数不足（score=${score}, threshold=${threshold}）`);
    }
    if (!passed) {
      errors.push('SUPERVISOR_SEMANTIC_REVIEW passed=false');
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkTriadFiles(taskPath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const file of TRIAD_FILES) {
    if (!existsSync(join(taskPath, file))) {
      errors.push(`缺少文件: ${file}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const roles = readFileSync(join(taskPath, 'TRIAD_ROLES.yaml'), 'utf-8');
  const workflow = readFileSync(join(taskPath, 'TRIAD_WORKFLOW.md'), 'utf-8');
  const acceptance = readFileSync(join(taskPath, 'TRIAD_ACCEPTANCE.md'), 'utf-8');

  for (const marker of ['generator:', 'qa:', 'supervisor:']) {
    if (!roles.includes(marker)) {
      errors.push(`TRIAD_ROLES.yaml 缺少角色定义: ${marker}`);
    }
  }

  for (const marker of ['## generator', '## qa', '## supervisor']) {
    if (!workflow.includes(marker)) {
      errors.push(`TRIAD_WORKFLOW.md 缺少章节: ${marker}`);
    }
  }

  for (const marker of ['## Hard Constraints', '## Artifact Checklist', '## Automated Validation']) {
    if (!acceptance.includes(marker)) {
      errors.push(`TRIAD_ACCEPTANCE.md 缺少章节: ${marker}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// 验证单个任务
function validateTask(taskPath: string, taskId: string): GateResult {
  const result: GateResult = {
    taskId,
    taskPath,
    passed: true,
    errors: [],
    warnings: [],
  };

  // 检查四件套文件存在性
  const requiredFiles = ['PROMPT.md', 'EVAL.ts', 'SCORING.md', 'task-metadata.yaml', ...TRIAD_FILES];
  for (const file of requiredFiles) {
    if (!checkFileExists(taskPath, file)) {
      result.errors.push(`缺少文件: ${file}`);
      result.passed = false;
    }
  }

  // 检查 SCORING.md 总分
  const scoringCheck = checkScoringTotal(taskPath);
  if (!scoringCheck.valid) {
    result.errors.push(...scoringCheck.errors);
    result.passed = false;
  }

  // 检查 PROMPT.md 结构
  const promptCheck = checkPromptStructure(taskPath);
  if (!promptCheck.valid) {
    result.errors.push(...promptCheck.errors);
    result.passed = false;
  }

  // 检查 EVAL.ts 结构
  const evalCheck = checkEvalStructure(taskPath);
  if (!evalCheck.valid) {
    result.errors.push(...evalCheck.errors);
    result.passed = false;
  }

  // 检查 task-metadata.yaml
  const metadataCheck = checkMetadata(taskPath);
  if (!metadataCheck.valid) {
    result.errors.push(...metadataCheck.errors);
    result.passed = false;
  }

  const metadataContent = checkFileExists(taskPath, 'task-metadata.yaml')
    ? readFileSync(join(taskPath, 'task-metadata.yaml'), 'utf-8')
    : '';
  if (metadataContent) {
    const agentCheck = checkAgentDefinitions(taskPath, metadataContent);
    if (!agentCheck.valid) {
      result.errors.push(...agentCheck.errors);
      result.passed = false;
    }
  }

  const triadCheck = checkTriadFiles(taskPath);
  if (!triadCheck.valid) {
    result.errors.push(...triadCheck.errors);
    result.passed = false;
  }

  const semanticCheck = checkSupervisorSemanticReport(taskPath);
  if (!semanticCheck.valid) {
    result.errors.push(...semanticCheck.errors);
    result.passed = false;
  }

  return result;
}

// 查找所有任务目录
function findTaskDirs(tasksDir: string): string[] {
  const dirs: string[] = [];
  
  if (!existsSync(tasksDir)) {
    return dirs;
  }

  const entries = readdirSync(tasksDir);
  for (const entry of entries) {
    const fullPath = join(tasksDir, entry);
    const stat = statSync(fullPath);
    
    // 支持多种任务命名格式: M1-001-*, M2-005-*, INT-083-*, etc.
    // 格式: [模块前缀][数字]-[序号]-[描述]
    if (stat.isDirectory() && entry.match(/^[A-Z]+\d*-\d+-.+/)) {
      dirs.push(fullPath);
    }
  }

  return dirs;
}

// 主函数
function main() {
  const tasksDir = resolve(process.cwd(), '.tasks');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           CodeMap 任务质量门禁检查');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 查找所有任务
  const taskDirs = findTaskDirs(tasksDir);
  console.log(`找到 ${taskDirs.length} 个任务目录\n`);

  if (taskDirs.length === 0) {
    console.log('❌ 未找到任何任务目录');
    process.exit(1);
  }

  // 验证每个任务
  const results: GateResult[] = [];
  for (const taskDir of taskDirs.sort()) {
    const taskId = taskDir.split('/').pop() || 'unknown';
    const result = validateTask(taskDir, taskId);
    results.push(result);
  }

  // 输出结果
  let passedCount = 0;
  let failedCount = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    if (result.passed) {
      passedCount++;
      console.log(`✅ ${result.taskId}`);
    } else {
      failedCount++;
      console.log(`\n❌ ${result.taskId}`);
      for (const error of result.errors) {
        console.log(`   - ${error}`);
        totalErrors++;
      }
      for (const warning of result.warnings) {
        console.log(`   ⚠️  ${warning}`);
        totalWarnings++;
      }
    }
  }

  // 汇总
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                      检查汇总');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`总任务数: ${results.length}`);
  console.log(`通过: ${passedCount} ✅`);
  console.log(`失败: ${failedCount} ❌`);
  console.log(`错误数: ${totalErrors}`);
  console.log(`警告数: ${totalWarnings}`);
  console.log('═══════════════════════════════════════════════════════════');

  // 检查持久上下文块
  console.log('\n📋 持久上下文块检查:');
  
  const agentsPath = resolve(process.cwd(), 'AGENTS.md');
  const claudePath = resolve(process.cwd(), 'CLAUDE.md');
  
  let contextFound = false;
  
  if (existsSync(agentsPath)) {
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    if (agentsContent.includes('TASK-GENERATOR-CONTEXT-START')) {
      console.log('  ✅ AGENTS.md 包含持久上下文块');
      contextFound = true;
    } else {
      console.log('  ❌ AGENTS.md 缺少持久上下文块');
    }
  }
  
  if (existsSync(claudePath)) {
    const claudeContent = readFileSync(claudePath, 'utf-8');
    if (claudeContent.includes('TASK-GENERATOR-CONTEXT-START')) {
      console.log('  ✅ CLAUDE.md 包含持久上下文块');
      contextFound = true;
    } else {
      console.log('  ❌ CLAUDE.md 缺少持久上下文块');
    }
  }

  // 最终结果
  console.log('\n═══════════════════════════════════════════════════════════');
  if (failedCount === 0 && contextFound) {
    console.log('✅ 质量门禁通过！');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('❌ 质量门禁未通过');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main();
