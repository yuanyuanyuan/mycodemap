import { expect, test, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// 文件路径常量
const TYPES_FILE = join(process.cwd(), 'src/orchestrator/types.ts');
const ADAPTER_BASE_FILE = join(process.cwd(), 'src/orchestrator/adapters/base-adapter.ts');
const ADAPTER_INDEX_FILE = join(process.cwd(), 'src/orchestrator/adapters/index.ts');

// Level 0: 项目约定检查

describe('Level 0: 项目约定检查', () => {
  test('[L0] 代码应遵循项目的 TypeScript 严格模式约定', () => {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});

// Level 1: 存在性检查

describe('Level 1: 存在性检查', () => {
  test('[L1-1] src/orchestrator/types.ts 文件应存在', () => {
    expect(existsSync(TYPES_FILE)).toBe(true);
  });

  test('[L1-2] src/orchestrator/adapters/base-adapter.ts 文件应存在', () => {
    expect(existsSync(ADAPTER_BASE_FILE)).toBe(true);
  });

  test('[L1-3] src/orchestrator/adapters/index.ts 文件应存在', () => {
    expect(existsSync(ADAPTER_INDEX_FILE)).toBe(true);
  });
});

// Level 2: 结构检查

describe('Level 2: 结构检查', () => {
  test('[L2-1] UnifiedResult 接口应包含所有必需字段', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    // 检查接口定义
    expect(content).toMatch(/interface\s+UnifiedResult\s*\{/);
    
    // 检查核心字段
    expect(content).toMatch(/id\s*:\s*string/);
    expect(content).toMatch(/source\s*:/);
    expect(content).toMatch(/toolScore\s*:\s*number/);
    expect(content).toMatch(/type\s*:/);
    expect(content).toMatch(/file\s*:\s*string/);
    expect(content).toMatch(/line\s*:\s*number/);
    expect(content).toMatch(/content\s*:\s*string/);
    expect(content).toMatch(/relevance\s*:\s*number/);
    expect(content).toMatch(/keywords\s*:\s*string\[\]/);
    
    // 检查 metadata 字段
    expect(content).toMatch(/metadata\s*:/);
  });

  test('[L2-2] HeatScore 接口应正确定义', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    expect(content).toMatch(/interface\s+HeatScore\s*\{/);
    expect(content).toMatch(/freq30d\s*:\s*number/);
    expect(content).toMatch(/lastType\s*:\s*string/);
    expect(content).toMatch(/lastDate\s*:\s*string/);
  });

  test('[L2-3] ToolAdapter 接口应正确定义', () => {
    const content = readFileSync(ADAPTER_BASE_FILE, 'utf-8');
    
    expect(content).toMatch(/interface\s+ToolAdapter\s*\{/);
    expect(content).toMatch(/name\s*:\s*string/);
    expect(content).toMatch(/weight\s*:\s*number/);
    expect(content).toMatch(/isAvailable\s*\(\s*\)\s*:\s*Promise<boolean>/);
    expect(content).toMatch(/execute\s*\(/);
  });

  test('[L2-4] ToolOptions 类型应定义', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    // ToolOptions 可以是 interface 或 type
    expect(content).toMatch(/(interface|type)\s+ToolOptions/);
  });

  test('[L2-5] adapters/index.ts 应导出 ToolAdapter', () => {
    const content = readFileSync(ADAPTER_INDEX_FILE, 'utf-8');
    
    expect(content).toMatch(/export.*ToolAdapter/);
  });
});

// Level 3: 模式检查

describe('Level 3: 模式检查', () => {
  test('[L3-1] source 字段应使用字面量联合类型', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    // 检查字面量联合类型
    expect(content).toMatch(/source\s*:\s*['"]codemap['"]\s*\|\s*['"]ast-grep['"]\s*\|\s*['"]rg-internal['"]\s*\|\s*['"]ai-feed['"]/);
  });

  test('[L3-2] type 字段应使用字面量联合类型', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    expect(content).toMatch(/type\s*:\s*['"]file['"]\s*\|\s*['"]symbol['"]\s*\|\s*['"]code['"]\s*\|\s*['"]documentation['"]\s*\|\s*['"]risk-assessment['"]/);
  });

  test('[L3-3] metadata.riskLevel 应使用字面量联合类型', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    expect(content).toMatch(/riskLevel\s*:\s*['"]high['"]\s*\|\s*['"]medium['"]\s*\|\s*['"]low['"]/);
  });

  test('[L3-4] metadata.symbolType 应使用字面量联合类型', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    expect(content).toMatch(/symbolType\s*:\s*['"]class['"]\s*\|\s*['"]function['"]\s*\|\s*['"]interface['"]\s*\|\s*['"]variable['"]/);
  });

  test('[L3-5] 核心字段应为必需（非可选）', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    // 提取 UnifiedResult 接口内容
    const unifiedResultMatch = content.match(/interface\s+UnifiedResult\s*\{[\s\S]*?\n\}/);
    expect(unifiedResultMatch).toBeTruthy();
    
    const interfaceContent = unifiedResultMatch![0];
    
    // 核心字段不应包含 ? 标记（在接口顶层）
    const coreFields = ['id:', 'source:', 'toolScore:', 'type:', 'file:', 'line:', 'content:', 'relevance:', 'keywords:'];
    for (const field of coreFields) {
      // 确保字段定义不以 ? 结尾
      const fieldPattern = new RegExp(`${field.replace(':', '\\s*\\??\\s*:')}`);
      expect(interfaceContent).toMatch(fieldPattern);
    }
  });

  test('[L3-6] 所有公共类型应被导出', () => {
    const typesContent = readFileSync(TYPES_FILE, 'utf-8');
    
    expect(typesContent).toMatch(/export\s+interface\s+UnifiedResult/);
    expect(typesContent).toMatch(/export\s+interface\s+HeatScore/);
  });
});

// Level 4: 负面检查

describe('Level 4: 负面检查', () => {
  test('[L4-1] 不应使用 any 类型', () => {
    const typesContent = readFileSync(TYPES_FILE, 'utf-8');
    const adapterContent = readFileSync(ADAPTER_BASE_FILE, 'utf-8');
    
    // 排除注释中的 "any"
    const codeWithoutComments = typesContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    expect(codeWithoutComments).not.toMatch(/:\s*any\b/);
    
    const adapterCodeWithoutComments = adapterContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    expect(adapterCodeWithoutComments).not.toMatch(/:\s*any\b/);
  });

  test('[L4-2] 不应使用 class 定义数据结构', () => {
    const typesContent = readFileSync(TYPES_FILE, 'utf-8');
    const adapterContent = readFileSync(ADAPTER_BASE_FILE, 'utf-8');
    
    // 不应使用 class 定义（允许在注释中提到）
    const codeWithoutComments = typesContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    expect(codeWithoutComments).not.toMatch(/\bclass\s+\w+/);
    
    const adapterCodeWithoutComments = adapterContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    expect(adapterCodeWithoutComments).not.toMatch(/\bclass\s+\w+/);
  });

  test('[L4-3] 不应使用 enum 定义', () => {
    const typesContent = readFileSync(TYPES_FILE, 'utf-8');
    
    // 排除注释中的 "enum"
    const codeWithoutComments = typesContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    expect(codeWithoutComments).not.toMatch(/\benum\s+/);
  });

  test('[L4-4] 数值字段应明确使用 number 类型', () => {
    const content = readFileSync(TYPES_FILE, 'utf-8');
    
    // 检查数值字段是否明确标记为 number
    const numberFields = [
      'toolScore',
      'line',
      'relevance',
      'commitCount',
      'gravity',
      'impactCount',
      'freq30d'
    ];
    
    for (const field of numberFields) {
      const pattern = new RegExp(`${field}\\s*:\\s*number`);
      expect(content).toMatch(pattern);
    }
  });
});
