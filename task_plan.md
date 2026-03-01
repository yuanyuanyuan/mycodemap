# CodeMap 编排层重构 - Phase 5-6 实施计划

## 任务概述

**目标**: 实施 CodeMap 编排层重构的 Phase 5-6。

**当前状态**: Phase 5 命令改造已完成（runEnhanced方法存在），但 CodemapAdapter 缺失；Phase 6 尚未实现。

## 阶段计划

### Phase 5: 改造现有命令为可调用模式
- [x] 5.1 创建 CodemapAdapter (`src/orchestrator/adapters/codemap-adapter.ts`)
- [x] 5.2 更新 adapters/index.ts 导出
- [x] 5.3 验证编译和测试通过

### Phase 6: 实现 AnalyzeCommand 统一入口
- [x] 6.1 创建 analyze.ts CLI 命令
- [x] 6.2 定义 CLI 参数契约
- [x] 6.3 实现测试关联器集成 (test-linker.ts)
- [x] 6.4 实现错误码系统 (E0001-E0006)
- [x] 6.5 编写单元测试 (analyze.test.ts, test-linker.test.ts)
