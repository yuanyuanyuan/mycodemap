# CodeMap 性能优化 - 技术实现细节

## 1. Worker 线程池实现

### 1.1 使用 Piscina 的完整实现

```typescript
// src/core/workers/analysis-pool.ts
import Piscina from 'piscina';
import { cpus } from 'os';
import { resolve } from 'path';

export interface WorkerPoolConfig {
  minThreads?: number;
  maxThreads?: number;
  idleTimeout?: number;
  concurrentTasksPerWorker?: number;
}

export class AnalysisWorkerPool {
  private pool: Piscina;
  private taskQueue: Map<string, Promise<any>> = new Map();
  
  constructor(config: WorkerPoolConfig = {}) {
    const cpuCount = cpus().length;
    
    this.pool = new Piscina({
      filename: resolve(__dirname, './analysis-worker.js'),
      minThreads: config.minThreads || Math.max(2, cpuCount / 4),
      maxThreads: config.maxThreads || Math.min(cpuCount, 8),
      idleTimeout: config.idleTimeout || 60000,
      concurrentTasksPerWorker: config.concurrentTasksPerWorker || 2,
      // 使用 Atomics 进行高效线程同步
      useAtomics: true
    });
  }
  
  async analyzeFile(filePath: string, content: string): Promise<AnalysisResult> {
    const cacheKey = `${filePath}:${content.length}`;
    
    // 检查是否有正在进行的相同任务
    if (this.taskQueue.has(cacheKey)) {
      return this.taskQueue.get(cacheKey)!;
    }
    
    const task = this.pool.run({
      filePath,
      content,
      operation: 'analyze'
    });
    
    this.taskQueue.set(cacheKey, task);
    
    try {
      const result = await task;
      return result;
    } finally {
      this.taskQueue.delete(cacheKey);
    }
  }
  
  async analyzeBatch(files: FileInfo[]): Promise<AnalysisResult[]> {
    // 动态批次大小：根据文件大小调整
    const batchSize = this.calculateOptimalBatchSize(files);
    const batches = this.createBatches(files, batchSize);
    
    // 使用 Promise.allSettled 处理部分失败
    const results = await Promise.allSettled(
      batches.map(batch => 
        this.pool.run({ files: batch, operation: 'analyzeBatch' })
      )
    );
    
    // 合并结果，处理失败
    const successful: AnalysisResult[] = [];
    const failed: { batch: FileInfo[]; error: any }[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(...result.value);
      } else {
        failed.push({ batch: batches[index], error: result.reason });
      }
    });
    
    // 重试失败的批次
    if (failed.length > 0) {
      console.warn(`Retrying ${failed.length} failed batches...`);
      for (const { batch } of failed) {
        try {
          const retryResult = await this.pool.run({ 
            files: batch, 
            operation: 'analyzeBatch' 
          });
          successful.push(...retryResult);
        } catch (error) {
          console.error('Batch failed after retry:', error);
        }
      }
    }
    
    return successful;
  }
  
  private calculateOptimalBatchSize(files: FileInfo[]): number {
    // 基于文件总大小计算最优批次大小
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const avgSize = totalSize / files.length;
    
    // 小文件：大批次，大文件：小批次
    if (avgSize < 1000) return 100;      // < 1KB: 100个文件
    if (avgSize < 10000) return 50;      // < 10KB: 50个文件
    if (avgSize < 100000) return 20;     // < 100KB: 20个文件
    return 10;                            // >= 100KB: 10个文件
  }
  
  private createBatches<T>(items: T[], size: number): T[][] {
    return Array.from(
      { length: Math.ceil(items.length / size) },
      (_, i) => items.slice(i * size, i * size + size)
    );
  }
  
  async destroy(): Promise<void> {
    await this.pool.destroy();
  }
  
  get stats() {
    return {
      queueSize: this.pool.queueSize,
      completed: this.pool.completed,
      runTime: this.pool.runTime,
      waitTime: this.pool.waitTime
    };
  }
}
```

### 1.2 Worker 线程实现

