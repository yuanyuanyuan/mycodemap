# 架构护栏规则

> 分层架构依赖规则与 Enforcement 策略

## 1. 架构分层原则

**第一性原理**：业务逻辑必须与实现细节解耦，确保可测试性和技术栈可替换性。

CodeMap 采用分层架构，各层职责如下：

| 层级 | 目录 | 职责 | 允许依赖 |
|------|------|------|---------|
| **入口层** | `src/cli/` | 命令解析、用户交互、平台检查 | orchestrator, types |
| **编排层** | `src/orchestrator/` | 多工具路由、CI 护栏、工作流编排 | core, parser, generator, plugins, types |
| **分析层** | `src/core/` | 文件发现、依赖图构建、全局索引 | parser, types |
| **解析层** | `src/parser/` | AST 解析、符号提取、源码分析 | types |
| **生成层** | `src/generator/` | 输出生成、AI 地图、上下文文档 | core, types |
| **插件层** | `src/plugins/` | 扩展分析能力、复杂度分析 | core, types |
| **支撑层** | `src/cache/`, `src/worker/`, `src/watcher/` | 缓存、工作线程、文件监听 | types |
| **类型层** | `src/types/` | 跨层共享类型与接口 | 无（纯类型定义） |

## 2. 依赖流向规则

### 2.1 禁止的依赖方向

```
cli ←── 禁止 ── orchestrator 层不得依赖 CLI 层
core ←── 禁止 ── orchestrator 层不得依赖 core 层（应通过接口）
parser ←── 禁止 ── core 层不得直接实例化解析器（应通过工厂）
types ←── 禁止 ── 任何层不得修改 types 层（只读）
```

### 2.2 允许的依赖方向

```
cli → orchestrator → core → parser
core → generator
orchestrator → plugins
core → cache, worker
all → types
```

## 3. 依赖注入规范

### 3.1 原则

- 高层模块不应依赖低层模块，两者都应依赖抽象（接口）
- 使用构造函数注入或工厂函数注入
- 禁止在模块内部直接 `new` 高阶服务

### 3.2 合规示例

```typescript
// ✅ 合规：通过接口注入
// src/core/analyzer.ts
import type { IParser } from '../parser/interfaces/IParser';
import type { IGenerator } from '../generator/interfaces/IGenerator';

export interface AnalyzerDeps {
  parser: IParser;
  generator: IGenerator;
}

export class Analyzer {
  constructor(private deps: AnalyzerDeps) {}
  
  async analyze(files: string[]) {
    const ast = await this.deps.parser.parse(files);
    return this.deps.generator.generate(ast);
  }
}
```

```typescript
// ❌ 违规：直接实例化
// src/core/analyzer.ts
import { SmartParser } from '../parser/implementations/smart-parser';
import { AIGenerator } from '../generator/ai-generator';

export class Analyzer {
  private parser = new SmartParser(); // 错误！硬编码实现
  private generator = new AIGenerator(); // 错误！难以测试和替换
}
```

## 4. 文件组织规范

### 4.1 目录结构

```
src/
  cli/              # 入口层
    commands/       # 子命令实现
    utils/          # CLI 工具函数
  orchestrator/     # 编排层
    adapters/       # 多工具适配器
    workflow/       # 工作流模块
  core/             # 分析层
    analyzer.ts     # 主分析器
    global-index.ts # 全局索引
  parser/           # 解析层
    interfaces/     # 解析器接口
    implementations/ # 解析器实现
  generator/        # 生成层
    context.ts      # 上下文生成
    file-describer.ts # 文件描述
  plugins/          # 插件层
    built-in/       # 内置插件
    types.ts        # 插件接口
  cache/            # 缓存层
  worker/           # 工作线程层
  watcher/          # 文件监听层
  types/            # 共享类型
```

### 4.2 文件命名规范

