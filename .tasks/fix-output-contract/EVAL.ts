import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
test('[L0] 代码应遵循项目的架构约定', () => {
  // 检查 CI 命令文件
  const ciContent = readFileSync(join(process.cwd(), 'src/cli/commands/ci.ts'), 'utf-8');
  
  // 检查是否使用了项目中定义的错误码模式
  expect(ciContent).toMatch(/E0010/);
  expect(ciContent).toMatch(/checkOutputContractAction/);
  
  // 检查是否避免了训练数据中常见但项目不使用的模式
  expect(ciContent).not.toMatch(/console\.log.*emoji/); // 无 emoji
  expect(ciContent).not.toMatch(/process\.exit\(\d+\).*\/\/.*中文/); // 纯文本输出
});

// Level 0b: 依赖版本检查
test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

  // 检查是否使用 chalk（项目中已有）
  const hasChalk = pkg.dependencies?.['chalk'] || pkg.devDependencies?.['chalk'];
  expect(hasChalk).toBeTruthy();
  
  // 检查是否使用 commander（项目中已有）
  const hasCommander = pkg.dependencies?.['commander'] || pkg.devDependencies?.['commander'];
  expect(hasCommander).toBeTruthy();
});

// Level 1: 存在性检查 - CI 校验实现
test('[L1] CI check-output-contract 应实现真正的输出校验', () => {
  const ciContent = readFileSync(join(process.cwd(), 'src/cli/commands/ci.ts'), 'utf-8');
  
  // 检查是否运行 analyze 命令获取输出
  expect(ciContent).toMatch(/codemap analyze.*--output-mode machine/);
  
  // 检查是否解析 JSON 输出
  expect(ciContent).toMatch(/JSON\.parse/);
  
  // 检查是否添加 E0010 错误码
  expect(ciContent).toMatch(/E0010.*CONTRACT/);
});

// Level 2: 结构检查 - analyze 输出字段完整性
test('[L2] analyze machine 输出应包含完整字段', () => {
  const analyzeContent = readFileSync(join(process.cwd(), 'src/cli/commands/analyze.ts'), 'utf-8');
  
  // 检查 schemaVersion 字段
  expect(analyzeContent).toMatch(/schemaVersion.*v1\.0\.0/);
  
  // 检查 tool 字段
  expect(analyzeContent).toMatch(/tool.*:/);
  
  // 检查 confidence 字段
  expect(analyzeContent).toMatch(/confidence/);
  expect(analyzeContent).toMatch(/score/);
  expect(analyzeContent).toMatch(/level/);
});

// Level 3: 模式检查 - JSON Schema 定义
test('[L3] 应定义 CodemapOutput 接口和类型守卫', () => {
  const typesPath = join(process.cwd(), 'src/orchestrator/types.ts');
  expect(existsSync(typesPath)).toBe(true);
  
  const typesContent = readFileSync(typesPath, 'utf-8');
  
  // 检查 CodemapOutput 接口定义
  expect(typesContent).toMatch(/interface CodemapOutput/);
  expect(typesContent).toMatch(/schemaVersion/);
  expect(typesContent).toMatch(/intent/);
  expect(typesContent).toMatch(/tool/);
  expect(typesContent).toMatch(/confidence/);
  expect(typesContent).toMatch(/results/);
  
  // 检查类型守卫函数
  expect(typesContent).toMatch(/isCodemapOutput/);
});

// Level 3b: 校验逻辑完整性
test('[L3] check-output-contract 应验证所有必需字段', () => {
  const ciContent = readFileSync(join(process.cwd(), 'src/cli/commands/ci.ts'), 'utf-8');
  
  // 检查 schemaVersion 校验
  expect(ciContent).toMatch(/schemaVersion/);
  
  // 检查 results 数量校验（Top-K）
  expect(ciContent).toMatch(/results.*length/);
  expect(ciContent).toMatch(/topK|top-k/);
  
  // 检查 token 限制校验
  expect(ciContent).toMatch(/token|split.*\s/);
  
  // 检查 confidence 字段校验
  expect(ciContent).toMatch(/confidence/);
});

// Level 4: 负面检查（反例场景验证）
test('[L4-负面] 不应该破坏 human 输出模式', () => {
  const analyzeContent = readFileSync(join(process.cwd(), 'src/cli/commands/analyze.ts'), 'utf-8');
  
  // 检查 human 模式仍然使用 printHumanOutput
  expect(analyzeContent).toMatch(/printHumanOutput/);
  
  // 检查 human 模式不输出 JSON
  const humanMatch = analyzeContent.match(/outputMode.*human[\s\S]*?return[\s\S]*?}/);
  if (humanMatch) {
    expect(humanMatch[0]).not.toMatch(/schemaVersion/);
  }
});

test('[L4-负面] 不应该引入项目未使用的依赖', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  
  // 不应引入新的 JSON Schema 验证库（项目未使用）
  expect(pkg.dependencies?.['ajv']).toBeFalsy();
  expect(pkg.dependencies?.['zod']).toBeFalsy();
  expect(pkg.devDependencies?.['ajv']).toBeFalsy();
  expect(pkg.devDependencies?.['zod']).toBeFalsy();
});

test('[L4-负面] 不应该移除现有 CI 错误码', () => {
  const ciContent = readFileSync(join(process.cwd(), 'src/cli/commands/ci.ts'), 'utf-8');
  
  // 检查现有错误码仍然存在
  expect(ciContent).toMatch(/E0007/);
  expect(ciContent).toMatch(/E0008/);
  expect(ciContent).toMatch(/E0009/);
});
