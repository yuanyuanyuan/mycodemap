# Task Plan: NPM 发布 P0 阶段实施

## Goal
按照 `docs/PUBLISH_NPM_DESIGN_FINAL.md` 执行 P0 阶段（发布闭环），使 `@mycodemap/mycodemap` 可成功发布。

## Scope & Constraints
- 仅执行 P0 阶段（Step A-F）
- P1 阶段（增强功能）本次不做
- 遵循文档中的验收标准和阶段门禁

## Current Phase
IN_PROGRESS: 阶段1 - 任务分析与 Skill 发现

## Phases

### Phase 1: 任务分析与 Skill 发现
- [x] 分析 6 个原子化步骤的并行可行性
- [x] 对每个子任务执行 Skill 回退链扫描
- [x] 输出任务总览与团队蓝图
- Status: complete

### Phase 2: 团队组建
- [x] 创建 Agent Team
- [x] 分配角色与任务
- Status: complete

### Phase 3: 并行执行
- [ ] Step A: 发布元数据与缺失文件
- [ ] Step B: CLI 命名与配置兼容
- [ ] Step C: 输出目录统一入口
- [ ] Step D: 环境变量双前缀兼容
- [ ] Step E: CI 与发布 workflow
- [ ] Step F: 回归测试与验收
- Status: pending

### Phase 4: 质量把关
- [ ] 验收检查（DoD）
- [ ] 产品打磨
- Status: pending

### Phase 5: 结果交付
- [ ] 汇总报告
- [ ] 部署移交
- Status: pending

## Definition of Done
- `@mycodemap/mycodemap` 成功发布并可 npx 运行
- `mycodemap --version` 与 `codemap --version` 均可用
- 新旧配置/目录/环境变量兼容策略按设计生效
- CI 发布流程可重复执行

## Deliverables
- 成功发布的 npm 包
- 更新后的项目文件（package.json、CLI、CI 等）
- 通过所有验收测试

## Risks
- 一次性改名可能存在遗漏，需通过回归测试覆盖
- CI token/权限配置可能需要额外调试

## Errors Encountered
| Error | Attempt | Resolution |
|---|---:|---|
