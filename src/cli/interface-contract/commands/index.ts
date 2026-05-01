// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Registry of all command contracts — central catalog for schema generation and validation

import { analyzeContract } from './analyze.js';
import { queryContract } from './query.js';
import { depsContract } from './deps.js';

export const commandContracts = [
  analyzeContract,
  queryContract,
  depsContract,
] as const;

export { analyzeContract, queryContract, depsContract };
