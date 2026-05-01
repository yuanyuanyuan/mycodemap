// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] TypeScript types for the CLI interface contract schema — single source of truth for command shapes

/**
 * Supported flag value types
 */
export type FlagType = 'string' | 'boolean' | 'number';

/**
 * Positional argument definition
 */
export interface ArgDef {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
}

/**
 * Flag / option definition
 */
export interface FlagDef {
  name: string;
  short?: string;
  long: string;
  description: string;
  type: FlagType;
  defaultValue?: unknown;
  multiple?: boolean;
  required?: boolean;
}

/**
 * Output property descriptor (JSON Schema-ish, serializable)
 */
export interface OutputProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  description?: string;
  nullable?: boolean;
  items?: OutputProperty;
  properties?: OutputProperty[];
}

/**
 * Output shape descriptor for a command
 */
export interface OutputShape {
  description?: string;
  type: 'object' | 'array';
  properties: OutputProperty[];
}

/**
 * Known error code for a command
 */
export interface ErrorCode {
  code: string;
  description: string;
}

/**
 * Contract for a single CLI command
 */
export interface CommandContract {
  name: string;
  description: string;
  aliases?: string[];
  args: ArgDef[];
  flags: FlagDef[];
  outputShape: OutputShape;
  errorCodes: ErrorCode[];
  examples: string[];
}

/**
 * Full CLI interface contract
 */
export interface InterfaceContract {
  version: string;
  programName: string;
  aliases: string[];
  description: string;
  commands: CommandContract[];
}
