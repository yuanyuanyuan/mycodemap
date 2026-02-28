# CodeMap 系统性能优化方案

## 概述

本方案旨在将 CodeMap 系统优化为高性能代码分析工具，参考 Repomix (29x 加速)、Tree-sitter (36x 比 regex 快) 等业界最佳实践。

---

## 1. 性能基准定义

### 1.1 测试项目选择

| 规模 | 项目名称 | 代码量 | 文件数 | 用途 |
|------|----------|--------|--------|------|
| **小型** | `lodash-es` | ~10K LOC | 200+ | 快速验证 |
| **中型** | `vuejs/core` | ~50K LOC | 1000+ | 主要基准 |
| **大型** | `facebook/react` | ~100K LOC | 3000+ | 压力测试 |
| **超大型** | `vercel/next.js` | ~500K LOC | 10000+ | 极限测试 |

### 1.2 关键性能指标 (KPI)

```typescript
interface PerformanceMetrics {
  // 时间指标
  totalAnalysisTime: number;      // 总分析时间 (目标: Fast<30s, Smart<2min)
  fileDiscoveryTime: number;      // 文件发现时间
  parsingTime: number;            // 解析时间
  symbolExtractionTime: number;   // 符号提取时间
  relationshipBuildTime: number;  // 关系构建时间
  
  // 内存指标
  peakMemoryUsage: number;        // 峰值内存 (目标: <2GB)
  finalMemoryUsage: number;       // 最终内存占用
  
  // 吞吐量指标
  filesPerSecond: number;         // 每秒处理文件数
  linesPerSecond: number;         // 每秒处理代码行数
  
  // 增量指标
  incrementalUpdateTime: number;  // 增量更新时间 (目标: <5s)
  cacheHitRate: number;           // 缓存命中率
}
```

### 1.3 测量方法

```typescript
// performance-monitor.ts
class PerformanceMonitor {
  private timers: Map<string, number> = new Map();
  private metrics: PerformanceMetrics = {} as PerformanceMetrics;
  
  startTimer(phase: string): void {
    this.timers.set(phase, performance.now());
  }
  
  endTimer(phase: string): number {
    const start = this.timers.get(phase);
    if (!start) return 0;
    const duration = performance.now() - start;
    this.metrics[`${phase}Time`] = duration;
    return duration;
  }
  
  recordMemory(): void {
    if (global.gc) global.gc(); // 强制垃圾回收
    const usage = process.memoryUsage();
    this.metrics.peakMemoryUsage = Math.max(
      this.metrics.peakMemoryUsage || 0,
      usage.heapUsed / 1024 / 1024 // MB
    );
  }
  
  generateReport(): PerformanceReport {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.generateSummary()
    };
  }
}
```

---

## 2. 架构层面优化

### 2.1 并行处理策略

参考 Repomix 的 Worker 线程优化 (29x 加速)：

```typescript
// worker-pool.ts
import { Worker } from 'worker_threads';
import Piscina from 'piscina';

class AnalysisWorkerPool {
  private pool: Piscina;
  
  constructor(options: WorkerPoolOptions) {
    this.pool = new Piscina({
      filename: new URL('./analysis-worker.js', import.meta.url).href,
      minThreads: options.minThreads || 2,
      maxThreads: options.maxThreads || Math.min(
        require('os').cpus().length,
        8  // 限制最大线程数
      ),
      idleTimeout: 60000,  // 空闲超时
      concurrentTasksPerWorker: 2
    });
  }
  
  async analyzeFiles(files: FileInfo[]): Promise<AnalysisResult[]> {
    // 批量提交任务，减少调度开销
    const batchSize = 50;
    const batches = this.chunkArray(files, batchSize);
    
    return Promise.all(
      batches.map(batch => 
        this.pool.run({ files: batch }, { name: 'analyzeBatch' })
      )
    ).then(results => results.flat());
  }
  
  private chunkArray<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) },
      (_, i) => arr.slice(i * size, i * size + size)
    );
  }
}

// analysis-worker.js
const { parentPort } = require('worker_threads');

module.exports = {
  analyzeBatch: async ({ files }) => {
    const results = [];
    for (const file of files) {
      // 使用 Tree-sitter 解析
      const tree = parser.parse(file.content);
      const symbols = extractSymbols(tree);
      results.push({ file: file.path, symbols });
    }
    return results;
  }
};
```

