# Task Plan: 测试报告问题修复

## Goal
修复测试报告中的所有问题，按优先级分配给多个 Agent 并行处理

## Current Phase
All Complete

## Phases

### Phase 1: Requirements & Discovery
- [x] 分析测试报告问题清单
- [x] 按优先级分类问题
- [x] 搜索相关Skills
- [x] 创建团队蓝图
- **Status:** complete

### Phase 2: Team Formation
- [x] 组建Agent团队
- [x] 分配任务给各Agent
- [x] 设定验收标准
- **Status:** complete

### Phase 3: Parallel Execution
- [x] 并行执行各Agent任务
- [x] 实时监控进度
- [x] 处理阻塞和依赖
- **Status:** complete

### Phase 4: Quality Gate
- [x] 验证所有修复
- [x] 单元测试通过 (705/705)
- [x] 集成测试通过
- **Status:** complete

### Phase 5: Delivery
- [x] 汇总修复结果
- [x] 生成最终报告
- [x] 部署验证
- **Status:** complete

## 待修复问题汇总

### P1 (高优先级 - 已修复)
| 问题 | 报告 | 状态 |
|------|------|------|
| 性能差距明显 (比rg慢100倍) | scenario5 | ✅ 缓存优化完成 |
| 大小写处理不一致 | symbol-search | ✅ 已修复 |
| 速度性能差 | symbol-search | ✅ 缓存+索引优化完成 |

### P2 (中优先级 - 已修复)
| 问题 | 报告 | 状态 |
|------|------|------|
| 依赖查询结果存在重复 | scenario5 | ✅ 已修复 |
| deps 与 query -d 输出格式不一致 | scenario5 | ✅ 已修复 |
| 缺少正则表达式支持 | scenario5 | ✅ 已修复 |
| 遗漏 re-export 依赖 | impact_analysis | ✅ 已修复 |
| 风险等级阈值不明确 | impact_analysis | ✅ 已修复 |
| 结果数量有限 | symbol-search | ✅ 已修复 |

### P3 (低优先级 - 已完成)
| 问题 | 报告 | 状态 |
|------|------|------|
| 缺少引用信息 | symbol-search | ✅ 已修复 |
| 无代码上下文 | symbol-search | ✅ 已修复 |
| codemap.json 不存储复杂度 | complexity | ✅ 已修复 |

## Key Questions
1. 问题修复是否需要修改核心解析逻辑？
2. 如何验证修复后的功能正确性？
3. 是否有现有测试可以复用？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 使用并行Agent处理 | 多维度问题可以并行处理提高效率 |
| 按报告分组任务 | 每个测试报告对应一个Agent处理 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 无 | - | - |

## Notes
- 每个Agent必须调用 using-superpower 技能
- 需要读取相关测试报告文件了解详情
- 优先处理P1问题

---

# Task Plan: package.json:13 (`npm test`) 性能排查（2026-03-03）

## Goal
定位 `package.json:13` 的慢运行根因，判断高 CPU 是否与当前项目相关，并给出可执行优化方案。

## Current Phase
All Complete

## Phases

### Phase 1: 证据采集
- [x] 定位 `package.json:13` 对应脚本
- [x] 采集 Vitest 配置与测试文件分布
- [x] 采集一次完整测试资源占用数据
- **Status:** complete

### Phase 2: 慢点定位
- [x] 找到最慢测试文件
- [x] 追踪慢测试内部实现成本
- [x] 识别额外稳定性风险（崩溃）
- **Status:** complete

### Phase 3: 优化方案
- [x] 提出“功能测试/性能基准测试”拆分方案
- [x] 提出线程池与并发参数优化建议
- [x] 定义验证指标（耗时/CPU/RSS）
- **Status:** complete

### Phase 4: 落地与验证
- [x] 常规测试池切换为 `threads`
- [x] 新增 `vitest.benchmark.config.ts`
- [x] 修复 `benchmark` 脚本与默认 exclude 冲突
- [x] benchmark 结果复用（避免重复执行 3 次）
- [x] 验证 `npm test` 与 `npm run benchmark`
- **Status:** complete

## Key Questions
1. `npm test` 当前是否仍包含基准测试？
2. 高 CPU 是真实瓶颈还是并行测试的正常表现？
3. 分离后如何保证基准测试仍可运行？

---

# Task Plan: codemap 运行日志保留（2026-03-03）

## Goal
为 codemap CLI 增加运行日志落盘与自动保留策略，便于故障调试和问题追踪。

## Current Phase
All Complete

## Phases

### Phase 1: 方案与范围
- [x] 确认日志范围（CLI 运行时）
- [x] 确认落盘目录与保留策略（默认 + 环境变量）
- [x] 确认对现有测试/输出兼容性
- **Status:** complete

### Phase 2: 实现
- [x] 新增运行日志模块（初始化、写入、清理）
- [x] 在 CLI 入口接入日志初始化
- [x] 补充单元测试覆盖关键逻辑
- [x] 新增日志按大小轮转与 gzip 压缩
- [x] benchmark 错误噪音分流到独立错误日志
- **Status:** complete

### Phase 3: 验证
- [x] 运行新增单测
- [x] 运行全量功能测试
- [x] 验证构建后 CLI 真实落盘日志
- **Status:** complete

## Key Questions
1. 默认日志目录是否应与 `.codemap/` 一致？
2. 日志保留应按天数、文件数还是两者结合？
3. 是否需要提供环境变量让 CI 可关闭日志写入？
