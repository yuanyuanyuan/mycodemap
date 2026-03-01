#!/usr/bin/env node
/**
 * 任务四件套验证脚本
 * 验证 PROMPT.md、EVAL.ts、SCORING.md、task-metadata.yaml 完整性
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
    tasksDir: '.tasks'
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

// 验证文件存在
function validateFileExists(filePath, fileName) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: `${fileName} 不存在: ${filePath}` };
  }
  return { valid: true };
}

// 验证 PROMPT.md
function validatePrompt(content) {
  const requiredSections = [
    '背景',
    '要求',
    '初始状态',
    '约束条件',
    '验收标准',
    '用户价值',
    '反例场景'
  ];

  const missing = requiredSections.filter(section => 
    !content.includes(section)
  );

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `PROMPT.md 缺少必需章节: ${missing.join(', ')}` 
    };
  }

  return { valid: true };
}

// 验证 EVAL.ts
function validateEval(content) {
  // 检查是否是有效的 TypeScript/Vitest 测试文件
  const hasTestImport = content.includes('import') && 
    (content.includes('vitest') || content.includes('describe') || content.includes('test'));
  const hasDescribe = content.includes('describe(');
  const hasTest = content.includes('test(') || content.includes('it(');

  if (!hasTestImport && !hasDescribe && !hasTest) {
    return { 
      valid: false, 
      warning: 'EVAL.ts 可能不是标准的测试文件（未检测到测试模式）'
    };
  }

  return { valid: true };
}

// 验证 SCORING.md
function validateScoring(content) {
  // 检查总分是否为100
  const totalMatch = content.match(/总分[：:]\s*(\d+)/);
  if (totalMatch) {
    const total = parseInt(totalMatch[1], 10);
    if (total !== 100) {
      return { 
        valid: false, 
        error: `SCORING.md 总分必须为 100，当前为 ${total}` 
      };
    }
  }

  // 检查是否有评分等级
  const hasGradingLevels = content.includes('通过') || 
    content.includes('Pass') || 
    content.includes('优秀') ||
    content.includes('Excellent');

  if (!hasGradingLevels) {
    return { 
      valid: false, 
      error: 'SCORING.md 缺少评分等级定义' 
    };
  }

  return { valid: true };
}

// 验证 task-metadata.yaml
function validateMetadata(content) {
  try {
    const data = yaml.load(content);
    
    // 检查必需字段
    const requiredFields = ['metadata', 'task', 'capabilities'];
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      return { 
        valid: false, 
        error: `task-metadata.yaml 缺少必需字段: ${missing.join(', ')}` 
      };
    }

    // 检查 metadata 子字段
    if (!data.metadata.task_id || !data.metadata.task_name) {
      return { 
        valid: false, 
        error: 'task-metadata.yaml metadata 缺少 task_id 或 task_name' 
      };
    }

    return { valid: true, data };
  } catch (e) {
    return { 
      valid: false, 
      error: `task-metadata.yaml 解析失败: ${e.message}` 
    };
  }
}

// 主验证函数
function validateTask(taskPath) {
  const results = {
    valid: true,
    files: {},
    errors: [],
    warnings: []
  };

  const files = {
    'PROMPT.md': { validator: validatePrompt, required: true },
    'EVAL.ts': { validator: validateEval, required: true },
    'SCORING.md': { validator: validateScoring, required: true },
    'task-metadata.yaml': { validator: validateMetadata, required: true }
  };

  for (const [fileName, config] of Object.entries(files)) {
    const filePath = path.join(taskPath, fileName);
    
    // 检查文件存在
    const existsResult = validateFileExists(filePath, fileName);
    if (!existsResult.valid) {
      results.files[fileName] = existsResult;
      if (config.required) {
        results.valid = false;
        results.errors.push(existsResult.error);
      }
      continue;
    }

    // 读取并验证内容
    const content = fs.readFileSync(filePath, 'utf8');
    const contentResult = config.validator(content);
    
    results.files[fileName] = {
      exists: true,
      ...contentResult
    };

    if (!contentResult.valid) {
      results.valid = false;
      results.errors.push(`${fileName}: ${contentResult.error}`);
    } else if (contentResult.warning) {
      results.warnings.push(`${fileName}: ${contentResult.warning}`);
    }
  }

  return results;
}

// 主函数
function main() {
  try {
    const options = parseArgs();
    const taskPath = getTaskPath(options);

    console.log(`🔍 验证任务: ${taskPath}`);
    console.log('=' .repeat(50));

    const results = validateTask(taskPath);

    // 输出结果
    for (const [fileName, result] of Object.entries(results.files)) {
      if (result.valid) {
        console.log(`✅ ${fileName}`);
      } else {
        console.log(`❌ ${fileName}: ${result.error}`);
      }
    }

    console.log('=' .repeat(50));

    if (results.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      results.warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (results.valid) {
      console.log('\n✅ 四件套验证通过');
      process.exit(0);
    } else {
      console.log('\n❌ 验证失败:');
      results.errors.forEach(e => console.log(`  - ${e}`));
      process.exit(1);
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
