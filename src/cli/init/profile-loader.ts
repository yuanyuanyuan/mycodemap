// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Phase 53 profile JSON loader with strict zod validation. Reads built-in
// bootstrap profiles from the package's `src/cli/init/profiles/` directory and
// validates them against `bootstrapProfileSchema` before returning a typed result.

import { z } from 'zod';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const bootstrapProfileSchema = z.object({
  parser: z.object({
    include: z.array(z.string()).min(1),
    extensions: z.array(z.string()).min(1),
  }),
  ignore: z.array(z.string()),
  analysis_depth: z.enum(['shallow', 'standard', 'deep']),
});

export type BootstrapProfile = z.infer<typeof bootstrapProfileSchema>;

/**
 * Allow-list of built-in profile names (security: prevents arbitrary file reads
 * via `--profile ../../../etc/passwd`-style inputs; threat T-53-01).
 */
const ALLOWED_PROFILE_NAMES = new Set<string>(['nodejs', 'python', 'go', 'rust', 'generic']);

/**
 * Map `analysis_depth` profile values to the canonical config `mode` field.
 *
 * Documented mapping (per RESOLVED open question 2 in 53-RESEARCH.md):
 *   shallow  -> fast
 *   standard -> hybrid
 *   deep     -> smart
 *
 * Consumed by `profile-plan.ts` in plan 53-02 when merging profile defaults
 * into `.mycodemap/config.json`. Kept here so the mapping lives next to the
 * schema that defines the source enum.
 */
export const ANALYSIS_DEPTH_TO_MODE: Record<BootstrapProfile['analysis_depth'], 'fast' | 'hybrid' | 'smart'> = {
  shallow: 'fast',
  standard: 'hybrid',
  deep: 'smart',
};

function resolvePackageRoot(): string {
  return fileURLToPath(new URL('../../../', import.meta.url));
}

/**
 * Resolve the absolute filesystem path for a built-in profile JSON file.
 *
 * Throws on unknown names or any name containing path separators / parent-dir
 * tokens (mitigation for T-53-01 path traversal).
 */
export function resolveProfilePath(profileName: string): string {
  if (!ALLOWED_PROFILE_NAMES.has(profileName)) {
    throw new Error(`未知 profile: ${profileName}`);
  }
  if (profileName.includes('/') || profileName.includes('\\') || profileName.includes('..')) {
    throw new Error(`非法 profile 名称: ${profileName}`);
  }
  return path.join(resolvePackageRoot(), 'src', 'cli', 'init', 'profiles', `${profileName}.json`);
}

/**
 * Load and validate a built-in bootstrap profile by name.
 *
 * Errors:
 *  - Unknown / illegal name → from `resolveProfilePath`
 *  - File missing on disk   → "Profile 文件未找到" (does NOT include full path
 *                              in the message body to mitigate T-53-04 info leak;
 *                              the path is appended only in the trailing detail)
 *  - JSON parse failure     → re-thrown with profile name context
 *  - Schema validation fail → flattened ZodError → "Profile 验证失败 [name]: ..."
 *
 * Pure: no `process.exit`; callers handle exit codes at CLI entry.
 */
export function loadProfile(profileName: string): BootstrapProfile {
  const filePath = resolveProfilePath(profileName);

  let text: string;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') {
      throw new Error(`Profile 文件未找到 [${profileName}]: ${filePath}`);
    }
    throw new Error(`无法读取 profile [${profileName}]: ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Profile JSON 解析失败 [${profileName}]: ${(error as Error).message}`);
  }

  try {
    return bootstrapProfileSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Profile 验证失败 [${profileName}]: ${issues}`);
    }
    throw error;
  }
}
