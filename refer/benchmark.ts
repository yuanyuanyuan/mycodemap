#!/usr/bin/env ts-node
/**
 * CodeMap 性能基准测试
 * 
 * 使用方法:
 *   ts-node benchmark.ts --project <path> [--mode fast|smart] [--iterations 3]
 */

import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// 测试项目配置
const TEST_PROJECTS = {
  small: {
    name: 'lodash-es',
    repo: 'https://github.com/lodash/lodash.git',
    files: 200,
    lines: 10000
  },
  medium: {
    name: 'vue-core',
    repo: 'https://github.com/vuejs/core.git',
    files: 1000,
    lines: 50000
  },
  large: {
    name: 'react',
    repo: 'https://github.com/facebook/react.git',
    files: 3000,
    lines: 100000
  },
  xlarge: {
    name: 'nextjs',
    repo: 'https://github.com/vercel/next.js.git',
    files: 10000,
    lines: 500000
  }
};

interface BenchmarkResult {
  project: string;
  mode: 'fast' | 'smart';
  iterations: number;
  times: number[];
  memory: number[];
  stats: {
    avgTime: number;
    minTime: number;
    maxTime: number;
    stdDev: number;
    avgMemory: number;
    peakMemory: number;
  };
  throughput: {
    filesPerSecond: number;
    linesPerSecond: number;
  };
}

interface PerformanceMetrics {
  fileDiscoveryTime: number;
  parsingTime: number;
  symbolExtractionTime: number;
  relationshipBuildTime: number;
  totalTime: number;
  peakMemory: number;
  filesAnalyzed: number;
  linesAnalyzed: number;
}