### 2.2 缓存架构设计

多层缓存策略：

```typescript
// cache-manager.ts
interface CacheStrategy {
  // L1: 内存缓存 (最快，但容量有限)
  memoryCache: LRUCache<string, ParsedFile>;
  
  // L2: 文件系统缓存 (持久化)
  fileSystemCache: FileSystemCache;
  
  // L3: 增量缓存 (变更追踪)
  incrementalCache: IncrementalCache;
}

class MultiLayerCache implements CacheStrategy {
  memoryCache = new LRUCache<string, ParsedFile>({
    max: 1000,           // 最多缓存1000个文件
    maxSize: 100 * 1024 * 1024, // 100MB
    sizeCalculation: (value) => JSON.stringify(value).length
  });
  
  fileSystemCache = new FileSystemCache({
    cacheDir: '.codemap/cache',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    compression: true
  });
  
  incrementalCache = new IncrementalCache({
    buildInfoFile: '.codemap/build-info.json'
  });
  
  async get(filePath: string, mtime: number): Promise<ParsedFile | null> {
    const cacheKey = this.generateCacheKey(filePath, mtime);
    
    // L1: 内存缓存
    const memResult = this.memoryCache.get(cacheKey);
    if (memResult) return memResult;
    
    // L2: 文件系统缓存
    const fsResult = await this.fileSystemCache.get(cacheKey);
    if (fsResult) {
      this.memoryCache.set(cacheKey, fsResult);
      return fsResult;
    }
    
    return null;
  }
  
  async set(filePath: string, mtime: number, data: ParsedFile): Promise<void> {
    const cacheKey = this.generateCacheKey(filePath, mtime);
    
    this.memoryCache.set(cacheKey, data);
    await this.fileSystemCache.set(cacheKey, data);
  }
  
  private generateCacheKey(filePath: string, mtime: number): string {
    return `${filePath}:${mtime}`;
  }
}
```

### 2.3 增量更新机制

参考 TypeScript 增量编译：

```typescript
// incremental-analyzer.ts
interface BuildInfo {
  version: string;
  lastBuildTime: number;
  fileInfos: Map<string, FileInfo>;
  dependencyGraph: DependencyGraph;
}

class IncrementalAnalyzer {
  private buildInfo: BuildInfo;
  private dependencyGraph: DependencyGraph;
  
  async analyzeIncremental(
    changedFiles: string[],
    deletedFiles: string[]
  ): Promise<AnalysisResult> {
    // 1. 加载上次构建信息
    await this.loadBuildInfo();
    
    // 2. 识别受影响的文件
    const affectedFiles = this.getAffectedFiles(changedFiles);
    
    // 3. 仅重新分析变更和受影响的文件
    const filesToAnalyze = [...changedFiles, ...affectedFiles];
    
    // 4. 并行分析
    const results = await this.analyzeFilesParallel(filesToAnalyze);
    
    // 5. 更新依赖图
    this.updateDependencyGraph(results);
    
    // 6. 保存构建信息
    await this.saveBuildInfo();
    
    return results;
  }
  
  private getAffectedFiles(changedFiles: string[]): string[] {
    const affected = new Set<string>();
    
    for (const file of changedFiles) {
      // 获取依赖此文件的所有文件
      const dependents = this.dependencyGraph.getDependents(file);
      dependents.forEach(dep => affected.add(dep));
    }
    
    return Array.from(affected);
  }
}
```

---

## 3. 具体优化技巧

