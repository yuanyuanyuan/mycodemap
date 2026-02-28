# 持久上下文块模板

## 目标
把"关键约束 + 检索入口"放进每轮都能看到的上下文，降低 skill 漏触发风险。

## 模板格式

```markdown
<!-- TASK-GENERATOR-CONTEXT-START -->
[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: [你的项目命令]|task:{task-a/PROMPT.md,task-b/PROMPT.md}|rules:{SCORING.md,EVAL.ts}
<!-- TASK-GENERATOR-CONTEXT-END -->
```

## 生成要求（必须）

1. **紧凑格式**：使用 pipe 索引（`|`），单行优先；必要时可拆多行
2. **索引而非全文**：列路径与入口，不把大段内容直接塞入上下文
3. **可恢复**：必须给出"缺失时重建"命令（项目自定义）
4. **可替换**：必须用 marker 包裹，重复执行只更新块内容
5. **可控体积**：默认 <= 12KB，超限时先删低价值字段再压缩目录粒度

## 注入算法（幂等）

1. 读取目标文件（`AGENTS.md` 或 `CLAUDE.md`）
2. 若存在 start/end marker：替换 marker 区间内容
3. 若不存在 marker：在文件末尾追加一次完整块
4. 再次执行同一任务时，必须得到相同结构（除时间戳等显式变更字段）

## 示例

### 最小版
```
<!-- TASK-GENERATOR-CONTEXT-START -->[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: pnpm task:refresh<!-- TASK-GENERATOR-CONTEXT-END -->
```

### 完整版
```
<!-- TASK-GENERATOR-CONTEXT-START -->
[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: pnpm task:refresh-context|task:{my-task/PROMPT.md,my-task/EVAL.ts,my-task/SCORING.md}|constraints:{must-pass-quality-gate,score-total-100}
<!-- TASK-GENERATOR-CONTEXT-END -->
```
