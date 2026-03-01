#!/usr/bin/env node
/**
 * 批量任务执行脚本
 * 支持批量任务并行/顺序执行，支持依赖编排
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
    tasks: [],
    status: null,
    withDependencies: false,
    tasksDir: '.tasks',
    parallel: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tasks':
        options.tasks = args[++i].split(',').map(t => t.trim());
        break;
      case '--status':
        options.status = args[++i];
        break;
      case '--with-dependencies':
        options.withDependencies = true;
        break;
      case '--tasks-dir':
        options.tasksDir = args[++i];
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  return options;
}

// 加载任务元数据
function loadTaskMetadata(taskPath) {
  const metadataPath = path.join(taskPath, 'task-metadata.yaml');
  if (!fs.existsSync(metadataPath)) {
    return null;
  }
  return yaml.load(fs.readFileSync(metadataPath, 'utf8'));
}

// 获取指定状态的任务
function getTasksByStatus(tasksDir, status) {
  const tasks = [];
  
  if (!fs.existsSync(tasksDir)) {
    return tasks;
  }

  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const metadata = loadTaskMetadata(path.join(tasksDir, entry.name));
      if (metadata) {
        const execStatus = metadata.workflow?.execution?.status;
        const workflowStatus = metadata.workflow?.triad?.generator?.status;
        
        // 根据状态筛选
        if (status === 'pending' && !execStatus) {
          tasks.push(entry.name);
        } else if (status === 'completed' && execStatus === 'completed') {
          tasks.push(entry.name);
        } else if (status === 'failed' && execStatus === 'failed') {
          tasks.push(entry.name);
        } else if (status === 'approved' && metadata.workflow?.approved === true && !execStatus) {
          // 已审批但未执行
          tasks.push(entry.name);
        }
      }
    }
  }

  return tasks;
}

// 解析依赖关系
function resolveDependencies(tasks, tasksDir) {
  const dependencyMap = new Map();
  
  for (const task of tasks) {
    const metadata = loadTaskMetadata(path.join(tasksDir, task));
    if (metadata) {
      const deps = metadata.dependencies?.requires || [];
      dependencyMap.set(task, deps.filter(d => tasks.includes(d)));
    } else {
      dependencyMap.set(task, []);
    }
  }

  return dependencyMap;
}

// 拓扑排序
function topologicalSort(tasks, dependencyMap) {
  const inDegree = new Map();
  const graph = new Map();

  // 初始化
  for (const task of tasks) {
    inDegree.set(task, 0);
    graph.set(task, []);
  }

  // 构建图
  for (const [task, deps] of dependencyMap) {
    for (const dep of deps) {
      if (tasks.includes(dep)) {
        inDegree.set(task, (inDegree.get(task) || 0) + 1);
        graph.get(dep).push(task);
      }
    }
  }

  // Kahn算法
  const queue = [];
  const result = [];

  for (const [task, degree] of inDegree) {
    if (degree === 0) {
      queue.push(task);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);

    for (const dependent of graph.get(current)) {
      const newDegree = inDegree.get(dependent) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  if (result.length !== tasks.length) {
    throw new Error('检测到任务间存在循环依赖');
  }

  return result;
}

// 执行单个任务
function executeSingleTask(taskName, tasksDir, options) {
  const taskPath = path.join(tasksDir, taskName);
  const scriptPath = path.join(__dirname, 'execute-task.js');
  const cmd = `node "${scriptPath}" --path "${taskPath}"${options.dryRun ? ' --dry-run' : ''}`;

  console.log(`\n🚀 执行任务: ${taskName}`);
  console.log(`   命令: ${cmd}`);

  if (options.dryRun) {
    return { task: taskName, success: true, output: '[Dry Run]' };
  }

  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 300000
    });
    return { task: taskName, success: true, output };
  } catch (error) {
    return { 
      task: taskName, 
      success: false, 
      output: error.stdout || '',
      error: error.stderr || error.message 
    };
  }
}

// 批量执行
async function executeBatch(tasks, tasksDir, options) {
  const results = [];

  if (options.parallel) {
    // 并行执行（仅适用于无依赖的任务）
    console.log(`\n⚡ 并行执行 ${tasks.length} 个任务`);
    const promises = tasks.map(task => 
      executeSingleTask(task, tasksDir, options)
    );
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  } else {
    // 顺序执行
    console.log(`\n📋 顺序执行 ${tasks.length} 个任务`);
    for (const task of tasks) {
      const result = executeSingleTask(task, tasksDir, options);
      results.push(result);
      
      // 如果任务失败且不是 dry-run，询问是否继续
      if (!result.success && !options.dryRun) {
        console.log(`\n⚠️  任务 ${task} 执行失败`);
        // 实际实现中可以添加交互式确认
      }
    }
  }

  return results;
}

// 生成批量执行报告
function generateBatchReport(results, options) {
  const timestamp = new Date().toISOString();
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  const report = `# Batch Execution Report

## 执行摘要
- **执行时间**: ${timestamp}
- **执行模式**: ${options.parallel ? '并行' : '顺序'}
- **总任务数**: ${results.length}
- **成功**: ${successCount}
- **失败**: ${failCount}
- **通过率**: ${Math.round((successCount / results.length) * 100)}%

## 执行详情

| 任务 | 状态 | 输出 |
|------|------|------|
${results.map(r => `| ${r.task} | ${r.success ? '✅ 成功' : '❌ 失败'} | ${r.error ? '查看错误日志' : '成功'} |`).join('\n')}

## 失败任务详情
${results.filter(r => !r.success).map(r => `
### ${r.task}
\`\`\`
${r.error || r.output}
\`\`\`
`).join('\n') || '无'}

---
*报告生成时间: ${timestamp}*
`;

  return report;
}

// 主函数
async function main() {
  try {
    const options = parseArgs();

    // 确定要执行的任务列表
    let tasksToExecute = [];

    if (options.tasks.length > 0) {
      tasksToExecute = options.tasks;
    } else if (options.status) {
      tasksToExecute = getTasksByStatus(options.tasksDir, options.status);
      console.log(`找到 ${tasksToExecute.length} 个状态为 "${options.status}" 的任务`);
    } else {
      console.error('错误: 必须指定 --tasks 或 --status');
      process.exit(1);
    }

    if (tasksToExecute.length === 0) {
      console.log('没有需要执行的任务');
      return;
    }

    console.log(`\n准备执行的任务:`);
    tasksToExecute.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));

    // 如果需要考虑依赖
    if (options.withDependencies) {
      console.log('\n📊 解析任务依赖关系...');
      const dependencyMap = resolveDependencies(tasksToExecute, options.tasksDir);
      
      // 输出依赖信息
      for (const [task, deps] of dependencyMap) {
        if (deps.length > 0) {
          console.log(`  ${task} → 依赖: ${deps.join(', ')}`);
        }
      }

      // 拓扑排序
      tasksToExecute = topologicalSort(tasksToExecute, dependencyMap);
      console.log('\n📋 依赖排序后的执行顺序:');
      tasksToExecute.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
    }

    // 执行
    if (options.dryRun) {
      console.log('\n🧪 [Dry Run] 模拟执行，不实际修改文件');
    }

    const results = await executeBatch(tasksToExecute, options.tasksDir, options);

    // 生成报告
    console.log('\n📄 生成批量执行报告...');
    const report = generateBatchReport(results, options);
    
    if (!options.dryRun) {
      const reportPath = path.join(options.tasksDir, 'BATCH_EXECUTION_REPORT.md');
      fs.writeFileSync(reportPath, report);
      console.log(`报告已保存: ${reportPath}`);
    }

    // 输出摘要
    console.log('\n' + '=' .repeat(60));
    console.log('批量执行完成');
    console.log(`总计: ${results.length} 个任务`);
    console.log(`成功: ${results.filter(r => r.success).length}`);
    console.log(`失败: ${results.filter(r => !r.success).length}`);

    process.exit(results.every(r => r.success) ? 0 : 1);

  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(`❌ 错误: ${e.message}`);
  process.exit(1);
});
