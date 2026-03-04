# MyCodeMap NPM 发布设计方案

> 版本: 1.2  
> 日期: 2026-03-04  
> 方案: 完整体验版（方案 1，最终审查版）

---

## 1. 概述

### 1.1 目标
将 CodeMap 工具发布到 NPM，使用户可以通过 `npx mycodemap` 方式在其他项目中使用，同时建立完善的日志反馈机制便于问题排查。

### 1.2 核心设计原则
1. **开箱即用** - 预编译 binary 覆盖主流平台，无需用户编译
2. **友好引导** - 首次使用提供交互式配置向导
3. **问题可追踪** - 完整的日志系统 + 一键上报机制（敏感信息脱敏，用户确认后生成）
4. **平台透明** - 乐观支持 macOS/Linux/Windows，如实提示风险
5. **品牌一致** - 配置文件、CLI 命令、文档统一使用 `mycodemap`
6. **按需检测** - tree-sitter 等依赖按需检测，避免不必要的启动开销
7. **安全确认** - 涉及敏感数据的操作需用户明确确认

### 1.3 平台支持策略

| 平台 | 架构 | 支持级别 | 说明 |
|------|------|----------|------|
| Linux | x64 | ⭐ 完全支持 | 主力开发和测试平台 |
| Linux | ARM64 | ⚠️ 实验性 | node-gyp-build 可能无法找到预编译 binary |
| macOS | x64/ARM64 | ⭐ 完全支持 | 有预编译 binary (darwin-x64, darwin-arm64) |
| Windows | x64 | ⭐ 完全支持 | 有预编译 binary (win32-x64) |
| Windows | ARM64 | ❌ 不支持 | 无预编译 binary，可能编译失败 |

**证据**:
```bash
$ ls node_modules/tree-sitter/prebuilds/
darwin-arm64  darwin-x64  linux-x64  win32-x64

$ ls node_modules/tree-sitter-typescript/prebuilds/
# 类似结构
```

**注意**: Linux ARM64 (如树莓派、Apple Silicon Linux VM) 和 Windows ARM64 没有预编译 binary，可能需要在安装时编译，这要求用户有 C++ 编译环境。

**注意**：非 Linux 平台首次使用时会显示友好提示：
```
⚠ 当前平台: darwin-arm64
  如遇问题请运行: mycodemap report
  反馈地址: https://github.com/yourname/mycodemap/issues
```

---

## 2. 包配置改造

### 2.1 tree-sitter 安装失败处理 ⭐ 关键补充

**问题**: tree-sitter 的 postinstall 脚本在安装阶段运行，如果预编译 binary 下载失败，npm install 会直接失败，用户无法看到我们的友好提示。

**解决方案**: 添加自定义 postinstall 脚本，捕获 tree-sitter 安装失败并提供友好提示。

**文件**: `scripts/postinstall.js`

```javascript
#!/usr/bin/env node
// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Provide friendly error messages when tree-sitter installation fails

const chalk = require('chalk');

function checkTreeSitter() {
  try {
    require('tree-sitter');
    require('tree-sitter-typescript');
    return true;
  } catch (error) {
    return false;
  }
}

if (!checkTreeSitter()) {
  console.log();
  console.log(chalk.yellow('⚠'), 'Tree-sitter 依赖安装可能不完整');
  console.log();
  console.log('这可能是由于：');
  console.log('  • 当前平台没有预编译的 binary');
  console.log('  • 网络问题导致下载失败');
  console.log();
  console.log(chalk.cyan('你可以尝试：'));
  console.log('  1. 安装 C++ 编译环境后重新安装');
  console.log('  2. 使用 --build-from-source 标志强制编译');
  console.log();
  console.log('详细帮助: https://github.com/yourname/mycodemap/issues');
  console.log();
  
  // 不退出错误码，让安装继续完成
  // 用户在使用时会在 CLI 中看到详细错误
}
```

**package.json 更新**:
```json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js"
  }
}
```

### 2.2 LICENSE 文件 ⭐ 关键遗漏（已发现）

**问题**: 项目缺少 LICENSE 文件，但 package.json 声明了 MIT 许可。

**证据**: 
```bash
$ ls -la LICENSE
# 文件不存在

$ cat package.json | jq -r '.license'
MIT
```

**解决方案**: 创建 MIT LICENSE 文件

