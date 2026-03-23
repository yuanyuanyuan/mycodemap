# 架构护栏规则

> MVP3 分层架构依赖规则与 Enforcement 策略

## 1. 架构分层原则（MVP3）

**第一性原理**：业务逻辑必须与实现细节解耦，确保可测试性和技术栈可替换性。

CodeMap 采用 **MVP3 分层架构**，各层职责如下：

| 层级 | 目录 | 职责 | 允许依赖 |
|------|------|------|---------|
| **CLI 层** | `src/cli/` | 命令解析、用户交互、平台检查 | Server, Domain (via Interface), Interface |
| **Server 层** | `src/server/` | HTTP API 服务器、路由处理、Handler | Domain (via Interface), Interface |
| **Domain 层** | `src/domain/` | 核心业务逻辑、领域实体、领域服务、领域事件 | Interface |
| **Infrastructure 层** | `src/infrastructure/` | 技术实现：存储、解析器、仓库实现 | Domain (接口实现), Interface |
| **Interface 层** | `src/interface/` | 类型定义、契约接口、配置 | 无（纯契约定义） |

### 分层依赖规则

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  src/cli/ - 命令行接口，注册命令、参数解析、用户交互          │
├─────────────────────────────────────────────────────────────┤
│                      Server Layer                           │
│  src/server/ - HTTP API 服务器，RESTful 端点，Handler 处理    │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                          │
│  src/domain/ - 核心业务逻辑，领域实体与服务                   │
│  - entities/: Project, Module, Symbol, Dependency, CodeGraph │
│  - services/: CodeGraphBuilder                              │
│  - events/: DomainEvent                                     │
│  - repositories/: 仓库接口（仅接口，非实现）                  │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│  src/infrastructure/ - 技术实现细节                          │
│  - storage/: FileSystemStorage, MemoryStorage, KuzuDBStorage, Neo4jStorage
│  - parser/: TypeScriptParser, GoParser, PythonParser, ParserRegistry
│  - repositories/: CodeGraphRepositoryImpl（仓库接口实现）     │
├─────────────────────────────────────────────────────────────┤
│                     Interface Layer                         │
│  src/interface/ - 类型定义与契约，跨层共享的接口              │
│  - types/: 核心类型定义                                     │
│  - config/: 配置接口                                        │
└─────────────────────────────────────────────────────────────┘
```

**依赖方向**（严格自上而下）：
- CLI → Server → Domain → Infrastructure → Interface
- **禁止跨层依赖**（如 Domain 层不得导入 CLI 模块）
- 同层内可以相互依赖

---

## 2. 与旧架构的关系

### 2.1 历史架构（已迁移）

MVP3 之前的旧架构：
```
src/cli/ → src/orchestrator/ → src/core/ → src/parser/
                                    ↓
                              src/generator/
```

### 2.2 迁移映射

| 旧架构 | MVP3 新架构 | 说明 |
|--------|------------|------|
| `src/cli/` | `src/cli/` | 保留，职责不变 |
| `src/orchestrator/` | 功能分散到 Server/CLI | 适配器部分移至 Infrastructure |
| `src/core/` | `src/domain/` | 核心业务逻辑下沉到 Domain 层 |
| `src/parser/` | `src/infrastructure/parser/` | 解析器作为基础设施 |
| `src/generator/` | `src/domain/services/` | 生成逻辑作为领域服务 |
| `src/types/` | `src/interface/` | 类型定义提升为独立层 |
| 新增 | `src/server/` | MVP3 新增 HTTP API 层 |
| 新增 | `src/infrastructure/storage/` | MVP3 新增存储抽象 |
| 新增 | `src/infrastructure/repositories/` | MVP3 新增仓库实现 |

---

## 3. 依赖流向规则

### 3.1 禁止的依赖方向

```
Domain ←── 禁止 ── CLI 层不得直接依赖 Domain 具体实现（应通过 Interface）
Infrastructure ←── 禁止 ── Domain 层不得依赖 Infrastructure 具体实现
Server ←── 禁止 ── CLI 层不得直接依赖 Server 层（应通过 Interface）
Interface ←── 禁止 ── 任何层不得修改 Interface 层（只读）
```

### 3.2 允许的依赖方向

```
CLI → Server → Domain → Infrastructure → Interface
CLI → Interface
Server → Interface
Domain → Interface
Infrastructure → Interface
```

---

## 4. 依赖注入规范

### 4.1 原则

- 高层模块不应依赖低层模块，两者都应依赖抽象（Interface 层契约）
- 使用构造函数注入或工厂函数注入
- 禁止在模块内部直接 `new` 高阶服务

### 4.2 合规示例

```typescript
// ✅ 合规：通过 Interface 层契约注入
// src/domain/services/CodeGraphBuilder.ts
import type { IStorage } from '../../interface/types/storage';
import type { IParserRegistry } from '../../interface/types/parser';

export interface CodeGraphBuilderDeps {
  storage: IStorage;
  parserRegistry: IParserRegistry;
}

export class CodeGraphBuilder {
  constructor(private deps: CodeGraphBuilderDeps) {}
  
  async build(files: string[]) {
    const parser = this.deps.parserRegistry.getParser('typescript');
    const ast = await parser.parse(files);
    return this.deps.storage.save(ast);
  }
}
```

```typescript
// ❌ 违规：直接实例化 Infrastructure 具体实现
// src/domain/services/CodeGraphBuilder.ts
import { FileSystemStorage } from '../../infrastructure/storage/FileSystemStorage';
import { TypeScriptParser } from '../../infrastructure/parser/implementations/TypeScriptParser';

