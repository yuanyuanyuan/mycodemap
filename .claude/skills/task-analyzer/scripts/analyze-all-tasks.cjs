#!/usr/bin/env node
/**
 * 任务分析器 - 扫描所有任务并生成审计报告
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const TASKS_DIR = '.tasks';
const OUTPUT_FILE = 'ANALYSIS_REPORT.md';

function scanTasks() {
  const tasks = [];

  if (!fs.existsSync(TASKS_DIR)) {
    console.error(`Tasks directory not found: ${TASKS_DIR}`);
    return tasks;
  }

  const entries = fs.readdirSync(TASKS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metadataPath = path.join(TASKS_DIR, entry.name, 'task-metadata.yaml');
    if (!fs.existsSync(metadataPath)) continue;

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const meta = yaml.parse(content);

      const workflow = meta.workflow || {};
      const triad = workflow.triad || {};
      const execution = meta.execution || {};

      const hasTriad = !!(triad.generator && triad.qa && triad.supervisor);
      const triadComplete = hasTriad &&
        triad.generator?.status === 'completed' &&
        triad.qa?.status === 'completed' &&
        triad.supervisor?.status === 'completed';

      const semanticScore = triad.supervisor?.semantic_review?.score || null;
      const score = execution.final_score || semanticScore;

      tasks.push({
        name: meta.metadata?.task_name || entry.name,
        path: entry.name,
        hasTriad,
        triadComplete,
        hasExecution: !!execution.status,
        executionStatus: execution.status || null,
        score,
        semanticScore
      });
    } catch (err) {
      console.error(`Error parsing ${metadataPath}:`, err);
    }
  }

  return tasks;
}

function generateReport(tasks) {
  const total = tasks.length;
  const triadComplete = tasks.filter(t => t.triadComplete).length;
  const executionComplete = tasks.filter(t => t.executionStatus === 'completed').length;
  const pending = tasks.filter(t => !t.executionStatus || t.executionStatus === 'pending').length;

  let report = `# 任务审计报告

> 生成时间: ${new Date().toISOString()}
> 扫描任务数: ${total}

---

## 执行摘要

| 指标 | 数值 |
|------|------|
| 扫描任务数 | ${total} |
| Triad 完成 | ${triadComplete}/${total} (${Math.round(triadComplete/total*100)}%) |
| 执行完成 | ${executionComplete}/${total} (${Math.round(executionComplete/total*100)}%) |
| 待执行 | ${pending} |

---

## 任务状态清单

| 任务 | Triad | 执行状态 | 得分 |
|------|-------|----------|------|
`;

  for (const task of tasks) {
    const triadStatus = task.triadComplete ? '✅' : '⚠️';
    const execStatus = task.executionStatus === 'completed' ? '✅' :
                       task.executionStatus === 'failed' ? '❌' : '⏳';
    const score = task.score || '-';
    report += `| ${task.name} | ${triadStatus} | ${execStatus} | ${score} |\n`;
  }

  // 问题清单
  const blockingTasks = tasks.filter(t => !t.triadComplete || t.executionStatus === 'failed');
  const warningTasks = tasks.filter(t => t.executionStatus === 'pending' || t.executionStatus === null);

  report += `\n## 问题分级\n\n`;

  if (blockingTasks.length > 0) {
    report += `### 🔴 BLOCKING (${blockingTasks.length}个)\n\n`;
    report += `| 任务 | 问题 | 建议操作 |\n|------|------|----------|\n`;
    for (const task of blockingTasks) {
      const issue = !task.triadComplete ? 'Triad未完成' : '执行失败';
      report += `| ${task.name} | ${issue} | 完成Triad或重新执行 |\n`;
    }
    report += '\n';
  }

  if (warningTasks.length > 0) {
    report += `### 🟡 WARNING (${warningTasks.length}个)\n\n`;
    report += `| 任务 | 问题 | 建议操作 |\n|------|------|----------|\n`;
    for (const task of warningTasks) {
      const issue = !task.executionStatus ? '未执行' : '待处理';
      report += `| ${task.name} | ${issue} | 执行任务 |\n`;
    }
    report += '\n';
  }

  // 修复计划
  report += `## 修复计划\n\n`;
  report += `### 阶段1: 修复 BLOCKING 问题\n`;
  for (const task of blockingTasks) {
    report += `- [ ] ${task.name}: ${!task.triadComplete ? '完成Triad审核' : '重新执行任务'}\n`;
  }
  report += `\n### 阶段2: 执行待处理任务\n`;
  for (const task of warningTasks) {
    report += `- [ ] ${task.name}: 执行任务验收\n`;
  }

  return report;
}

function main() {
  console.log('🔍 扫描任务...');
  const tasks = scanTasks();
  console.log(`找到 ${tasks.length} 个任务`);

  const report = generateReport(tasks);

  fs.writeFileSync(OUTPUT_FILE, report);
  console.log(`📄 报告已生成: ${OUTPUT_FILE}`);

  // 打印摘要
  const complete = tasks.filter(t => t.executionStatus === 'completed').length;
  const pending = tasks.filter(t => !t.executionStatus || t.executionStatus === 'pending').length;
  console.log(`\n📊 状态: ${complete} 已完成, ${pending} 待执行`);
}

main();
