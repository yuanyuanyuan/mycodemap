// [META] since:2026-05 | owner:architecture-team | stable:false
// [WHY] Composition root for parser/analyzer wiring so Core consumes abstractions, not Infrastructure factories

import { createDefaultParserRegistry } from '../infrastructure/parser/index.js';
import { TypeScriptTypeEnhancer } from '../infrastructure/parser/enhancers/TypeScriptTypeEnhancer.js';
import { PythonTypeEnhancer } from '../parser/enhancers/PythonTypeEnhancer.js';
import type { IParserRegistry, ITypeEnhancer } from '../interface/types/parser.js';

export interface AnalysisContext {
  parserRegistry: IParserRegistry;
  typeEnhancers: ITypeEnhancer[];
}

export function buildAnalysisContext(rootDir: string, enhanceTypes = true): AnalysisContext {
  return {
    parserRegistry: createDefaultParserRegistry(),
    typeEnhancers: [
      new TypeScriptTypeEnhancer(rootDir, enhanceTypes),
      new PythonTypeEnhancer(enhanceTypes),
    ],
  };
}
