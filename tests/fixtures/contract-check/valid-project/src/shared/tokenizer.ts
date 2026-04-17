// [META] since:2026-04 | owner:test-fixtures | stable:false
// [WHY] Provide fixture source for contract-check rule coverage
export function tokenize(source: string): string[] {
  return source.split(/\s+/u).filter(Boolean);
}