### 3.1 文件过滤和优先级

```typescript
// file-filter.ts
interface FilterConfig {
  // 排除模式
  exclude: string[];
  // 包含模式
  include: string[];
  // 优先级规则
  priorityRules: PriorityRule[];
}

class SmartFileFilter {
  private config: FilterConfig = {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/test/**',
      '**/__tests__/**',
      '**/*.spec.ts',
      '**/*.test.ts'
    ],
    include: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ],
    priorityRules: [
      { pattern: '**/index.*', priority: 10 },      // 入口文件优先
      { pattern: '**/types/**', priority: 9 },      // 类型定义优先
      { pattern: '**/core/**', priority: 8 },       // 核心模块优先
      { pattern: '**/utils/**', priority: 5 },      // 工具类次之
      { pattern: '**/*.test.*', priority: 1 }       // 测试文件最低
    ]
  };
  
  filter(files: string[]): FilteredFiles {
    const filtered = files.filter(file => 
      this.shouldInclude(file) && !this.shouldExclude(file)
    );
    
    // 按优先级排序
    const prioritized = filtered.sort((a, b) => 
      this.getPriority(b) - this.getPriority(a)
    );
    
    return {
      core: prioritized.filter(f => this.getPriority(f) >= 8),
      normal: prioritized.filter(f => this.getPriority(f) >= 5 && this.getPriority(f) < 8),
      low: prioritized.filter(f => this.getPriority(f) < 5)
    };
  }
  
  private shouldInclude(file: string): boolean {
    return this.config.include.some(pattern => 
      minimatch(file, pattern)
    );
  }
  
  private shouldExclude(file: string): boolean {
    return this.config.exclude.some(pattern => 
      minimatch(file, pattern)
    );
  }
  
  private getPriority(file: string): number {
    for (const rule of this.config.priorityRules) {
      if (minimatch(file, rule.pattern)) {
        return rule.priority;
      }
    }
    return 5; // 默认优先级
  }
}
```

### 3.2 符号索引策略

```typescript
// symbol-index.ts
interface SymbolIndex {
  // 按类型索引
  byType: Map<SymbolType, Symbol[]>;
  // 按文件索引
  byFile: Map<string, Symbol[]>;
  // 按名称索引 (用于快速查找)
  byName: Map<string, Symbol[]>;
  // 依赖关系索引
  dependencies: Map<string, Set<string>>;
}

class OptimizedSymbolIndex {
  private index: SymbolIndex = {
    byType: new Map(),
    byFile: new Map(),
    byName: new Map(),
    dependencies: new Map()
  };
  
  // 使用布隆过滤器快速判断符号是否存在
  private bloomFilter: BloomFilter;
  
  addSymbol(symbol: Symbol): void {
    // 按类型索引
    const typeList = this.index.byType.get(symbol.type) || [];
    typeList.push(symbol);
    this.index.byType.set(symbol.type, typeList);
    
    // 按文件索引
    const fileList = this.index.byFile.get(symbol.file) || [];
    fileList.push(symbol);
    this.index.byFile.set(symbol.file, fileList);
    
    // 按名称索引 (支持前缀匹配)
    const nameKey = symbol.name.toLowerCase();
    const nameList = this.index.byName.get(nameKey) || [];
    nameList.push(symbol);
    this.index.byName.set(nameKey, nameList);
    
    // 更新布隆过滤器
    this.bloomFilter.add(symbol.name);
  }
  
  // O(1) 符号存在性检查
  mightContain(name: string): boolean {
    return this.bloomFilter.mightContain(name);
  }
  
  // 快速前缀搜索
  findByPrefix(prefix: string): Symbol[] {
    const results: Symbol[] = [];
    const lowerPrefix = prefix.toLowerCase();
    
    // 利用布隆过滤器快速过滤
    for (const [name, symbols] of this.index.byName) {
      if (name.startsWith(lowerPrefix) && this.mightContain(name)) {
        results.push(...symbols);
      }
    }
    
    return results;
  }
}
```