```typescript
// src/core/workers/analysis-worker.ts
import { parentPort } from 'worker_threads';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

// 每个 Worker 维护自己的 Parser 实例
const parser = new Parser();
parser.setLanguage(TypeScript);

// 预编译的正则表达式 (避免重复编译)
const PATTERNS = {
  import: /import\s+.*?from\s+['"]([^'"]+)['"]/g,
  export: /export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var)\s+(\w+)/g,
  function: /(?:async\s+)?function\s+(\w+)\s*\(/g,
  class: /class\s+(\w+)(?:\s+extends\s+(\w+))?/g
};

export interface WorkerMessage {
  operation: 'analyze' | 'analyzeBatch';
  filePath?: string;
  content?: string;
  files?: FileInfo[];
}

export interface AnalysisResult {
  filePath: string;
  symbols: SymbolInfo[];
  imports: string[];
  exports: string[];
  dependencies: string[];
  parseTime: number;
  error?: string;
}

export default async function analyze(message: WorkerMessage): Promise<any> {
  const startTime = performance.now();
  
  try {
    switch (message.operation) {
      case 'analyze':
        return analyzeSingle(message.filePath!, message.content!);
      case 'analyzeBatch':
        return analyzeBatch(message.files!);
      default:
        throw new Error(`Unknown operation: ${message.operation}`);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - startTime
    };
  }
}

function analyzeSingle(filePath: string, content: string): AnalysisResult {
  const parseStart = performance.now();
  
  // 使用 Tree-sitter 解析
  const tree = parser.parse(content);
  const parseTime = performance.now() - parseStart;
  
  // 提取符号
  const symbols = extractSymbols(tree, filePath);
  
  // 提取导入导出
  const imports = extractImports(content);
  const exports = extractExports(content);
  
  tree.delete(); // 释放内存
  
  return {
    filePath,
    symbols,
    imports,
    exports,
    dependencies: imports,
    parseTime
  };
}

async function analyzeBatch(files: FileInfo[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  
  for (const file of files) {
    try {
      const result = analyzeSingle(file.path, file.content);
      results.push(result);
    } catch (error) {
      results.push({
        filePath: file.path,
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        parseTime: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return results;
}

function extractSymbols(tree: Parser.Tree, filePath: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const cursor = tree.walk();
  
  const visit = () => {
    const node = cursor.currentNode;
    
    // 只处理关键节点类型
    if (isSymbolNode(node)) {
      symbols.push({
        name: getNodeName(node),
        type: getSymbolType(node),
        location: {
          file: filePath,
          line: node.startPosition.row + 1,
          column: node.startPosition.column
        }
      });
    }
    
    // 遍历子节点
    if (cursor.gotoFirstChild()) {
      do {
        visit();
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  };
  
  visit();
  return symbols;
}

function isSymbolNode(node: Parser.SyntaxNode): boolean {
  const symbolTypes = [
    'function_declaration',
    'class_declaration',
    'interface_declaration',
    'type_alias_declaration',
    'variable_declaration',
    'method_definition'
  ];
  return symbolTypes.includes(node.type);
}

function getNodeName(node: Parser.SyntaxNode): string {
  const nameNode = node.childForFieldName('name');
  return nameNode?.text || 'anonymous';
}

function getSymbolType(node: Parser.SyntaxNode): SymbolType {
  const typeMap: Record<string, SymbolType> = {
    'function_declaration': 'function',
    'class_declaration': 'class',
    'interface_declaration': 'interface',
    'type_alias_declaration': 'type',
    'variable_declaration': 'variable',
    'method_definition': 'method'
  };
  return typeMap[node.type] || 'unknown';
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  let match;
  while ((match = PATTERNS.import.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return [...new Set(imports)]; // 去重
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  let match;
  while ((match = PATTERNS.export.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return [...new Set(exports)];
}
```

## 2. 增量缓存系统

### 2.1 完整缓存管理器

