#!/usr/bin/env python3
"""Generate a repo-local capability baseline report without gating workflows."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Sequence

PROJECT_ROOT = Path(__file__).resolve().parent.parent

CommandRunner = Callable[[Sequence[str], Path, int], dict[str, Any]]


def iso_utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def trim_output(value: str | bytes | None, limit: int = 400) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    text = value.strip()
    return text[:limit]


def run_command(command: Sequence[str], cwd: Path, timeout: int) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        duration_ms = round((time.perf_counter() - started) * 1000)
        return {
            "available": True,
            "returncode": completed.returncode,
            "stdout": trim_output(completed.stdout),
            "stderr": trim_output(completed.stderr),
            "duration_ms": duration_ms,
        }
    except FileNotFoundError as error:
        duration_ms = round((time.perf_counter() - started) * 1000)
        return {
            "available": False,
            "returncode": None,
            "stdout": "",
            "stderr": str(error),
            "duration_ms": duration_ms,
        }
    except subprocess.TimeoutExpired as error:
        duration_ms = round((time.perf_counter() - started) * 1000)
        return {
            "available": True,
            "returncode": None,
            "stdout": trim_output(error.stdout),
            "stderr": trim_output(error.stderr) or f"timeout after {timeout}s",
            "duration_ms": duration_ms,
        }


def classify_status(kind: str, available: bool, returncode: int | None) -> str:
    if kind == "required":
        return "PASS" if available and returncode == 0 else "REQUIRED_FAIL"
    if kind == "optional":
        return "PASS" if available and returncode == 0 else "OPTIONAL_DISABLED"
    if kind == "strategy":
        return "STRATEGY_PASS" if available and returncode == 0 else "STRATEGY_FAIL"
    raise ValueError(f"unsupported capability kind: {kind}")


def build_item(
    name: str,
    kind: str,
    command: Sequence[str],
    *,
    cwd: Path,
    timeout: int,
    runner: CommandRunner = run_command,
    notes: list[str] | None = None,
) -> dict[str, Any]:
    outcome = runner(command, cwd, timeout)
    item: dict[str, Any] = {
        "name": name,
        "kind": kind,
        "command": " ".join(command),
        "status": classify_status(kind, outcome["available"], outcome["returncode"]),
        "duration_ms": outcome["duration_ms"],
        "returncode": outcome["returncode"],
        "stdout": outcome["stdout"],
        "stderr": outcome["stderr"],
    }
    if notes:
        item["notes"] = notes
    return item


def build_git_hooks_item(project_root: Path, runner: CommandRunner = run_command) -> dict[str, Any]:
    item = build_item(
        "git_hooks",
        "required",
        ["git", "config", "core.hooksPath"],
        cwd=project_root,
        timeout=10,
        runner=runner,
    )
    configured_path = item["stdout"].strip()
    if item["returncode"] == 0 and configured_path:
        item["notes"] = [f"core.hooksPath={configured_path}"]
        return item

    fallback_dir = project_root / ".githooks"
    if fallback_dir.is_dir():
        item["status"] = "PASS"
        item["notes"] = ["core.hooksPath unset; fallback .githooks directory exists"]
        return item

    item["status"] = "REQUIRED_FAIL"
    item["notes"] = ["core.hooksPath unset and .githooks directory missing"]
    return item


def build_optional_validator_item(project_root: Path, runner: CommandRunner = run_command) -> dict[str, Any]:
    validator_path = project_root / "scripts" / "validate-rules.py"
    if not validator_path.is_file():
        return {
            "name": "validate_rules",
            "kind": "optional",
            "command": "python3 scripts/validate-rules.py code --report-only",
            "status": "OPTIONAL_DISABLED",
            "duration_ms": None,
            "returncode": None,
            "stdout": "",
            "stderr": "",
            "notes": ["scripts/validate-rules.py is unavailable"],
        }

    item = build_item(
        "validate_rules",
        "optional",
        ["python3", "scripts/validate-rules.py", "code", "--report-only"],
        cwd=project_root,
        timeout=180,
        runner=runner,
    )
    if item["status"] == "OPTIONAL_DISABLED" and not item.get("notes"):
        item["notes"] = ["validator exists but report-only command is unavailable"]
    return item


def summarize(items: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    summary = {
        "required": {"passed": 0, "failed": 0, "total": 0},
        "optional": {"passed": 0, "disabled": 0, "total": 0},
        "strategy": {"passed": 0, "failed": 0, "total": 0},
    }

    for item in items:
        kind = item["kind"]
        status = item["status"]
        summary[kind]["total"] += 1
        if kind == "required":
            summary[kind]["passed" if status == "PASS" else "failed"] += 1
        elif kind == "optional":
            summary[kind]["passed" if status == "PASS" else "disabled"] += 1
        else:
            summary[kind]["passed" if status == "STRATEGY_PASS" else "failed"] += 1
    return summary


def build_report(project_root: Path = PROJECT_ROOT, runner: CommandRunner = run_command) -> dict[str, Any]:
    items = [
        build_item("python3", "required", ["python3", "--version"], cwd=project_root, timeout=10, runner=runner),
        build_item("node", "required", ["node", "--version"], cwd=project_root, timeout=10, runner=runner),
        build_git_hooks_item(project_root, runner=runner),
        build_item(
            "typecheck",
            "strategy",
            ["npm", "run", "typecheck"],
            cwd=project_root,
            timeout=300,
            runner=runner,
        ),
        build_item(
            "tests",
            "strategy",
            ["npm", "test"],
            cwd=project_root,
            timeout=300,
            runner=runner,
        ),
        build_item(
            "lint",
            "strategy",
            ["npm", "run", "lint"],
            cwd=project_root,
            timeout=300,
            runner=runner,
        ),
        build_item(
            "codemap_cli",
            "optional",
            ["node", "dist/cli/index.js", "--version"],
            cwd=project_root,
            timeout=30,
            runner=runner,
        ),
        build_optional_validator_item(project_root, runner=runner),
    ]

    return {
        "version": 1,
        "generated_at": iso_utc_now(),
        "summary": summarize(items),
        "items": items,
    }


def write_report(report: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a capability baseline report for repo-local rule control.")
    parser.add_argument("--output", type=Path, help="Optional path to write the JSON report.")
    return parser.parse_args(argv)


def main(
    argv: Sequence[str] | None = None,
    *,
    report_builder: Callable[[], dict[str, Any]] | None = None,
) -> int:
    args = parse_args(argv)
    report = (report_builder or build_report)()
    if args.output is not None:
        write_report(report, args.output)
    json.dump(report, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
