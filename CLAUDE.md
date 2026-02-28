# CodeMap 项目开发指南

## 项目概述

CodeMap 是一个 TypeScript 代码结构分析工具，为 AI 辅助开发提供结构化上下文。

## 开发规范

### 使用 codemap 进行开发维护

本项目使用 **codemap** 工具进行代码分析和开发辅助：

```bash
# 分析项目结构
codemap generate

# 查看依赖关系
codemap deps

# 检测循环依赖
codemap cycles

# 分析代码复杂度
codemap complexity

# 分析文件影响范围
codemap impact -f <file-path>
codemap impact -f <file-path> --transitive  # 包含传递依赖

# 查询符号
codemap query --symbol <name>
codemap query -S <word>           # 模糊搜索
codemap query -m <path>           # 查询模块
codemap query -d <name>            # 查询依赖
codemap query -S <word> -l 10      # 限制结果数量
codemap query -S <word> -j         # JSON 格式输出

# 监听文件变化
codemap watch
```

### 开发命令

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
# 或
npx vitest run

# 运行 CLI
node dist/cli/index.js <command>
```

## 项目结构

```
src/
├── cli/           # 命令行接口
├── core/          # 核心分析器
├── parser/        # 解析器实现
├── generator/     # 文档生成器
├── cache/         # 缓存系统
├── watcher/       # 文件监听
├── plugins/       # 插件系统
├── ai/            # AI 集成
└── types/         # 类型定义
```

## 常用操作

- 添加新 CLI 命令：在 `src/cli/commands/` 创建文件并在 `src/cli/index.ts` 注册
- 添加解析器：在 `src/parser/implementations/` 实现
- 运行测试：`npx vitest run`
- 构建发布：`npm run build`