```typescript
// src/core/cache/cache-manager.ts
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, stat, access } from 'fs/promises';
import { resolve, dirname } from 'path';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  checksum: string;
}

interface CacheOptions {
  cacheDir: string;
  maxAge: number;        // 毫秒
  compression: boolean;
  version: string;
}

export class CacheManager<T> {
  private options: CacheOptions;
  private memoryCache: Map<string, CacheEntry<T>> = new Map();
  private maxMemoryEntries = 1000;
  
  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      cacheDir: '.codemap/cache',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      compression: true,
      version: '1.0.0',
      ...options
    };
  }
  
  async initialize(): Promise<void> {
    await mkdir(this.options.cacheDir, { recursive: true });
  }
  
  async get(key: string, fileMtime?: number): Promise<T | null> {
    const cacheKey = this.generateCacheKey(key);
    
    // 1. 检查内存缓存
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry && this.isValid(memEntry, fileMtime)) {
      return memEntry.data;
    }
    
    // 2. 检查文件缓存
    try {
      const fileEntry = await this.readFromFile(cacheKey);
      if (fileEntry && this.isValid(fileEntry, fileMtime)) {
        // 更新内存缓存
        this.updateMemoryCache(cacheKey, fileEntry);
        return fileEntry.data;
      }
    } catch (error) {
      // 缓存文件不存在或损坏
    }
    
    return null;
  }
  
  async set(key: string, data: T): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: this.options.version,
      checksum: this.calculateChecksum(JSON.stringify(data))
    };
    
    // 更新内存缓存
    this.updateMemoryCache(cacheKey, entry);
    
    // 异步写入文件缓存
    await this.writeToFile(cacheKey, entry);
  }
  
  async invalidate(key: string): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    this.memoryCache.delete(cacheKey);
    
    try {
      await access(this.getCacheFilePath(cacheKey));
      await unlink(this.getCacheFilePath(cacheKey));
    } catch {
      // 文件不存在，忽略
    }
  }
  
  async invalidatePattern(pattern: RegExp): Promise<number> {
    let count = 0;
    
    // 清理内存缓存
    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
        count++;
      }
    }
    
    // 清理文件缓存 (异步)
    // 实际实现中可能需要扫描缓存目录
    
    return count;
  }
  
  async clear(): Promise<void> {
    this.memoryCache.clear();
    // 清理文件缓存目录
    const { rm } = await import('fs/promises');
    await rm(this.options.cacheDir, { recursive: true, force: true });
    await this.initialize();
  }
  
  private isValid(entry: CacheEntry<T>, fileMtime?: number): boolean {
    // 检查版本
    if (entry.version !== this.options.version) {
      return false;
    }
    
    // 检查过期时间
    if (Date.now() - entry.timestamp > this.options.maxAge) {
      return false;
    }
    
    // 检查文件修改时间
    if (fileMtime && entry.timestamp < fileMtime) {
      return false;
    }
    
    return true;
  }
  
  private updateMemoryCache(key: string, entry: CacheEntry<T>): void {
    // LRU 策略：如果超过限制，删除最旧的条目
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
    
    this.memoryCache.set(key, entry);
  }
  
  private async readFromFile(key: string): Promise<CacheEntry<T> | null> {
    const filePath = this.getCacheFilePath(key);
    
    try {
      const buffer = await readFile(filePath);
      
      // 解压
      const data = this.options.compression 
        ? await gunzipAsync(buffer)
        : buffer;
      
      return JSON.parse(data.toString());
    } catch {
      return null;
    }
  }
  
  private async writeToFile(key: string, entry: CacheEntry<T>): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    
    const data = Buffer.from(JSON.stringify(entry));
    
    // 压缩
    const compressed = this.options.compression
      ? await gzipAsync(data)
      : data;
    
    await writeFile(filePath, compressed);
  }
  
  private generateCacheKey(key: string): string {
    return createHash('md5').update(key).digest('hex');
  }
  
  private calculateChecksum(data: string): string {
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }
  
  private getCacheFilePath(key: string): string {
    // 使用分层目录结构避免单目录文件过多
    const dir1 = key.slice(0, 2);
    const dir2 = key.slice(2, 4);
    return resolve(this.options.cacheDir, dir1, dir2, `${key}.cache`);
  }
  
  get stats() {
    return {
      memoryEntries: this.memoryCache.size,
      maxMemoryEntries: this.maxMemoryEntries,
      hitRate: this.calculateHitRate()
    };
  }
  
  private calculateHitRate(): number {
    // 实际实现中需要追踪命中次数
    return 0;
  }
}
```

### 2.2 增量构建信息

