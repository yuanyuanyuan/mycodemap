# Phase 63: Graph Schema Foundation - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 12
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/infrastructure/storage/sqlite/schema.ts` | config | CRUD | `src/infrastructure/storage/sqlite/schema.ts` | exact |
| `src/infrastructure/storage/sqlite/graph-projection.ts` (new, likely) | utility | transform | `src/infrastructure/storage/sqlite/schema.ts` | role-match |
| `src/infrastructure/storage/adapters/SQLiteStorage.ts` | service | CRUD | `src/infrastructure/storage/adapters/SQLiteStorage.ts` | exact |
| `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts` | service | request-response | `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts` | exact |
| `src/interface/types/index.ts` | model | transform | `src/interface/types/index.ts` | exact |
| `src/domain/entities/Dependency.ts` | model | transform | `src/domain/entities/Dependency.ts` | exact |
| `src/interface/types/storage.ts` | interface | request-response | `src/interface/types/storage.ts` | exact |
| `src/cli/commands/generate.ts` | handler | batch | `src/cli/commands/generate.ts` | exact |
| `src/server/handlers/QueryHandler.ts` | handler | request-response | `src/server/handlers/QueryHandler.ts` | exact |
| `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | test | CRUD | `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | exact |
| `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` | test | request-response | `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` | exact |
| `src/server/handlers/__tests__/QueryHandler.test.ts` | test | request-response | `src/server/handlers/__tests__/QueryHandler.test.ts` | exact |

## Pattern Assignments

### `src/infrastructure/storage/sqlite/schema.ts` (config, CRUD)

**Analog:** `src/infrastructure/storage/sqlite/schema.ts`

**Imports / constant pattern** (`src/infrastructure/storage/sqlite/schema.ts:7-15`):
```ts
export const CURRENT_SQLITE_SCHEMA_VERSION = 'governance-v3';

export const SQLITE_SCHEMA_VERSION_UPSERT_SQL = `
  INSERT INTO metadata (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;
```

**Schema block pattern** (`src/infrastructure/storage/sqlite/schema.ts:21-64`):
```ts
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  language TEXT NOT NULL,
  lines INTEGER NOT NULL,
  code_lines INTEGER NOT NULL,
  comment_lines INTEGER NOT NULL,
  blank_lines INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  file_path TEXT,
  line INTEGER,
  confidence TEXT
);
```

**Index pattern** (`src/infrastructure/storage/sqlite/schema.ts:95-113`):
```ts
CREATE INDEX IF NOT EXISTS idx_dependencies_source
  ON dependencies (source_id, dependency_type);
CREATE INDEX IF NOT EXISTS idx_dependencies_target
  ON dependencies (target_id, dependency_type);
```

**Apply to Phase 63:** 新增 traversal projection table / view / index 时，继续集中在这个 schema 常量文件定义，不要把 DDL 分散进 adapter。

---

### `src/infrastructure/storage/sqlite/graph-projection.ts` (new, likely; utility, transform)

**Analog:** `src/infrastructure/storage/sqlite/schema.ts`

**Why this analog:** 新文件大概率承载派生 projection SQL、row mapper 或 rebuild helper；当前仓库最接近的“集中声明 SQLite 持久化结构”的模式就在 `schema.ts`。

**Suggested copy points**

**SQL 常量组织方式** (`src/infrastructure/storage/sqlite/schema.ts:7-15`)
```ts
export const CURRENT_SQLITE_SCHEMA_VERSION = 'governance-v3';
export const SQLITE_SCHEMA_VERSION_UPSERT_SQL = `...`;
```

