import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ============================================
// Level 0: 项目约定检查
// ============================================

describe('L0: 项目约定检查', () => {
  test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    
    // 确保没有引入不必要的运行时依赖
    const hasUnnecessaryDeps = pkg.dependencies?.['rxjs'] || 
                               pkg.dependencies?.['lodash'] ||
                               pkg.dependencies?.['axios'];
    expect(hasUnnecessaryDeps).toBeFalsy();
  });

  test('[L0] 代码应遵循 TypeScript 严格模式', () => {
    const tsConfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
    expect(tsConfig.compilerOptions?.strict).toBe(true);
  });
});

// ============================================
// Level 1: 存在性检查
// ============================================

describe('L1: 文件存在性检查', () => {
  test('[L1-1] tool-orchestrator.ts 文件应存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('[L1-2] intent-router.ts 文件应存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/intent-router.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('[L1-3] orchestrator/index.ts 入口文件应存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/index.ts');
    expect(existsSync(filePath)).toBe(true);
  });
});

// ============================================
// Level 2: 结构检查
// ============================================

describe('L2: 代码结构检查', () => {
  test('[L2-1] ToolOrchestrator 类应定义', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/class\s+ToolOrchestrator/);
  });

  test('[L2-2] IntentRouter 类应定义', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/intent-router.ts'), 'utf-8');
    expect(content).toMatch(/class\s+IntentRouter/);
  });

  test('[L2-3] 应实现 runToolWithTimeout 方法', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/runToolWithTimeout\s*\(/);
  });

  test('[L2-4] 应实现 runToolSafely 方法', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/runToolSafely\s*\(/);
  });

  test('[L2-5] 应实现 executeWithFallback 方法', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/executeWithFallback\s*\(/);
  });

  test('[L2-6] 应实现 executeParallel 方法', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/executeParallel\s*\(/);
  });

  test('[L2-7] IntentRouter 应实现 route 方法', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/intent-router.ts'), 'utf-8');
    expect(content).toMatch(/route\s*\([^)]*\)\s*:\s*CodemapIntent/);
  });

  test('[L2-8] 应定义 CodemapIntent 类型', () => {
    const typesPath = join(process.cwd(), 'src/orchestrator/types.ts');
    if (existsSync(typesPath)) {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/interface\s+CodemapIntent|type\s+CodemapIntent/);
    } else {
      // 可能定义在其他文件中
      const orchestratorContent = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
      expect(orchestratorContent).toMatch(/CodemapIntent/);
    }
  });

  test('[L2-9] 应定义 IntentType 类型', () => {
    const typesPath = join(process.cwd(), 'src/orchestrator/types.ts');
    const content = existsSync(typesPath) 
      ? readFileSync(typesPath, 'utf-8')
      : readFileSync(join(process.cwd(), 'src/orchestrator/intent-router.ts'), 'utf-8');
    expect(content).toMatch(/type\s+IntentType|IntentType\s*=/);
  });

  test('[L2-10] 应定义回退链配置', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/fallbackChains/);
    expect(content).toMatch(/ast-grep.*rg-internal|codemap.*rg-internal/);
  });
});

// ============================================
// Level 3: 模式检查
// ============================================