```typescript
// src/core/cache/build-info.ts
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

interface FileBuildInfo {
  path: string;
  mtime: number;
  size: number;
  checksum: string;
  dependencies: string[];
  dependents: string[];
}

interface BuildInfo {
  version: string;
  timestamp: number;
  files: Map<string, FileBuildInfo>;
  dependencyGraph: DependencyGraph;
}

interface DependencyGraph {
  // 文件 -> 它依赖的文件
  dependencies: Map<string, Set<string>>;
  // 文件 -> 依赖它的文件
  dependents: Map<string, Set<string>>;
}

export class IncrementalBuildInfo {
  private buildInfo: BuildInfo | null = null;
  private buildInfoPath: string;
  
  constructor(cacheDir: string) {
    this.buildInfoPath = resolve(cacheDir, 'build-info.json');
  }
  
  async load(): Promise<BuildInfo | null> {
    try {
      const content = await readFile(this.buildInfoPath, 'utf-8');
      const data = JSON.parse(content);
      
      // 还原 Map 结构
      this.buildInfo = {
        version: data.version,
        timestamp: data.timestamp,
        files: new Map(Object.entries(data.files)),
        dependencyGraph: {
          dependencies: new Map(
            Object.entries(data.dependencyGraph.dependencies).map(
              ([k, v]) => [k, new Set(v as string[])]
            )
          ),
          dependents: new Map(
            Object.entries(data.dependencyGraph.dependents).map(
              ([k, v]) => [k, new Set(v as string[])]
            )
          )
        }
      };
      
      return this.buildInfo;
    } catch {
      return null;
    }
  }
  
  async save(buildInfo: BuildInfo): Promise<void> {
    // 转换 Map 为普通对象以便 JSON 序列化
    const serializable = {
      version: buildInfo.version,
      timestamp: buildInfo.timestamp,
      files: Object.fromEntries(buildInfo.files),
      dependencyGraph: {
        dependencies: Object.fromEntries(
          Array.from(buildInfo.dependencyGraph.dependencies.entries()).map(
            ([k, v]) => [k, Array.from(v)]
          )
        ),
        dependents: Object.fromEntries(
          Array.from(buildInfo.dependencyGraph.dependents.entries()).map(
            ([k, v]) => [k, Array.from(v)]
          )
        )
      }
    };
    
    await writeFile(this.buildInfoPath, JSON.stringify(serializable, null, 2));
  }
  
  getChangedFiles(currentFiles: Map<string, FileStats>): string[] {
    if (!this.buildInfo) {
      return Array.from(currentFiles.keys());
    }
    
    const changed: string[] = [];
    
    for (const [path, stats] of currentFiles) {
      const buildInfo = this.buildInfo.files.get(path);
      
      if (!buildInfo) {
        // 新文件
        changed.push(path);
      } else if (
        buildInfo.mtime !== stats.mtime ||
        buildInfo.size !== stats.size
      ) {
        // 文件已修改
        changed.push(path);
      }
    }
    
    // 检查删除的文件
    for (const path of this.buildInfo.files.keys()) {
      if (!currentFiles.has(path)) {
        changed.push(path);
      }
    }
    
    return changed;
  }
  
  getAffectedFiles(changedFiles: string[]): string[] {
    if (!this.buildInfo) return [];
    
    const affected = new Set<string>();
    const visited = new Set<string>();
    
    const visit = (file: string) => {
      if (visited.has(file)) return;
      visited.add(file);
      
      const dependents = this.buildInfo!.dependencyGraph.dependents.get(file);
      if (dependents) {
        for (const dependent of dependents) {
          affected.add(dependent);
          visit(dependent);
        }
      }
    };
    
    for (const file of changedFiles) {
      visit(file);
    }
    
    return Array.from(affected);
  }
  
  updateDependencyGraph(file: string, dependencies: string[]): void {
    if (!this.buildInfo) return;
    
    // 清除旧的依赖关系
    const oldDeps = this.buildInfo.dependencyGraph.dependencies.get(file);
    if (oldDeps) {
      for (const dep of oldDeps) {
        this.buildInfo.dependencyGraph.dependents.get(dep)?.delete(file);
      }
    }
    
    // 建立新的依赖关系
    this.buildInfo.dependencyGraph.dependencies.set(file, new Set(dependencies));
    
    for (const dep of dependencies) {
      if (!this.buildInfo.dependencyGraph.dependents.has(dep)) {
        this.buildInfo.dependencyGraph.dependents.set(dep, new Set());
      }
      this.buildInfo.dependencyGraph.dependents.get(dep)!.add(file);
    }
  }
}
```

