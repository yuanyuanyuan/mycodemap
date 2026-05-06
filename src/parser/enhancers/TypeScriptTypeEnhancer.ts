// [META] since:2026-05 | owner:parser-team | stable:false
// [WHY] TS-only post-parse enhancement seam preserves SmartParser insights without keeping it as the main parser selector

import { SmartParser } from '../implementations/smart-parser.js';
import type { ParseResult, ParserOptions } from '../interfaces/IParser.js';

const TYPESCRIPT_EXTENSIONS = new Set(['.ts', '.tsx']);

export class TypeScriptTypeEnhancer {
  private readonly smartParser: SmartParser;

  constructor(
    private readonly rootDir: string,
    private readonly enabled: boolean = true
  ) {
    const options: ParserOptions = { rootDir, mode: 'tree-sitter', enhanceTypes: enabled };
    this.smartParser = new SmartParser(options);
  }

  async enhance(results: ParseResult[]): Promise<ParseResult[]> {
    if (!this.enabled) {
      return results;
    }

    const enhancedResults: ParseResult[] = [];
    for (const result of results) {
      enhancedResults.push(await this.enhanceResult(result));
    }

    return enhancedResults;
  }

  dispose(): void {
    this.smartParser.dispose();
  }

  private async enhanceResult(result: ParseResult): Promise<ParseResult> {
    if (!this.isTypeScriptFile(result.path)) {
      return result;
    }

    const enhanced = await this.smartParser.parseFile(result.path);
    return {
      ...result,
      typeInfo: enhanced.typeInfo ?? result.typeInfo,
      callGraph: enhanced.callGraph ?? result.callGraph,
      complexity: enhanced.complexity ?? result.complexity,
    };
  }

  private isTypeScriptFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    for (const extension of TYPESCRIPT_EXTENSIONS) {
      if (lower.endsWith(extension)) {
        return true;
      }
    }
    return false;
  }
}