### 3.3 内存管理技巧

```typescript
// memory-manager.ts
class MemoryManager {
  private maxMemoryMB: number = 2048; // 2GB 上限
  private currentMemoryMB: number = 0;
  private objectPool: Map<string, ObjectPool> = new Map();
  
  // 流式处理大文件
  async processLargeFile(filePath: string): Promise<void> {
    const stream = createReadStream(filePath, { 
      encoding: 'utf-8',
      highWaterMark: 64 * 1024 // 64KB 块
    });
    
    let buffer = '';
    for await (const chunk of stream) {
      buffer += chunk;
      
      // 检查内存并触发清理
      if (this.getMemoryUsage() > this.maxMemoryMB * 0.8) {
        await this.forceCleanup();
      }
    }
  }
  
  // 对象池复用
  acquireObject<T>(type: string, factory: () => T): T {
    let pool = this.objectPool.get(type);
    if (!pool) {
      pool = new ObjectPool(factory);
      this.objectPool.set(type, pool);
    }
    return pool.acquire();
  }
  
  releaseObject<T>(type: string, obj: T): void {
    const pool = this.objectPool.get(type);
    if (pool) {
      pool.release(obj);
    }
  }
  
  // 强制垃圾回收
  async forceCleanup(): Promise<void> {
    // 清空 LRU 缓存
    this.clearLRUCache();
    
    // 释放对象池
    for (const pool of this.objectPool.values()) {
      pool.trim();
    }
    
    // 触发 V8 垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    // 等待垃圾回收完成
    await new Promise(resolve => setImmediate(resolve));
  }
  
  private getMemoryUsage(): number {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
}
```

---

## 4. 分层分析策略

### 4.1 Fast 模式 (快速分析)

```typescript
// fast-analyzer.ts
class FastAnalyzer {
  // Fast 模式：牺牲部分准确性换取速度
  async analyze(projectPath: string): Promise<CodeMap> {
    const config: AnalysisConfig = {
      // 使用轻量级解析
      parser: 'lightweight',
      // 禁用深度类型分析
      enableTypeAnalysis: false,
      // 禁用跨文件引用追踪
      enableCrossFileRefs: false,
      // 最大分析深度
      maxDepth: 2,
      // 只分析核心文件
      fileLimit: 500,
      // 超时设置
      timeout: 30000 // 30秒
    };
    
    return this.analyzeWithConfig(projectPath, config);
  }
  
  private async analyzeWithConfig(
    projectPath: string,
    config: AnalysisConfig
  ): Promise<CodeMap> {
    // 1. 快速文件发现 (使用原生 fs，跳过详细过滤)
    const files = await this.fastFileDiscovery(projectPath, config.fileLimit);
    
    // 2. 并行轻量级解析
    const parseResults = await this.parallelParse(files, {
      workers: 4,
      lightweight: true
    });
    
    // 3. 快速符号提取 (只提取关键符号)
    const symbols = this.extractKeySymbols(parseResults);
    
    // 4. 简化关系构建
    const relationships = this.buildSimpleRelationships(symbols);
    
    return {
      symbols,
      relationships,
      metadata: {
        mode: 'fast',
        analyzedFiles: files.length,
        analysisTime: Date.now()
      }
    };
  }
}
```

### 4.2 Smart 模式 (深度分析)