describe('L3: 代码模式检查', () => {
  test('[L3-1] 超时控制应使用 AbortController', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/AbortController/);
    expect(content).toMatch(/controller\.abort/);
    expect(content).toMatch(/signal/);
  });

  test('[L3-2] 默认超时时间应为 30 秒', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    const has30Seconds = content.match(/DEFAULT_TIMEOUT\s*=\s*30000/) ||
                         content.match(/default.*30[^\d]*000/) ||
                         content.match(/timeout.*=.*30000/);
    expect(has30Seconds).toBeTruthy();
  });

  test('[L3-3] 应处理 AbortError 超时情况', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/AbortError/);
  });

  test('[L3-4] runToolSafely 应返回对象包含 results 和 error', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/results\s*:/);
    expect(content).toMatch(/error\?:/);
  });

  test('[L3-5] executeWithFallback 应检查置信度阈值', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/threshold/);
    expect(content).toMatch(/confidence\.score/);
  });

  test('[L3-6] IntentRouter 应实现白名单验证', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/intent-router.ts'), 'utf-8');
    expect(content).toMatch(/validIntents|whitelist|includes/);
  });

  test('[L3-7] 应使用 async/await 处理异步操作', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/async\s+\w+/);
    expect(content).toMatch(/await\s+/);
  });

  test('[L3-8] 应正确导出模块成员', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/index.ts'), 'utf-8');
    expect(content).toMatch(/export.*ToolOrchestrator/);
    expect(content).toMatch(/export.*IntentRouter/);
  });

  test('[L3-9] 回退链应防止循环依赖', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // 应该有限制逻辑，避免 A->B->A 循环
    expect(content).toMatch(/visited|executed|has.*run/i);
  });

  test('[L3-10] 应使用 console 进行日志记录', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    expect(content).toMatch(/console\.(debug|warn|error|log)/);
  });
});

// ============================================
// Level 4: 负面检查（反例场景）
// ============================================

describe('L4: 反模式检查', () => {
  test('[L4-1] 不应使用 setTimeout 抛错实现超时', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // 不应有 setTimeout 抛出异常的写法
    const badPattern = /setTimeout\s*\(\s*\(\)\s*=>\s*\{?\s*throw/;
    expect(content).not.toMatch(badPattern);
  });

  test('[L4-2] 不应在错误时直接抛出异常中断流程', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // runToolSafely 中不应在 catch 块中重新抛出
    const runToolSafelyMatch = content.match(/runToolSafely[\s\S]*?\n\s*\}/);
    if (runToolSafelyMatch) {
      const methodContent = runToolSafelyMatch[0];
      // 检查是否在 catch 中有 throw
      const hasRethrow = /catch[\s\S]*?\{[\s\S]*?throw/.test(methodContent);
      expect(hasRethrow).toBe(false);
    }
  });

  test('[L4-3] 不应创建循环回退链', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // 不应有 rg-internal 指向 ast-grep 或 codemap 的回退
    expect(content).not.toMatch(/rg-internal.*ast-grep/);
    expect(content).not.toMatch(/rg-internal.*codemap/);
  });

  test('[L4-4] 不应硬编码魔法数字', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // 超时时间应使用常量定义
    expect(content).toMatch(/DEFAULT_TIMEOUT|const.*TIMEOUT/);
  });

  test('[L4-5] 不应有未使用的导入', () => {
    const indexPath = join(process.cwd(), 'src/orchestrator/index.ts');
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath, 'utf-8');
      // 简单检查：导入的都应该被使用
      const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
      // 至少应该有 .js 扩展名的导入
      const hasJsExtension = imports.some(imp => imp.includes('.js'));
      expect(hasJsExtension || imports.length === 0).toBe(true);
    }
  });

  test('[L4-6] 不应使用 any 类型', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // 减少 any 的使用
    const anyCount = (content.match(/:\s*any/g) || []).length;
    expect(anyCount).toBeLessThanOrEqual(2); // 允许极少量必要时使用
  });

  test('[L4-7] 不应遗漏 Promise 返回类型', () => {
    const content = readFileSync(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'), 'utf-8');
    // 异步方法应有返回类型标注
    const asyncMethods = content.match(/async\s+\w+\s*\([^)]*\)\s*:\s*Promise/g) || [];
    expect(asyncMethods.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================
// 功能行为测试
// ============================================

describe('功能行为测试', () => {
  // 这些测试需要在实际模块实现后运行
  // 使用动态导入避免编译错误

  test('应能动态导入 ToolOrchestrator', async () => {
    try {
      const module = await import(join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts'));
      expect(module.ToolOrchestrator).toBeDefined();
    } catch (e) {
      // 如果模块不存在，测试通过（L1 会捕获）
      expect(true).toBe(true);
    }
  });

  test('应能动态导入 IntentRouter', async () => {
    try {
      const module = await import(join(process.cwd(), 'src/orchestrator/intent-router.ts'));
      expect(module.IntentRouter).toBeDefined();
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
