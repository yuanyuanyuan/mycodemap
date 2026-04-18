# AI Guide - MCP / Agent 集成

> 当前 canonical integration path：**真实本地 stdio MCP server**。旧 CLI wrapper 只作为 fallback。

---

## 1. 当前事实边界

| 维度 | 当前基线 |
|------|----------|
| transport | 本地 `stdio` |
| 读写权限 | **只读** |
| public surface | `mycodemap mcp install`、`mycodemap mcp start` |
| MCP tools | `codemap_query`、`codemap_impact` |
| 图前置条件 | 先执行 `mycodemap generate --symbol-level` |
| 稳定性 | **experimental** |
| 非目标 | HTTP MCP、远程 transport、写操作、全局 host lifecycle |

---

## 1.1 速查表

| 你遇到的问题 | 先看什么 |
|--------------|----------|
| 想让 host 真正通过 MCP 调 CodeMap | 本文第 2-4 节 |
| host 只会跑命令，不会连 MCP | 本文第 6 节 fallback |
| 想判断 storage / 运行时是否满足 | 本文第 7 节故障排查 |

---

## 2. canonical 集成步骤

### Step 1: 生成 symbol-level 图

```bash
mycodemap generate --symbol-level
```

如果输出里的 `graphStatus = "partial"`，说明图是降级结果；MCP tools 仍可返回结果，但会显式带 `graph_status: "partial"`。

### Step 2: 安装到当前仓库 `.mcp.json`

```bash
mycodemap mcp install
```

该命令当前只做一件事：在**当前仓库根目录**的 `.mcp.json` 里写入一个 experimental server entry。

### Step 3: 让 MCP host 启动 stdio server

```bash
mycodemap mcp start
```

注意：
- 这是给 MCP host 启动的 `stdio` server，不是给人类终端交互的命令
- `stdout` 只承载 MCP 协议帧
- 欢迎信息、迁移提示、runtime log 不会混入 `stdout`

---

## 3. `.mcp.json` 参考配置

`mcp install` 会写入与下列 shape 等价的配置：

```json
{
  "mcpServers": {
    "mycodemap-experimental": {
      "command": "node",
      "args": ["dist/cli/index.js", "mcp", "start"],
      "cwd": "/absolute/path/to/repo",
      "env": {
        "MYCODEMAP_RUNTIME_LOG_ENABLED": "false"
      }
    }
  }
}
```

### 当前宿主支持边界

- 当前文档只保证**repo-local `.mcp.json`** 这一路径
- 不承诺全局安装、升级覆盖策略或卸载命令
- 若你的 host 不读取 `.mcp.json`，请手动拷贝上面的 server entry 到宿主自己的 MCP 配置文件

---

## 4. MCP tool contract

### `codemap_query`

输入：

```typescript
interface CodemapQueryInput {
  symbol: string;
  filePath?: string;
}
```

返回：
- symbol 定义
- callers
- callees
- `graph_status`
- `generated_at`
- `error.code`（若失败）

### `codemap_impact`

输入：

```typescript
interface CodemapImpactInput {
  symbol: string;
  filePath?: string;
  depth?: number;
  limit?: number;
}
```

返回：
- `root_symbol`
- symbol-level caller impact 链
- `depth` / `limit` / `truncated`
- `graph_status`
- `generated_at`
- `error.code`（若失败）

> 完整输出类型见 `docs/ai-guide/OUTPUT.md`。

---

## 5. 错误语义

| `error.code` | 何时出现 | 应对方式 |
|--------------|----------|----------|
| `GRAPH_NOT_FOUND` | 还没生成 symbol-level 图 | 先跑 `mycodemap generate --symbol-level` |
| `SYMBOL_NOT_FOUND` | 请求的 symbol 不存在 | 检查拼写，或先用 `query -S` / `analyze -i find` 搜索 |
| `AMBIGUOUS_EDGE` | 同名 symbol 无法仅靠 `symbol` / `filePath` 消歧 | 补充更具体的 `filePath` |

### `graph_status` 解读

| 值 | 含义 |
|----|------|
| `complete` | 图完整，可正常消费 |
| `partial` | 图降级，结果可用但不应伪装成完整 truth |
| `missing` | 图不存在，工具会返回 `GRAPH_NOT_FOUND` |

---

## 6. fallback：旧 CLI wrapper

如果你的宿主暂时**不支持真正 MCP server**，可以临时回退到直接调用 CLI：

```bash
mycodemap query -s "SymbolName" -j
mycodemap impact -f "src/file.ts" -j
mycodemap analyze -i find -k "SymbolName" --json --structured
```

但要注意：
- 这不是原生 MCP
- 你需要自己做命令拼装、stdout JSON 解析和错误分类
- canonical path 仍然是 `mcp install` + `mcp start`

---

## 7. 故障排查

### host 能启动 server，但工具返回 `GRAPH_NOT_FOUND`

```bash
mycodemap generate --symbol-level
```

### `mcp install` 后看不到 server

- 确认 host 会读取当前仓库根目录的 `.mcp.json`
- 不会读取的话，手动复制 `mycodemap-experimental` entry 到宿主配置

### `mcp start` 无法启动

先确认：

```bash
npm run build
node dist/cli/index.js mcp start
```

若宿主要求依赖 symbol-level / SQLite 路径，还需确认：

```bash
npm ls better-sqlite3
```

### 结果为空但不是错误

- 先检查 `graph_status` 是否为 `partial`
- 再检查 symbol 是否真的唯一；必要时补 `filePath`

### storage 运行时错误速查表

| 错误 / 信号 | 含义 | 处理方式 |
|-------------|------|----------|
| `UNSUPPORTED_STORAGE_TYPE` / `STORAGE_BACKEND_MIGRATED` / `SQLITE_NOT_AVAILABLE` | 当前 storage 配置不受支持，或显式 `sqlite` 但运行时条件不满足 | 检查 `mycodemap.config.json.storage`，确认是否仍在使用旧 backend，或当前机器是否满足 SQLite 运行时要求 |
| `better-sqlite3` 缺失 | 显式 `sqlite` 需要本地 SQLite binding | 安装 `better-sqlite3` |
| Node.js `>=20` 不满足 | SQLite 路径需要较新的 Node 运行时 | 升级 Node.js |
| SQLite 不可用时会 warning 后回退 `filesystem` | 仅 `storage.type = "auto"` 会这么做 | 若你要强制 SQLite，请改用显式 `storage.type = "sqlite"` 并补齐依赖 |

---

## 8. 交叉引用

- 命令参考：`docs/ai-guide/COMMANDS.md`
- 输出契约：`docs/ai-guide/OUTPUT.md`
- 主索引：`AI_GUIDE.md`
- 执行手册：`CLAUDE.md`
