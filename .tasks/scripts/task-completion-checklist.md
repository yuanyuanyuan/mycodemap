# 任务完成检查清单

> 每次任务生成/修改完成后，必须逐项检查并打勾

## 生成阶段
- [ ] PROMPT.md 已创建并包含所有必备章节
- [ ] EVAL.ts 已创建并包含 L0-L4 分层检查
- [ ] SCORING.md 已创建且总分 = 100
- [ ] task-metadata.yaml 已创建且 workflow 字段完整
- [ ] TRIAD_ROLES.yaml 已创建
- [ ] TRIAD_WORKFLOW.md 已创建
- [ ] TRIAD_ACCEPTANCE.md 已创建
- [ ] SUPERVISOR_SEMANTIC_REVIEW.md 已创建

## 质量门禁
- [ ] 运行了 task-quality-gate.ts
- [ ] 没有错误

## 🔴 文档同步（最容易遗漏！）
- [ ] **AGENTS.md 任务列表已更新**
- [ ] **CLAUDE.md 任务列表已更新**
- [ ] README.md 已检查（如有需要）
- [ ] docs/ 目录相关文档已检查（如有需要）

## 最终确认
- [ ] 运行了 post-task-sync-check.sh 脚本
- [ ] 脚本输出 "所有文档同步检查通过"

---

**禁止在未完成以上所有勾选前告知用户"任务完成"！**
