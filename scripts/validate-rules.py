#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable, Sequence

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_CLI_PATH = REPO_ROOT / "dist" / "cli" / "index.js"
ALLOWED_LEVELS = ("P0", "P1", "P2")
ALLOWED_STATUSES = ("passed", "failed", "unavailable")
TYPECHECK_COMMAND = "npm run typecheck"
TEST_COMMAND = "npm test"
LINT_COMMAND = "npm run lint"
ARCH_COMMAND = "node dist/cli/index.js deps -m src/domain"
Runner = Callable[[Sequence[str]], dict[str, str]]


def command_to_string(command: Sequence[str]) -> str:
    return " ".join(command)


def combine_output(stdout: str | None, stderr: str | None) -> str:
    parts = [part.strip() for part in (stdout, stderr) if part and part.strip()]
    if parts:
        return "\n".join(parts)
    return "(no output)"


def run_command(command: Sequence[str]) -> dict[str, str]:
    try:
        completed = subprocess.run(
            list(command),
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
    except FileNotFoundError as error:
        return {"status": "unavailable", "output": str(error)}
    except OSError as error:
        return {"status": "unavailable", "output": str(error)}
    except subprocess.TimeoutExpired as error:
        return {
            "status": "failed",
            "output": combine_output(error.stdout, error.stderr)
            + "\nCommand timed out after 300 seconds.",
        }

    return {
        "status": "passed" if completed.returncode == 0 else "failed",
        "output": combine_output(completed.stdout, completed.stderr),
    }


def make_check(
    name: str,
    level: str,
    command: Sequence[str],
    status: str,
    output: str,
) -> dict[str, str]:
    if level not in ALLOWED_LEVELS:
        raise ValueError(f"Unsupported level: {level}")
    if status not in ALLOWED_STATUSES:
        raise ValueError(f"Unsupported status: {status}")

    return {
        "name": name,
        "level": level,
        "status": status,
        "command": command_to_string(command),
        "output": output,
    }


def code_check_specs() -> list[dict[str, Any]]:
    return [
        {
            "name": "typecheck",
            "level": "P0",
            "command": TYPECHECK_COMMAND.split(),
        },
        {
            "name": "test",
            "level": "P0",
            "command": TEST_COMMAND.split(),
        },
        {
            "name": "lint",
            "level": "P1",
            "command": LINT_COMMAND.split(),
        },
    ]


def arch_check_specs(dist_cli_path: Path = DIST_CLI_PATH) -> list[dict[str, Any]]:
    command = ARCH_COMMAND.split()
    if not dist_cli_path.exists():
        return [
            make_check(
                name="architecture-domain-deps",
                level="P0",
                command=command,
                status="unavailable",
                output=f"dist CLI is unavailable: {dist_cli_path} was not found.",
            )
        ]

    return [
        {
            "name": "architecture-domain-deps",
            "level": "P0",
            "command": command,
        }
    ]


def build_specs(target: str, dist_cli_path: Path = DIST_CLI_PATH) -> list[dict[str, Any]]:
    if target == "code":
        return code_check_specs()
    if target == "arch":
        return arch_check_specs(dist_cli_path=dist_cli_path)
    if target == "all":
        return code_check_specs() + arch_check_specs(dist_cli_path=dist_cli_path)
    raise ValueError(f"Unsupported target: {target}")


def execute_checks(
    target: str,
    runner: Runner = run_command,
    dist_cli_path: Path = DIST_CLI_PATH,
) -> list[dict[str, str]]:
    checks: list[dict[str, str]] = []

    for spec in build_specs(target=target, dist_cli_path=dist_cli_path):
        if "status" in spec:
            checks.append(spec)
            continue

        result = runner(spec["command"])
        checks.append(
            make_check(
                name=spec["name"],
                level=spec["level"],
                command=spec["command"],
                status=result["status"],
                output=result["output"],
            )
        )

    return checks


def count_checks(checks: list[dict[str, str]], *, status: str, level: str | None = None) -> int:
    return sum(
        1
        for check in checks
        if check["status"] == status and (level is None or check["level"] == level)
    )


def resolve_exit_code(checks: list[dict[str, str]], report_only: bool) -> int:
    if report_only:
        return 0
    if any(check["status"] == "unavailable" for check in checks):
        return 4
    if any(check["status"] == "failed" and check["level"] == "P0" for check in checks):
        return 1
    if any(check["status"] == "failed" and check["level"] == "P1" for check in checks):
        return 2
    if any(check["status"] == "failed" and check["level"] == "P2" for check in checks):
        return 3
    return 0


def build_summary(checks: list[dict[str, str]], exit_code: int, report_only: bool) -> dict[str, Any]:
    return {
        "reportOnly": report_only,
        "exitCode": exit_code,
        "failedByLevel": {
            level: count_checks(checks, status="failed", level=level)
            for level in ALLOWED_LEVELS
        },
        "passed": count_checks(checks, status="passed"),
        "unavailable": count_checks(checks, status="unavailable"),
    }


def build_report(target: str, checks: list[dict[str, str]], report_only: bool) -> dict[str, Any]:
    exit_code = resolve_exit_code(checks, report_only=report_only)
    return {
        "target": target,
        "checks": checks,
        "summary": build_summary(checks, exit_code=exit_code, report_only=report_only),
    }


def summary_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    failed = summary["failedByLevel"]
    return (
        "SUMMARY "
        f"target={report['target']} "
        f"report_only={str(summary['reportOnly']).lower()} "
        f"exit_code={summary['exitCode']} "
        f"P0={failed['P0']} "
        f"P1={failed['P1']} "
        f"P2={failed['P2']} "
        f"unavailable={summary['unavailable']}"
    )


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate repo-local rule checks for code and architecture gates."
    )
    parser.add_argument("target", choices=("code", "arch", "all"))
    parser.add_argument("--report-only", action="store_true", dest="report_only")
    return parser.parse_args(argv)


def exit_process(exit_code: int) -> None:
    if exit_code == 0:
        sys.exit(0)
    if exit_code == 1:
        sys.exit(1)
    if exit_code == 2:
        sys.exit(2)
    if exit_code == 3:
        sys.exit(3)
    sys.exit(4)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    report = build_report(
        target=args.target,
        checks=execute_checks(target=args.target),
        report_only=args.report_only,
    )
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    print(summary_text(report), file=sys.stderr)
    return int(report["summary"]["exitCode"])


if __name__ == "__main__":
    exit_process(main())