```typescript
// smart-analyzer.ts
class SmartAnalyzer {
  // Smart 模式：完整分析，追求准确性
  async analyze(projectPath: string): Promise<CodeMap> {
    const config: AnalysisConfig = {
      parser: 'tree-sitter',
      enableTypeAnalysis: true,
      enableCrossFileRefs: true,
      maxDepth: Infinity,
      fileLimit: Infinity,
      timeout: 120000 // 2分钟
    };
    
    return this.analyzeWithConfig(projectPath, config);
  }
  
  private async analyzeWithConfig(
    projectPath: string,
    config: AnalysisConfig
  ): Promise<CodeMap> {
    // 1. 完整文件发现
    const files = await this.completeFileDiscovery(projectPath);
    
    // 2. 分层解析策略
    // 先解析核心文件，再解析依赖
    const coreFiles = this.identifyCoreFiles(files);
    const otherFiles = files.filter(f => !coreFiles.includes(f));
    
    // 3. 深度解析核心文件
    const coreResults = await this.deepParse(coreFiles, {
      workers: 4,
      extractTypes: true
    });
    
    // 4. 基于依赖关系解析其他文件
    const dependencyOrder = this.buildDependencyOrder(coreResults);
    const otherResults = await this.parseInOrder(otherFiles, dependencyOrder);
    
    // 5. 完整符号提取
    const symbols = this.extractAllSymbols([...coreResults, ...otherResults]);
    
    // 6. 深度关系分析
    const relationships = await this.buildDeepRelationships(symbols);
    
    // 7. 类型推断和验证
    const typeInfo = await this.analyzeTypes(symbols);
    
    return {
      symbols,
      relationships,
      typeInfo,
      metadata: {
        mode: 'smart',
        analyzedFiles: files.length,
        analysisTime: Date.now()
      }
    };
  }
}
```

### 4.3 自适应模式选择

```typescript
// adaptive-analyzer.ts
class AdaptiveAnalyzer {
  async analyze(projectPath: string): Promise<CodeMap> {
    // 1. 快速评估项目规模
    const projectStats = await this.assessProject(projectPath);
    
    // 2. 根据项目规模选择模式
    const mode = this.selectMode(projectStats);
    
    console.log(`Selected mode: ${mode} for project with ${projectStats.fileCount} files`);
    
    // 3. 执行对应模式的分析
    switch (mode) {
      case 'fast':
        return this.fastAnalyzer.analyze(projectPath);
      case 'smart':
        return this.smartAnalyzer.analyze(projectPath);
      case 'hybrid':
        return this.hybridAnalyze(projectPath, projectStats);
    }
  }
  
  private async assessProject(projectPath: string): Promise<ProjectStats> {
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/dist/**']
    });
    
    const totalLines = await this.countLines(files);
    
    return {
      fileCount: files.length,
      totalLines,
      estimatedComplexity: this.estimateComplexity(files)
    };
  }
  
  private selectMode(stats: ProjectStats): AnalysisMode {
    if (stats.fileCount < 100 && stats.totalLines < 10000) {
      return 'smart'; // 小项目用 Smart 模式
    } else if (stats.fileCount > 1000 || stats.totalLines > 100000) {
      return 'fast';  // 大项目用 Fast 模式
    } else {
      return 'hybrid'; // 中等项目用混合模式
    }
  }
  
  // 混合模式：核心文件深度分析，其他文件快速分析
  private async hybridAnalyze(
    projectPath: string,
    stats: ProjectStats
  ): Promise<CodeMap> {
    const files = await this.completeFileDiscovery(projectPath);
    const { core, normal, low } = this.smartFileFilter.filter(files);
    
    // 核心文件深度分析
    const coreResults = await this.smartAnalyzer.analyzeFiles(core);
    
    // 其他文件快速分析
    const normalResults = await this.fastAnalyzer.analyzeFiles(normal);
    const lowResults = await this.fastAnalyzer.analyzeFiles(low);
    
    // 合并结果
    return this.mergeResults([coreResults, normalResults, lowResults]);
  }
}
```

---

## 5. 性能监控方案

### 5.1 关键路径分析

