// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Top-level 'doctor' command — diagnose CodeMap ecosystem health

import { Command } from 'commander';
import { runDoctor } from '../doctor/orchestrator.js';
import { formatDoctorJsonData, formatDoctorReport } from '../doctor/formatter.js';
import { resolveOutputMode, formatError } from '../output/index.js';

interface DoctorCommandOptions {
  json?: boolean;
  human?: boolean;
}

async function doctorAction(options: DoctorCommandOptions): Promise<void> {
  try {
    const report = await runDoctor({ json: options.json, cwd: process.cwd() });

    // Resolve output mode: --human/--json/no-flag = TTY auto-detect
    const mode = resolveOutputMode({ json: options.json, human: options.human });

    // JSON mode: write the serializable data array; Human mode: write the formatted report
    if (mode === 'json') {
      const data = formatDoctorJsonData(report.results);
      process.stdout.write(JSON.stringify(data) + '\n');
    } else {
      process.stdout.write(formatDoctorReport(report.results) + '\n');
    }

    // Set exit code without calling process.exit() — allow commander natural exit
    process.exitCode = report.exitCode;
  } catch (error) {
    const mode = resolveOutputMode({ json: options.json, human: options.human });
    process.stdout.write(formatError(error, mode) + '\n');
    process.exitCode = 1;
  }
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose CodeMap ecosystem health')
  .option('-j, --json', 'Output diagnostics as JSON')
  .option('--human', 'Force human-readable output')
  .action(doctorAction);
