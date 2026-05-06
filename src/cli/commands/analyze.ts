/**
 * [META] AnalyzeCommand - 统一分析入口
 * [WHY] CLI analyze wrapper now delegates execution truth to the shared contract-tools seam and keeps only parse/render/exit-code responsibilities
 */

import { parseArgs } from 'node:util';
import { ANALYZE_PARSE_OPTIONS, getAnalyzeHelpText } from './analyze-options.js';
import { resolveOutputMode, renderOutput, createProgressEmitter, formatError } from '../output/index.js';
import type { OutputMode } from '../output/index.js';
import type { CodemapOutput, UnifiedResult } from '../../orchestrator/types.js';
import {
  AnalyzeCommand,
  AnalyzeErrorCode,
  ERROR_MESSAGES,
  formatAnalyzeHuman,
  type AnalyzeArgs,
} from '../../execution/contract-tools/index.js';

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

export function parseAnalyzeArgs(argv: string[]): AnalyzeArgs {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: ANALYZE_PARSE_OPTIONS,
    });

    const positionalTargets = positionals?.filter(position => !position.startsWith('-')) ?? [];
    const explicitTargets = normalizeStringArray(values.targets);
    const allTargets = [...explicitTargets, ...positionalTargets];
    const keywords = normalizeStringArray(values.keywords);

    return {
      intent: values.intent as AnalyzeArgs['intent'],
      targets: allTargets.length > 0 ? allTargets : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      scope: values.scope as AnalyzeArgs['scope'],
      topK: values.topK ? Number.parseInt(values.topK as string, 10) : undefined,
      includeTests: values['include-tests'] as boolean,
      includeGitHistory: values['include-git-history'] as boolean,
      json: values.json as boolean,
      human: values.human as boolean,
      structured: values.structured as boolean,
      outputMode: values['output-mode'] as AnalyzeArgs['outputMode'],
    };
  } catch {
    return {};
  }
}

export async function analyzeCommand(argv: string[]): Promise<void> {
  const filteredArgv = argv.filter(arg => arg !== 'analyze');
  const args = parseAnalyzeArgs(filteredArgv);

  if (args.intent === 'help' || !args.intent) {
    console.log(getAnalyzeHelpText());
    return;
  }

  const mode: OutputMode = resolveOutputMode({ json: args.json, human: args.human });
  const progress = createProgressEmitter(mode, 'Analyzing...');

  try {
    progress.update(10, 'Starting analysis...');
    const output = await new AnalyzeCommand(args).execute() as CodemapOutput;

    let data: CodemapOutput = output;
    if (args.structured) {
      const structuredOutput = JSON.parse(JSON.stringify(output)) as CodemapOutput;
      if (structuredOutput.results) {
        structuredOutput.results = structuredOutput.results.map(result => {
          const { content, ...rest } = result;
          void content;
          return rest as UnifiedResult;
        });
      }
      data = structuredOutput;
    }

    progress.complete();
    renderOutput(data, formatAnalyzeHuman, mode);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap analyze') + '\n');
    process.exitCode = 1;
  }
}

export { AnalyzeCommand, AnalyzeErrorCode, ERROR_MESSAGES };
export type { AnalyzeArgs };