**文件**: `LICENSE`
```
MIT License

Copyright (c) 2026 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 2.3 package.json 变更

**决策确认**: 
- 版本号: `0.1.0`（早期版本标识）
- bin 命令: `mycodemap` + `cm` 别名
- 暂不实现版本更新检测（后续迭代添加）
- 发布前确保登录官方 npm registry

```json
{
  "name": "mycodemap",
  "version": "0.1.0",
  "description": "TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文",
  "main": "dist/index.js",
  "type": "module",
  "bin": {
    "mycodemap": "./dist/cli/index.js",
    "cm": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "LICENSE",
    "README.md",
    "mycodemap.config.schema.json",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "benchmark": "bash scripts/run-benchmark.sh",
    "test:all": "npm run test && npm run benchmark",
    "prepublishOnly": "npm run build && npm test",
    "postversion": "npm run changelog && git add CHANGELOG.md && git commit -m \"docs: update changelog for v$(node -p \"require('./package.json').version\")\"",
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s"
  },
  "keywords": [
    "typescript",
    "codemap",
    "code-analysis",
    "ai",
    "developer-tools",
    "static-analysis",
    "code-visualization"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/mycodemap.git"
  },
  "bugs": {
    "url": "https://github.com/yourname/mycodemap/issues"
  },
  "homepage": "https://github.com/yourname/mycodemap#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "os": ["darwin", "linux", "win32"],
  "cpu": ["x64", "arm64"],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

### 2.2 关键变更说明

| 字段 | 变更 | 原因 |
|------|------|------|
| `name` | `codemap` → `mycodemap` | 原包名已被占用 |
| `bin` | 增加 `cm` 别名 | 提供更短更快的命令 |
| `files` | 新增 `CHANGELOG.md` | 用户需要了解版本变更 |
| `engines` | Node >= 18.0.0 | tree-sitter 需要现代 Node |
| `os` | [darwin, linux, win32] | 声明支持的操作系统 |
| `cpu` | [x64, arm64] | 声明支持的 CPU 架构 |
| `repository/bugs/homepage` | 新增 | NPM 页面信息完整 |
| `publishConfig.registry` | 显式指定 | 确保发布到官方 registry，避免镜像源问题 |

**⚠️ 重要: npm Registry 检查** ⭐ 新增

**问题**: 当前环境配置使用淘宝镜像源，无法直接发布到 npm。

**证据**:
```bash
$ npm config get registry
https://registry.npmmirror.com  # 非官方 registry

$ npm whoami
ENEEDAUTH  # 未登录
```

**发布前必须执行**:
```bash
# 1. 临时切换到官方 registry
npm config set registry https://registry.npmjs.org/

# 2. 登录 npm（需要 OTP 验证）
npm login

# 3. 验证登录状态
npm whoami

# 4. 发布
npm publish --access public

# 5. 如需要，恢复镜像源
npm config set registry https://registry.npmmirror.com/
```

或者使用 nrm 管理 registry:
```bash
npx nrm use npm
npm login
npm publish --access public
npx nrm use taobao
```

---

## 3. .npmignore 设计

### 3.1 完整配置

```gitignore
# ============================================
# 源代码和开发文件
# ============================================
src/
tests/
refer/
scripts/
!scripts/postinstall.js
coverage/
.codemap/
.tasks/
.tmp/
.worktrees/
custom-output/
archive/
test-provider.ts

# ============================================
# 构建和配置
# ============================================
tsconfig.json
vitest.config.ts
vitest.config.js
vitest.config.d.ts
vitest.config.d.ts.map
vitest.benchmark.config.ts
.eslintrc*
.prettierrc*
.gitignore
.gitattributes
.github/
.githooks/

# ============================================
# 文档（选择性保留）
# ============================================
docs/
*.md
!README.md
!CHANGELOG.md

# ============================================
# 开发环境配置
# ============================================
.kimi/
.claude/
.agents/
.mcp.json
codemap.config.json
mycodemap.config.json
.vscode/
.idea/

# ============================================
# 其他
# ============================================
*.log
node_modules/
.prebuilds/

# ============================================
# 注意：保留 source map 文件
# dist/*.js.map 需要保留，便于用户调试
# ============================================
```

**重要决策**: 保留 `dist/*.js.map` 文件
- 便于用户调试时定位到 TypeScript 源码
- 增加包大小约 30%，但显著提升调试体验

### 3.2 打包内容分析

```
mycodemap-0.1.0.tgz
├── dist/                 # 编译后的代码 (~500KB)
├── LICENSE               # MIT 许可证
├── README.md             # 项目说明
├── CHANGELOG.md          # 版本变更日志
├── codemap.config.schema.json  # 配置 JSON Schema
└── package.json          # 包配置

预计总大小: ~600KB (压缩后)
```

---

## 4. mycodemap.config.schema.json 设计

**品牌一致性决策**: 配置文件名从 `codemap.config.json` 改为 `mycodemap.config.json`

### 4.1 完整 Schema

**Schema 引用决策**: 使用相对路径 `./node_modules/mycodemap/mycodemap.config.schema.json`，无需部署到 CDN

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mycodemap.dev/schema.json",
  "title": "CodeMap Configuration",
  "description": "Configuration schema for CodeMap - TypeScript code analysis tool",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "$schema": {
      "type": "string",
      "description": "JSON Schema reference"
    },
    "mode": {
      "type": "string",
      "enum": ["fast", "smart", "hybrid"],
      "default": "hybrid",
      "description": "Analysis mode: fast (regex), smart (AST), or hybrid (auto-select)"
    },
    "include": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": ["src/**/*.ts"],
      "description": "Glob patterns for files to include in analysis"
    },
    "exclude": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": [
        "node_modules/**",
        "dist/**",
        "build/**",
        "*.test.ts",
        "*.spec.ts"
      ],
      "description": "Glob patterns for files to exclude from analysis"
    },
    "output": {
      "type": "string",
      "default": ".codemap",
      "description": "Output directory for generated code maps"
    },
    "plugins": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Plugin modules to load"
    },
    "ai": {
      "type": "object",
      "description": "AI context generation settings",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable AI context generation"
        },
        "model": {
          "type": "string",
          "default": "default",
          "description": "AI model to use for descriptions"
        }
      }
    },
    "watch": {
      "type": "object",
      "description": "Watch mode settings",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable watch mode by default"
        },
        "debounce": {
          "type": "number",
          "default": 500,
          "description": "Debounce interval in milliseconds"
        }
      }
    },
    "logging": {
      "type": "object",
      "description": "Logging configuration",
      "properties": {
        "level": {
          "type": "string",
          "enum": ["debug", "info", "warn", "error"],
          "default": "info"
        },
        "enabled": {
          "type": "boolean",
          "default": true
        }
      }
    }
  },
  "examples": [
    {
      "$schema": "https://codemap.dev/schema.json",
      "mode": "hybrid",
      "include": ["src/**/*.ts"],
      "exclude": ["node_modules/**", "**/*.test.ts"],
      "output": ".codemap"
    }
  ]
}
```

### 4.2 使用示例

```json
{
  "$schema": "./node_modules/mycodemap/mycodemap.config.schema.json",
  "mode": "hybrid",
  "include": ["src/**/*.ts", "lib/**/*.js"],
  "exclude": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "output": ".codemap",
  "ai": {
    "enabled": true,
    "model": "default"
  },
  "watch": {
    "enabled": false,
    "debounce": 500
  },
  "logging": {
    "level": "info",
    "enabled": true
  }
}
```

---

## 5. 平台检测与引导系统

### 5.1 平台检测模块

**文件**: `src/cli/platform-check.ts`

```typescript
// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Detect platform compatibility and provide user guidance on first run

