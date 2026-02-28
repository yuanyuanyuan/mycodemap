# 研究依据（Vercel）

来源：<https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals>

## 核心结论（按原文数据）

1. **基线（不显式调用 skill）**：通过率约 **53%**。
2. **显式调用 skill（在 prompt 中要求先调用）**：通过率约 **79%**。
3. **使用 AGENTS.md 文档索引**：通过率约 **100%**。

## 对 task-generator 的直接启发

1. 任务生成不应只依赖“技能触发词”，还要把关键约束写入持久上下文块。
2. 上下文块应是“索引 + 检索入口”，而不是大段正文。
3. 必须保留 retrieval-led 指令，降低模型基于旧记忆的偏差。

## 推荐落地方式

```markdown
<!-- TASK-GENERATOR-CONTEXT-START -->
[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: <project-command>|task:{...}
<!-- TASK-GENERATOR-CONTEXT-END -->
```