- **实现文件**：`kebab-case.ts`（如 `smart-parser.ts`）
- **接口文件**：`I{PascalCase}.ts`（如 `IParser.ts`）或 `{name}.interface.ts`
- **测试文件**：`{name}.test.ts` 或 `__tests__/{name}.test.ts`
- **类型文件**：`types.ts` 或 `{name}.types.ts`

## 5. Enforcement 策略

### 5.1 自动检测

使用 `dependency-cruiser` 配置架构规则：

```javascript
// .dependency-cruiser.js（待配置）
module.exports = {
  forbidden: [
    {
      name: 'no-cli-in-orchestrator',
      comment: 'orchestrator 层不得依赖 cli 层',
      severity: 'error',
      from: { path: '^src/orchestrator' },
      to: { path: '^src/cli' }
    },
    {
      name: 'no-cli-in-core',
      comment: 'core 层不得依赖 cli 层',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/cli' }
    },
    {
      name: 'no-cli-in-parser',
      comment: 'parser 层不得依赖 cli 层',
      severity: 'error',
      from: { path: '^src/parser' },
      to: { path: '^src/cli' }
    }
  ]
};
```

### 5.2 手动检查

使用 CodeMap CLI 检查模块依赖：

```bash
# 检查某模块的依赖
node dist/cli/index.js deps -m "src/core/analyzer"

# 检查某文件的影响范围
node dist/cli/index.js impact -f "src/types/index.ts"
```

### 5.3 CI 检查

在 CI 中添加架构合规检查：

```yaml
# .github/workflows/ci-gateway.yml 待添加
- name: Check architecture compliance
  run: npm run check:architecture
```

## 6. 违规处理

### 6.1 发现违规时

1. **暂停任务**：不得继续添加更多代码
2. **评估影响**：使用 `impact` 命令评估影响范围
3. **重构方案**：将直接依赖改为接口注入
4. **验证修复**：重新运行架构检查

### 6.2 临时例外

若因紧急需求必须暂时违规，必须按技术债务标记：

```typescript
// TODO-DEBT [L2] [日期:2026-03-17] [作者:AI] [原因:紧急修复]
// 问题：core 层临时依赖 CLI logger
// 风险：破坏分层架构，难以单元测试
// 偿还计划：提取 Logger 接口，通过依赖注入传递
import { runtimeLogger } from '../cli/runtime-logger';
```

## 7. 最佳实践

### 7.1 依赖注入模式

```typescript
// 推荐：工厂函数模式
export function createAnalyzer(deps: Partial<AnalyzerDeps> = {}) {
  return new Analyzer({
    parser: deps.parser ?? new SmartParser(),
    generator: deps.generator ?? new AIGenerator(),
  });
}

// 使用
const analyzer = createAnalyzer(); // 生产环境
const testAnalyzer = createAnalyzer({ parser: mockParser }); // 测试环境
```

### 7.2 接口定义位置

- 接口定义在**被依赖方**（通常是低层模块）
- 或定义在独立的 `types/` 或 `interfaces/` 目录

```typescript
// src/parser/interfaces/IParser.ts
export interface IParser {
  parse(files: string[]): Promise<AST>;
}

// src/parser/implementations/smart-parser.ts
import type { IParser } from '../interfaces/IParser';
export class SmartParser implements IParser { ... }

// src/core/analyzer.ts
import type { IParser } from '../parser/interfaces/IParser';
export class Analyzer {
  constructor(private parser: IParser) {}
}
```

## 8. 验证清单

修改架构相关代码前，检查：

- [ ] 新模块的依赖方向是否符合分层规则
- [ ] 是否使用了依赖注入而非直接实例化
- [ ] 接口定义是否在合适的位置
- [ ] 是否可以通过 `check:architecture` 验证

## 9. 相关文档

- `ARCHITECTURE.md` - 系统总图与模块边界
- `docs/rules/engineering-with-codex-openai.md` - 工程规则与 CI 护栏
- `docs/rules/code-quality-redlines.md` - 代码质量红线
