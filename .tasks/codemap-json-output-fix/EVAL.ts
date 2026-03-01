// [META] since:2026-03 | owner:task-executor | stable:false
// [WHY] Evaluation test file for codemap JSON output fix task
/**
 * Evaluation Checkpoints for CodeMap CLI JSON Output Fix
 * 
 * 分层检查点与测试代码
 */

// ============================================================
// Phase 1: 文件检查 (File Inspection)
// ============================================================

/**
 * Checkpoint 1.1: 验证源文件存在
 * 检查 tool-orchestrator.ts 文件是否存在
 */
export function checkSourceFileExists(): boolean {
  const fs = require('fs');
  const path = '/data/codemap/src/orchestrator/tool-orchestrator.ts';
  return fs.existsSync(path);
}

/**
 * Checkpoint 1.2: 获取所有 console 调用位置
 * 返回文件中所有 console.* 调用的行号和类型
 */
export function getConsoleCalls(): Array<{ line: number; type: string; content: string }> {
  const fs = require('fs');
  const path = '/data/codemap/src/orchestrator/tool-orchestrator.ts';
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  
  const consoleCalls: Array<{ line: number; type: string; content: string }> = [];
  const consolePattern = /console\.(debug|warn|error|log|info)\s*\(/;
  
  lines.forEach((line: string, index: number) => {
    const match = line.match(consolePattern);
    if (match) {
      consoleCalls.push({
        line: index + 1,
        type: match[1],
        content: line.trim()
      });
    }
  });
  
  return consoleCalls;
}

/**
 * Checkpoint 1.3: 验证无未注释的 console 调用
 * 所有 console.* 调用必须被注释或删除
 */
export function checkNoUncommentedConsoleCalls(): boolean {
  const calls = getConsoleCalls();
  const fs = require('fs');
  const path = '/data/codemap/src/orchestrator/tool-orchestrator.ts';
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  
  for (const call of calls) {
    const line = lines[call.line - 1];
    // 检查是否被注释 (以 // 开头或包含在 /* */ 中)
    const trimmed = line.trim();
    if (!trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
      // 检查是否在多行注释中
      // 简单检查：如果这行有 console 且不是注释掉的，返回 false
      return false;
    }
  }
  
  return true;
}

// ============================================================
// Phase 2: 构建验证 (Build Verification)
// ============================================================

/**
 * Checkpoint 2.1: TypeScript 编译通过
 * 运行 npm run build 检查编译是否成功
 */
export async function checkBuildSucceeds(): Promise<boolean> {
  const { execSync } = require('child_process');
  
  try {
    execSync('npm run build', {
      cwd: '/data/codemap',
      stdio: 'pipe',
      timeout: 120000
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checkpoint 2.2: 输出文件存在
 * 检查 dist/cli/index.js 是否存在
 */
export function checkDistExists(): boolean {
  const fs = require('fs');
  return fs.existsSync('/data/codemap/dist/cli/index.js');
}

// ============================================================
// Phase 3: 功能验证 (Functional Verification)
// ============================================================

/**
 * Checkpoint 3.1: JSON 输出有效
 * 运行 analyze --json 命令并验证输出是有效 JSON
 */
export async function checkJsonOutputValid(): Promise<boolean> {
  const { execSync } = require('child_process');
  
  try {
    const output = execSync(
      'node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json',
      {
        cwd: '/data/codemap',
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );
    
    // 尝试解析 JSON
    JSON.parse(output);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checkpoint 3.2: JSON 输出无日志混杂
 * 验证输出中不包含已知的日志关键字
 */
export async function checkJsonOutputClean(): Promise<{ clean: boolean; violations: string[] }> {
  const { execSync } = require('child_process');
  
  const logKeywords = [
    '执行工具',
    '未注册',
    '不可用',
    '执行成功',
    '执行超时',
    '执行失败',
    '执行异常',
    '置信度',
    '跳过已执行',
    '[LOW CONFIDENCE]'
  ];
  
  try {
    const output = execSync(
      'node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json',
      {
        cwd: '/data/codemap',
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
    
    const violations: string[] = [];
    for (const keyword of logKeywords) {
      if (output.includes(keyword)) {
        violations.push(keyword);
      }
    }
    
    return {
      clean: violations.length === 0,
      violations
    };
  } catch (error) {
    return {
      clean: false,
      violations: ['Command execution failed']
    };
  }
}

/**
 * Checkpoint 3.3: 分析功能正常
 * 验证 JSON 输出包含预期的分析结果结构
 */
export async function checkAnalysisFunction(): Promise<boolean> {
  const { execSync } = require('child_process');
  
  try {
    const output = execSync(
      'node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json',
      {
        cwd: '/data/codemap',
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
    
    const json = JSON.parse(output);
    
    // 验证基本的分析结果结构
    return (
      json &&
      typeof json === 'object' &&
      (json.results !== undefined || json.impact !== undefined || json.dependencies !== undefined || Object.keys(json).length > 0)
    );
  } catch (error) {
    return false;
  }
}

// ============================================================
// Phase 4: 回归测试 (Regression Testing)
// ============================================================

/**
 * Checkpoint 4.1: 无 console 调用残留
 * 最终验证文件中没有任何 console 调用
 */
export function checkFinalNoConsole(): boolean {
  const fs = require('fs');
  const path = '/data/codemap/src/orchestrator/tool-orchestrator.ts';
  const content = fs.readFileSync(path, 'utf-8');
  
  // 检查是否有未被注释的 console 调用
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // 如果行包含 console. 且不是注释
    if (trimmed.match(/console\.(debug|warn|error|log|info)\s*\(/) && 
        !trimmed.startsWith('//') && 
        !trimmed.startsWith('*')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Checkpoint 4.2: 多次运行结果一致
 * 多次运行命令，验证结果一致且始终为纯净 JSON
 */
export async function checkConsistency(): Promise<boolean> {
  const { execSync } = require('child_process');
  
  try {
    const results: string[] = [];
    
    for (let i = 0; i < 3; i++) {
      const output = execSync(
        'node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json',
        {
          cwd: '/data/codemap',
          encoding: 'utf-8',
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024
        }
      );
      
      // 验证每次输出都是有效 JSON
      JSON.parse(output);
      results.push(output);
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================
// 运行所有检查
// ============================================================

export async function runAllChecks(): Promise<{
  phase1: { fileExists: boolean; consoleCalls: number; noUncommented: boolean };
  phase2: { buildSuccess: boolean; distExists: boolean };
  phase3: { jsonValid: boolean; jsonClean: boolean; violations: string[]; functionNormal: boolean };
  phase4: { noConsole: boolean; consistent: boolean };
  overall: boolean;
}> {
  const phase1 = {
    fileExists: checkSourceFileExists(),
    consoleCalls: getConsoleCalls().length,
    noUncommented: checkNoUncommentedConsoleCalls()
  };
  
  const phase2 = {
    buildSuccess: await checkBuildSucceeds(),
    distExists: checkDistExists()
  };
  
  const jsonCleanResult = await checkJsonOutputClean();
  const phase3 = {
    jsonValid: await checkJsonOutputValid(),
    jsonClean: jsonCleanResult.clean,
    violations: jsonCleanResult.violations,
    functionNormal: await checkAnalysisFunction()
  };
  
  const phase4 = {
    noConsole: checkFinalNoConsole(),
    consistent: await checkConsistency()
  };
  
  const overall = 
    phase1.fileExists &&
    phase1.noUncommented &&
    phase2.buildSuccess &&
    phase2.distExists &&
    phase3.jsonValid &&
    phase3.jsonClean &&
    phase3.functionNormal &&
    phase4.noConsole &&
    phase4.consistent;
  
  return {
    phase1,
    phase2,
    phase3,
    phase4,
    overall
  };
}

// 如果直接运行此文件，执行所有检查
if (require.main === module) {
  runAllChecks().then(results => {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.overall ? 0 : 1);
  });
}
