// [META] since:2025-01 | owner:cli-team | stable:true
// [WHY] 提供变更影响分析命令，复用 shared graph-native impact truth
import chalk from 'chalk';
import path from 'node:path';
import type { UnifiedResult, HeatScore } from '../../orchestrator/types.js';
import type {
  ImpactAnalysisRequest,
  ImpactNode,
  SharedImpactResult,
} from '../../interface/types/storage.js';
import { analyzeImpactInGraph } from '../../infrastructure/storage/graph-helpers.js';
import { createConfiguredStorage } from '../storage-runtime.js';

interface ImpactOptions {
  file: string;
  json?: boolean;
  structured?: boolean;
  transitive?: boolean;
}

interface ImpactArgs {
  targets: string[];
  scope: 'direct' | 'transitive';
}

type ImpactResult = SharedImpactResult;

const DEFAULT_DIRECT_DEPTH = 1;
const DEFAULT_TRANSITIVE_DEPTH = 5;

function createImpactRequest(filePath: string, scope: ImpactArgs['scope']): ImpactAnalysisRequest {
  return {
    kind: 'file',
    filePath,
    depth: scope === 'transitive' ? DEFAULT_TRANSITIVE_DEPTH : DEFAULT_DIRECT_DEPTH,
  };
}

function toDisplayPath(rootDir: string, filePath: string | undefined): string {
  if (!filePath) {
    return '(unknown)';
  }

  if (path.isAbsolute(filePath)) {
    return path.relative(rootDir, filePath) || filePath;
  }

  return filePath;
}

function flattenImpactNodes(result: SharedImpactResult): ImpactNode[] {
  return [
    ...result.direct,
    ...result.transitiveLayers.flatMap((layer) => layer.nodes),
  ];
}

function summarizeHumanStatus(result: SharedImpactResult): string {
  if (result.status === 'ok') {
    return result.confidence === 'high' ? '可用' : '可用（降级）';
  }

  return result.error?.message ?? result.status;
}

function formatHumanImpact(result: SharedImpactResult, rootDir: string): void {
  console.log(chalk.cyan('\n📍 影响分析'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.yellow('\n入口:'));
  console.log(chalk.green(`   ${toDisplayPath(rootDir, result.entrypoint.filePath ?? result.entrypoint.name)}`));
  console.log(chalk.gray(`   状态: ${summarizeHumanStatus(result)}`));

  if (result.status !== 'ok') {
    if (result.entrypoint.candidates && result.entrypoint.candidates.length > 0) {
      console.log(chalk.yellow('\n候选项:'));
      for (const candidate of result.entrypoint.candidates) {
        console.log(chalk.green(`   • ${candidate.name} (${toDisplayPath(rootDir, candidate.filePath)})`));
      }
    }
    if (result.remediation) {
      console.log(chalk.gray(`\n建议: ${result.remediation}`));
    }
    console.log('');
    return;
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\n警告:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`   • ${warning.message}`));
    }
  }

  console.log(chalk.yellow(`\n⬇️  直接影响 (${result.direct.length}):`));
  if (result.direct.length === 0) {
    console.log(chalk.gray('   无'));
  } else {
    for (const node of result.direct) {
      console.log(chalk.green(`   • ${toDisplayPath(rootDir, node.filePath)}`));
      console.log(chalk.gray(`     depth=${node.depth} path=${node.path.join(' -> ')}`));
    }
  }

  const transitiveCount = result.summary.transitiveCount;
  console.log(chalk.yellow(`\n🌐 传递影响 (${transitiveCount}):`));
  if (result.transitiveLayers.length === 0) {
    console.log(chalk.gray('   无'));
  } else {
    for (const layer of result.transitiveLayers) {
      console.log(chalk.gray(`   depth ${layer.depth}`));
      for (const node of layer.nodes) {
        console.log(chalk.green(`   • ${toDisplayPath(rootDir, node.filePath)}`));
        console.log(chalk.gray(`     path=${node.path.join(' -> ')}`));
      }
    }
  }

  console.log(chalk.gray('\n─'.repeat(50)));
  console.log(chalk.cyan('\n摘要:'));
  console.log(chalk.cyan(`   直接影响: ${result.summary.directCount}`));
  console.log(chalk.cyan(`   传递影响: ${result.summary.transitiveCount}`));
  console.log(chalk.cyan(`   最大深度: ${result.summary.maxDepth}`));
  console.log(chalk.cyan(`   截断: ${result.summary.truncated ? '是' : '否'}`));
  console.log('');
}

