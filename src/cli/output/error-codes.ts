// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Canonical error code registry with prefix classification and remediation map

export const ErrorCodes = {
  // Dependency errors
  DEP_NATIVE_MISSING: 'DEP_NATIVE_MISSING',
  DEP_WASM_FALLBACK_AVAILABLE: 'DEP_WASM_FALLBACK_AVAILABLE',
  DEP_MODULE_NOT_FOUND: 'DEP_MODULE_NOT_FOUND',
  DEP_REBUILD_REQUIRED: 'DEP_REBUILD_REQUIRED',

  // Configuration errors
  CFG_INVALID_CONFIG: 'CFG_INVALID_CONFIG',
  CFG_WORKSPACE_NOT_INITIALIZED: 'CFG_WORKSPACE_NOT_INITIALIZED',
  CFG_WORKSPACE_DRIFT: 'CFG_WORKSPACE_DRIFT',

  // Runtime errors
  RUN_COMMAND_FAILED: 'RUN_COMMAND_FAILED',
  RUN_PARSE_ERROR: 'RUN_PARSE_ERROR',
  RUN_TIMEOUT: 'RUN_TIMEOUT',

  // Filesystem errors
  FS_FILE_NOT_FOUND: 'FS_FILE_NOT_FOUND',
  FS_PERMISSION_DENIED: 'FS_PERMISSION_DENIED',
  FS_WORKING_DIR_INVALID: 'FS_WORKING_DIR_INVALID',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ErrorRemediation: Record<
  ErrorCode,
  { message: string; nextCommand?: string; confidence: number }
> = {
  DEP_NATIVE_MISSING: {
    message:
      'Native dependency cannot be loaded. Try: --wasm-fallback, npm rebuild, or install prebuilt binaries',
    nextCommand: 'codemap --wasm-fallback',
    confidence: 0.9,
  },
  DEP_WASM_FALLBACK_AVAILABLE: {
    message: 'Native dependency unavailable but WASM fallback is available',
    nextCommand: 'codemap --wasm-fallback',
    confidence: 0.95,
  },
  DEP_MODULE_NOT_FOUND: {
    message:
      'Required module not found. Run npm install to install dependencies',
    nextCommand: 'npm install',
    confidence: 0.85,
  },
  DEP_REBUILD_REQUIRED: {
    message: 'Native modules need rebuilding. Run npm rebuild',
    nextCommand: 'npm rebuild',
    confidence: 0.85,
  },
  CFG_INVALID_CONFIG: {
    message:
      'Configuration file is invalid. Check .mycodemap/config.json syntax',
    confidence: 0.7,
  },
  CFG_WORKSPACE_NOT_INITIALIZED: {
    message: 'Workspace not initialized. Run codemap init first',
    nextCommand: 'codemap init',
    confidence: 0.9,
  },
  CFG_WORKSPACE_DRIFT: {
    message:
      'Workspace has drifted from receipt state. Run codemap doctor for details',
    nextCommand: 'codemap doctor',
    confidence: 0.8,
  },
  RUN_COMMAND_FAILED: {
    message: 'Command execution failed. Check the error details above',
    confidence: 0.3,
  },
  RUN_PARSE_ERROR: {
    message: 'Parse error in source file. Verify the file syntax',
    confidence: 0.5,
  },
  RUN_TIMEOUT: {
    message:
      'Operation timed out. Try with a smaller scope or increase timeout',
    confidence: 0.6,
  },
  FS_FILE_NOT_FOUND: {
    message: 'Required file not found. Verify the path is correct',
    confidence: 0.7,
  },
  FS_PERMISSION_DENIED: {
    message: 'Permission denied. Check file/directory permissions',
    confidence: 0.6,
  },
  FS_WORKING_DIR_INVALID: {
    message: 'Working directory is invalid or does not exist',
    confidence: 0.8,
  },
};