import os from 'node:os';
import chalk from 'chalk';

export interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  isSupported: boolean;
  supportLevel: 'full' | 'experimental' | 'unsupported';
}

const FULLY_SUPPORTED_PLATFORMS: Array<{ platform: NodeJS.Platform; arch: string }> = [
  { platform: 'linux', arch: 'x64' },
  { platform: 'darwin', arch: 'x64' },
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'win32', arch: 'x64' },
];

export function detectPlatform(): PlatformInfo {
  const platform = os.platform();
  const arch = os.arch();
  const nodeVersion = process.version;

  const isFullySupported = FULLY_SUPPORTED_PLATFORMS.some(
    p => p.platform === platform && p.arch === arch
  );

  let supportLevel: PlatformInfo['supportLevel'] = 'unsupported';
  if (isFullySupported) {
    supportLevel = 'full';
  } else if (['linux', 'darwin', 'win32'].includes(platform)) {
    supportLevel = 'experimental';
  }

  return {
    platform,
    arch,
    nodeVersion,
    isSupported: supportLevel !== 'unsupported',
    supportLevel,
  };
}

export function printPlatformNotice(info: PlatformInfo): void {
  if (info.supportLevel === 'full') {
    if (info.platform === 'linux') {
      console.log(chalk.green('✓'), '已针对 Linux 优化');
    }
    // macOS 和 Windows 完全支持，不显示额外提示
    return;
  }

  if (info.supportLevel === 'experimental') {
    console.log(
      chalk.yellow('⚠'),
      `当前平台: ${info.platform}-${info.arch}`
    );
    console.log(
      chalk.gray('  '),
      '此平台为实验性支持，如遇问题请运行:',
      chalk.cyan('mycodemap report')
    );
    console.log(
      chalk.gray('  '),
      '反馈地址:',
      chalk.underline('https://github.com/yourname/mycodemap/issues')
    );
    console.log();
    return;
  }

  // unsupported
  console.log(
    chalk.red('✗'),
    `不支持的的平台: ${info.platform}-${info.arch}`
  );
  console.log(
    chalk.gray('  '),
    '当前支持的平台: Linux/macOS/Windows (x64/arm64)'
  );
}

export function checkNodeVersion(): boolean {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  
  if (major < 18) {
    console.log(chalk.red('✗'), `Node.js 版本过低: ${version}`);
    console.log(chalk.gray('  '), '请升级至 Node.js 18.0.0 或更高版本');
    return false;
  }
  
  return true;
}
```

### 5.2 CLI 入口集成

**修改**: `src/cli/index.ts`

```typescript
import { detectPlatform, printPlatformNotice, checkNodeVersion } from './platform-check.js';

// CLI 启动时执行检查
const platform = detectPlatform();
printPlatformNotice(platform);

if (!checkNodeVersion()) {
  process.exit(1);
}
```

### 5.3 tree-sitter 兼容性检测

**降级方案决策**: 当 tree-sitter 无法加载时，**阻止使用并给出清晰错误提示**，而非静默降级。

**性能优化决策**: tree-sitter 检测**按需进行**，非每次 CLI 启动都检测。
- `init`, `query`, `report` 等命令不需要 tree-sitter，跳过检测
- `generate`, `watch`, `complexity` 等需要 AST 解析的命令才检测

**文件**: `src/cli/tree-sitter-check.ts`

```typescript
// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Check tree-sitter availability and provide clear error messages

import chalk from 'chalk';

export function checkTreeSitter(): boolean {
  try {
    // 尝试动态导入 tree-sitter
    const Parser = require('tree-sitter');
    const TypeScript = require('tree-sitter-typescript');
    
    // 验证是否能正常实例化
    const parser = new Parser();
    parser.setLanguage(TypeScript.typescript);
    
    return true;
  } catch (error) {
    return false;
  }
}

