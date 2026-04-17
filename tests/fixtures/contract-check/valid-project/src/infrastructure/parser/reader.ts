// [META] since:2026-04 | owner:test-fixtures | stable:false
// [WHY] Provide fixture source for contract-check rule coverage
import { tokenize } from '../../shared/tokenizer';

export function readTokens(source: string): string[] {
  return tokenize(source);
}
