#!/usr/bin/env node
// Advisory-only scoped rule routing for Write/Edit operations.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const validationReminder = 'python3 scripts/validate-rules.py code --report-only';

function normalizePath(cwd, filePath) {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(cwd, filePath);

  return path.relative(cwd, resolved).replace(/\\/g, '/');
}

function loadConfig(cwd) {
  const configPath = path.join(cwd, '.claude', 'rule-system.config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  input += chunk;
});
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);

  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name;
    if (toolName !== 'Write' && toolName !== 'Edit') {
      process.exit(0);
    }

    const cwd = data.cwd || process.cwd();
    const config = loadConfig(cwd);
    if (!config?.enabled || !config.soft_gate?.change_analyzer) {
      process.exit(0);
    }

    const filePath = data.tool_input?.file_path || data.tool_input?.path || '';
    if (!filePath) {
      process.exit(0);
    }

    const relativeFile = normalizePath(cwd, filePath);
    const helperPath = path.join(cwd, 'scripts', 'rule-context.mjs');
    if (!fs.existsSync(helperPath)) {
      process.exit(0);
    }

    const helperResult = spawnSync(
      process.execPath,
      [helperPath, '--files', relativeFile, '--format', 'prompt'],
      {
        cwd,
        encoding: 'utf8',
      },
    );

    if (helperResult.status !== 0) {
      process.exit(0);
    }

    const scopedPrompt = helperResult.stdout.trim();
    if (!scopedPrompt || scopedPrompt === 'No scoped rules inferred') {
      process.exit(0);
    }

    const advisoryLines = [
      `⚠️ RULE ROUTING ADVISORY: ${path.basename(relativeFile)} matched scoped repo rules.`,
      scopedPrompt,
    ];

    if (!scopedPrompt.includes(validationReminder)) {
      advisoryLines.push('', 'Verify after edits:', `- ${validationReminder}`);
    }

    advisoryLines.push('', 'This is advisory-only. Continue with the edit if it is intentional.');

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: advisoryLines.join('\n'),
        },
      }),
    );
  } catch {
    process.exit(0);
  }
});