export class ImpactCommand {
  async run(args: ImpactArgs): Promise<ImpactResult[]> {
    const { storage } = await createConfiguredStorage(process.cwd());

    try {
      const graph = await storage.loadCodeGraph();
      return args.targets.map((target) => analyzeImpactInGraph(graph, createImpactRequest(target, args.scope)));
    } finally {
      await storage.close();
    }
  }

  async runEnhanced(args: ImpactArgs): Promise<UnifiedResult[]> {
    const impactResults = await this.run(args);
    return this.toUnifiedResults(impactResults);
  }

  private toUnifiedResults(impactResults: ImpactResult[]): UnifiedResult[] {
    const unifiedResults: UnifiedResult[] = [];

    for (const result of impactResults) {
      if (result.status !== 'ok') {
        continue;
      }

      const impactedNodes = flattenImpactNodes(result);
      const totalDependents = impactedNodes.length;
      const relevance = Math.min(0.5 + totalDependents * 0.05, 1.0);

      let riskLevel: 'high' | 'medium' | 'low';
      if (totalDependents <= 3) {
        riskLevel = 'low';
      } else if (totalDependents <= 10) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'high';
      }

      const heatScore: HeatScore = {
        freq30d: 0,
        lastType: 'unknown',
        lastDate: null,
        stability: result.confidence === 'high',
      };

      unifiedResults.push({
        id: `codemap-impact-${result.entrypoint.id ?? result.entrypoint.name}`,
        source: 'codemap',
        toolScore: 0.9,
        type: 'file',
        file: result.entrypoint.filePath ?? result.entrypoint.name,
        line: 0,
        content: `direct=${result.summary.directCount}, transitive=${result.summary.transitiveCount}, confidence=${result.confidence}`,
        relevance,
        keywords: [],
        metadata: {
          symbolType: 'class' as const,
          dependencies: impactedNodes.map((node) => node.filePath),
          testFile: '',
          commitCount: 0,
          gravity: totalDependents * 0.1,
          heatScore,
          impactCount: totalDependents,
          stability: result.confidence === 'high',
          riskLevel,
        },
      });

      for (const node of impactedNodes) {
        unifiedResults.push({
          id: `codemap-impact-node-${node.id}`,
          source: 'codemap',
          toolScore: node.depth === 1 ? 0.85 : 0.8,
          type: 'file',
          file: node.filePath,
          line: 0,
          content: node.depth === 1
            ? `直接受 ${path.basename(result.entrypoint.name)} 影响`
            : `传递受 ${path.basename(result.entrypoint.name)} 影响 (depth=${node.depth})`,
          relevance: Math.max(0.35, 0.9 - (node.depth * 0.1)),
          keywords: [],
          metadata: {
            symbolType: 'class' as const,
            dependencies: [result.entrypoint.filePath ?? result.entrypoint.name],
            testFile: '',
            commitCount: 0,
            gravity: Math.max(0.2, 1 / (node.depth + 1)),
            heatScore,
            impactCount: 1,
            stability: result.confidence === 'high',
            riskLevel: node.depth === 1 ? 'medium' : 'low',
          },
        });
      }
    }

    return unifiedResults;
  }
}

export async function impactCommand(options: ImpactOptions): Promise<void> {
  const rootDir = process.cwd();

  if (!options.file) {
    console.log(chalk.red('❌ 请指定要分析的文件 (--file <path>)'));
    console.log(chalk.gray('\n用法:'));
    console.log(chalk.gray('   mycodemap impact --file <path>'));
    console.log(chalk.gray('   mycodemap impact --file <path> --transitive'));
    console.log(chalk.gray('   mycodemap impact --file <path> --json'));
    process.exit(1);
  }

  const command = new ImpactCommand();
  const [result] = await command.run({
    targets: [options.file],
    scope: options.transitive ? 'transitive' : 'direct',
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'ok') {
      process.exitCode = 1;
    }
    return;
  }

  formatHumanImpact(result, rootDir);
  if (result.status !== 'ok') {
    process.exit(1);
  }
}

export type { ImpactArgs, ImpactResult, ImpactOptions };