## 3. 性能监控集成

```typescript
// src/core/performance/performance-monitor.ts
import { EventEmitter } from 'events';

interface PerformanceEvent {
  phase: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

interface MemorySnapshot {
  timestamp: number;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export class PerformanceMonitor extends EventEmitter {
  private timers: Map<string, number> = new Map();
  private events: PerformanceEvent[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private isRecording = false;
  
  startRecording(): void {
    this.isRecording = true;
    this.events = [];
    this.memorySnapshots = [];
    
    // 定期记录内存
    this.startMemorySampling();
  }
  
  stopRecording(): void {
    this.isRecording = false;
    this.stopMemorySampling();
  }
  
  startPhase(phase: string, metadata?: any): void {
    this.timers.set(phase, performance.now());
    
    if (this.isRecording) {
      this.emit('phase:start', { phase, timestamp: Date.now(), metadata });
    }
  }
  
  endPhase(phase: string, metadata?: any): number {
    const startTime = this.timers.get(phase);
    if (!startTime) {
      console.warn(`Phase "${phase}" was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(phase);
    
    if (this.isRecording) {
      const event: PerformanceEvent = {
        phase,
        duration,
        timestamp: Date.now(),
        metadata
      };
      this.events.push(event);
      this.emit('phase:end', event);
    }
    
    return duration;
  }
  
  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    if (this.isRecording) {
      this.emit('metric', { name, value, unit, timestamp: Date.now() });
    }
  }
  
  private memorySamplingInterval: NodeJS.Timeout | null = null;
  
  private startMemorySampling(intervalMs: number = 1000): void {
    this.memorySamplingInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.memorySnapshots.push({
        timestamp: Date.now(),
        rss: usage.rss / 1024 / 1024,
        heapTotal: usage.heapTotal / 1024 / 1024,
        heapUsed: usage.heapUsed / 1024 / 1024,
        external: usage.external / 1024 / 1024,
        arrayBuffers: usage.arrayBuffers / 1024 / 1024
      });
    }, intervalMs);
  }
  
  private stopMemorySampling(): void {
    if (this.memorySamplingInterval) {
      clearInterval(this.memorySamplingInterval);
      this.memorySamplingInterval = null;
    }
  }
  
  generateReport(): PerformanceReport {
    const phases = this.aggregatePhases();
    const memoryAnalysis = this.analyzeMemory();
    
    return {
      summary: {
        totalDuration: this.events.reduce((sum, e) => sum + e.duration, 0),
        phaseCount: this.events.length,
        memorySnapshots: this.memorySnapshots.length
      },
      phases,
      memory: memoryAnalysis,
      bottlenecks: this.identifyBottlenecks(phases),
      recommendations: this.generateRecommendations(phases, memoryAnalysis),
      rawEvents: this.events,
      rawMemorySnapshots: this.memorySnapshots
    };
  }
  
  private aggregatePhases(): PhaseSummary[] {
    const phaseMap = new Map<string, number[]>();
    
    for (const event of this.events) {
      const durations = phaseMap.get(event.phase) || [];
      durations.push(event.duration);
      phaseMap.set(event.phase, durations);
    }
    
    return Array.from(phaseMap.entries())
      .map(([name, durations]) => ({
        name,
        count: durations.length,
        total: durations.reduce((a, b) => a + b, 0),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      }))
      .sort((a, b) => b.total - a.total);
  }
  
  private analyzeMemory(): MemoryAnalysis {
    if (this.memorySnapshots.length === 0) {
      return { peakHeapUsed: 0, avgHeapUsed: 0, trend: 'stable' };
    }
    
    const heapUsed = this.memorySnapshots.map(s => s.heapUsed);
    const peak = Math.max(...heapUsed);
    const avg = heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length;
    
    // 分析趋势
    const firstHalf = heapUsed.slice(0, Math.floor(heapUsed.length / 2));
    const secondHalf = heapUsed.slice(Math.floor(heapUsed.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondAvg > firstAvg * 1.1) trend = 'increasing';
    else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
    
    return {
      peakHeapUsed: peak,
      avgHeapUsed: avg,
      trend,
      snapshots: this.memorySnapshots.length
    };
  }
  
  private identifyBottlenecks(phases: PhaseSummary[]): Bottleneck[] {
    const totalTime = phases.reduce((sum, p) => sum + p.total, 0);
    const bottlenecks: Bottleneck[] = [];
    
    for (const phase of phases) {
      const percentage = (phase.total / totalTime) * 100;
      if (percentage > 30) {
        bottlenecks.push({
          phase: phase.name,
          duration: phase.total,
          percentage,
          severity: percentage > 50 ? 'critical' : 'high'
        });
      }
    }
    
    return bottlenecks.sort((a, b) => b.percentage - a.percentage);
  }
  
  private generateRecommendations(
    phases: PhaseSummary[],
    memory: MemoryAnalysis
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // 基于阶段的建议
    const parsingPhase = phases.find(p => p.name.includes('parse'));
    if (parsingPhase && parsingPhase.avg > 100) {
      recommendations.push({
        priority: 'high',
        issue: '解析阶段耗时过长',
        suggestion: '启用 Worker 线程并行解析，或使用 Tree-sitter 增量解析',
        expectedImprovement: '2-5x'
      });
    }
    
    // 基于内存的建议
    if (memory.peakHeapUsed > 1500) {
      recommendations.push({
        priority: 'critical',
        issue: '内存使用过高',
        suggestion: '实现流式处理和对象池，限制 AST 缓存大小',
        expectedImprovement: '内存降低 50%+'
      });
    }
    
    if (memory.trend === 'increasing') {
      recommendations.push({
        priority: 'high',
        issue: '内存持续增长，可能存在内存泄漏',
        suggestion: '检查事件监听器和闭包，确保及时释放资源',
        expectedImprovement: '防止 OOM'
      });
    }
    
    return recommendations;
  }
}

