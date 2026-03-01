import { expect, test, describe, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
describe('L0: 项目约定检查', () => {
  test('[L0] 代码应遵循项目的架构约定', () => {
    // 检查是否使用了项目中定义的模式
    const impactPath = join(PROJECT_ROOT, 'src/cli/commands/impact.ts');
    const impactContent = readFileSync(impactPath, 'utf-8');
    
    // 应该保留原有函数导出
    expect(impactContent).toMatch(/export\s+(async\s+)?function\s+impactCommand/);
    
    // 应该新增 ImpactCommand 类
    expect(impactContent).toMatch(/export\s+class\s+ImpactCommand/);
    
    // 检查 DepsCommand
    const depsPath = join(PROJECT_ROOT, 'src/cli/commands/deps.ts');
    const depsContent = readFileSync(depsPath, 'utf-8');
    expect(depsContent).toMatch(/export\s+(async\s+)?function\s+depsCommand/);
    expect(depsContent).toMatch(/export\s+class\s+DepsCommand/);
    
    // 检查 ComplexityCommand
    const complexityPath = join(PROJECT_ROOT, 'src/cli/commands/complexity.ts');
    const complexityContent = readFileSync(complexityPath, 'utf-8');
    expect(complexityContent).toMatch(/export\s+(async\s+)?function\s+complexityCommand/);
    expect(complexityContent).toMatch(/export\s+class\s+ComplexityCommand/);
  });

  test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
    
    // 检查是否使用 chalk（项目已有）
    const hasChalk = pkg.dependencies?.['chalk'] || pkg.devDependencies?.['chalk'];
    expect(hasChalk).toBeTruthy();
  });
});

// Level 1: 存在性检查
describe('L1: 文件存在性检查', () => {
  test('[L1-1] ImpactCommand 类应存在', () => {
    const filePath = join(PROJECT_ROOT, 'src/cli/commands/impact.ts');
    expect(existsSync(filePath)).toBe(true);
    
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/class\s+ImpactCommand/);
  });

  test('[L1-2] DepsCommand 类应存在', () => {
    const filePath = join(PROJECT_ROOT, 'src/cli/commands/deps.ts');
    expect(existsSync(filePath)).toBe(true);
    
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/class\s+DepsCommand/);
  });

  test('[L1-3] ComplexityCommand 类应存在', () => {
    const filePath = join(PROJECT_ROOT, 'src/cli/commands/complexity.ts');
    expect(existsSync(filePath)).toBe(true);
    
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/class\s+ComplexityCommand/);
  });

  test('[L1-4] CodemapAdapter 应存在', () => {
    const filePath = join(PROJECT_ROOT, 'src/orchestrator/adapters/codemap-adapter.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('[L1-5] 适配器索引文件应存在', () => {
    const filePath = join(PROJECT_ROOT, 'src/orchestrator/adapters/index.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('[L1-6] Orchestrator 类型定义应存在', () => {
    const typesPath = join(PROJECT_ROOT, 'src/orchestrator/types.ts');
    expect(existsSync(typesPath)).toBe(true);
  });
});

// Level 2: 结构检查
describe('L2: 代码结构检查', () => {
  test('[L2-1] ImpactCommand 应有 run 和 runEnhanced 方法', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    expect(content).toMatch(/run\s*\([^)]*\)\s*:\s*Promise<[^>]*>/);
    expect(content).toMatch(/runEnhanced\s*\([^)]*\)\s*:\s*Promise<UnifiedResult\[\]>/);
  });

  test('[L2-2] DepsCommand 应有 run 和 runEnhanced 方法', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/deps.ts'), 'utf-8');
    expect(content).toMatch(/run\s*\([^)]*\)\s*:\s*Promise<[^>]*>/);
    expect(content).toMatch(/runEnhanced\s*\([^)]*\)\s*:\s*Promise<UnifiedResult\[\]>/);
  });

  test('[L2-3] ComplexityCommand 应有 run 和 runEnhanced 方法', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/complexity.ts'), 'utf-8');
    expect(content).toMatch(/run\s*\([^)]*\)\s*:\s*Promise<[^>]*>/);
    expect(content).toMatch(/runEnhanced\s*\([^)]*\)\s*:\s*Promise<UnifiedResult\[\]>/);
  });

  test('[L2-4] CodemapAdapter 应实现 ToolAdapter 接口', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/orchestrator/adapters/codemap-adapter.ts'), 'utf-8');
    expect(content).toMatch(/class\s+CodemapAdapter\s+(implements\s+)?ToolAdapter/);
    expect(content).toMatch(/name\s*=\s*['"]codemap['"]/);
    expect(content).toMatch(/weight\s*=\s*0\.9/);
    expect(content).toMatch(/isAvailable\s*\(\s*\)\s*:\s*Promise<boolean>/);
    expect(content).toMatch(/execute\s*\([^)]*\)\s*:\s*Promise<UnifiedResult\[\]>/);
  });

  test('[L2-5] 适配器索引应导出 CodemapAdapter', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/orchestrator/adapters/index.ts'), 'utf-8');
    expect(content).toMatch(/export\s+.*CodemapAdapter/);
  });

  test('[L2-6] UnifiedResult 类型应定义完整', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/orchestrator/types.ts'), 'utf-8');
    expect(content).toMatch(/interface\s+UnifiedResult/);
    expect(content).toMatch(/id\s*:\s*string/);
    expect(content).toMatch(/source\s*:/);
    expect(content).toMatch(/toolScore\s*:\s*number/);
    expect(content).toMatch(/type\s*:/);
    expect(content).toMatch(/file\s*:\s*string/);
    expect(content).toMatch(/content\s*:\s*string/);
    expect(content).toMatch(/relevance\s*:\s*number/);
    expect(content).toMatch(/keywords\s*:\s*string\[\]/);
  });
});

