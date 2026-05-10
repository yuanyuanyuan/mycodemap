// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Deprecated compatibility wrapper around the shared Infrastructure TreeSitterParser

import { TreeSitterParser } from './TreeSitterParser.js';

/**
 * @deprecated Use `TreeSitterParser` directly. Kept to avoid breaking existing imports/tests.
 */
export class TypeScriptParser extends TreeSitterParser {}