export function printTreeSitterError(): void {
  console.log();
  console.log(chalk.red('✗'), 'Tree-sitter 加载失败');
  console.log();
  console.log(chalk.yellow('可能的原因：'));
  console.log('  1. 当前平台没有预编译的 binary');
  console.log('  2. 缺少 C++ 编译环境（如需要源码编译）');
  console.log('  3. 网络问题导致 binary 下载失败');
  console.log();
  console.log(chalk.yellow('解决方案：'));
  console.log('  • Linux (Ubuntu): 确保安装 build-essential');
  console.log('    ', chalk.gray('sudo apt-get install build-essential'));
  console.log('  • macOS: 安装 Xcode Command Line Tools');
  console.log('    ', chalk.gray('xcode-select --install'));
  console.log('  • Windows: 安装 Visual Studio Build Tools');
  console.log();
  console.log('  如问题持续，请运行', chalk.cyan('mycodemap report'), '并提交 Issue:');
  console.log('  ', chalk.underline('https://github.com/yourname/mycodemap/issues'));
  console.log();
}
```

### 5.4 首次使用引导

**文件**: `src/cli/first-run-guide.ts`

```typescript
// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Guide new users through initial setup and configuration

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function isFirstRun(cwd: string): boolean {
  const configPath = path.join(cwd, 'mycodemap.config.json');
  const hasConfig = fs.existsSync(configPath);
  
  const markerPath = path.join(cwd, '.codemap', '.first-run');
  const hasMarker = fs.existsSync(markerPath);
  
  return !hasConfig && !hasMarker;
}

export function markFirstRunComplete(cwd: string): void {
  const markerDir = path.join(cwd, '.codemap');
  const markerPath = path.join(markerDir, '.first-run');
  
  try {
    fs.mkdirSync(markerDir, { recursive: true });
    fs.writeFileSync(markerPath, new Date().toISOString());
  } catch {
    // ignore
  }
}

export function printWelcomeMessage(): void {
  const pkg = require('../../package.json');
  
  console.log();
  console.log(chalk.bold.cyan(`🗺️  Welcome to MyCodeMap v${pkg.version}!`));
  console.log();
  console.log('快速开始:');
  console.log(chalk.gray('  1.'), '初始化配置:', chalk.cyan('mycodemap init'));
  console.log(chalk.gray('  2.'), '生成代码地图:', chalk.cyan('mycodemap generate'));
  console.log(chalk.gray('  3.'), '查看帮助:', chalk.cyan('mycodemap --help'));
  console.log();
  console.log('常用命令:');
  console.log(chalk.gray('  •'), chalk.cyan('mycodemap query -s <symbol>'), '  查询符号');
  console.log(chalk.gray('  •'), chalk.cyan('mycodemap deps -m <module>'), '   分析依赖');
  console.log(chalk.gray('  •'), chalk.cyan('mycodemap complexity'), '        复杂度分析');
  console.log();
  console.log(chalk.gray('需要更多帮助? 访问:'), chalk.underline(pkg.homepage));
  console.log();
}
```

---

## 6. Report 命令设计

### 6.1 功能说明

`mycodemap report` 命令用于打包运行环境信息，方便用户提交 Issue 时提供完整的调试信息。

**隐私保护决策**: 报告中的敏感信息必须进行脱敏处理。

### 6.2 采集信息清单

| 类别 | 内容 | 脱敏处理 |
|------|------|----------|
| 日志文件 | 最近 3 天的日志 | 路径中的用户名替换为 `<user>` |
| 系统信息 | Node 版本、平台、CPU、内存 | 无需脱敏 |
| 包信息 | mycodemap 版本、依赖版本 | 无需脱敏 |
| 配置信息 | mycodemap.config.json | 路径脱敏 |
| 运行时信息 | 环境变量（CODEMAP_*） | 敏感值（API keys 等）替换为 `<redacted>` |
| 树形信息 | 项目结构概览 | 路径脱敏，仅保留相对结构 |

### 6.3 脱敏实现

**文件**: `src/cli/utils/sanitize.ts`

```typescript
// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Sanitize sensitive information from logs and paths

import os from 'node:os';
import path from 'node:path';

export function sanitizePath(input: string): string {
  const homeDir = os.homedir();
  const username = path.basename(homeDir);
  
  return input
    .replace(new RegExp(homeDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '~')
    .replace(new RegExp(username, 'g'), '<user>');
}

export function sanitizeEnvValue(key: string, value: string): string {
  // 敏感 key 模式
  const sensitivePatterns = [
    /key/i,
    /token/i,
    /secret/i,
    /password/i,
    /auth/i,
    /credential/i,
    /private/i,
  ];
  
  const isSensitive = sensitivePatterns.some(p => p.test(key));
  return isSensitive ? '<redacted>' : value;
}

export function sanitizeLogContent(content: string): string {
  return content
    .split('\n')
    .map(line => {
      // 脱敏路径
      line = sanitizePath(line);
      
      // 脱敏环境变量值（格式: KEY=value）
      line = line.replace(/(\w+)=([^\s]+)/g, (match, key, value) => {
        return `${key}=${sanitizeEnvValue(key, value)}`;
      });
      
      return line;
    })
    .join('\n');
}
```

### 6.3 实现代码

**文件**: `src/cli/commands/report.ts`

```typescript
// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Collect runtime information for bug reporting and troubleshooting

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import chalk from 'chalk';
import { Command } from 'commander';

const require = createRequire(import.meta.url);

interface ReportData {
  timestamp: string;
  mycodemapVersion: string;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpus: number;
    totalMemory: string;
    freeMemory: string;
  };
  environment: Record<string, string | undefined>;
  config: unknown | null;
  logs: string[];
  projectStructure: string;
}

