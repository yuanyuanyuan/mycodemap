// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Zod meta-schema for runtime validation of interface contracts

import { z } from 'zod';
import type {
  ArgDef,
  CommandContract,
  ErrorCode,
  FlagDef,
  InterfaceContract,
  OutputProperty,
  OutputShape,
} from './types.js';

export const flagTypeSchema = z.enum(['string', 'boolean', 'number']);

export const argDefSchema: z.ZodType<ArgDef> = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().optional(),
  variadic: z.boolean().optional(),
});

export const flagDefSchema: z.ZodType<FlagDef> = z.object({
  name: z.string(),
  short: z.string().optional(),
  long: z.string(),
  description: z.string(),
  type: flagTypeSchema,
  defaultValue: z.unknown().optional(),
  multiple: z.boolean().optional(),
  required: z.boolean().optional(),
});

export const outputPropertySchema: z.ZodType<OutputProperty> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'null']),
    description: z.string().optional(),
    nullable: z.boolean().optional(),
    items: outputPropertySchema.optional(),
    properties: z.array(outputPropertySchema).optional(),
  })
);

export const outputShapeSchema: z.ZodType<OutputShape> = z.object({
  description: z.string().optional(),
  type: z.enum(['object', 'array']),
  properties: z.array(outputPropertySchema),
});

export const errorCodeSchema: z.ZodType<ErrorCode> = z.object({
  code: z.string(),
  description: z.string(),
});

export const commandContractSchema: z.ZodType<CommandContract> = z.object({
  name: z.string(),
  description: z.string(),
  aliases: z.array(z.string()).optional(),
  args: z.array(argDefSchema),
  flags: z.array(flagDefSchema),
  outputShape: outputShapeSchema,
  errorCodes: z.array(errorCodeSchema),
  examples: z.array(z.string()),
});

export const interfaceContractSchema: z.ZodType<InterfaceContract> = z.object({
  version: z.string(),
  programName: z.string(),
  aliases: z.array(z.string()),
  description: z.string(),
  commands: z.array(commandContractSchema),
});

/**
 * Validate an unknown value as an InterfaceContract.
 * @returns parsed contract on success, throws ZodError on failure
 */
export function validateInterfaceContract(data: unknown): InterfaceContract {
  return interfaceContractSchema.parse(data);
}

/**
 * Safe validation — returns a result object instead of throwing.
 */
export function safeValidateInterfaceContract(
  data: unknown,
): { success: true; data: InterfaceContract } | { success: false; error: z.ZodError } {
  const result = interfaceContractSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
