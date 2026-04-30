// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Top-level 'doctor' command — diagnose CodeMap ecosystem health

import { Command } from 'commander';
import { runDoctor } from '../doctor/orchestrator.js';
import { formatDoctorJson, formatDoctorReport } from '../doctor/formatter.js';

interface DoctorCommandOptions {
  json?: boolean;
}

async function doctorAction(options: DoctorCommandOptions): Promise<void> {
  const report = await runDoctor({ json: options.json, cwd: process.cwd() });

  // Determine output mode: --json flag takes priority, then TTY auto-detection
  const useJson = options.json || !process.stdout.isTTY;

  const output = useJson
    ? formatDoctorJson(report.results)
    : formatDoctorReport(report.results);

  console.log(output);

  // Set exit code without calling process.exit() — allow commander natural exit
  process.exitCode = report.exitCode;
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose CodeMap ecosystem health')
  .option('-j, --json', 'Output diagnostics as JSON')
  .action(doctorAction);