```typescript
// critical-path-analyzer.ts
class CriticalPathAnalyzer {
  private phases: AnalysisPhase[] = [];
  
  recordPhase(name: string, duration: number, details: any): void {
    this.phases.push({
      name,
      duration,
      timestamp: Date.now(),
      details
    });
  }
  
  analyzeCriticalPath(): CriticalPathReport {
    // 找出耗时最长的阶段
    const sortedPhases = [...this.phases].sort((a, b) => b.duration - a.duration);
    
    // 计算各阶段占比
    const totalTime = this.phases.reduce((sum, p) => sum + p.duration, 0);
    
    const phaseBreakdown = this.phases.map(phase => ({
      name: phase.name,
      duration: phase.duration,
      percentage: (phase.duration / totalTime * 100).toFixed(2) + '%',
      bottleneck: phase.duration > totalTime * 0.3 // 超过30%视为瓶颈
    }));
    
    return {
      totalTime,
      phaseBreakdown,
      topBottlenecks: sortedPhases.slice(0, 3),
      recommendations: this.generateRecommendations(sortedPhases)
    };
  }
  
  private generateRecommendations(bottlenecks: AnalysisPhase[]): string[] {
    const recommendations: string[] = [];
    
    for (const phase of bottlenecks) {
      if (phase.name === 'parsing' && phase.duration > 10000) {
        recommendations.push('考虑使用 Worker 线程并行解析文件');
        recommendations.push('启用增量解析以减少重复工作');
      }
      if (phase.name === 'symbolExtraction' && phase.duration > 5000) {
        recommendations.push('优化符号提取算法，减少 AST 遍历次数');
        recommendations.push('使用缓存避免重复提取');
      }
      if (phase.name === 'relationshipBuild' && phase.duration > 5000) {
        recommendations.push('简化关系图，只保留关键依赖');
        recommendations.push('使用惰性加载延迟非关键关系计算');
      }
    }
    
    return recommendations;
  }
}
```

### 5.2 性能指标收集

