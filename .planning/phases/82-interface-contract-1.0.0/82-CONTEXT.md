# Phase 82 Context: Interface Contract 1.0.0

## Goal

把当前 CLI interface contract 从“字段结构已存在的 `0.1.0` 草案”收口为可发布的 `1.0.0` 稳定表面：核心命令必须完整声明 `outputShape`、`errorCodes`、`examples`，并显式标记 `stable: true`。

## Locked Scope

- 只处理 `src/cli/interface-contract/**` 及其测试、依赖它的 schema-adapter / `--schema` 验证。
- 不新增命令家族，不扩展新的 CLI 行为。
- 不重构 MCP direct-execution 逻辑，只同步消费新的 contract 字段。
- 不修改非 contract 命令实现，除非测试或类型面必须联动。

## Must Stay True

- `POL-04`：核心 CLI / MCP command contract 补全 `outputShape`、`errorCodes`、`examples` 并声明 `stable: true`。
- `--schema` 继续输出可验证 JSON。
- 现有 contract-driven MCP tool conversion 不因为 `1.0.0` 收口而回归。

## Relevant Code Facts

- `CommandContract` 当前只有 `outputShape`、`errorCodes`、`examples`，还没有 `stable` 字段。
- `getFullContract()` 当前版本号仍是 `0.1.0`。
- 当前注册表里的命令 contract 都已经具备 `outputShape`、`errorCodes`、`examples`，因此 Phase 82 的主工作是把“隐含稳定”提升为“显式稳定 + 测试门”。
- 现有测试主要校验字段存在，但没有校验 `stable: true` 或 `1.0.0` 版本收口。

## Success Criteria

1. in-scope core commands have complete machine-readable contract fields for outputs, errors, and examples
2. stable commands explicitly declare `stable: true` and docs/help surfaces stay in sync
3. validation catches any missing contract fields before they can ship