function collectSystemInfo(): ReportData['system'] {
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
    freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
  };
}

function collectEnvironment(): ReportData['environment'] {
  const env: ReportData['environment'] = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('CODEMAP_')) {
      env[key] = value;
    }
  }
  return env;
}

function collectConfig(cwd: string): unknown | null {
  const configPath = path.join(cwd, 'mycodemap.config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { error: 'Failed to parse config' };
  }
}

function collectRecentLogs(logDir: string, days: number): string[] {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const logs: string[] = [];

  for (const file of fs.readdirSync(logDir)) {
    if (!file.startsWith('codemap-') || !file.endsWith('.log')) {
      continue;
    }
    
    const filePath = path.join(logDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.mtimeMs < cutoff) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // 仅保留最近 1000 行，避免过大
      const lines = content.split('\n').slice(-1000);
      logs.push(`=== ${file} ===\n${lines.join('\n')}`);
    } catch {
      // ignore
    }
  }

  return logs;
}

function collectProjectStructure(cwd: string, maxDepth = 3): string {
  const output: string[] = [];
  
  function traverse(dir: string, depth: number, prefix: string): void {
    if (depth > maxDepth) {
      output.push(`${prefix}...`);
      return;
    }

    const items: string[] = [];
    try {
      for (const item of fs.readdirSync(dir)) {
        // 跳过隐藏文件和常见不需要的目录
        if (item.startsWith('.') || 
            ['node_modules', 'dist', 'build', 'coverage'].includes(item)) {
          continue;
        }
        items.push(item);
      }
    } catch {
      return;
    }

    items.sort();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      const line = prefix + (isLast ? '└── ' : '├── ') + item;
      output.push(line);
      
      if (stat.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        traverse(itemPath, depth + 1, newPrefix);
      }
    }
  }

  output.push(path.basename(cwd) + '/');
  traverse(cwd, 1, '');
  
  return output.join('\n');
}

export function generateReport(cwd: string, logDir: string): ReportData {
  const pkg = require('../../../package.json');
  
  return {
    timestamp: new Date().toISOString(),
    mycodemapVersion: pkg.version,
    system: collectSystemInfo(),
    environment: collectEnvironment(),
    config: collectConfig(cwd),
    logs: collectRecentLogs(logDir, 3),
    projectStructure: collectProjectStructure(cwd),
  };
}

export function writeReportFile(report: ReportData, outputDir: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `mycodemap-report-${timestamp}.json`;
  const filePath = path.join(outputDir, fileName);
  
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  
  return filePath;
}

// 报告大小限制: 5MB
const MAX_REPORT_SIZE_MB = 5;

function getReportSize(report: ReportData): number {
  const json = JSON.stringify(report, null, 2);
  return Buffer.byteLength(json, 'utf-8') / 1024 / 1024;
}

