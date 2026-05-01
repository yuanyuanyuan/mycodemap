// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Public API for the CLI interface contract — schema access, validation, and programmatic introspection

import type { InterfaceContract } from './types.js';
import { commandContracts } from './commands/index.js';
import {
  interfaceContractSchema,
  safeValidateInterfaceContract,
  validateInterfaceContract,
} from './schema.js';

export type {
  ArgDef,
  CommandContract,
  ErrorCode,
  FlagDef,
  FlagType,
  InterfaceContract,
  OutputProperty,
  OutputShape,
} from './types.js';

export {
  interfaceContractSchema,
  safeValidateInterfaceContract,
  validateInterfaceContract,
} from './schema.js';

export {
  commandContracts,
  analyzeContract,
  queryContract,
  depsContract,
} from './commands/index.js';

/**
 * Build the full interface contract from the registered command contracts.
 */
export function getFullContract(): InterfaceContract {
  return {
    version: '0.1.0',
    programName: 'mycodemap',
    aliases: ['codemap'],
    description:
      'TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文',
    commands: [...commandContracts],
  };
}

/**
 * Validate a candidate contract object against the meta-schema.
 * @throws {z.ZodError} if validation fails
 */
export function validateContract(data: unknown): InterfaceContract {
  return validateInterfaceContract(data);
}

/**
 * Validate the current full contract against the meta-schema.
 * Useful as a self-test during CI or startup.
 */
export function validateCurrentContract(): {
  valid: boolean;
  errors?: string[];
} {
  const contract = getFullContract();
  const result = safeValidateInterfaceContract(contract);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.issues.map(
      (e) => `${String(e.path)}: ${e.message}`,
    ),
  };
}
