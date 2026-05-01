# 架构护栏

> 当前仓库采用 MVP3 分层架构。下面只保留会影响日常改动的最小 contract。

## 分层地图

| 层 | 路径 | 允许依赖 |
|---|---|---|
| CLI | `src/cli/` | `src/server/`、`src/domain/`（经 Interface）、`src/interface/` |
| Server | `src/server/` | `src/domain/`（经 Interface）、`src/interface/` |
| Domain | `src/domain/` | `src/interface/` |
| Infrastructure | `src/infrastructure/` | `src/domain/`（接口实现）、`src/interface/` |
| Interface | `src/interface/` | 无 |

## 护栏表

| 规则 | 命令 | 阈值/级别 | 失败后果 | 恢复方式 |
|---|---|---|---|---|
| 禁止跨层反向依赖 | `node dist/cli/index.js deps -m "src/domain"` | `Domain` 不得依赖 `Infrastructure` 具体实现 | 阻断设计验收 / 需返工 | 提取接口到 `src/interface/`，改走注入 |
| 禁止 CLI 直接耦合实现细节 | `node dist/cli/index.js deps -m "src/cli"` | CLI 只依赖 Server / Interface contract | 阻断 | 下沉到 Server 或 Interface |
| 接口放在 Interface 层 | `rg "interface|type" src/interface src/domain src/infrastructure` | 跨层共享 contract 必须位于 `src/interface/` | 阻断 | 移动 contract，再改 import |
| 高层不直接 `new` 低层服务 | `rg "new .*Storage|new .*Parser" src/domain src/server src/cli` | 通过构造函数/工厂注入 | 返工 | 提取工厂或依赖注入 |

## 快速验证

```bash
node dist/cli/index.js deps -m "src/domain"
node dist/cli/index.js impact -f "src/interface/types/index.ts"
```

> 架构依赖检查通过 `deps` 命令完成，不再使用单独的 npm script。

## 常见误区

- `Server Layer` 是内部架构层，不等于公共产品面的 `mycodemap server`。
- `src/domain/` 可以依赖接口，不能依赖实现。
- 做小改动也不能顺手把跨层 import 当成“临时方便”。
