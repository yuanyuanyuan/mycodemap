from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


def load_validate_rules_module():
    module_path = Path(__file__).resolve().parents[1] / "validate-rules.py"
    spec = importlib.util.spec_from_file_location("validate_rules", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


validate_rules = load_validate_rules_module()


def make_check(level: str, status: str):
    return validate_rules.make_check(
        name=f"{level.lower()}-{status}",
        level=level,
        command=["echo", status],
        status=status,
        output=status,
    )


class ValidateRulesExitCodeTests(unittest.TestCase):
    def test_exit_code_for_no_findings(self):
        checks = [make_check("P0", "passed"), make_check("P1", "passed")]
        self.assertEqual(validate_rules.resolve_exit_code(checks, report_only=False), 0)

    def test_exit_code_for_p0(self):
        checks = [make_check("P0", "failed"), make_check("P1", "passed")]
        self.assertEqual(validate_rules.resolve_exit_code(checks, report_only=False), 1)

    def test_exit_code_for_p1(self):
        checks = [make_check("P0", "passed"), make_check("P1", "failed")]
        self.assertEqual(validate_rules.resolve_exit_code(checks, report_only=False), 2)

    def test_exit_code_for_p2(self):
        checks = [make_check("P0", "passed"), make_check("P2", "failed")]
        self.assertEqual(validate_rules.resolve_exit_code(checks, report_only=False), 3)

    def test_exit_code_for_unavailable(self):
        checks = [make_check("P0", "failed"), make_check("P1", "unavailable")]
        self.assertEqual(validate_rules.resolve_exit_code(checks, report_only=False), 4)

    def test_report_only_exits_zero(self):
        checks = [make_check("P0", "failed"), make_check("P1", "unavailable")]
        self.assertEqual(validate_rules.resolve_exit_code(checks, report_only=True), 0)

    def test_report_status_values_are_runtime_only(self):
        checks = [
            make_check("P0", "passed"),
            make_check("P1", "failed"),
            make_check("P2", "unavailable"),
        ]
        report = validate_rules.build_report("all", checks, report_only=False)
        self.assertEqual([check["level"] for check in report["checks"]], ["P0", "P1", "P2"])
        self.assertSetEqual(
            {check["status"] for check in report["checks"]},
            {"passed", "failed", "unavailable"},
        )

    def test_arch_check_marks_missing_dist_as_unavailable(self):
        missing_dist = Path("/tmp/validate-rules-missing-dist.js")
        checks = validate_rules.execute_checks("arch", dist_cli_path=missing_dist)
        self.assertEqual(len(checks), 1)
        self.assertEqual(checks[0]["level"], "P0")
        self.assertEqual(checks[0]["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
