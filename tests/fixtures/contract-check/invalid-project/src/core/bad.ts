// [META] since:2026-04 | owner:test-fixtures | stable:false
// [WHY] Provide fixture source for contract-check rule coverage
import { runCommand } from '../cli/command';

export const coreLeak = runCommand();
