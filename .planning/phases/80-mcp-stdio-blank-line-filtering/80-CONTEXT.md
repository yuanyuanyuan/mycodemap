# Phase 80 Context: MCP Stdio Blank-Line Filtering

## Goal

在 MCP stdio transport 输入边界过滤空白行，避免 blank-line noise 触发伪请求、协议噪音或 transport-level drift，同时保持非空坏 payload 的显式失败语义。

## Locked Scope

- 仅覆盖 `mcp start` 使用的 stdio server transport。
- 仅处理 transport 输入边界，不改业务 tool/service 逻辑。
- 必须保持 stdout 协议纯净；任何 transport failure 也必须是协议帧，而不是裸日志。

## Must Stay True

- `POL-02`：空白行在 request parsing 之前被忽略。
- 有效 MCP request 的 schema、工具注册和行为不回归。
- 非空 malformed payload 不能被 silent swallow，必须显式暴露 parse failure。

## Relevant Code Facts

- `src/server/mcp/server.ts` 当前直接实例化 SDK `StdioServerTransport`，没有输入过滤层。
- SDK `ReadBuffer` 逐行 `JSON.parse(...)`，空白行会直接触发 parse error。
- 当前 parse error 在本仓库实验验证下不会回写显式 JSON-RPC error frame，属于 silent swallow 风险。
- `docs/rules/harness.md` 已锁定 “MCP stdout 必须保持协议纯净” 与 “长期 transport/stdio 测试必须覆盖失败路径和真实 transport”。

## Success Criteria

1. blank input lines are ignored before request parsing on stdio transport paths
2. valid MCP requests continue to work without schema or behavior regressions
3. malformed non-blank payloads still fail explicitly instead of being swallowed
