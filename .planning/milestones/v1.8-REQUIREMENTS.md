# Requirements: CodeMap

**Defined:** 2026-04-22
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## v1 Requirements

Requirements for `v1.8 entry-docs-structure-consolidation`.

### Authority Model

- [x] **AUTH-01**: 维护者打开 `AGENTS.md` 时，可以确认仓库级治理规则只有一个权威来源，而不是多份入口文档共同定权
- [x] **AUTH-02**: 贡献者打开根 `CLAUDE.md` 时，只会看到加载顺序与路由，不会再读到独立的执行政策正文
- [x] **AUTH-03**: Claude 运行时打开 `.claude/CLAUDE.md` 时，只会读到 Claude 专属 adapter / 导入差异，不会再读到重复的通用规则

### Content Destinations

- [x] **DEST-01**: 从 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 移出的操作性内容，必须在同一轮迁移到现有 live 文档，不留下规范性 `TODO`
- [x] **DEST-02**: 维护者可以查看明确的“旧 section → 新归宿文件”映射，从而知道迁移后应去哪里维护
- [x] **DEST-03**: `AGENTS.md` 在收敛后仍保持宪法级边界，不重新承接从两份 `CLAUDE` 文档移出的操作性细节

### Routing & Discoverability

- [x] **ROUTE-01**: 从 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 任一入口开始，贡献者都能快速判断哪份是权威
- [x] **ROUTE-02**: 从任一入口开始，贡献者都能快速定位下一步该读哪份 live 文档
- [x] **ROUTE-03**: 从任一入口开始，贡献者都能快速定位规则变更时真正应该编辑的 live 文档
- [x] **ROUTE-04**: 本阶段完成结构收敛时，不引入新的治理中间层、生成式文档系统或入口文档自审自动化

## v2 Requirements

### Governance Follow-ups

- **GOV-01**: 自动检测入口文档之间的重复政策 drift，并在 drift 出现时阻断或告警
- **GOV-02**: 继续处理 ghost commands、验证可信度与 archive/live 身份治理问题
- **GOV-03**: 为入口文档结构收敛补自审/重复检测机制，但不把它变成新的治理入口

## Out of Scope

| Feature | Reason |
|---------|--------|
| 新增治理中间层文档来承接迁移内容 | 一期要求复用现有 live 文档，而不是再制造新入口 |
| 引入文档生成器、自审框架或重复检测自动化 | 一期只做结构角色澄清与内容迁移 |
| 为入口文档收敛顺手重写全部治理规则正文 | 当前只在消除重复、明确权威和修正归宿所必需时改写 |
| 将 ghost commands / 验证信任 / archive 身份治理作为本 milestone 主目标 | 这些议题被明确延后，除非阻断结构迁移本身 |
| 把 `.claude/CLAUDE.md` 扩展成第二套 Claude 独立规则手册 | 一期目标是超薄 adapter，而不是新的权威入口 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 29 | Complete |
| AUTH-02 | Phase 29 | Complete |
| AUTH-03 | Phase 29 | Complete |
| DEST-01 | Phase 28 | Complete |
| DEST-02 | Phase 28 | Complete |
| DEST-03 | Phase 29 | Complete |
| ROUTE-01 | Phase 30 | Complete |
| ROUTE-02 | Phase 30 | Complete |
| ROUTE-03 | Phase 30 | Complete |
| ROUTE-04 | Phase 28 | Complete |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after completing Phase 30 discoverability verification*
