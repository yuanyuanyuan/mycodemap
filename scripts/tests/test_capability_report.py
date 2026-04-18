import contextlib
import io
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


def load_capability_report_module():
    module_path = Path(__file__).resolve().parents[1] / "capability-report.py"
    spec = importlib.util.spec_from_file_location("capability_report", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CapabilityReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_capability_report_module()

    def test_required_fail_status(self):
        def failing_runner(command, cwd, timeout):
            return {
                "available": True,
                "returncode": 1,
                "stdout": "",
                "stderr": "failed",
                "duration_ms": 8,
            }

        item = self.module.build_item(
            "python3",
            "required",
            ["python3", "--version"],
            cwd=Path("."),
            timeout=10,
            runner=failing_runner,
        )

        self.assertEqual(item["status"], "REQUIRED_FAIL")

    def test_optional_disabled_status(self):
        def missing_runner(command, cwd, timeout):
            return {
                "available": False,
                "returncode": None,
                "stdout": "",
                "stderr": "missing",
                "duration_ms": 5,
            }

        item = self.module.build_item(
            "validate_rules",
            "optional",
            ["python3", "scripts/validate-rules.py", "code", "--report-only"],
            cwd=Path("."),
            timeout=10,
            runner=missing_runner,
        )

        self.assertEqual(item["status"], "OPTIONAL_DISABLED")

    def test_output_file_written(self):
        fake_report = {
            "version": 1,
            "generated_at": "2026-04-19T00:00:00Z",
            "summary": {"required": {"passed": 1, "failed": 0, "total": 1}},
            "items": [{"name": "python3", "kind": "required", "status": "PASS"}],
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "capability-report.json"
            with contextlib.redirect_stdout(io.StringIO()):
                exit_code = self.module.main(["--output", str(output_path)], report_builder=lambda: fake_report)

            self.assertEqual(exit_code, 0)
            self.assertTrue(output_path.exists())

            payload = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertIn("summary", payload)
            self.assertIn("items", payload)


if __name__ == "__main__":
    unittest.main()
