# Task Plan: Review 并合并 NPM 发布设计方案

## Goal
对 `docs/archive/PUBLISH_NPM_DESIGN_V1.md` 与 `docs/archive/PUBLISH_NPM_DESIGN_V2.md` 做第三方设计评审，给出带证据（本地代码 + 官方最佳实践）的问题与建议；在用户确认后，合并为一份可执行的最终设计文档，并补充实施执行附录与覆盖矩阵。

## Scope & Constraints
- 只评审 NPM 发布相关设计，不扩展到无关重构。
- 证据必须可追溯到本地文件行号或官方文档 URL。
- 先评审与确认，再执行合并。

## Current Phase
COMPLETE ✅

## Phases

### Phase 1: 资料收集与基线核对
- [x] 阅读两份设计文档并提取差异
- [x] 核对项目当前代码与配置现状
- [x] 收集 npm/Node/TypeScript/发布流程官方最佳实践证据
- Status: complete

### Phase 2: 第三方评审输出
- [x] 给出系统设计风险（高/中/低）
- [x] 给出实施风险（高/中/低）
- [x] 每条意见附证据标签与来源
- [x] 与用户确认评审意见
- Status: complete

### Phase 3: 合并最终文档
- [x] 生成统一版设计文档结构
- [x] 合并/修订冲突项与遗漏项
- [x] 自检文档可执行性（DoD、失败场景、验证步骤）
- Status: complete

### Phase 4: 收尾与同步检查
- [x] 检查是否需同步更新 `AGENTS.md` / `README.md` / `CLAUDE.md` / `docs/`
- [x] 更新 progress 与 findings
- Status: complete

## Definition of Done
- 输出一份经确认的评审结论（含证据）
- 产出一份最终设计方案文档（可直接用于实施）
- 明确至少 1 个失败场景及规避方案

## Deliverables
- 新增：`docs/PUBLISH_NPM_DESIGN_FINAL.md`（最终合并版）
- 归档：`docs/archive/PUBLISH_NPM_DESIGN_V1.md`、`docs/archive/PUBLISH_NPM_DESIGN_V2.md`
- 已确认：基线为“scoped 包 + 双前缀兼容一版 + 两阶段实施（P0/P1）”

## Risks
- 全量改名仍存在潜在遗漏，需在实施阶段通过回归测试覆盖。
- Trusted publishing 依赖仓库与 npm 侧配置正确绑定。

## Errors Encountered
| Error | Attempt | Resolution |
|---|---:|---|
| 临时 Python 小脚本语法错误（括号/字符串） | 1 | 修正脚本后重跑成功 |
