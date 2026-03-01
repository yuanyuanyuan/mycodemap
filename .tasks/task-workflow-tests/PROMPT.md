# 工作流编排器模块测试生成任务

## 背景

工作流编排器模块是CodeMap系统的核心组件，负责管理6阶段重构工作流（reference → impact → risk → implementation → commit → ci）。该模块包含5个核心文件，需要为其生成完整的Vitest测试套件，确保100%代码覆盖率和所有状态转换的正确性。

## 要求

### 功能要求
1. 生成5个测试文件，分别覆盖：
   - `workflow-orchestrator.ts` - WorkflowOrchestrator类
   - `workflow-context.ts` - WorkflowContext工厂和验证器
   - `workflow-persistence.ts` - 持久化管理器
   - `phase-checkpoint.ts` - 阶段检查点验证
   - `config.ts` - 配置常量

2. 测试必须覆盖：
   - 所有公共方法
   - 所有状态转换路径
   - 所有边界条件
   - 错误处理路径

3. 使用 `vi.mock` 模拟 `node:fs` 模块
4. 使用 `vi.fn()` 创建spy函数
5. 目标代码覆盖率100%

### 技术约束

**Prefer retrieval-led reasoning over pre-training-led reasoning**

- 基于实际源代码结构生成测试
- 参考类型定义确保类型安全
- 测试用例必须反映真实行为

## 初始状态

- 源代码已存在于 `src/orchestrator/workflow/`
- `__tests__` 目录已创建
- Vitest配置已完成
- 使用ESM模块

## 约束条件

1. **Mock要求**
   - 必须使用 `vi.mock('node:fs')` 模拟文件系统
   - 必须使用 `vi.mock` 模拟外部依赖类
   - 每个mock必须有明确的返回值

2. **测试组织**
   - 使用 `describe` 组织相关测试
   - 使用 `beforeEach` 重置状态
   - 测试描述必须清晰说明测试内容

3. **类型安全**
   - 所有测试代码必须是TypeScript
   - 使用正确的类型导入
   - 避免 `any` 类型

4. **覆盖率**
   - 语句覆盖率100%
   - 分支覆盖率100%
   - 函数覆盖率100%
   - 行覆盖率100%

## 验收标准

### 功能验收
- [ ] 所有5个测试文件生成完成
- [ ] 所有测试用例通过
- [ ] 代码覆盖率达到100%
- [ ] 无TypeScript编译错误

### 质量验收
- [ ] Mock使用正确，测试相互隔离
- [ ] 边界条件全面覆盖
- [ ] 状态机转换完整测试
- [ ] 测试描述清晰准确

### 反例场景（必须避免）
- ❌ 测试之间相互依赖
- ❌ Mock未正确清理导致状态泄漏
- ❌ 未测试错误处理路径
- ❌ 使用真实的文件系统
- ❌ 覆盖率低于100%

## 用户价值

生成高质量的测试套件，确保工作流编排器的可靠性和稳定性：
- 支持CI/CD自动测试
- 防止回归问题
- 提供重构信心
- 作为模块使用文档
