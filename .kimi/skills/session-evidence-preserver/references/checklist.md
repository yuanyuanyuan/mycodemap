# 证据收集检查清单

## Kimi 会话文件

- [ ] `~/.kimi/sessions/<workspace>/<session-uuid>/context.jsonl`
  - 大小是否正常（KB~MB 级）
  - 是否包含敏感信息（API keys、密码等）
- [ ] `~/.kimi/sessions/<workspace>/<session-uuid>/wire.jsonl`
  - API 通信记录是否完整
- [ ] `~/.kimi/sessions/<workspace>/<session-uuid>/state.json`
  - 会话元数据是否可读
- [ ] `~/.kimi/sessions/<workspace>/<session-uuid>/subagents/`（如有）
  - 子代理输出是否完整

## Git 状态

- [ ] `git status` 输出
  - 是否有未提交的改动
  - 是否有未跟踪的文件
- [ ] `git log --oneline -20` 输出
  - 最近的提交记录
- [ ] `git diff --stat` 输出
  - 改动统计

## 复盘文档

- [ ] `retrospective.md` 是否生成
  - 问题描述是否清晰
  - AI 困惑点是否记录
  - 根因分析是否到位
  - 改进建议是否可行

## 系统信息

- [ ] 当前工作目录
- [ ] 时间戳
- [ ] 环境变量（脱敏后）

## 打包验证

- [ ] `tar -tzf` 能正常列出内容
- [ ] 压缩包大小是否合理
- [ ] 所有必需文件都在包内
- [ ] 文件权限正确（无敏感信息泄露风险）

## 隐私检查

- [ ] 确认用户同意打包会话内容
- [ ] 检查是否包含 API keys、tokens、密码
- [ ] 检查是否包含个人隐私信息
- [ ] 如有敏感信息，提醒用户或进行脱敏
