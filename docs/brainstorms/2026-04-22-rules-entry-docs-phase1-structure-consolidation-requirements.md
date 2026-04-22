---
date: 2026-04
topic: rules-entry-docs-phase1-structure-consolidation
---

# Rules 入口文档一期结构收敛

## Problem Frame

当前仓库存在三层入口文档面：`AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`。它们在治理规则、执行流程、验证要求和交付约束上存在交叠，导致 agent 和人类贡献者难以快速判断：

- 哪份文档才是权威来源
- 哪份文档只是入口路由
- 被移出的内容应该落到哪里维护

本期要解决的问题不是“规则不够多”，而是“入口面职责不清、共享真相源不清、入口文档容易再次膨胀”。第一阶段因此聚焦**结构收敛**：先把三层入口文档的角色和内容归宿切清，再把后续信任修复、自审机制、历史文档治理等议题留给后续阶段。

| 文档 | 一期目标角色 | 允许内容 | 必须移出 |
|---|---|---|---|
| `AGENTS.md` | 严格宪法 | 风险分级、证据协议、文档职责、改动边界、交付底线 | 操作清单、工具专属适配、长命令列表 |
| `CLAUDE.md` | 纯路由页 | 加载顺序、去哪读下一份文档、去哪找验证规则 | 策略正文、命令清单、默认值、dogfood、交付 checklist |
| `.claude/CLAUDE.md` | 超薄 adapter | 仅 Claude 专属导入/适配差异 | 通用执行规则、TDD/commit/验证政策、第二套手册 |

## Requirements

**权威模型**

- R1. `AGENTS.md` 必须成为仓库级治理主题的唯一权威来源，覆盖风险分级、证据协议、文档职责分层、改动边界与交付底线。
- R2. 根 `CLAUDE.md` 必须收缩为纯路由页，只负责告诉 agent 去哪里读，不再作为独立规则面存在。
- R3. `.claude/CLAUDE.md` 必须收缩为 Claude 专属 adapter，只保留 Claude 需要的导入或装配差异。
- R4. 每一条规范性要求必须只有一个权威文件；其他入口文档只允许链接或导入，不允许复述为第二套规则面。
- R5. 本阶段采用零重复原则：入口文档之间不保留提醒式摘要、简化 checklist 或重复政策条目。

**内容归宿**

- R6. 本阶段从 `AGENTS.md`、`CLAUDE.md`、`.claude/CLAUDE.md` 中移出的内容，必须在同一轮迁移到现有文档归宿，不允许留下悬空 `TODO` 作为规范性承接。
- R7. 本阶段只复用现有文档体系承接迁移内容，例如 `docs/rules/*.md`、`AI_GUIDE.md`、`ARCHITECTURE.md`，不新增中间治理文档。
- R8. 验证顺序、验证命令、gate 说明等操作性内容，必须归入现有验证或工程规则文档，不再停留在三份入口文档中。
- R9. 工具发现、命令速查、dogfood、使用提示等内容，必须归入现有 AI 指南或其他既有归宿，不再停留在三份入口文档中。
- R10. `AGENTS.md` 不得承接从两份 `CLAUDE` 文档移出的操作性细节；宪法层必须保持窄而稳定。
- R11. 本阶段交付物必须明确给出“被移出内容 → 新归宿文件”的映射，保证后续维护者知道去哪里编辑。

**路由与可发现性**

- R12. 重构完成后，无论从 `AGENTS.md`、根 `CLAUDE.md` 还是 `.claude/CLAUDE.md` 开始，贡献者都应能快速回答三个问题：哪份是权威、下一步去哪读、规则变更时该改哪一份。
- R13. 收敛后的入口面必须同时保持对 Codex 风格 `AGENTS.md` 读取和 Claude 专属 adapter 加载方式的可发现性。
- R14. 路由面必须保持简洁，表达导航关系而不是重新长成第二本执行手册。

**阶段范围控制**

- R15. 第一阶段只解决结构角色澄清与内容迁移，不要求同时完成治理自审、自动生成表格或文档防漂移系统。
- R16. 第一阶段不新增治理中间层、生成式文档系统或新的规则承接机制。
- R17. 第一阶段不要求重写所有规则本身；只在消除重复、明确权威和修正归宿所必需时调整措辞。
- R18. 第一阶段不以“完全修复 ghost commands / 验证信任 / archive 身份治理”为成功前提，除非这些问题会阻断结构迁移本身。

## Success Criteria

- [ ] `AGENTS.md` 只保留宪法级内容，不再承载操作清单或工具专属执行细节
- [ ] 根 `CLAUDE.md` 变为纯路由页，不再内嵌命令清单、默认值、dogfood 或交付 checklist
- [ ] `.claude/CLAUDE.md` 只保留 Claude 专属 adapter 内容，不再重复通用执行政策
- [ ] 三份入口文档之间不存在重复的规范性要求
- [ ] 每一类从入口文档移出的内容都有明确且现成的目标文档承接
- [ ] 本阶段未引入新的中间治理文档
- [ ] 维护者能从任一入口文档快速定位权威文件与下一步阅读路径

## Scope Boundaries

- 不在本阶段新增新的治理承接文档
- 不在本阶段引入文档生成器、自审框架或重复检测自动化
- 不在本阶段重写全部规则正文，只做必要的归宿与措辞收敛
- 不把 ghost commands、验证可信度或 archive/live 身份治理作为本阶段主目标
- 不把 `.claude/CLAUDE.md` 扩展为第二套 Claude 独立规则手册

## Key Decisions

- **D1** `AGENTS.md` 定位为严格宪法：仓库级规范只在这里定权
- **D2** 根 `CLAUDE.md` 定位为纯路由页：负责导航，不负责再定义规则
- **D3** `.claude/CLAUDE.md` 定位为超薄 adapter：只保留 Claude 专属差异
- **D4** 零重复是硬约束：入口文档之间不保留摘要式复述
- **D5** 所有被移出内容必须同轮迁移，且只允许迁移到现有文档体系
- **D6** 第一阶段是结构收敛，不是一次性解决全部治理问题

## Alternatives Considered

- **根 `CLAUDE.md` 继续保留轻量执行面**：被否决，因为会继续让路由页承担规则职责
- **`.claude/CLAUDE.md` 保留完整 Claude 手册**：被否决，因为会继续制造第二套权威入口
- **`AGENTS.md` 承接更多执行框架或 checklist**：被否决，因为会让宪法层重新膨胀成超级入口

## Dependencies / Assumptions

- 现有 `docs/rules/*.md`、`AI_GUIDE.md`、`ARCHITECTURE.md` 会继续作为 live 文档面存在
- Claude 侧可以通过 adapter/import 方式消费共享规则，而不必复制整套规则正文
- 后续规划阶段可以逐项确认“旧 section → 新文件”的精确映射与改写顺序

## Outstanding Questions

### Resolve Before Planning

_None — 本阶段的产品级结构决策已收敛。_

### Deferred to Planning

- [Technical] 根 `CLAUDE.md` 最终采用什么路由表现形式最清晰：路径表、场景表、还是最小导航清单
- [Technical] `.claude/CLAUDE.md` 采用何种最小导入/引用写法，既满足 Claude 使用，又不形成第二套文本面
- [Technical] 现有入口文档中的每个 section 应如何一对一映射到现有目标文档
- [Technical] 为保证迁移后仍可发现，是否需要同步微调 `docs/rules/README.md` 或 `AI_GUIDE.md` 的导航表达

## Next Steps

-> `/ce:plan` for structured implementation planning