class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  
  async run(options: {
    project: string;
    mode: 'fast' | 'smart';
    iterations: number;
  }): Promise<BenchmarkResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Benchmark: ${options.project} (${options.mode} mode)`);
    console.log(`Iterations: ${options.iterations}`);
    console.log('='.repeat(60));
    
    const times: number[] = [];
    const memories: number[] = [];
    
    for (let i = 0; i < options.iterations; i++) {
      console.log(`\nIteration ${i + 1}/${options.iterations}`);
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
        global.gc();
      }
      
      const metrics = await this.runAnalysis(options.project, options.mode);
      
      times.push(metrics.totalTime);
      memories.push(metrics.peakMemory);
      
      console.log(`  Time: ${metrics.totalTime.toFixed(2)}ms`);
      console.log(`  Memory: ${metrics.peakMemory.toFixed(2)}MB`);
      console.log(`  Files: ${metrics.filesAnalyzed}`);
      console.log(`  Throughput: ${(metrics.filesAnalyzed / (metrics.totalTime / 1000)).toFixed(2)} files/s`);
      
      // 间隔冷却
      await this.sleep(1000);
    }
    
    const result: BenchmarkResult = {
      project: options.project,
      mode: options.mode,
      iterations: options.iterations,
      times,
      memory: memories,
      stats: {
        avgTime: this.average(times),
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        stdDev: this.stdDev(times),
        avgMemory: this.average(memories),
        peakMemory: Math.max(...memories)
      },
      throughput: {
        filesPerSecond: 0, // 需要实际文件数
        linesPerSecond: 0
      }
    };
    
    this.printResult(result);
    return result;
  }
  
  private async runAnalysis(
    projectPath: string,
    mode: 'fast' | 'smart'
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    let peakMemory = startMemory;
    
    // 模拟分析过程
    const metrics: PerformanceMetrics = {
      fileDiscoveryTime: 0,
      parsingTime: 0,
      symbolExtractionTime: 0,
      relationshipBuildTime: 0,
      totalTime: 0,
      peakMemory: 0,
      filesAnalyzed: 0,
      linesAnalyzed: 0
    };
    
    // 1. 文件发现
    const fileDiscoveryStart = performance.now();
    const files = await this.discoverFiles(projectPath);
    metrics.fileDiscoveryTime = performance.now() - fileDiscoveryStart;
    metrics.filesAnalyzed = files.length;
    
    peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed / 1024 / 1024);
    
    // 2. 解析
    const parsingStart = performance.now();
    const parseResults = await this.parseFiles(files, mode);
    metrics.parsingTime = performance.now() - parsingStart;
    metrics.linesAnalyzed = parseResults.totalLines;
    
    peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed / 1024 / 1024);
    
    // 3. 符号提取
    const symbolStart = performance.now();
    const symbols = await this.extractSymbols(parseResults);
    metrics.symbolExtractionTime = performance.now() - symbolStart;
    
    peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed / 1024 / 1024);
    
    // 4. 关系构建
    const relationStart = performance.now();
    await this.buildRelationships(symbols, mode);
    metrics.relationshipBuildTime = performance.now() - relationStart;
    
    peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed / 1024 / 1024);
    
    metrics.totalTime = performance.now() - startTime;
    metrics.peakMemory = peakMemory - startMemory;
    
    return metrics;
  }
  
  private async discoverFiles(projectPath: string): Promise<string[]> {
    // 模拟文件发现
    // 实际实现中应该使用 glob 或 fs.walk
    return new Array(1000).fill(0).map((_, i) => `${projectPath}/file${i}.ts`);
  }
  
  private async parseFiles(
    files: string[],
    mode: 'fast' | 'smart'
  ): Promise<{ totalLines: number }> {
    // 模拟解析
    const delay = mode === 'fast' ? 1 : 5;
    await this.sleep(files.length * delay);
    return { totalLines: files.length * 100 };
  }
  
  private async extractSymbols(parseResults: any): Promise<any[]> {
    // 模拟符号提取
    await this.sleep(100);
    return [];
  }
  
  private async buildRelationships(symbols: any[], mode: 'fast' | 'smart'): Promise<void> {
    // 模拟关系构建
    const delay = mode === 'fast' ? 50 : 500;
    await this.sleep(delay);
  }
  
  private printResult(result: BenchmarkResult): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Benchmark Results');
    console.log('='.repeat(60));
    console.log(`Project: ${result.project}`);
    console.log(`Mode: ${result.mode}`);
    console.log(`Iterations: ${result.iterations}`);
    console.log('-'.repeat(60));
    console.log('Time Statistics:');
    console.log(`  Average: ${result.stats.avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${result.stats.minTime.toFixed(2)}ms`);
    console.log(`  Max: ${result.stats.maxTime.toFixed(2)}ms`);
    console.log(`  Std Dev: ${result.stats.stdDev.toFixed(2)}ms`);
    console.log('-'.repeat(60));
    console.log('Memory Statistics:');
    console.log(`  Average: ${result.stats.avgMemory.toFixed(2)}MB`);
    console.log(`  Peak: ${result.stats.peakMemory.toFixed(2)}MB`);
    console.log('='.repeat(60));
  }
  
  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private stdDev(values: number[]): number {
    const avg = this.average(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateSummary()
    };
    
    const outputPath = resolve(process.cwd(), 'benchmark-report.json');
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${outputPath}`);
  }
  
  private generateSummary() {
    const byMode = {
      fast: this.results.filter(r => r.mode === 'fast'),
      smart: this.results.filter(r => r.mode === 'smart')
    };
    
    return {
      fast: {
        avgTime: this.average(byMode.fast.map(r => r.stats.avgTime)),
        avgMemory: this.average(byMode.fast.map(r => r.stats.avgMemory))
      },
      smart: {
        avgTime: this.average(byMode.smart.map(r => r.stats.avgTime)),
        avgMemory: this.average(byMode.smart.map(r => r.stats.avgMemory))
      }
    };
  }
}

// CLI 入口
async function main() {
  const args = process.argv.slice(2);
  const options = {
    project: './test-project',
    mode: 'fast' as 'fast' | 'smart',
    iterations: 3
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--project':
      case '-p':
        options.project = args[++i];
        break;
      case '--mode':
      case '-m':
        options.mode = args[++i] as 'fast' | 'smart';
        break;
      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
CodeMap Performance Benchmark

Usage: ts-node benchmark.ts [options]

Options:
  -p, --project <path>     Project path to analyze (default: ./test-project)
  -m, --mode <mode>        Analysis mode: fast|smart (default: fast)
  -i, --iterations <n>     Number of iterations (default: 3)
  -h, --help              Show this help message

Examples:
  ts-node benchmark.ts --project ./my-project --mode smart --iterations 5
  ts-node benchmark.ts -p ./react -m fast -i 10
        `);
        process.exit(0);
    }
  }
  
  const runner = new BenchmarkRunner();
  await runner.run(options);
  runner.generateReport();
}

main().catch(console.error);
