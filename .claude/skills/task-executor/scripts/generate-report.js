#!/usr/bin/env node
/**
 * 执行报告生成脚本
 * 生成标准化的任务执行报告
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    task: null,
    path: null,
    tasksDir: '.tasks',
    output: null,
    format: 'markdown' // markdown, json
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--task':
        options.task = args[++i];
        break;
      case '--path':
        options.path = args[++i];
        break;
      case '--tasks-dir':
        options.tasksDir = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
    }
  }

  return options;
}

// 获取任务路径
function getTaskPath(options) {
  if (options.path) {
    return options.path;
  }
  if (options.task) {
    return path.join(options.tasksDir, options.task);
  }
  throw new Error('必须指定 --task 或 --path');
}

// 加载任务数据
function loadTaskData(taskPath) {
  const data = {
    metadata: null,
    executionReport: null,
    prompt: null
  };

  // 加载元数据
  const metadataPath = path.join(taskPath, 'task-metadata.yaml');
  if (fs.existsSync(metadataPath)) {
    data.metadata = yaml.load(fs.readFileSync(metadataPath, 'utf8'));
  }

  // 加载执行报告
  const reportPath = path.join(taskPath, 'EXECUTION_REPORT.md');
  if (fs.existsSync(reportPath)) {
    data.executionReport = fs.readFileSync(reportPath, 'utf8');
  }

  // 加载 PROMPT
  const promptPath = path.join(taskPath, 'PROMPT.md');
  if (fs.existsSync(promptPath)) {
    data.prompt = fs.readFileSync(promptPath, 'utf8');
  }

  return data;
}

// 生成 Markdown 报告
function generateMarkdownReport(taskName, taskData) {
  const execution = taskData.metadata?.workflow?.execution || {};
  const task = taskData.metadata?.task || {};
  const meta = taskData.metadata?.metadata || {};

  const timestamp = new Date().toISOString();

  return `# Task Execution Summary: ${taskName}

## 基本信息
- **任务ID**: ${meta.task_id || 'N/A'}
- **任务名称**: ${meta.task_name || taskName}
- **版本**: ${meta.version || 'N/A'}
- **创建时间**: ${meta.created_at || 'N/A'}

## 执行信息
- **执行状态**: ${execution.status || '未执行'}
- **执行时间**: ${execution.executed_at || 'N/A'}
- **执行者**: ${execution.executed_by || 'N/A'}
- **最终得分**: ${execution.final_score !== undefined ? execution.final_score + '/100' : 'N/A'}

## 任务属性
- **类型**: ${task.type || 'N/A'}
- **难度**: ${task.difficulty || 'N/A'}
- **预估时间**: ${task.estimated_minutes || 'N/A'} 分钟

## 执行证据
${execution.evidence || '无'}

## 执行报告
${taskData.executionReport || '暂无执行报告'}

---
*摘要生成时间: ${timestamp}*
`;
}

// 生成 JSON 报告
function generateJSONReport(taskName, taskData) {
  const report = {
    task_name: taskName,
    generated_at: new Date().toISOString(),
    metadata: taskData.metadata?.metadata || {},
    task: taskData.metadata?.task || {},
    execution: taskData.metadata?.workflow?.execution || {},
    has_execution_report: !!taskData.executionReport
  };

  return JSON.stringify(report, null, 2);
}

// 主函数
function main() {
  try {
    const options = parseArgs();
    const taskPath = getTaskPath(options);
    const taskName = options.task || path.basename(taskPath);

    console.log(`📄 生成执行报告: ${taskName}`);

    // 加载任务数据
    const taskData = loadTaskData(taskPath);

    // 生成报告
    let report;
    if (options.format === 'json') {
      report = generateJSONReport(taskName, taskData);
    } else {
      report = generateMarkdownReport(taskName, taskData);
    }

    // 输出报告
    if (options.output) {
      fs.writeFileSync(options.output, report);
      console.log(`✅ 报告已保存: ${options.output}`);
    } else {
      console.log('\n--- 报告内容 ---\n');
      console.log(report);
    }

  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

try {
  main();
} catch (e) {
  console.error(`❌ 错误: ${e.message}`);
  process.exit(1);
}
