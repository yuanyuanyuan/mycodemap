// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Parser module exports - central entry point for parser infrastructure
// ============================================
// Parser 模块导出 - 解析器基础设施的中央入口点
// ============================================

import { ParserRegistry } from './registry/ParserRegistry.js';
import { TreeSitterParser } from './implementations/TreeSitterParser.js';
import { TypeScriptParser } from './implementations/TypeScriptParser.js';
import { GoParser } from './implementations/GoParser.js';
import { PythonParser } from './implementations/PythonParser.js';
import { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js';

// 基类和接口
export { ParserBase, ParseError } from './interfaces/ParserBase.js';

// 注册表
export { ParserRegistry, parserRegistry, ParserNotFoundError } from './registry/ParserRegistry.js';

// 具体解析器实现
export { TreeSitterParser } from './implementations/TreeSitterParser.js';
export { TypeScriptParser } from './implementations/TypeScriptParser.js';
export { GoParser } from './implementations/GoParser.js';
export { PythonParser } from './implementations/PythonParser.js';
export { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js';

// 重新导出 Interface Layer 的类型
export type {
  ILanguageParser,
  IParserRegistry,
  LanguageId,
  LanguageFeature,
  ParseOptions,
  ParseResult,
  CallGraphInfo,
  ParseError as ParseErrorInterface,
} from '../../interface/types/parser.js';

/**
 * 创建并配置默认解析器注册表
 * 注册所有内置解析器
 */
export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  
  // Tree-sitter is the active TS/JS parser; the regex TypeScriptParser remains as a compatibility wrapper only.
  registry.register(new TreeSitterParser());
  
  // 注册 Go 解析器
  registry.register(new GoParser());
  
  // AST-first: PythonTreeSitterParser replaces regex PythonParser (D-08, D-11)
  // If tree-sitter-python is unavailable, parseFile() throws with actionable error (D-10)
  registry.register(new PythonTreeSitterParser());
  
  return registry;
}
