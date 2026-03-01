#!/usr/bin/env node
/**
 * 任务元数据更新脚本
 * 更新 task-metadata.yaml 的执行状态和结果
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
    status: null,
    score: null,
    evidence: null
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
      case '--status':
        options.status = args[++i];
        break;
      case '--score':
        options.score = parseInt(args[++i], 10);
        break;
      case '--evidence':
        options.evidence = args[++i];
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

// 更新元数据
function updateMetadata(taskPath, options) {
  const metadataPath = path.join(taskPath, 'task-metadata.yaml');

  if (!fs.existsSync(metadataPath)) {
    throw new Error(`任务元数据不存在: ${metadataPath}`);
  }

  const content = fs.readFileSync(metadataPath, 'utf8');
  const data = yaml.load(content);

  // 确保 workflow 存在
  if (!data.workflow) {
    data.workflow = {};
  }

  // 创建或更新 execution 字段
  if (!data.workflow.execution) {
    data.workflow.execution = {};
  }

  const execution = data.workflow.execution;

  // 更新字段
  if (options.status) {
    execution.status = options.status;
  }
  
  execution.updated_at = new Date().toISOString();
  execution.executed_by = 'task-executor';

  if (options.score !== null && !isNaN(options.score)) {
    execution.final_score = options.score;
  }

  if (options.evidence) {
    execution.evidence = options.evidence;
  }

  // 确保 artifacts 存在
  if (!execution.artifacts) {
    execution.artifacts = {};
  }
  execution.artifacts.last_update = new Date().toISOString();

  // 写回文件
  fs.writeFileSync(metadataPath, yaml.dump(data, { 
    lineWidth: -1,
    noRefs: true 
  }));

  return data;
}

// 主函数
function main() {
  try {
    const options = parseArgs();
    const taskPath = getTaskPath(options);
    const taskName = options.task || path.basename(taskPath);

    console.log(`💾 更新任务元数据: ${taskName}`);

    const updatedData = updateMetadata(taskPath, options);

    console.log('✅ 元数据已更新');
    console.log(`   状态: ${updatedData.workflow.execution.status}`);
    if (updatedData.workflow.execution.final_score !== undefined) {
      console.log(`   得分: ${updatedData.workflow.execution.final_score}`);
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
