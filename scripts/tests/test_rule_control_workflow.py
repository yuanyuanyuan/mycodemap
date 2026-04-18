from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class RuleControlWorkflowTests(unittest.TestCase):
    def test_rule_context_is_scoped(self):
        result = subprocess.run(
            [
                "node",
                "scripts/rule-context.mjs",
                "--files",
                "src/cli/index.ts",
                "--format",
                "json",
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )

        payload = json.loads(result.stdout)
        self.assertIn("docs/rules/code-quality-redlines.md", payload["matchedRules"])
        self.assertNotIn("docs/rules/testing.md", payload["matchedRules"])

    def test_execute_workflows_include_rule_context(self):
        workflow_paths = [
            ROOT / ".codex/get-shit-done/workflows/execute-phase.md",
            ROOT / ".claude/get-shit-done/workflows/execute-phase.md",
        ]

        for workflow_path in workflow_paths:
            content = workflow_path.read_text(encoding="utf-8")
            self.assertIn("rule-context.mjs --files", content)
            self.assertIn("<rule_context>", content)

    def test_ci_contains_rule_backstop(self):
        content = (ROOT / ".github/workflows/ci-gateway.yml").read_text(encoding="utf-8")
        self.assertIn("Rule validation backstop", content)
        self.assertIn("python3 scripts/validate-rules.py code", content)


if __name__ == "__main__":
    unittest.main()
