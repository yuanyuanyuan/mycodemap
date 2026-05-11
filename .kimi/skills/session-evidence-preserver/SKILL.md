---
name: session-evidence-preserver
description: >
  在 Kimi Code CLI 会话中快速打包和保留问题现场证据。
  当用户说"保留现场"、"打包会话"、"保存证据"、"review 问题"、
  "记录问题"、"导出会话"、"存档证据"或遇到需要事后 review 的问题时触发。
  自动收集 ~/.kimi/sessions/ 当前会话原始文件、git 状态、复盘文档，
  生成结构化的现场报告压缩包。
---

# Session Evidence Preserver

快速保留 Kimi Code CLI 会话中的问题现场证据，供后续 review 和分析。

## 触发条件

当用户遇到以下场景时激活此技能：
1. 用户明确说"保留现场"、"打包会话"、"保存证据"
2. 用户要求"review 刚才的问题"、"记录问题"
3. 会话中出现异常、错误、误导性思考需要复盘
4. 用户要求"导出当前会话"

## 执行流程

### 步骤 1：定位当前会话

```bash
# 找到最新的 Kimi 会话目录
ls -lt ~/.kimi/sessions/*/
# 进入最新的子目录，找到时间戳最新的 UUID 文件夹
```

当前会话路径模式：`~/.kimi/sessions/<workspace-id>/<session-uuid>/`

### 步骤 2：收集证据

收集以下文件到 `session-evidence/` 目录：

| 来源 | 文件 | 说明 |
|------|------|------|
| `~/.kimi/sessions/.../<session-uuid>/` | `context.jsonl` | 完整对话上下文 |
| `~/.kimi/sessions/.../<session-uuid>/` | `wire.jsonl` | API 通信记录 |
| `~/.kimi/sessions/.../<session-uuid>/` | `state.json` | 会话状态元数据 |
| 当前工作目录 | `git status` / `git log` | Git 状态记录 |
| 生成的 | `retrospective.md` | AI 生成的复盘文档 |

### 步骤 3：生成复盘文档

基于会话内容，生成 `retrospective.md`，包含：
- **问题描述**：用户原始需求与 AI 执行结果的偏差
- **AI 的困惑/误解**：AI 在哪些点上产生了错误假设或过度思考
- **根因分析**：为什么会发生这些问题
- **正确做法**：如果重来，应该如何执行
- **验证结果**：最终是否完成目标，使用了哪些绕过手段

### 步骤 4：打包输出

```bash
tar -czvf session-evidence-$(date +%Y%m%d-%H%M%S).tar.gz session-evidence/
```

## 复盘文档模板

使用 `references/retrospective-template.md` 作为模板生成复盘。

## 检查清单

使用 `references/checklist.md` 确保证据收集完整。

## 注意事项

1. **隐私**：`context.jsonl` 和 `wire.jsonl` 可能包含敏感信息，打包前应提醒用户
2. **大小**：Kimi 会话文件可能较大（MB 级），应确认用户是否需要完整打包
3. **并行执行陷阱**：在复盘文档中记录任何因并行 Shell 命令导致的 race condition
4. **Hook 绕过**：严禁在复盘中建议使用 `--no-verify` 绕过检查，应记录如何合规通过