```typescript
// metrics-collector.ts
class PerformanceMetricsCollector {
  private metrics: PerformanceMetrics = {
    timeMetrics: {},
    memoryMetrics: {},
    throughputMetrics: {},
    cacheMetrics: {}
  };
  
  private histograms: Map<string, Histogram> = new Map();
  
  // 收集时间指标
  recordTime(phase: string, duration: number): void {
    if (!this.metrics.timeMetrics[phase]) {
      this.metrics.timeMetrics[phase] = {
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
        avg: 0
      };
    }
    
    const metric = this.metrics.timeMetrics[phase];
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
    metric.avg = metric.total / metric.count;
  }
  
  // 收集内存指标
  recordMemory(): void {
    const usage = process.memoryUsage();
    this.metrics.memoryMetrics = {
      rss: usage.rss / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      heapUsed: usage.heapUsed / 1024 / 1024,
      external: usage.external / 1024 / 1024
    };
  }
  
  // 收集吞吐量指标
  recordThroughput(filesProcessed: number, linesProcessed: number, duration: number): void {
    this.metrics.throughputMetrics = {
      filesPerSecond: filesProcessed / (duration / 1000),
      linesPerSecond: linesProcessed / (duration / 1000),
      timestamp: Date.now()
    };
  }
  
  // 收集缓存指标
  recordCacheHit(hit: boolean): void {
    if (!this.metrics.cacheMetrics) {
      this.metrics.cacheMetrics = { hits: 0, misses: 0, hitRate: 0 };
    }
    
    if (hit) {
      this.metrics.cacheMetrics.hits++;
    } else {
      this.metrics.cacheMetrics.misses++;
    }
    
    const total = this.metrics.cacheMetrics.hits + this.metrics.cacheMetrics.misses;
    this.metrics.cacheMetrics.hitRate = this.metrics.cacheMetrics.hits / total;
  }
  
  // 导出 Prometheus 格式
  exportPrometheus(): string {
    const lines: string[] = [];
    
    // 时间指标
    for (const [phase, metric] of Object.entries(this.metrics.timeMetrics)) {
      lines.push(`# HELP codemap_analysis_duration_ms Analysis duration in milliseconds`);
      lines.push(`# TYPE codemap_analysis_duration_ms summary`);
      lines.push(`codemap_analysis_duration_ms{phase="${phase}",quantile="0.5"} ${metric.avg}`);
      lines.push(`codemap_analysis_duration_ms{phase="${phase}",quantile="0.99"} ${metric.max}`);
    }
    
    // 内存指标
    lines.push(`# HELP codemap_memory_usage_mb Memory usage in MB`);
    lines.push(`# TYPE codemap_memory_usage_mb gauge`);
    lines.push(`codemap_memory_usage_mb{type="heapUsed"} ${this.metrics.memoryMetrics.heapUsed}`);
    
    // 缓存命中率
    lines.push(`# HELP codemap_cache_hit_rate Cache hit rate`);
    lines.push(`# TYPE codemap_cache_hit_rate gauge`);
    lines.push(`codemap_cache_hit_rate ${this.metrics.cacheMetrics?.hitRate || 0}`);
    
    return lines.join('\n');
  }
}
```

### 5.3 瓶颈诊断工具

```typescript
// bottleneck-diagnoser.ts
class BottleneckDiagnoser {
  async diagnose(projectPath: string): Promise<DiagnosisReport> {
    const report: DiagnosisReport = {
      timestamp: new Date().toISOString(),
      issues: [],
      suggestions: [],
      performanceProfile: null
    };
    
    // 1. CPU Profiling
    const cpuProfile = await this.profileCPU(projectPath);
    if (cpuProfile.hotFunctions.length > 0) {
      report.issues.push({
        type: 'cpu',
        severity: 'high',
        description: `检测到 ${cpuProfile.hotFunctions.length} 个热点函数`,
        details: cpuProfile.hotFunctions
      });
    }
    
    // 2. 内存 Profiling
    const memoryProfile = await this.profileMemory(projectPath);
    if (memoryProfile.peakHeap > 2048) { // 超过 2GB
      report.issues.push({
        type: 'memory',
        severity: 'critical',
        description: `峰值内存使用 ${memoryProfile.peakHeap.toFixed(2)}MB，超过 2GB 限制`,
        details: memoryProfile
      });
    }
    
    // 3. I/O 分析
    const ioProfile = await this.profileIO(projectPath);
    if (ioProfile.totalReadTime > 10000) { // I/O 超过 10秒
      report.issues.push({
        type: 'io',
        severity: 'medium',
        description: `文件 I/O 耗时 ${ioProfile.totalReadTime.toFixed(2)}ms，建议优化`,
        details: ioProfile
      });
    }
    
    // 4. 生成优化建议
    report.suggestions = this.generateSuggestions(report.issues);
    
    return report;
  }
  
  private async profileCPU(projectPath: string): Promise<CPUProfile> {
    const inspector = require('inspector');
    const session = new inspector.Session();
    session.connect();
    
    return new Promise((resolve, reject) => {
      const profiles: any[] = [];
      
      session.on('Profiler.consoleProfileFinished', (message) => {
        profiles.push(message.params.profile);
      });
      
      session.post('Profiler.enable', () => {
        session.post('Profiler.start', () => {
          // 运行分析
          setTimeout(() => {
            session.post('Profiler.stop', (err, params) => {
              if (err) reject(err);
              else {
                const hotFunctions = params.profile.nodes
                  .sort((a: any, b: any) => b.hitCount - a.hitCount)
                  .slice(0, 10);
                resolve({ hotFunctions });
              }
            });
          }, 5000);
        });
      });
    });
  }
  
