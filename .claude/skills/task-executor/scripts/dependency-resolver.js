#!/usr/bin/env node
/**
 * 任务依赖解析脚本
 * 解析任务间的依赖关系，生成拓扑排序的执行顺序
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
    tasksDir: '.tasks',
    task: null,
    listAll: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tasks-dir':
        options.tasksDir = args[++i];
        break;
      case '--task':
        options.task = args[++i];
        break;
      case '--list-all':
        options.listAll = true;
        break;
    }
  }

  return options;
}

// 加载所有任务的元数据
function loadAllTasks(tasksDir) {
  const tasks = [];
  
  if (!fs.existsSync(tasksDir)) {
    return tasks;
  }

  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const metadataPath = path.join(tasksDir, entry.name, 'task-metadata.yaml');
      if (fs.existsSync(metadataPath)) {
        try {
          const content = fs.readFileSync(metadataPath, 'utf8');
          const data = yaml.load(content);
          tasks.push({
            name: entry.name,
            path: path.join(tasksDir, entry.name),
            metadata: data
          });
        } catch (e) {
          console.warn(`警告: 无法解析 ${metadataPath}: ${e.message}`);
        }
      }
    }
  }

  return tasks;
}

// 构建依赖图
function buildDependencyGraph(tasks) {
  const graph = new Map();
  const taskMap = new Map();

  // 建立任务名称到任务的映射
  for (const task of tasks) {
    taskMap.set(task.name, task);
    graph.set(task.name, {
      task,
      dependencies: [],
      dependents: []
    });
  }

  // 解析依赖关系
  for (const task of tasks) {
    const deps = task.metadata?.dependencies?.requires || [];
    const node = graph.get(task.name);

    for (const depName of deps) {
      if (taskMap.has(depName)) {
        node.dependencies.push(depName);
        
        // 反向记录被依赖关系
        const depNode = graph.get(depName);
        if (depNode) {
          depNode.dependents.push(task.name);
        }
      } else {
        console.warn(`警告: 任务 ${task.name} 依赖的任务 ${depName} 不存在`);
      }
    }
  }

  return graph;
}

// 拓扑排序（Kahn算法）
function topologicalSort(graph) {
  const inDegree = new Map();
  const result = [];
  const queue = [];

  // 计算入度
  for (const [name, node] of graph) {
    inDegree.set(name, node.dependencies.length);
    if (node.dependencies.length === 0) {
      queue.push(name);
    }
  }

  // Kahn算法
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);

    const node = graph.get(current);
    for (const dependent of node.dependents) {
      const newDegree = inDegree.get(dependent) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // 检查是否有环
  if (result.length !== graph.size) {
    throw new Error('检测到任务依赖存在循环依赖');
  }

  return result;
}

// 获取任务的完整依赖链
function getDependencyChain(graph, taskName, visited = new Set()) {
  if (visited.has(taskName)) {
    return [];
  }
  
  visited.add(taskName);
  const node = graph.get(taskName);
  
  if (!node) {
    return [];
  }

  const chain = [];
  for (const dep of node.dependencies) {
    chain.push(...getDependencyChain(graph, dep, visited));
    if (!chain.includes(dep)) {
      chain.push(dep);
    }
  }

  return chain;
}

// 获取依赖于指定任务的所有任务
function getDependents(graph, taskName, visited = new Set()) {
  if (visited.has(taskName)) {
    return [];
  }
  
  visited.add(taskName);
  const node = graph.get(taskName);
  
  if (!node) {
    return [];
  }

  const dependents = [];
  for (const dep of node.dependents) {
    dependents.push(dep);
    dependents.push(...getDependents(graph, dep, visited));
  }

  return [...new Set(dependents)];
}

// 主函数
function main() {
  try {
    const options = parseArgs();
    const tasks = loadAllTasks(options.tasksDir);
    
    if (tasks.length === 0) {
      console.log('没有找到任何任务');
      return;
    }

    console.log(`找到 ${tasks.length} 个任务`);
    console.log('=' .repeat(60));

    const graph = buildDependencyGraph(tasks);

    if (options.listAll) {
      // 列出所有任务及其依赖
      console.log('\n所有任务及其依赖:');
      for (const [name, node] of graph) {
        const deps = node.dependencies;
        if (deps.length === 0) {
          console.log(`  ${name} (无依赖)`);
        } else {
          console.log(`  ${name} → 依赖: ${deps.join(', ')}`);
        }
      }
    }

    if (options.task) {
      // 显示特定任务的依赖信息
      const node = graph.get(options.task);
      if (!node) {
        console.error(`错误: 任务 ${options.task} 不存在`);
        process.exit(1);
      }

      console.log(`\n任务: ${options.task}`);
      console.log('-'.repeat(40));
      
      const depChain = getDependencyChain(graph, options.task);
      console.log(`执行前必须完成的依赖: ${depChain.length > 0 ? depChain.join(' → ') : '无'}`);
      
      const dependents = getDependents(graph, options.task);
      console.log(`依赖于此任务的其他任务: ${dependents.length > 0 ? dependents.join(', ') : '无'}`);
    }

    // 输出拓扑排序结果
    console.log('\n建议的执行顺序（拓扑排序）:');
    const executionOrder = topologicalSort(graph);
    executionOrder.forEach((task, index) => {
      const node = graph.get(task);
      const depInfo = node.dependencies.length > 0 
        ? `(依赖: ${node.dependencies.join(', ')})` 
        : '(无依赖)';
      console.log(`  ${index + 1}. ${task} ${depInfo}`);
    });

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
