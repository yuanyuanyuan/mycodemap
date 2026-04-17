// [META] since:2026-04 | owner:test-fixtures | stable:false
// [WHY] Provide fixture source for contract-check rule coverage
import fs from 'fs';

export function readFile(pathname: string): string {
  return fs.readFileSync(pathname, 'utf8');
}