function previewReport(report: ReportData): string {
  const lines: string[] = [];
  lines.push(chalk.bold('报告预览:'));
  lines.push(`  时间戳: ${report.timestamp}`);
  lines.push(`  版本: ${report.mycodemapVersion}`);
  lines.push(`  平台: ${report.system.platform}-${report.system.arch}`);
  lines.push(`  日志条数: ${report.logs.length}`);
  lines.push(`  配置: ${report.config ? '已包含' : '无'}`);
  return lines.join('\n');

export function createReportCommand(): Command {
  return new Command('report')
    .description('Generate a diagnostic report for bug reporting')
    .option('-o, --output <dir>', 'Output directory', '.codemap')
    .option('--days <n>', 'Number of days of logs to include', '3')
    .option('-y, --yes', 'Skip confirmation', false)
    .action(async (options) => {
      const cwd = process.cwd();
      const logDir = path.join(cwd, '.codemap', 'logs');
      const outputDir = path.resolve(cwd, options.output);
      
      // 边界情况 1: 检查日志目录是否存在
      if (!fs.existsSync(logDir)) {
        console.log(chalk.yellow('⚠'), '没有找到日志目录');
        console.log(chalk.gray('  '), logDir);
        console.log();
        console.log('请先运行其他 mycodemap 命令生成日志，再生成报告。');
        return;
      }
      
      // 边界情况 2: 检查是否有日志文件
      const logs = collectRecentLogs(logDir, parseInt(options.days, 10));
      if (logs.length === 0) {
        console.log(chalk.yellow('⚠'), '最近几天没有日志文件');
        console.log();
        console.log('请先运行其他 mycodemap 命令生成日志，再生成报告。');
        return;
      }
      
      console.log(chalk.blue('📋'), '正在生成诊断报告...');
      
      const report = generateReport(cwd, logDir);
      
      // 边界情况 3: 检查报告大小
      const sizeMB = getReportSize(report);
      if (sizeMB > MAX_REPORT_SIZE_MB) {
        console.log(chalk.yellow('⚠'), `报告过大 (${sizeMB.toFixed(2)}MB)，建议清理日志后重试`);
        console.log(chalk.gray('  '), '日志目录:', logDir);
        return;
      }
      
      // 显示预览并请求确认
      if (!options.yes) {
        console.log();
        console.log(previewReport(report));
        console.log();
        console.log(chalk.gray('报告将包含以上信息（敏感信息已脱敏）'));
        console.log();
        
        // 简单的确认提示
        process.stdout.write('确认生成报告? [Y/n] ');
        const response = await new Promise<string>((resolve) => {
          process.stdin.once('data', (data) => {
            resolve(data.toString().trim().toLowerCase());
          });
        });
        
        if (response !== '' && response !== 'y' && response !== 'yes') {
          console.log('已取消');
          return;
        }
      }
      
      const filePath = writeReportFile(report, outputDir);
      
      console.log();
      console.log(chalk.green('✓'), '报告已生成:');
      console.log(chalk.gray('  '), filePath);
      console.log();
      console.log('请将此文件附加到 Issue 中:');
      console.log(chalk.cyan('  '), chalk.underline('https://github.com/yourname/mycodemap/issues'));
      console.log();
      console.log(chalk.gray('说明: 报告包含系统信息和日志，不包含源代码。敏感信息已脱敏。'));
    });
}
```

### 6.4 报告示例

```json
{
  "timestamp": "2026-03-04T13:30:00.000Z",
  "mycodemapVersion": "0.1.0",
  "system": {
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "v20.11.0",
    "cpus": 8,
    "totalMemory": "16384MB",
    "freeMemory": "8192MB"
  },
  "environment": {
    "CODEMAP_RUNTIME_LOG_ENABLED": "true",
    "CODEMAP_RUNTIME_LOG_RETENTION_DAYS": "14"
  },
  "config": {
    "mode": "hybrid",
    "include": ["src/**/*.ts"]
  },
  "logs": ["=== codemap-2026-03-04.log ===\n[...]"],
  "projectStructure": "my-project/\n├── src/\n│   ├── index.ts\n│   └── utils/\n└── package.json"
}
```

---

## 7. CHANGELOG.md 格式

### 7.1 文件头模板

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```

### 7.2 版本条目示例

```markdown
## [0.1.0] - 2026-03-04

### Added
- Initial release of MyCodeMap
- Support for TypeScript/JavaScript code analysis
- Dual parsing modes: fast (regex) and smart (AST)
- CLI commands: init, generate, query, deps, complexity, cycles, watch, report
- Platform support: Linux, macOS, Windows (x64/arm64)
- Runtime logging system for troubleshooting
- Diagnostic report generation (`mycodemap report`)
- JSON Schema for configuration validation
- Pre-compiled tree-sitter binaries for faster installation

### Notes
- Optimized for Linux (Ubuntu) environments
- Experimental support for other platforms
- Requires Node.js >= 18.0.0
```

### 7.3 npm script 集成

```json
{
  "scripts": {
    "postversion": "npm run changelog && git add CHANGELOG.md && git commit -m \"docs: update changelog for v$(node -p \"require('./package.json').version\")\"",
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s"
  }
}
```

---

## 8. README.md 更新要点

### 8.1 安装说明更新

**品牌一致性**: 所有用户-facing 文档中，`codemap` 统一改为 `mycodemap`。

```markdown
## 安装

### 使用 npx（推荐，无需安装）

```bash
npx mycodemap init
npx mycodemap generate
```

### 全局安装

```bash
npm install -g mycodemap
mycodemap init
# 或使用短命令
cm init
```

### 项目本地安装

```bash
npm install --save-dev mycodemap
npx mycodemap init
```

### 环境要求

- **Node.js**: >= 18.0.0
- **平台**: Linux (完全支持), macOS (完全支持), Windows (完全支持)
- **架构**: x64, ARM64

> **注意**: 虽然支持多平台，但在 Linux (Ubuntu) 上测试最充分。
> 其他平台如遇问题请运行 `mycodemap report` 并提交 Issue。

### 命令别名

安装后可以使用以下任一命令：
- `mycodemap` - 完整命令
- `cm` - 短命令（推荐）

> **注意**: 如果之前安装过其他 `codemap` 包，请确保使用 `mycodemap` 或 `cm`，而非 `codemap`。
```

### 8.2 故障排查章节

```markdown
## 故障排查

### 安装问题

#### 1. Tree-sitter 加载失败

如果遇到以下错误：
```
✗ Tree-sitter 加载失败
```

**可能的原因**：
- 当前平台没有预编译的 binary
- 缺少 C++ 编译环境（如需要源码编译）
- 网络问题导致 binary 下载失败

**解决方案**：

**Linux (Ubuntu)**:
```bash
sudo apt-get install build-essential
npm rebuild tree-sitter tree-sitter-typescript
```

**macOS**:
```bash
xcode-select --install
npm rebuild tree-sitter tree-sitter-typescript
```

**Windows**:
安装 Visual Studio Build Tools，然后运行：
```bash
npm rebuild tree-sitter tree-sitter-typescript
```

如问题持续，请运行 `mycodemap report` 并提交 Issue。

#### 2. 平台不支持错误

如果遇到 `Unsupported platform` 错误，请确认:
- Node.js 版本 >= 18.0.0 (`node --version`)
- 操作系统为 Linux/macOS/Windows
- 架构为 x64 或 ARM64

#### 2. 首次运行较慢

首次使用 `npx mycodemap` 时可能需要下载依赖，请耐心等待。
后续运行会使用本地缓存，速度会快很多。

### 运行问题

#### 1. 生成结果为空

检查 `codemap.config.json` 中的 `include` 配置是否正确匹配你的源代码路径。

#### 2. 内存不足

对于大型项目，可以增加 Node.js 内存限制:
```bash
NODE_OPTIONS="--max-old-space-size=4096" mycodemap generate
```

### 提交 Issue

如果遇到无法解决的问题，请运行以下命令生成诊断报告:

```bash
mycodemap report
```

然后将生成的 `.codemap/mycodemap-report-*.json` 文件附加到 Issue 中：
https://github.com/yourname/mycodemap/issues
```

---

## 9. 实施步骤

### Phase 1: 包配置准备

1. **更新 package.json**
   - 修改 `name` 为 `mycodemap`
   - 添加 `bin.cm` 别名
   - 更新 `files` 字段
   - 添加 `os` 和 `cpu` 限制
   - 添加 `repository/bugs/homepage`

2. **创建 .npmignore**
   - 排除开发文件和源代码
   - 保留必要文档

3. **创建 codemap.config.schema.json**
   - 完整的 JSON Schema 定义
   - 包含所有配置项的验证规则

### Phase 2: 功能开发

4. **创建 postinstall.js 脚本** ⭐ 新增
   - 检查 tree-sitter 是否成功安装
   - 提供友好的错误提示
   - 添加到 package.json 的 postinstall 钩子

5. **创建 platform-check.ts**
   - 平台检测逻辑
   - 支持级别判断
   - 用户提示输出

6. **创建 tree-sitter-check.ts**
   - tree-sitter 可用性检测（按需）
   - 加载失败时的错误提示

7. **创建 first-run-guide.ts**
   - 首次运行检测
   - 欢迎信息输出
   - 快速开始指南

8. **创建 sanitize.ts**
   - 路径脱敏（用户名）
   - 环境变量值脱敏
   - 日志内容脱敏

9. **创建 report 命令**
   - 诊断信息收集（使用脱敏工具）
   - 边界情况处理（无日志、报告过大）
   - 交互式用户确认
   - 报告文件生成
   - CLI 命令集成

10. **更新 CLI 入口**
    - 集成平台检测
    - 集成按需 tree-sitter 检测
    - 集成首次运行引导
    - 注册 report 命令

12. **更新 init 命令**
    - 生成 `mycodemap.config.json`（而非 `codemap.config.json`）
    - 使用相对路径引用 schema
    - 检测旧配置 `codemap.config.json` 并提示迁移

### Phase 3: 文档准备

13. **创建 CHANGELOG.md**
    - Keep a Changelog 格式
    - 初始版本条目

14. **创建 mycodemap.config.schema.json**
    - 完整的 JSON Schema 定义
    - 包含所有配置项的验证规则

15. **创建 LICENSE 文件** ⭐ 关键遗漏
    - MIT 许可证内容
    - 与 package.json 中的 license 字段一致

16. **更新 README.md**
    - 新的安装说明（品牌名统一）
    - 平台支持说明
    - 故障排查章节（含 tree-sitter 错误）

### Phase 4: 测试验证

17. **本地打包测试**
    ```bash
    npm pack
    tar -tzf mycodemap-0.1.0.tgz
    ```

18. **本地安装测试**
    ```bash
    npm link
    mycodemap --version
    cm --version
    mycodemap init
    mycodemap report
    ```

19. **多平台测试**（如可能）
    - Linux x64
    - macOS x64/ARM64
    - Windows x64

### Phase 5: 发布

20. **发布到 NPM**
    ```bash
    npm config set registry https://registry.npmjs.org/
    npm login
    npm publish --access public
    ```

21. **验证安装**
    ```bash
    npm uninstall -g mycodemap
    npx mycodemap --version
    npx cm --version
    ```

---

## 10. 发布流程与 CI/CD 集成 ⭐ 新增

### 10.1 版本发布流程

**手动发布流程**（推荐初期使用）:
```bash
# 1. 确保所有测试通过
npm run test:all

# 2. 更新版本号（自动更新 CHANGELOG）
npm version patch  # 或 minor, major

# 3. 推送标签到远程
git push origin main --tags

# 4. 发布到 NPM
npm publish --access public
```

**版本号策略**:
- `0.1.0` - 初始版本
- `0.1.1` - bugfix 版本
- `0.2.0` - 新功能版本
- `1.0.0` - 稳定版本（API 稳定后）

### 10.2 Git Tag 与 NPM 版本同步

**package.json 脚本**:
```json
{
  "scripts": {
    "version": "npm run changelog && git add CHANGELOG.md",
    "postversion": "git push origin main --tags"
  }
}
```

**说明**: 
- `npm version` 会自动打 git tag
- `postversion` 自动推送 tag 到远程
- 确保 git 和 npm 版本始终一致

### 10.3 GitHub Actions 自动化（可选）

**文件**: `.github/workflows/publish.yml`

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Publish to NPM
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**注意**: 需要先在 GitHub Settings 中添加 `NPM_TOKEN` secret。

---

## 11. 测试策略 ⭐ 新增

### 11.1 单元测试

**已有测试**: `src/**/*.test.ts`

**需新增测试**:
- `src/cli/__tests__/platform-check.test.ts`
- `src/cli/__tests__/tree-sitter-check.test.ts`
- `src/cli/__tests__/sanitize.test.ts`
- `src/cli/commands/__tests__/report.test.ts`

### 11.2 集成测试

**打包测试**:
```bash
# 模拟发布
npm pack

# 解压检查内容
tar -tzf mycodemap-*.tgz | head -20
```

**本地安装测试**:
```bash
# 链接到全局
npm link

# 测试所有命令
mycodemap --version
mycodemap init -y
mycodemap generate
mycodemap report

# 取消链接
npm unlink -g mycodemap
```

### 11.3 平台兼容性测试

**策略**:
- **Linux**: 主要开发和测试平台（GitHub Actions Ubuntu Runner）
- **macOS**: 本地手动测试（或 GitHub Actions macOS Runner）
- **Windows**: 本地手动测试（或 GitHub Actions Windows Runner）

** tree-sitter 失败模拟测试**:
```typescript
// 模拟 tree-sitter 不可用的情况
describe('tree-sitter-check', () => {
  it('should handle missing tree-sitter gracefully', () => {
    // 模拟 require 失败
    jest.mock('tree-sitter', () => {
      throw new Error('Cannot find module');
    });
    
    const result = checkTreeSitter();
    expect(result).toBe(false);
  });
});
```

### 11.4 发布前检查清单

- [ ] 所有单元测试通过 (`npm test`)
- [ ] TypeScript 编译无错误 (`npm run typecheck`)
- [ ] ESLint 检查通过 (`npm run lint`)
- [ ] `npm pack` 生成的包包含正确文件
- [ ] 本地安装测试通过 (`npm link` + 命令测试)
- [ ] 版本号已更新 (`package.json`)
- [ ] CHANGELOG 已更新
- [ ] README 中的示例已验证

---

## 13. 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| tree-sitter 预编译 binary 不兼容 | 低 | 高 | 提供详细的错误提示和 report 命令 |
| tree-sitter 在 npm install 阶段失败 | 中 | 高 | postinstall 脚本提供友好提示，不阻断安装 |
| 包名 mycodemap 后续被占用 | 极低 | 高 | 发布后立即推广，建立品牌认知 |
| Windows 平台问题较多 | 中 | 中 | 文档说明实验性支持，收集反馈迭代 |
| 包体积过大 | 低 | 低 | 优化 .npmignore，仅包含必要文件 |
| Node.js 版本要求过高 | 低 | 中 | 在 README 显著位置标明要求 |
| 报告文件包含未脱敏的敏感信息 | 低 | 高 | 脱敏工具全面审查，报告前用户确认 |
| 现有用户迁移困惑（codemap → mycodemap） | 中 | 中 | README 明确说明，保留旧配置检测提示 |

---

## 12. 成功标准

- [ ] `npm pack` 生成的包小于 1MB
- [ ] `npx mycodemap --version` 正常工作
- [ ] `npx cm --version` 正常工作（别名测试）
- [ ] `mycodemap init` 在干净环境成功运行
- [ ] `mycodemap init` 生成 `mycodemap.config.json`（非旧名）
- [ ] `mycodemap report` 生成有效报告文件
- [ ] `mycodemap report` 正确脱敏敏感信息
- [ ] tree-sitter 检测按需工作（init 不检测，generate 检测）
- [ ] Linux 平台完全正常工作
- [ ] macOS 平台基本正常工作
- [ ] Windows 平台无致命错误

---

## 附录 A: 文件清单

### 新增文件
- `docs/PUBLISH_NPM_DESIGN.md` (本文档)
- `LICENSE` - MIT 许可证 ⭐ 关键遗漏
- `mycodemap.config.schema.json` (原 `codemap.config.schema.json`)
- `.npmignore`
- `CHANGELOG.md`
- `scripts/postinstall.js` - npm 安装后检查 tree-sitter
- `src/cli/platform-check.ts`
- `src/cli/tree-sitter-check.ts`
- `src/cli/first-run-guide.ts`
- `src/cli/utils/sanitize.ts`
- `src/cli/commands/report.ts`

### 修改文件
- `package.json` - 包名、bin 配置、engines、os/cpu 限制、postinstall 脚本
- `README.md` - 品牌名称、安装说明、故障排查
- `src/cli/index.ts` - 集成平台检测、按需 tree-sitter 检测、report 命令
- `src/cli/commands/init.ts` - 配置文件名改为 `mycodemap.config.json`，检测旧配置并提示迁移

### 已确认事项
- ✅ `src/cli/index.ts` 已包含 `#!/usr/bin/env node` shebang
- ✅ 编译后的 `dist/cli/index.js` 保留 shebang 和可执行权限

---

## 附录 B: 现有用户迁移指南 ⭐ 新增

### 配置文件迁移

**init 命令检测旧配置**:
```typescript
// 在 init.ts 中添加
function checkLegacyConfig(cwd: string): void {
  const legacyPath = path.join(cwd, 'codemap.config.json');
  const newPath = path.join(cwd, 'mycodemap.config.json');
  
  if (fs.existsSync(legacyPath) && !fs.existsSync(newPath)) {
    console.log(chalk.yellow('⚠'), '检测到旧版配置文件 codemap.config.json');
    console.log(chalk.gray('  '), '建议重命名为 mycodemap.config.json');
    console.log();
    console.log('你可以运行以下命令迁移:');
    console.log(chalk.cyan('  '), `mv codemap.config.json mycodemap.config.json`);
    console.log();
  }
}
```

### 命令迁移

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `codemap init` | `mycodemap init` 或 `cm init` | 使用新的 CLI 名称 |
| `codemap generate` | `mycodemap generate` 或 `cm generate` | 同上 |

### 环境变量

环境变量前缀保持 `CODEMAP_*` 不变，无需修改。

---

*文档结束*
