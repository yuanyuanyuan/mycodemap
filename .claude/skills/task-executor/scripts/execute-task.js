#!/usr/bin/env node
/**
 * 单任务执行脚本
 * 核心执行逻辑：读取 PROMPT → 分析 → 实现 → 测试 → 评分
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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
    dryRun: false,
    verbose: false
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
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
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

// 加载任务文件
function loadTaskFiles(taskPath) {
  return {
    prompt: fs.readFileSync(path.join(taskPath, 'PROMPT.md'), 'utf8'),
    eval: fs.readFileSync(path.join(taskPath, 'EVAL.ts'), 'utf8'),
    scoring: fs.readFileSync(path.join(taskPath, 'SCORING.md'), 'utf8'),
    metadata: yaml.load(fs.readFileSync(path.join(taskPath, 'task-metadata.yaml'), 'utf8'))
  };
}

// 解析 PROMPT.md 提取关键信息
function parsePrompt(content) {
  const info = {
    background: '',
    requirements: [],
    constraints: [],
    acceptanceCriteria: [],
    initialState: '',
    counterExamples: []
  };

  // 提取背景
  const bgMatch = content.match(/## 背景\s*\n([\s\S]*?)(?=##|$)/);
  if (bgMatch) info.background = bgMatch[1].trim();

  // 提取要求
  const reqMatch = content.match(/## 要求\s*\n([\s\S]*?)(?=##|$)/);
  if (reqMatch) {
    const reqSection = reqMatch[1];
    // 匹配 ### 开头的子项
    const subReqs = reqSection.match(/### \d+\.[\s\S]*?(?=### \d+|##|$)/g);
    if (subReqs) {
      info.requirements = subReqs.map(r => r.trim());
    }
  }

  // 提取约束条件
  const constraintMatch = content.match(/## 约束条件\s*\n([\s\S]*?)(?=##|$)/);
  if (constraintMatch) {
    const constraints = constraintMatch[1].match(/-\s+\*\*[\s\S]*?\*\*[\s\S]*?(?=\n\s*-\s*\*\*|$)/g);
    if (constraints) {
      info.constraints = constraints.map(c => c.trim());
    }
  }

  // 提取验收标准
  const criteriaMatch = content.match(/## 验收标准\s*\n([\s\S]*?)(?=##|$)/);
  if (criteriaMatch) {
    const criteriaTable = criteriaMatch[1];
    const rows = criteriaTable.match(/\|\s*[^|]+\|[^|]+\|[^|]+\|/g);
    if (rows && rows.length > 1) {
      // 跳过表头行
      info.acceptanceCriteria = rows.slice(1).map(row => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        return {
          standard: cells[0] || '',
          method: cells[1] || '',
          description: cells[2] || ''
        };
      });
    }
  }

  // 提取初始状态
  const stateMatch = content.match(/## 初始状态\s*\n([\s\S]*?)(?=##|$)/);
  if (stateMatch) info.initialState = stateMatch[1].trim();

  return info;
}

// 解析 SCORING.md 提取评分标准
function parseScoring(content) {
  const checkpoints = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // 匹配评分表行: | ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
    const match = line.match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*(\d+)\s*\|/);
    if (match && !line.includes('ID') && !line.includes('--')) {
      checkpoints.push({
        id: match[1].trim(),
        name: match[2].trim(),
        score: parseInt(match[3], 10),
        passed: false
      });
    }
  }

  return checkpoints;
}

// 执行测试
function runTests(taskPath, options) {
  const results = {
    success: false,
    output: '',
    error: ''
  };

  try {
    const evalPath = path.join(taskPath, 'EVAL.ts');
    const cmd = `npm test ${evalPath}`;
    
    if (options.verbose) {
      console.log(`运行测试: ${cmd}`);
    }

    if (!options.dryRun) {
      const output = execSync(cmd, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 120000
      });
      results.output = output;
      results.success = true;
    } else {
      results.output = '[Dry Run] 测试将被执行';
      results.success = true;
    }
  } catch (error) {
    results.error = error.stderr || error.message;
    results.output = error.stdout || '';
    results.success = false;
  }

  return results;
}

// 计算自评分数
function calculateSelfScore(checkpoints, testResults) {
  let totalScore = 0;
  let maxScore = 0;

  for (const cp of checkpoints) {
    maxScore += cp.score;
    // 基于测试结果判断是否通过
    // 这里简化处理：假设测试通过则检查点通过
    if (testResults.success) {
      cp.passed = true;
      totalScore += cp.score;
    }
  }

  return {
    score: totalScore,
    maxScore: maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
    checkpoints
  };
}

// 生成执行报告
function generateReport(taskName, taskInfo, testResults, scoreResult, options) {
  const timestamp = new Date().toISOString();
  
  const report = `# Task Execution Report: ${taskName}

## 执行摘要
- **执行时间**: ${timestamp}
- **执行模式**: single
- **执行状态**: ${testResults.success ? 'success' : 'failed'}
- **最终得分**: ${scoreResult.score}/${scoreResult.maxScore} (${scoreResult.percentage}%)

## 任务信息
- **任务ID**: ${taskInfo.metadata?.metadata?.task_id || 'N/A'}
- **任务名称**: ${taskInfo.metadata?.metadata?.task_name || taskName}
- **难度**: ${taskInfo.metadata?.task?.difficulty || 'N/A'}
- **预估时间**: ${taskInfo.metadata?.task?.estimated_minutes || 'N/A'} 分钟

## 测试执行结果
\`\`\`
${testResults.output || testResults.error}
\`\`\`

## 自评详情

| 检查点 | 分值 | 状态 |
|--------|------|------|
${scoreResult.checkpoints.map(cp => `| ${cp.name} | ${cp.score} | ${cp.passed ? '✅ 通过' : '❌ 未通过'} |`).join('\n')}

## 评分等级
- ${scoreResult.percentage >= 90 ? '✅' : '⬜'} **优秀 (Excellent)**: >= 90 分
- ${scoreResult.percentage >= 70 ? '✅' : '⬜'} **通过 (Pass)**: >= 70 分
- ${scoreResult.percentage < 70 ? '❌' : '⬜'} **失败 (Fail)**: < 70 分

## 结论
${testResults.success && scoreResult.percentage >= 70 
  ? '✅ 任务执行成功，通过验收标准' 
  : '❌ 任务执行未通过，需要修复'}

---
*报告生成时间: ${timestamp}*
`;

  return report;
}

// 更新任务元数据
function updateMetadata(taskPath, executionResult) {
  const metadataPath = path.join(taskPath, 'task-metadata.yaml');
  const content = fs.readFileSync(metadataPath, 'utf8');
  const data = yaml.load(content);

  // 添加或更新执行信息
  if (!data.workflow) {
    data.workflow = {};
  }
  
  data.workflow.execution = {
    status: executionResult.success ? 'completed' : 'failed',
    executed_at: new Date().toISOString(),
    executed_by: 'task-executor',
    final_score: executionResult.score,
    evidence: `执行报告: EXECUTION_REPORT.md, 得分: ${executionResult.score}`,
    artifacts: {
      report: 'EXECUTION_REPORT.md'
    }
  };

  // 写回文件
  fs.writeFileSync(metadataPath, yaml.dump(data, { lineWidth: -1 }));
}

// 主函数
function main() {
  try {
    const options = parseArgs();
    const taskPath = getTaskPath(options);
    const taskName = options.task || path.basename(taskPath);

    console.log(`🚀 执行任务: ${taskName}`);
    console.log('=' .repeat(60));

    // 1. 加载任务文件
    console.log('📂 加载任务文件...');
    const taskFiles = loadTaskFiles(taskPath);
    
    // 2. 解析 PROMPT
    console.log('📖 解析任务要求...');
    const promptInfo = parsePrompt(taskFiles.prompt);
    
    if (options.verbose) {
      console.log(`  - 找到 ${promptInfo.requirements.length} 个要求`);
      console.log(`  - 找到 ${promptInfo.constraints.length} 个约束`);
      console.log(`  - 找到 ${promptInfo.acceptanceCriteria.length} 个验收标准`);
    }

    // 3. 解析评分标准
    console.log('📊 解析评分标准...');
    const checkpoints = parseScoring(taskFiles.scoring);
    
    if (options.verbose) {
      console.log(`  - 找到 ${checkpoints.length} 个检查点`);
    }

    // 4. 执行测试
    console.log('🧪 执行测试...');
    const testResults = runTests(taskPath, options);
    
    if (testResults.success) {
      console.log('  ✅ 测试通过');
    } else {
      console.log('  ❌ 测试失败');
      if (options.verbose) {
        console.log(testResults.error);
      }
    }

    // 5. 计算自评分数
    console.log('📝 计算自评分数...');
    const scoreResult = calculateSelfScore(checkpoints, testResults);
    console.log(`  得分: ${scoreResult.score}/${scoreResult.maxScore} (${scoreResult.percentage}%)`);

    // 6. 生成报告
    console.log('📄 生成执行报告...');
    const report = generateReport(taskName, taskFiles, testResults, scoreResult, options);
    
    if (!options.dryRun) {
      const reportPath = path.join(taskPath, 'EXECUTION_REPORT.md');
      fs.writeFileSync(reportPath, report);
      console.log(`  报告已保存: ${reportPath}`);
    }

    // 7. 更新元数据
    if (!options.dryRun) {
      console.log('💾 更新任务元数据...');
      updateMetadata(taskPath, {
        success: testResults.success && scoreResult.percentage >= 70,
        score: scoreResult.percentage
      });
    }

    // 8. 输出结果
    console.log('=' .repeat(60));
    console.log('执行完成!');
    console.log(`状态: ${testResults.success && scoreResult.percentage >= 70 ? '✅ 通过' : '❌ 失败'}`);
    console.log(`得分: ${scoreResult.percentage}%`);

    process.exit(testResults.success && scoreResult.percentage >= 70 ? 0 : 1);

  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    if (process.argv.includes('--verbose')) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(e => {
  console.error(`❌ 错误: ${e.message}`);
  process.exit(1);
});