**单文件集中定义一组 related DDL** (`src/infrastructure/storage/sqlite/schema.ts:15-113`)
```ts
export const SQLITE_GOVERNANCE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS ...
  CREATE INDEX IF NOT EXISTS ...
`;
```

**Apply to Phase 63:** 如果 planner 决定把 graph edge projection 拆成新文件，优先沿用 “export const SQL_STRING = \`...\`” 这种常量风格；由 `SQLiteStorage` 负责执行，不要在 helper 里自行持有 DB 生命周期。

---

### `src/infrastructure/storage/adapters/SQLiteStorage.ts` (service, CRUD)

**Analog:** `src/infrastructure/storage/adapters/SQLiteStorage.ts`

**Imports pattern** (`src/infrastructure/storage/adapters/SQLiteStorage.ts:7-18`, `:32-58`, `:100-104`):
```ts
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  StorageConfig,
  Cycle,
  GraphMetadata,
  ImpactResult,
  ProjectStatistics,
  SymbolImpactResult,
} from '../../../interface/types/storage.js';
import type {
  CodeGraph,
  Module,
  Symbol,
  Dependency,
} from '../../../interface/types/index.js';
import { StorageBase, StorageError } from '../interfaces/StorageBase.js';
import {
  CURRENT_SQLITE_SCHEMA_VERSION,
  SQLITE_GOVERNANCE_SCHEMA_SQL,
  SQLITE_SCHEMA_VERSION_UPSERT_SQL,
} from '../sqlite/schema.js';
import {
  GovernanceGraphCache,
  readGovernanceGraphFromSQLite,
} from '../sqlite/GovernanceGraphCache.js';
```

**Initialize + schema versioning pattern** (`src/infrastructure/storage/adapters/SQLiteStorage.ts:336-369`):
```ts
protected async doInitialize(): Promise<void> {
  if (!this.projectPath) {
    throw new StorageError('Project path not set', 'PROJECT_PATH_NOT_SET');
  }

  try {
    const databasePath = this.storageConfig.databasePath
      ? join(this.projectPath, this.storageConfig.databasePath)
      : join(this.projectPath, '.codemap', 'governance.sqlite');

    await mkdir(dirname(databasePath), { recursive: true });

    const Database = await loadSQLiteModule();
    this.database = new Database(databasePath);
    this.database.pragma?.('journal_mode = WAL');
    this.database.pragma?.('foreign_keys = ON');
    this.database.exec(SQLITE_GOVERNANCE_SCHEMA_SQL);
    this.ensureSchemaColumns(this.database);
    this.database
      .prepare(SQLITE_SCHEMA_VERSION_UPSERT_SQL)
      .run('schema_version', CURRENT_SQLITE_SCHEMA_VERSION);

    this.backfillLegacySnapshotIfNeeded(this.database);
    this.refreshGovernanceGraphCache(this.database);
  } catch (error) {
    throw new StorageError(
      'Failed to initialize SQLite storage',
      'SQLITE_INIT_FAILED',
      error
    );
  }
}
```

**Query path + cache fallback pattern** (`src/infrastructure/storage/adapters/SQLiteStorage.ts:469-555`):
```ts
async findDependencies(moduleId: string): Promise<Dependency[]> {
  const cachedDependencies = this.governanceGraphCache?.findDependencies(moduleId);
  if (cachedDependencies) {
    return cachedDependencies;
  }

  const rows = this.getDatabase()
    .prepare(`
      SELECT id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
      FROM dependencies
      WHERE source_id = ?
      ORDER BY id
    `)
    .all(moduleId);

  return rows.map(row => this.mapDependencyRow(row));
}
```

**Whole-graph replace write pattern** (`src/infrastructure/storage/adapters/SQLiteStorage.ts:951-1146`):
```ts
private replaceCurrentGraph(
  database: SQLiteDatabaseLike,
  graph: CodeGraph,
  historySource: string,
  recordedAt: string = new Date().toISOString()
): void {
  const normalizedGraph = this.normalizeGraph(graph);
  const symbolIds = new Set(normalizedGraph.symbols.map(symbol => symbol.id));
  const upsertMetadata = database.prepare(SQLITE_SCHEMA_VERSION_UPSERT_SQL);
  const insertDependency = database.prepare(`
    INSERT INTO dependencies (
      id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  this.runInTransaction(database, () => {
    database.prepare('DELETE FROM dependencies').run();
    database.prepare('DELETE FROM symbols').run();
    database.prepare('DELETE FROM modules').run();
    database.prepare('DELETE FROM projects').run();
    database.prepare('DELETE FROM snapshots').run();

    for (const dependency of normalizedGraph.dependencies) {
      const sourceEntityType = resolveEntityType(dependency.sourceEntityType, dependency.sourceId, symbolIds);
      const targetEntityType = resolveEntityType(dependency.targetEntityType, dependency.targetId, symbolIds);
      insertDependency.run(
        dependency.id,
        dependency.sourceId,
        sourceEntityType,
        dependency.targetId,
        targetEntityType,
        dependency.type,
        dependency.filePath ?? null,
        dependency.line ?? null,
        dependency.confidence ?? null
      );
    }

    upsertMetadata.run(GRAPH_STATUS_METADATA_KEY, normalizedGraph.graphStatus ?? 'complete');
  });

  this.refreshGovernanceGraphCache(database);
}
```

**Column/backfill compatibility pattern** (`src/infrastructure/storage/adapters/SQLiteStorage.ts:913-949`):
```ts
private ensureSchemaColumns(database: SQLiteDatabaseLike): void {
  addColumnIfMissing(database, 'symbols', 'signature', 'signature TEXT');
  addColumnIfMissing(database, 'dependencies', 'file_path', 'file_path TEXT');
  addColumnIfMissing(database, 'dependencies', 'line', 'line INTEGER');
  addColumnIfMissing(database, 'dependencies', 'confidence', 'confidence TEXT');
}

private backfillLegacySnapshotIfNeeded(database: SQLiteDatabaseLike): void {
  const hasCurrentProject = toNumberValue(
    database.prepare('SELECT COUNT(*) AS count FROM projects').get()?.count
  ) > 0;
  if (hasCurrentProject) {
    return;
  }
  ...
  this.replaceCurrentGraph(database, graph, 'legacy-snapshot-backfill', recordedAt);
}
```

**Read / mapper pattern** (`src/infrastructure/storage/adapters/SQLiteStorage.ts:1174-1275`):
```ts
private readCodeGraph(database: SQLiteDatabaseLike): CodeGraph {
  ...
  const dependencies = database
    .prepare(`
      SELECT id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
      FROM dependencies
      ORDER BY id
    `)
    .all()
    .map(row => this.mapDependencyRow(row));
  ...
}

private mapDependencyRow(row: Record<string, unknown>): Dependency {
  return {
    id: toStringValue(row.id),
    sourceId: toStringValue(row.source_id),
    sourceEntityType: toStringValue(row.source_entity_type, 'module') as Dependency['sourceEntityType'],
    targetId: toStringValue(row.target_id),
    targetEntityType: toStringValue(row.target_entity_type, 'module') as Dependency['targetEntityType'],
    type: toStringValue(row.dependency_type) as Dependency['type'],
    filePath: toStringValue(row.file_path) || undefined,
    line: toOptionalNumberValue(row.line),
    confidence: toStringValue(row.confidence) === '' ? undefined : toStringValue(row.confidence) as Dependency['confidence'],
  };
}
```

**Apply to Phase 63:** projection rebuild、confidence 三态持久化、schema mismatch remediation、projection refresh 都应该继续落在这个 adapter 内，用 `StorageError` 和 transaction 模式包住。

---

### `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts` (service, request-response)

**Analog:** `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts`

**Imports + DB-like abstraction** (`src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:4-35`):
```ts
import type {
  Cycle,
  ImpactResult,
} from '../../../interface/types/storage.js';
import type {
  CodeGraph,
  Dependency,
  Module,
} from '../../../interface/types/index.js';
...
export interface GovernanceGraphDatabaseLike {
  prepare: (sql: string) => GovernanceGraphStatementLike;
}
```

**SQLite read-model hydration pattern** (`src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:107-178`):
```ts
export function readGovernanceGraphFromSQLite(
  database: GovernanceGraphDatabaseLike,
  projectPath: string
): CodeGraph {
  ...
  const dependencies = database
    .prepare(`
      SELECT id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
      FROM dependencies
      ORDER BY id
    `)
    .all()
    .map((row): Dependency => ({
      id: toStringValue(row.id),
      sourceId: toStringValue(row.source_id),
      ...
      confidence: toStringValue(row.confidence) === '' ? undefined : toStringValue(row.confidence) as Dependency['confidence'],
    }));
  ...
}
```

**Threshold-gated cache mode pattern** (`src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:212-286`):
```ts
hydrate(): void {
  const rssBefore = process.memoryUsage().rss;
  const startedAt = performance.now();

  try {
    const { moduleCount, dependencyCount } = readGovernanceGraphCounts(this.database);
    if (moduleCount > this.thresholds.maxFiles) {
      this.graph = null;
      this.stats = createGovernanceGraphRuntimeStats({
        cacheMode: 'sqlite-direct',
        ...
        warning: `governance graph cache disabled: module count ${moduleCount} exceeds maxFiles=${this.thresholds.maxFiles}`,
      });
      return;
    }

    const graph = readGovernanceGraphFromSQLite(this.database, this.projectPath);
    ...
    this.graph = graph;
    this.stats = createGovernanceGraphRuntimeStats({
      cacheMode: 'memory-eager',
      ...
    });
  } catch (error) {
    this.graph = null;
    this.stats = createGovernanceGraphRuntimeStats({
      cacheMode: 'sqlite-direct',
      warning: `governance graph cache disabled: ${warning}`,
    });
  }
}
```

**Read-through API pattern** (`src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:293-323`):
```ts
findDependencies(moduleId: string): Dependency[] | null {
  if (!this.graph) {
    return null;
  }
  return findDependenciesInGraph(this.graph, moduleId);
}
```

**Apply to Phase 63:** 如果 graph projection 需要额外 cache/read-model，继续走 “SQLite truth -> hydrate read model -> threshold gate -> sqlite-direct fallback” 这条线，不要把 cache 变成第二真相源。

---

### `src/interface/types/index.ts` (model, transform)

**Analog:** `src/interface/types/index.ts`

**Dependency interface pattern** (`src/interface/types/index.ts:624-645`):
```ts
export interface Dependency {
  id: string;
  sourceId: string;
  targetId: string;
  sourceEntityType?: 'module' | 'symbol';
  targetEntityType?: 'module' | 'symbol';
  type: 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';
  confidence?: 'high' | 'ambiguous';
  filePath?: string;
  line?: number;
}

export interface CodeGraph {
  project: Project;
  modules: Module[];
  symbols: Symbol[];
  dependencies: Dependency[];
  graphStatus?: GraphStatus;
  failedFileCount?: number;
  parseFailureFiles?: string[];
}
```

**Apply to Phase 63:** confidence 三态先从这里扩成共享接口枚举，再向 domain / generate / storage 传播；不要只改 storage row。

---

### `src/domain/entities/Dependency.ts` (model, transform)

**Analog:** `src/domain/entities/Dependency.ts`

**Type alias pattern** (`src/domain/entities/Dependency.ts:12-15`):
```ts
export type DependencyType = 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';
export type DependencyEntityType = 'module' | 'symbol';
export type DependencyConfidence = 'high' | 'ambiguous';
```

**Constructor + interface bridge pattern** (`src/domain/entities/Dependency.ts:24-90`):
```ts
export class Dependency implements DependencyInterface {
  ...
  constructor(
    id: string,
    sourceId: string,
    targetId: string,
    type: DependencyType = 'import',
    sourceEntityType: DependencyEntityType = 'module',
    targetEntityType: DependencyEntityType = 'module',
    confidence?: DependencyConfidence,
    filePath?: string,
    line?: number
  ) {
    ...
    this.validate();
  }

  static fromInterface(data: DependencyInterface): Dependency {
    return new Dependency(
      data.id,
      data.sourceId,
      data.targetId,
      data.type,
      data.sourceEntityType ?? 'module',
      data.targetEntityType ?? 'module',
      data.confidence,
      data.filePath,
      data.line
    );
  }
}
```

**Clone/reverse preservation pattern** (`src/domain/entities/Dependency.ts:166-194`):
```ts
createReverse(newId: string): Dependency {
  return new Dependency(
    newId,
    this.targetId,
    this.sourceId,
    this.type,
    this.targetEntityType,
    this.sourceEntityType,
    this.confidence,
    this.filePath,
    this.line
  );
}
```

**Apply to Phase 63:** `EXTRACTED | INFERRED | AMBIGUOUS` 要在这里同步替换，保证 `fromInterface()/toInterface()/snapshot()/createReverse()` 全链路保留 confidence。

---

### `src/interface/types/storage.ts` (interface, request-response)

**Analog:** `src/interface/types/storage.ts`

**Storage contract pattern** (`src/interface/types/storage.ts:56-64`, `:121-187`):
```ts
export interface GraphMetadata {
  generatedAt: string | null;
  graphStatus: 'complete' | 'partial';
  failedFileCount: number;
  parseFailureFiles: string[];
  moduleCount: number;
  symbolCount: number;
}

export interface IStorage {
  readonly type: StorageType | DeprecatedStorageType;
  initialize(projectPath: string): Promise<void>;
  close(): Promise<void>;
  saveCodeGraph(graph: CodeGraph): Promise<void>;
  loadCodeGraph(): Promise<CodeGraph>;
  loadGraphMetadata(): Promise<GraphMetadata>;
  findDependencies(moduleId: string): Promise<Dependency[]>;
  findDependents(moduleId: string): Promise<Dependency[]>;
  calculateImpact(moduleId: string, depth: number): Promise<ImpactResult>;
  calculateSymbolImpact(symbolId: string, depth: number, limit: number): Promise<SymbolImpactResult>;
}
```

**Apply to Phase 63:** 若 handler 需要 projection-backed 读取或新的 metadata diagnostics，这里是 shared contract 的落点；优先扩 metadata/contract，不要让 handler 直接摸内部表结构。

---

### `src/cli/commands/generate.ts` (handler, batch)

**Analog:** `src/cli/commands/generate.ts`

**Save path seam pattern** (`src/cli/commands/generate.ts:383-398`):
```ts
const storage = await storageFactory.createForProject(
  process.cwd(),
  storageConfig
);

try {
  const codeGraph = convertToCodeGraph(codeMap, { symbolLevel });
  const repository = new CodeGraphRepositoryImpl(storage);
  await repository.save(codeGraph);

  return {
    storageType: storage.type,
  };
} finally {
  await storage.close();
}
```

**Primary truth conversion pattern** (`src/cli/commands/generate.ts:404-550`):
```ts
function convertToCodeGraph(codeMap: { ... }, options: { symbolLevel: boolean }): CodeGraph {
  const project = new Project(
    createGeneratedId('proj'),
    codeMap.project.name,
    codeMap.project.rootDir
  );

  const codeGraph = new CodeGraph(project);
  codeGraph.graphStatus = codeMap.graphStatus ?? 'complete';
  codeGraph.failedFileCount = codeMap.failedFileCount ?? 0;
  codeGraph.parseFailureFiles = [...(codeMap.parseFailureFiles ?? [])];
  ...
}
```

**Dependency production pattern** (`src/cli/commands/generate.ts:481-545`):
```ts
for (const depPath of mod.dependencies) {
  const targetId = moduleIdMap.get(depPath);
  if (!targetId) continue;

  const dependency = new Dependency(
    createGeneratedId('dep'),
    sourceId,
    targetId,
    'import'
  );
  ...
}

codeGraph.addDependency(new Dependency(
  createGeneratedId('dep'),
  sourceEntry.id,
  targetEntry.id,
  'call',
  'symbol',
  'symbol',
  'high',
  mod.path,
  call.line
));
```

**Apply to Phase 63:** `generate` 的变化应继续只落在 `convertToCodeGraph()` 这一处，把 module-import、symbol-call、ambiguous/inferred 统一映射成 `Dependency` 实体；外围 CLI envelope 不要一起抖动。

---

### `src/server/handlers/QueryHandler.ts` (handler, request-response)

**Analog:** `src/server/handlers/QueryHandler.ts`

**Constructor + storage-driven handler pattern** (`src/server/handlers/QueryHandler.ts:29-30`):
```ts
export class QueryHandler {
  constructor(private storage: IStorage) {}
}
```

**Compatibility read pattern** (`src/server/handlers/QueryHandler.ts:81-116`):
```ts
async getModuleDetail(moduleId: string): Promise<ModuleDetailResponse | null> {
  const module = await this.storage.findModuleById(moduleId);
  if (!module) return null;

  const dependencies = await this.storage.findDependencies(moduleId);
  const dependents = await this.storage.findDependents(moduleId);

  const graph = await this.storage.loadCodeGraph();
  const symbols = graph.symbols
    .filter(s => s.moduleId === moduleId)
    .map(s => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      visibility: s.visibility,
    }));
  ...
}
```

**Impact compatibility pattern** (`src/server/handlers/QueryHandler.ts:143-185`):
```ts
async analyzeImpact(request: ImpactAnalysisRequest): Promise<ImpactAnalysisResponse> {
  const depth = request.depth ?? Infinity;
  const result = await this.storage.calculateImpact(request.moduleId, depth);

  const graph = await this.storage.loadCodeGraph();
  ...
  for (const dep of graph.dependencies) {
    if (dep.targetId === id && !visited.has(dep.sourceId)) {
      queue.push({ id: dep.sourceId, level: level + 1 });
    }
  }

  return {
    rootModule: result.rootModule,
    affectedModules: affectedWithDepth,
    totalAffected: affectedWithDepth.length,
    maxDepth: Math.max(...affectedWithDepth.map(m => m.depth), 0),
  };
}
```

**Visualization compatibility pattern** (`src/server/handlers/QueryHandler.ts:229-245`):
```ts
async getDependencyGraph(params: PaginationParams = {}): Promise<DependencyGraphResponse> {
  const graph = await this.storage.loadCodeGraph();

  const nodes = graph.modules.map(module => ({
    id: module.id,
    label: module.path.split('/').pop() ?? module.path,
    type: 'module' as const,
    category: this.categorizeModule(module.path),
  }));

  const edges = graph.dependencies.map(dep => ({
    from: dep.sourceId,
    to: dep.targetId,
    type: dep.type,
  }));
}
```

**Apply to Phase 63:** 兼容层现在依赖 `IStorage` 而不是 SQL 细节；如果要消费 confidence 或 projection，优先新增/替换 storage 方法，再让 handler 继续做 response assembly。

---

### `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` (test, CRUD)

**Analog:** `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`

**真实 SQLite fixture pattern** (`src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:9-27`, `:30-107`):
```ts
function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-sqlite-storage-'));
}

async function createSQLiteInspector(rootDir: string, databasePath = '.codemap/governance.sqlite') {
  const sqliteModule = await import('better-sqlite3');
  mkdirSync(path.dirname(getDatabaseFilePath(rootDir, databasePath)), { recursive: true });
  return new sqliteModule.default(getDatabaseFilePath(rootDir, databasePath));
}
```

**Round-trip + row inspection pattern** (`src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:122-156`):
```ts
await storage.initialize(rootDir);
await storage.saveCodeGraph(createGraphFixture());

const loadedGraph = await storage.loadCodeGraph();
expect(loadedGraph.modules).toHaveLength(2);
...
expect(inspector.prepare('SELECT confidence FROM dependencies WHERE id = ?').get('dep-3')?.confidence)
  .toBe('high');
expect(inspector.prepare('SELECT snapshot_source FROM history_snapshots LIMIT 1').get()?.snapshot_source)
  .toBe('save-code-graph');
```

**Behavioral helper pattern** (`src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:161-227`):
```ts
expect(await storage.findDependencies('sym-a')).toEqual([
  expect.objectContaining({
    id: 'dep-3',
    sourceEntityType: 'symbol',
    targetEntityType: 'symbol',
    confidence: 'high',
    filePath: 'src/a.ts',
    line: 1,
  }),
]);
expect(await storage.loadGraphMetadata()).toEqual(expect.objectContaining({
  generatedAt: expect.any(String),
  graphStatus: 'partial',
  failedFileCount: 1,
  parseFailureFiles: ['src/missing.ts'],
}));
```

**Failure/compat path pattern** (`src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:229-279`):
```ts
legacyDatabase.prepare(`
  INSERT INTO metadata (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`).run('schema_version', 'bootstrap-v1');
...
expect(inspector.prepare('SELECT snapshot_source FROM history_snapshots LIMIT 1').get()?.snapshot_source)
  .toBe('legacy-snapshot-backfill');
```

**Apply to Phase 63:** 新 schema/projection 测试继续用真实临时目录 + 真实 SQLite 文件 + SQL inspect；必须补至少一个 schema compatibility / rebuild-required 失败场景。

---

### `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` (test, request-response)

**Analog:** `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts`

**Cache mode parity pattern** (`src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts:67-83`, `:86-129`):
```ts
const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });
await storage.initialize(rootDir);
await storage.saveCodeGraph(createGovernanceGraphFixture());

const stats = storage.getGovernanceGraphRuntimeStats();
expect(stats.cacheMode).toBe('memory-eager');
...
expect(await eagerStorage.findDependencies('mod-1')).toEqual(
  await directStorage.findDependencies('mod-1')
);
expect(await eagerStorage.calculateImpact('mod-3', 3)).toEqual(
  await directStorage.calculateImpact('mod-3', 3)
);
```

**Threshold fallback pattern** (`src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts:135-149`):
```ts
const oversizedGraph = createGovernanceGraphFixture(10_001);
await storage.saveCodeGraph(oversizedGraph);

const stats = storage.getGovernanceGraphRuntimeStats();
expect(stats.cacheMode).toBe('sqlite-direct');
expect(stats.moduleCount).toBe(10_001);
expect(stats.warning).toContain('maxFiles=10000');
```

**Apply to Phase 63:** projection cache / traversal cache 如果新增，必须延续 “memory-eager vs sqlite-direct parity” 的双模式断言。

---

### `src/server/handlers/__tests__/QueryHandler.test.ts` (test, request-response)

**Analog:** `src/server/handlers/__tests__/QueryHandler.test.ts`

**Handler parity pattern** (`src/server/handlers/__tests__/QueryHandler.test.ts:65-109`):
```ts
const eagerHandler = new QueryHandler(eagerStorage);
const directHandler = new QueryHandler(directStorage);
const eagerResult = await eagerHandler.analyzeImpact({ moduleId: 'leaf', depth: 3 });
const directResult = await directHandler.analyzeImpact({ moduleId: 'leaf', depth: 3 });

expect(eagerStorage.getGovernanceGraphRuntimeStats().cacheMode).toBe('memory-eager');
expect(directStorage.getGovernanceGraphRuntimeStats().cacheMode).toBe('sqlite-direct');
expect(eagerResult).toEqual(directResult);
```

**Apply to Phase 63:** handler compatibility 测试优先验证“新 schema / projection 不改变成功 envelope”，尤其是 `module detail`、`impact`、`dependency graph` 这些仍在消费 `IStorage` 的路径。

---

### `src/cli/commands/__tests__/generate.test.ts` (test, batch)

**Analog:** `src/cli/commands/__tests__/generate.test.ts`

**Storage mock seam pattern** (`src/cli/commands/__tests__/generate.test.ts:39-42`, `:58-62`, `:128-141`):
```ts
const mockCreateForProject = vi.fn();
const mockStorageSaveCodeGraph = vi.fn();
const mockStorageClose = vi.fn();

vi.mock('../../../infrastructure/storage/StorageFactory.js', () => ({
  storageFactory: {
    createForProject: (...args: unknown[]) => mockCreateForProject(...args),
  },
}));

mockCreateForProject.mockResolvedValue({
  type: 'sqlite',
  saveCodeGraph: mockStorageSaveCodeGraph,
  close: mockStorageClose,
});
```

**Generate-path contract pattern** (`src/cli/commands/__tests__/generate.test.ts:214-241`):
```ts
await generateCommand({});

expect(mockCreateForProject).toHaveBeenCalledWith(process.cwd(), {
  type: 'sqlite',
  databasePath: '.mycodemap/governance.sqlite',
});
expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('治理图存储 (sqlite)'));
```

**Apply to Phase 63:** `generate` 的单元测试继续验证 storage handoff、config wiring 和 remediation 文案；真正的 schema semantics 放到 SQLite integration tests 验证。

## Shared Patterns

### SQLite-only backend boundary
**Source:** `src/infrastructure/storage/StorageFactory.ts:31-46`, `:66-99`
**Apply to:** `generate` path, any new storage helper, compatibility diagnostics
```ts
switch (storageType) {
  case 'memory':
    return new MemoryStorage();
  case 'sqlite':
    return new SQLiteStorage(config);
  default:
    throw new StorageError(
      `Unknown storage type: ${String(storageType)}`,
      'UNKNOWN_STORAGE_TYPE'
    );
}
...
throw new StorageError(
  `${type} backend is no longer supported. ` +
  'Use storage.type="sqlite" or storage.type="auto" for persistent storage, ' +
  'or storage.type="memory" only for tests and ephemeral runs.' +
  legacyPathHint,
  'UNSUPPORTED_STORAGE_TYPE'
);
```

### Narrow repository seam
**Source:** `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:26-35`, `:41-63`
**Apply to:** keep domain truth stable while evolving storage internals
```ts
async save(graph: CodeGraph): Promise<void> {
  try {
    await this.storage.saveCodeGraph(graph.toInterface());
  } catch (error) {
    throw new RepositoryError(
      'Failed to save code graph',
      'SAVE_FAILED',
      error
    );
  }
}
```

### Stable primary truth shape
**Source:** `src/domain/entities/CodeGraph.ts:22-27`, `:52-77`
**Apply to:** all Phase 63 storage changes
```ts
export class CodeGraph implements CodeGraphInterface {
  project: Project;
  modules: Module[];
  symbols: Symbol[];
  dependencies: Dependency[];
  graphStatus?: CodeGraphInterface['graphStatus'];
  failedFileCount?: number;
  parseFailureFiles?: string[];
}
...
dependencies: this.dependencies.map(d => d.toInterface()),
```

### Real filesystem + real SQLite verification
**Source:** `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:122-156`
**Apply to:** schema upgrade, projection rebuild, confidence enum round-trip
```ts
await storage.initialize(rootDir);
await storage.saveCodeGraph(createGraphFixture());

const inspector = await createSQLiteInspector(rootDir);
expect(inspector.prepare('SELECT COUNT(*) AS count FROM dependencies').get()?.count).toBe(3);
```

### Compatibility through `IStorage`, not raw SQL in handlers
**Source:** `src/server/handlers/QueryHandler.ts:82-90`, `:145-147`
**Apply to:** handler/MCP compatibility work
```ts
const dependencies = await this.storage.findDependencies(moduleId);
const dependents = await this.storage.findDependents(moduleId);
const graph = await this.storage.loadCodeGraph();
...
const result = await this.storage.calculateImpact(request.moduleId, depth);
```

## No Analog Found

None.  
新建的 traversal projection helper 虽然当前不存在一模一样文件，但 `schema.ts` 已提供足够强的 SQLite SQL 常量组织模式，`GovernanceGraphCache.ts` 已提供足够强的 projection/read-model 消费模式。

## Metadata

**Analog search scope:** `src/infrastructure/storage/**`, `src/interface/types/**`, `src/domain/entities/**`, `src/cli/commands/**`, `src/server/handlers/**`  
**Files scanned:** 15  
**Pattern extraction date:** 2026-05-08