export class CodeGraphBuilder {
  private storage = new FileSystemStorage(); // 错误！硬编码实现
  private parser = new TypeScriptParser();   // 错误！难以测试和替换
}
```

---

## 5. 文件组织规范

### 5.1 目录结构（MVP3）

```
src/
  cli/                      # CLI 层
    commands/               # 子命令实现
    index.ts               # CLI 入口
  server/                   # Server 层（MVP3 新增）
    CodeMapServer.ts       # HTTP 服务器
    handlers/              # 请求处理器
    routes/                # 路由定义
  domain/                   # Domain 层
    entities/              # 领域实体
      Project.ts
      Module.ts
      Symbol.ts
      Dependency.ts
      CodeGraph.ts
    services/              # 领域服务
      CodeGraphBuilder.ts
    events/                # 领域事件
      DomainEvent.ts
    repositories/          # 仓库接口（仅接口）
      CodeGraphRepository.ts
  infrastructure/           # Infrastructure 层
    storage/               # 存储适配器
      FileSystemStorage.ts
      MemoryStorage.ts
      KuzuDBStorage.ts
      Neo4jStorage.ts
      StorageFactory.ts
    parser/                # 解析器
      interfaces/
      implementations/
      registry/
    repositories/          # 仓库实现
      CodeGraphRepositoryImpl.ts
  interface/                # Interface 层
    types/                 # 类型定义
    config/                # 配置接口
```

### 5.2 文件命名规范

- **实现文件**：`kebab-case.ts`（如 `code-graph-builder.ts`）
- **接口文件**：`I{PascalCase}.ts`（如 `IStorage.ts`）或 `types.ts`
- **测试文件**：`{name}.test.ts` 或 `__tests__/{name}.test.ts`
- **实体文件**：`PascalCase.ts`（如 `CodeGraph.ts`）

---

## 6. Enforcement 策略

### 6.1 自动检测

使用 `dependency-cruiser` 配置架构规则：

```javascript
// .dependency-cruiser.js（待配置）
module.exports = {
  forbidden: [
    {
      name: 'no-domain-in-cli',
      comment: 'CLI 层不得直接依赖 Domain 层（应通过 Interface）',
      severity: 'error',
      from: { path: '^src/cli' },
      to: { path: '^src/domain', pathNot: '^src/domain/[^/]+\.ts$' }
    },
    {
      name: 'no-infrastructure-in-domain',
      comment: 'Domain 层不得依赖 Infrastructure 层',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/infrastructure' }
    },
    {
      name: 'no-server-in-cli',
      comment: 'CLI 层不得依赖 Server 层',
      severity: 'error',
      from: { path: '^src/cli' },
      to: { path: '^src/server' }
    }
  ]
};
```

### 6.2 手动检查

使用 CodeMap CLI 检查模块依赖：

```bash
# 检查某模块的依赖
node dist/cli/index.js deps -m "src/domain/services"

# 检查某文件的影响范围
node dist/cli/index.js impact -f "src/interface/types/index.ts"

# 检查跨层依赖（使用 analyze）
node dist/cli/index.js analyze -i dependency -t src/domain
```

### 6.3 CI 检查

在 CI 中添加架构合规检查：

```yaml
# .github/workflows/ci-gateway.yml
- name: Check architecture compliance
  run: npm run check:architecture
```

---

## 7. 违规处理

### 7.1 发现违规时

1. **暂停任务**：不得继续添加更多代码
2. **评估影响**：使用 `impact` 命令评估影响范围
3. **重构方案**：将直接依赖改为接口注入
4. **验证修复**：重新运行架构检查

### 7.2 临时例外

若因紧急需求必须暂时违规，必须按技术债务标记：

```typescript
// TODO-DEBT [L2] [日期:2026-03-20] [作者:AI] [原因:紧急修复]
// 问题：Domain 层临时依赖 Infrastructure 具体实现
// 风险：破坏分层架构，难以单元测试
// 偿还计划：提取接口，通过依赖注入传递
import { FileSystemStorage } from '../infrastructure/storage/FileSystemStorage';
```

---

## 8. 最佳实践

### 8.1 依赖注入模式

```typescript
// 推荐：工厂函数模式
export function createCodeGraphBuilder(deps: Partial<CodeGraphBuilderDeps> = {}) {
  return new CodeGraphBuilder({
    storage: deps.storage ?? createStorage(),
    parserRegistry: deps.parserRegistry ?? createParserRegistry(),
  });
}

// 使用
const builder = createCodeGraphBuilder(); // 生产环境
const testBuilder = createCodeGraphBuilder({ storage: mockStorage }); // 测试环境
```

### 8.2 接口定义位置

- 接口定义在 **Interface 层**（`src/interface/`）
- 或定义在被依赖方的接口目录

```typescript
// src/interface/types/storage.ts
export interface IStorage {
  save(data: unknown): Promise<void>;
  load(): Promise<unknown>;
}

// src/infrastructure/storage/FileSystemStorage.ts
import type { IStorage } from '../../interface/types/storage';
export class FileSystemStorage implements IStorage { ... }

// src/domain/services/CodeGraphBuilder.ts
import type { IStorage } from '../../interface/types/storage';
export class CodeGraphBuilder {
  constructor(private storage: IStorage) {}
}
```

---

## 9. 验证清单

修改架构相关代码前，检查：

- [ ] 新模块的依赖方向是否符合 MVP3 分层规则
- [ ] 是否使用了依赖注入而非直接实例化
- [ ] 接口定义是否在 Interface 层
- [ ] 是否可以通过 `check:architecture` 验证

---

## 10. 相关文档

- `ARCHITECTURE.md` - 系统总图与模块边界
- `docs/rules/engineering-with-codex-openai.md` - 工程规则与 CI 护栏
- `docs/rules/code-quality-redlines.md` - 代码质量红线
- `docs/exec-plans/MVP3-IMPLEMENTATION-ROADMAP.md` - MVP3 重构路线图