  private generateSuggestions(issues: Issue[]): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'cpu':
          suggestions.push({
            priority: 'high',
            action: '启用 Worker 线程并行处理',
            expectedImprovement: '2-5x 速度提升'
          });
          break;
        case 'memory':
          suggestions.push({
            priority: 'critical',
            action: '实现流式处理和对象池',
            expectedImprovement: '内存使用降低 50%+'
          });
          break;
        case 'io':
          suggestions.push({
            priority: 'medium',
            action: '使用缓存和增量读取',
            expectedImprovement: 'I/O 时间减少 70%+'
          });
          break;
      }
    }
    
    return suggestions;
  }
}
```

---

## 6. 预期性能数据

### 6.1 不同规模项目的预期分析时间

基于 Repomix 和 Tree-sitter 的基准数据：

| 项目规模 | 文件数 | 代码行数 | Fast 模式 | Smart 模式 | 增量更新 |
|----------|--------|----------|-----------|------------|----------|
| **小型** | < 200 | < 10K | < 3s | < 10s | < 1s |
| **中型** | 500-1000 | 10K-50K | < 10s | < 30s | < 2s |
| **大型** | 2000-5000 | 50K-200K | < 30s | < 2min | < 5s |
| **超大型** | 5000+ | 200K+ | < 60s | < 5min | < 10s |

### 6.2 内存占用估算

```
内存使用公式:
Base Memory: 200MB (运行时开销)
Per File: 0.5KB (文件元数据) + 2KB (符号索引)
Per 1000 LOC: 100KB (AST 缓存)

示例计算 (中型项目 1000 文件, 50K 行):
Base: 200MB
Files: 1000 * 2.5KB = 2.5MB
AST: 50 * 100KB = 5MB
Total: ~210MB (远低于 2GB 限制)

示例计算 (超大型项目 10000 文件, 500K 行):
Base: 200MB
Files: 10000 * 2.5KB = 25MB
AST: 500 * 100KB = 50MB
Total: ~275MB (使用 LRU 缓存控制)
```

### 6.3 性能对比表

| 优化项 | 优化前 | 优化后 | 提升倍数 |
|--------|--------|--------|----------|
| **Worker 并行** | 单线程 | 多线程 | 4-8x |
| **增量解析** | 全量解析 | 增量更新 | 10-15x |
| **Tree-sitter** | Regex 解析 | Tree-sitter | 36x |
| **多层缓存** | 无缓存 | L1/L2/L3 | 5-10x |
| **文件过滤** | 全量扫描 | 智能过滤 | 2-3x |

### 6.4 参考基准数据

```
Repomix 实际测试结果:
- facebook/react (100K+ LOC): 123s → 4.19s (29x 加速)
- vercel/next.js (500K+ LOC): 17.85min → 17.27s (58x 加速)

Tree-sitter 性能:
- 比 Regex 解析快 36x
- 增量解析额外 15x 提升

TypeScript 编译器:
- 增量编译可减少 80%+ 时间
- 项目引用优化额外 50% 提升
```

---

## 7. 实施路线图

### Phase 1: 基础优化 (1-2 周)
- [ ] 实现 Worker 线程池
- [ ] 添加文件过滤和优先级
- [ ] 基础内存管理

### Phase 2: 缓存系统 (2-3 周)
- [ ] 多层缓存架构
- [ ] 增量更新机制
- [ ] 缓存持久化

### Phase 3: 分析优化 (2-3 周)
- [ ] Fast/Smart 分层模式
- [ ] Tree-sitter 集成
- [ ] 符号索引优化

### Phase 4: 监控完善 (1-2 周)
- [ ] 性能指标收集
- [ ] 瓶颈诊断工具
- [ ] 可视化报告

---

## 8. 总结

本性能优化方案通过以下策略实现目标：

1. **并行处理**: Worker 线程池实现 4-8x 加速
2. **增量更新**: 类似 TypeScript 的增量编译，10-15x 提升
3. **多层缓存**: L1/L2/L3 缓存架构，5-10x 提升
4. **分层分析**: Fast/Smart 模式平衡速度和质量
5. **内存优化**: 流式处理和对象池，控制在 2GB 内

预期最终实现：
- **Fast 模式**: < 30秒 (大型项目)
- **Smart 模式**: < 2分钟 (大型项目)
- **增量更新**: < 5秒
- **内存占用**: < 2GB