// 类型定义
interface PhaseSummary {
  name: string;
  count: number;
  total: number;
  avg: number;
  min: number;
  max: number;
}

interface MemoryAnalysis {
  peakHeapUsed: number;
  avgHeapUsed: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  snapshots?: number;
}

interface Bottleneck {
  phase: string;
  duration: number;
  percentage: number;
  severity: 'critical' | 'high' | 'medium';
}

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
  expectedImprovement: string;
}

interface PerformanceReport {
  summary: {
    totalDuration: number;
    phaseCount: number;
    memorySnapshots: number;
  };
  phases: PhaseSummary[];
  memory: MemoryAnalysis;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  rawEvents: PerformanceEvent[];
  rawMemorySnapshots: MemorySnapshot[];
}
```

## 4. 配置示例

```typescript
// codemap.config.ts
export default {
  // 性能配置
  performance: {
    // Worker 线程配置
    workers: {
      enabled: true,
      minThreads: 2,
      maxThreads: 8,
      idleTimeout: 60000
    },
    
    // 缓存配置
    cache: {
      enabled: true,
      directory: '.codemap/cache',
      maxAge: '7d',
      compression: true,
      maxMemoryEntries: 1000
    },
    
    // 增量分析配置
    incremental: {
      enabled: true,
      buildInfoFile: '.codemap/build-info.json'
    },
    
    // 内存限制
    memory: {
      maxHeapSize: '2gb',
      enableForceGC: true,
      gcThreshold: '1.5gb'
    },
    
    // 分析模式
    mode: 'adaptive', // 'fast' | 'smart' | 'adaptive'
    
    // 自适应模式阈值
    adaptive: {
      fastThreshold: { files: 1000, lines: 50000 },
      smartThreshold: { files: 200, lines: 10000 }
    }
  },
  
  // 文件过滤配置
  files: {
    include: ['**/*.{ts,tsx,js,jsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}'
    ],
    priorityRules: [
      { pattern: '**/index.{ts,tsx}', priority: 10 },
      { pattern: '**/types/**', priority: 9 },
      { pattern: '**/core/**', priority: 8 }
    ]
  },
  
  // 解析配置
  parsing: {
    parser: 'tree-sitter',
    enableTypeAnalysis: true,
    maxFileSize: '1mb',
    timeout: 30000
  },
  
  // 监控配置
  monitoring: {
    enabled: true,
    outputFormat: 'json', // 'json' | 'html' | 'prometheus'
    includeRawData: false
  }
};
```