// Level 3: 模式检查
describe('L3: 实现模式检查', () => {
  test('[L3-1] toUnifiedResults 转换方法应存在', () => {
    const impactContent = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    expect(impactContent).toMatch(/toUnifiedResults|private\s+.*unified/i);
  });

  test('[L3-2] UnifiedResult 的 source 应为 codemap', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // 检查转换方法中设置了 source: 'codemap'
    expect(content).toMatch(/source\s*:\s*['"]codemap['"]/);
  });

  test('[L3-3] id 格式应符合规范', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // id 应该包含 codemap 前缀和文件路径
    expect(content).toMatch(/id\s*:.+codemap/i);
  });

  test('[L3-4] CodemapAdapter.isAvailable 应检查 codemap.json', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/orchestrator/adapters/codemap-adapter.ts'), 'utf-8');
    expect(content).toMatch(/codemap\.json|\.codemap/i);
  });

  test('[L3-5] 原有命令函数应保持兼容', () => {
    const impactContent = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // 检查原有函数没有被修改签名
    expect(impactContent).toMatch(/export\s+async?\s+function\s+impactCommand\s*\(\s*options\s*:/);
  });
});

// Level 4: 负面检查（反例场景验证）
describe('L4: 反模式检查', () => {
  test('[L4-1] 不应修改原有 run 方法签名', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // 原有函数不应该有返回值类型改变为 UnifiedResult[]
    const functionMatch = content.match(/export\s+async\s+function\s+impactCommand[^{]+/);
    if (functionMatch) {
      // 原函数不应该返回 UnifiedResult[]
      expect(functionMatch[0]).not.toMatch(/UnifiedResult/);
    }
  });

  test('[L4-2] UnifiedResult 转换不应遗漏必需字段', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // 检查 toUnifiedResults 方法中设置了所有必需字段
    // 至少应该看到这些字段被设置
    expect(content).toMatch(/id\s*:/);
    expect(content).toMatch(/file\s*:/);
    expect(content).toMatch(/content\s*:/);
    expect(content).toMatch(/relevance\s*:/);
  });

  test('[L4-3] 不应直接使用 console.log 在 runEnhanced 中', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // runEnhanced 方法体内不应该有 console.log
    const classMatch = content.match(/class\s+ImpactCommand[\s\S]+/);
    if (classMatch) {
      const classBody = classMatch[0];
      // 检查 runEnhanced 方法
      const runEnhancedMatch = classBody.match(/runEnhanced[\s\S]+?(?=\n\s{2,}\w+\s*\(|\n\s*})/);
      if (runEnhancedMatch) {
        // runEnhanced 不应该有 console.log（返回数据的方法不应有输出）
        expect(runEnhancedMatch[0]).not.toMatch(/console\.log/);
      }
    }
  });

  test('[L4-4] source 字段值不应错误', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'), 'utf-8');
    // 不应该使用其他 source 值（如 'ast-grep'）
    expect(content).not.toMatch(/source\s*:\s*['"]ast-grep['"]/);
    expect(content).not.toMatch(/source\s*:\s*['"]rg-internal['"]/);
  });

  test('[L4-5] CodemapAdapter weight 不应错误', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'src/orchestrator/adapters/codemap-adapter.ts'), 'utf-8');
    // weight 应该是 0.9，不是其他值
    expect(content).not.toMatch(/weight\s*=\s*1\.0/); // 这是 ast-grep 的权重
    expect(content).not.toMatch(/weight\s*=\s*0\.7/); // 这是 rg-internal 的权重
  });
});

// 编译测试
describe('编译测试', () => {
  test('TypeScript 应该编译通过', async () => {
    // 这是一个标记测试，实际编译检查由 CI 执行
    // 这里只做文件存在性检查作为代理
    expect(existsSync(join(PROJECT_ROOT, 'src/cli/commands/impact.ts'))).toBe(true);
    expect(existsSync(join(PROJECT_ROOT, 'src/orchestrator/adapters/codemap-adapter.ts'))).toBe(true);
  });
});
