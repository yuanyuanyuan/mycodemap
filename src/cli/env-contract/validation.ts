// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Runtime validation for Project Environment Contract data loaded from generated files or discovery output.

import {
  CONTRACT_CATEGORIES,
  CONTRACT_SEVERITIES,
  SOURCE_AUTHORITIES,
  type ContractItem,
  type ProjectEnvironmentContract,
} from './types.js';

export interface EnvContractValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasAllowedValue<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

export function validateContractItem(
  item: unknown,
  index = 0,
): EnvContractValidationResult {
  const errors: string[] = [];
  const prefix = `Item[${index}]`;

  if (!isRecord(item)) {
    return {
      valid: false,
      errors: [`${prefix}: item must be an object`],
    };
  }

  if (!hasAllowedValue(CONTRACT_CATEGORIES, item.category)) {
    errors.push(`${prefix}: invalid category "${String(item.category)}"`);
  }

  if (!hasAllowedValue(CONTRACT_SEVERITIES, item.severity)) {
    errors.push(`${prefix}: invalid severity "${String(item.severity)}"`);
  }

  if (!isNonEmptyString(item.content)) {
    errors.push(`${prefix}: content must not be empty`);
  }

  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    errors.push(`${prefix}: sources must include at least one source`);
  } else {
    item.sources.forEach((source, sourceIndex) => {
      const sourcePrefix = `${prefix}.sources[${sourceIndex}]`;
      if (!isRecord(source)) {
        errors.push(`${sourcePrefix}: source must be an object`);
        return;
      }
      if (!isNonEmptyString(source.file)) {
        errors.push(`${sourcePrefix}: file is required`);
      }
      if (!isNonEmptyString(source.hash)) {
        errors.push(`${sourcePrefix}: hash is required`);
      }
      if (!hasAllowedValue(SOURCE_AUTHORITIES, source.authority)) {
        errors.push(`${sourcePrefix}: invalid authority "${String(source.authority)}"`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateProjectEnvironmentContract(
  contract: unknown,
): EnvContractValidationResult {
  const errors: string[] = [];

  if (!isRecord(contract)) {
    return {
      valid: false,
      errors: ['Contract must be an object'],
    };
  }

  if (contract.schemaVersion !== 'env-contract.v1') {
    errors.push('schemaVersion must be "env-contract.v1"');
  }

  if (!Array.isArray(contract.items)) {
    errors.push('items must be an array');
  } else {
    contract.items.forEach((item, index) => {
      errors.push(...validateContractItem(item, index).errors);
    });
  }

  if (!Array.isArray(contract.sourceSnapshots)) {
    errors.push('sourceSnapshots must be an array');
  } else {
    contract.sourceSnapshots.forEach((snapshot, index) => {
      const prefix = `sourceSnapshots[${index}]`;
      if (!isRecord(snapshot)) {
        errors.push(`${prefix}: snapshot must be an object`);
        return;
      }
      if (!isNonEmptyString(snapshot.file)) {
        errors.push(`${prefix}: file is required`);
      }
      if (!isNonEmptyString(snapshot.hash)) {
        errors.push(`${prefix}: hash is required`);
      }
      if (!isNonEmptyString(snapshot.lastModified)) {
        errors.push(`${prefix}: lastModified is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertProjectEnvironmentContract(
  contract: unknown,
): ProjectEnvironmentContract {
  const result = validateProjectEnvironmentContract(contract);
  if (!result.valid) {
    throw new Error(`Invalid Project Environment Contract: ${result.errors.join('; ')}`);
  }
  return contract as ProjectEnvironmentContract;
}

export function assertContractItem(item: unknown): ContractItem {
  const result = validateContractItem(item);
  if (!result.valid) {
    throw new Error(`Invalid ContractItem: ${result.errors.join('; ')}`);
  }
  return item as ContractItem;
}
