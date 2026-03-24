# 03-01 Summary

## 完成内容
- 在 `src/orchestrator/types.ts` 将 public analyze intent 收敛为 `find` / `read` / `link` / `show`，并补齐 legacy 兼容期所需的 `CompatibleLegacyIntentType`、`IntentCompatibility` 与 `AnalyzeWarning` 元数据入口。
- 在 `src/orchestrator/intent-router.ts` 建立四意图与 legacy alias 的统一 normalize 映射，清除 public contract 上“默认 search/impact”这类漂移事实。
- 在 `src/cli/commands/analyze.ts` 改为显式要求 `--intent`，并按 normalize 后 intent 分流参数校验：
  - `find` 允许 `keywords-only` 或 `targets-only`
  - legacy `reference + keywords` 在兼容窗口内不再被旧的 `targets required` 规则误杀
  - invalid intent 统一走 `E0001_INVALID_INTENT`
- 在 `src/orchestrator/__tests__/intent-router.test.ts` 与 `src/cli/commands/__tests__/analyze-command.test.ts` 补齐 public 4 intent、legacy normalize、help 与错误码回归覆盖。

## 验证
- `npm run build`
- `pnpm exec vitest run src/orchestrator/__tests__/intent-router.test.ts`
- `node dist/cli/index.js analyze --help`
- `node dist/cli/index.js analyze -i invalid -t src/cli/index.ts`
- `node dist/cli/index.js analyze -i find -k SourceLocation --json`

## 失败场景预演
- 若 `analyze` 继续保留隐式默认 intent，CLI help、router 与 docs 会再次出现“help 说四意图、执行却默认旧 intent”的契约漂移；本次通过强制 `intent` 必填消除此类漂移。
- 若 `find` 仍沿用旧“targets 必填”规则，AI/Agent 常见的 symbol keyword 查找会直接失败；本次显式放开 `find` 的 `keywords-only` 通路。

## 剩余风险
- 当前 internal execution 仍借用 `search` / `impact` / `dependency` / `overview` 作为底层桥接意图；这不再暴露为 public contract，但后续若替换底层执行器，需保持 `IntentRouter` 的 normalize 语义不变。
