## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L0-1 | 遵循项目架构约定（保留原函数，新增类） | 10 | EVAL.ts L0 | 自动 |
| L1-1 | ImpactCommand 类存在 | 8 | EVAL.ts L1-1 | 自动 |
| L1-2 | DepsCommand 类存在 | 8 | EVAL.ts L1-2 | 自动 |
| L1-3 | ComplexityCommand 类存在 | 8 | EVAL.ts L1-3 | 自动 |
| L1-4 | CodemapAdapter 存在 | 8 | EVAL.ts L1-4 | 自动 |
| L1-5 | 适配器索引文件存在 | 4 | EVAL.ts L1-5 | 自动 |
| L1-6 | Orchestrator 类型定义存在 | 4 | EVAL.ts L1-6 | 自动 |
| L2-1 | ImpactCommand 有 run/runEnhanced 方法 | 6 | EVAL.ts L2-1 | 自动 |
| L2-2 | DepsCommand 有 run/runEnhanced 方法 | 5 | EVAL.ts L2-2 | 自动 |
| L2-3 | ComplexityCommand 有 run/runEnhanced 方法 | 5 | EVAL.ts L2-3 | 自动 |
| L2-4 | CodemapAdapter 实现 ToolAdapter | 8 | EVAL.ts L2-4 | 自动 |
| L2-5 | 适配器索引导出 CodemapAdapter | 4 | EVAL.ts L2-5 | 自动 |
| L2-6 | UnifiedResult 类型定义完整 | 4 | EVAL.ts L2-6 | 自动 |
| L3-1 | toUnifiedResults 转换方法存在 | 4 | EVAL.ts L3-1 | 自动 |
| L3-2 | UnifiedResult source 为 'codemap' | 4 | EVAL.ts L3-2 | 自动 |
| L3-3 | id 格式符合规范 | 4 | EVAL.ts L3-3 | 自动 |
| L4-1 | 未修改原有 run 方法签名 | 3 | EVAL.ts L4-1 | 自动 |
| L4-2 | UnifiedResult 未遗漏必需字段 | 3 | EVAL.ts L4-2 | 自动 |

> **总分: 100 分**

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 关键检查点说明

#### L0 级别（项目约定）- 10 分
验证 AI 是否正确遵循了项目的架构模式：
- 保留原有的命令函数导出（向后兼容）
- 使用新增的类来封装可调用逻辑
- 不引入项目中未使用的依赖

#### L1 级别（存在性）- 40 分
验证所有必需的文件是否已创建：
- 三个命令类的改造（24 分）
- CodemapAdapter 适配器（8 分）
- 适配器索引和类型定义（8 分）

#### L2 级别（结构）- 32 分
验证代码结构是否符合设计规范：
- 所有命令类都有 run 和 runEnhanced 方法（16 分）
- CodemapAdapter 正确实现 ToolAdapter 接口（8 分）
- 类型定义和导出正确（8 分）

#### L3 级别（模式）- 12 分
验证实现细节是否正确：
- 转换方法存在（4 分）
- source 字段值正确（4 分）
- id 格式符合规范（4 分）

#### L4 级别（负面检查）- 6 分
验证没有出现反模式：
- 未破坏向后兼容（3 分）
- UnifiedResult 字段完整（3 分）

### 验证环境
- Node.js 版本: >= 20
- 测试框架: Vitest
- 执行命令: `npx vitest run .tasks/phase5-refactor-commands/EVAL.ts`

### 手动验证步骤

```bash
# 1. 编译检查
npx tsc --noEmit

# 2. 运行测试
npx vitest run .tasks/phase5-refactor-commands/EVAL.ts

# 3. 向后兼容检查（原有 CLI 应正常工作）
npx tsx src/cli/index.ts impact --file src/index.ts --json
npx tsx src/cli/index.ts deps --module src/index.ts --json
npx tsx src/cli/index.ts complexity --file src/index.ts --json

# 4. 新接口检查（应能导入并使用）
cat > /tmp/test-phase5.ts << 'EOF'
import { ImpactCommand, DepsCommand, ComplexityCommand } from './src/cli/commands';
import { CodemapAdapter } from './src/orchestrator/adapters';

async function test() {
  const impact = new ImpactCommand();
  const adapter = new CodemapAdapter();
  console.log('Imports OK');
}
EOF
npx tsc /tmp/test-phase5.ts --noEmit --module Node16 --moduleResolution Node16
```

### 常见失败原因

1. **破坏了向后兼容**（-10 分）
   - 修改了原有命令函数的签名
   - 改变了原有命令的输出格式

2. **UnifiedResult 字段缺失**（-4 分）
   - 遗漏了 id、source、toolScore 等必需字段
   - source 字段值不为 'codemap'

3. **CodemapAdapter 实现不完整**（-8 分）
   - 未实现 ToolAdapter 接口的所有方法
   - weight 值不正确

4. **类型定义缺失**（-4 分）
   - UnifiedResult 类型未定义或定义不完整
   - ToolOptions 类型缺失
