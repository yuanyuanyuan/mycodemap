# AI Guide - 快速开始

> AI/Agent 使用 CodeMap 的快速入门和决策指南

---

## 快速开始

```bash
# Step 1: 生成代码地图（必须在其他命令之前执行）
node dist/cli/index.js generate

# Step 2: 阅读生成的 AI_MAP.md 获取项目概览
cat .mycodemap/AI_MAP.md

# Step 3: 根据任务选择命令...
```

---

## 命令选择决策树

```
开始任务
    ↓
是否需要理解项目整体结构？
    ├── 是 → mycodemap generate → 阅读 .mycodemap/AI_MAP.md
    ↓ 否
需要查找特定符号/函数/类？
    ├── 是 → mycodemap query -s "SymbolName"
    ↓ 否
需要修改某个文件？
    ├── 是 → mycodemap impact -f "path/to/file" --transitive
    ↓ 否
需要理解模块依赖关系？
    ├── 是 → mycodemap analyze -i dependency -t "src/module"
    ↓ 否
需要评估代码质量/复杂度？
    ├── 是 → mycodemap analyze -i complexity -t "src/"
    ↓ 否
需要搜索包含特定关键词的代码？
    ├── 是 → mycodemap analyze -i search -k "keyword"
    ↓ 否
需要执行复杂的多步骤任务？
    ├── 是 → mycodemap workflow start "任务描述"
    ↓ 否
需要验证代码是否符合规范？
        └── 是 → mycodemap ci check-headers
```

---

## 场景-命令映射表

| 用户意图 | 推荐命令 | 备选命令 | 输出格式 |
|---------|---------|---------|---------|
| "项目结构是什么" | `generate` + 读 `AI_MAP.md` | `analyze -i overview` | 文本 |
| "XXX 在哪里定义" | `query -s "XXX"` | `query -S "XXX"` | 文本 |
| "修改 XXX 会影响什么" | `impact -f "XXX" -t` | `analyze -i impact -t "XXX"` | JSON |
| "XXX 模块依赖什么" | `analyze -i dependency -t "XXX"` | `deps -m "XXX"` | JSON |
| "代码质量如何" | `analyze -i complexity -t "src/"` | `complexity` | JSON |
| "查找与 XXX 相关的代码" | `analyze -i search -k "XXX"` | `query -S "XXX"` | JSON |
| "这个改动安全吗" | `ci assess-risk` | `analyze -i impact` | 文本 |
| "需要重构建议" | `analyze -i refactor -t "src/"` | `cycles` + `complexity` | JSON |
| "查找循环依赖" | `cycles` | - | 文本 |
| "有哪些测试文件" | `query -S ".test.ts"` | - | 文本 |

---

## 参数选择指南

### 何时使用 `--json`

| 场景 | 使用 `--json` | 原因 |
|------|--------------|------|
| 需要解析结果进行进一步处理 | ✅ 是 | 结构化数据便于解析 |
| 向用户展示结果 | ❌ 否 | 人类可读格式更好 |
| 需要提取文件路径列表 | ✅ 是 | 便于正则提取 |
| 需要计算统计数据 | ✅ 是 | JSON 可直接计算 |
| 简单查询确认存在性 | ❌ 否 | 文本输出更直观 |

### 何时使用 `--transitive` / `--scope transitive`

| 场景 | 使用 | 说明 |
|------|------|------|
| 评估变更影响范围 | ✅ 是 | 包含间接依赖 |
| 查找所有相关代码 | ✅ 是 | 完整的依赖链 |
| 仅查看直接依赖 | ❌ 否 | 默认就是 direct |
| 结果太多需要简化 | ❌ 否 | 缩小范围 |

---

## 核心能力矩阵

| 能力 | 命令 | 典型场景 |
|------|------|---------|
| 代码地图生成 | `generate` | 首次理解项目结构 |
| 符号查询 | `query -s` | 查找类/函数定义位置 |
| 依赖分析 | `deps` / `analyze -i dependency` | 理解模块关系 |
| 影响分析 | `impact` / `analyze -i impact` | 评估变更范围 |
| 复杂度分析 | `complexity` / `analyze -i complexity` | 识别复杂代码 |
| 循环依赖检测 | `cycles` | 发现架构问题 |
| 统一分析 | `analyze` | 多意图智能路由 |
| CI 门禁 | `ci` | 代码质量检查 |
| 工作流编排 | `workflow` | 复杂任务管理 |
| HTTP API | `server` | 远程访问分析能力 |

---

## 下一步

- 需要完整命令参数？查看 [COMMANDS.md](./COMMANDS.md)
- 需要解析 JSON 输出？查看 [OUTPUT.md](./OUTPUT.md)
- 需要即用型提示词？查看 [PROMPTS.md](./PROMPTS.md)
