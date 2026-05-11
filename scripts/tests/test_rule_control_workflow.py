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
        existing_paths = [workflow_path for workflow_path in workflow_paths if workflow_path.exists()]

        if not existing_paths:
            self.skipTest("execute-phase workflow paths are not vendored in this checkout")

        for workflow_path in existing_paths:
            content = workflow_path.read_text(encoding="utf-8")
            self.assertIn("rule-context.mjs --files", content)
            self.assertIn("<rule_context>", content)

    def test_ci_contains_rule_backstop(self):
        content = (ROOT / ".github/workflows/ci-gateway.yml").read_text(encoding="utf-8")
        self.assertIn("Rule validation backstop", content)
        self.assertIn("python3 scripts/validate-rules.py code", content)

    def test_pre_commit_report_only_timeout_guard_exists(self):
        for hook_path in [
            ROOT / ".mycodemap" / "hooks" / "pre-commit",
            ROOT / "scripts" / "hooks" / "templates" / "pre-commit",
        ]:
            content = hook_path.read_text(encoding="utf-8")
            self.assertIn("RULE_REPORT_ONLY_TIMEOUT_SECONDS", content)
            self.assertIn("Rule validation report-only timed out after", content)
            self.assertIn("subprocess.TimeoutExpired", content)

    def test_pre_commit_contains_generic_test_strategy_fallbacks(self):
        for hook_path in [
            ROOT / ".mycodemap" / "hooks" / "pre-commit",
            ROOT / "scripts" / "hooks" / "templates" / "pre-commit",
        ]:
            content = hook_path.read_text(encoding="utf-8")
            self.assertIn("TRIGGERED_SOURCE_FILES", content)
            self.assertIn("TEST_STRATEGY", content)
            self.assertIn("package-test", content)
            self.assertIn("pytest", content)
            self.assertIn("go test ./...", content)
            self.assertIn("cargo test", content)

    def test_pre_commit_contains_agent_protocol_contract(self):
        for hook_path in [
            ROOT / ".mycodemap" / "hooks" / "pre-commit",
            ROOT / "scripts" / "hooks" / "templates" / "pre-commit",
        ]:
            content = hook_path.read_text(encoding="utf-8")
            self.assertIn("CODEMAP_PRECHECK_PROTOCOL:", content)
            self.assertIn("CODEMAP_AGENT_CONTEXT", content)
            self.assertIn("schema': 'codemap.precommit.v1'", content)
            self.assertIn("suggested_groups", content)
            self.assertIn("attempt_id", content)

    def test_commit_msg_contains_agent_protocol_contract(self):
        for hook_path in [
            ROOT / ".mycodemap" / "hooks" / "commit-msg",
            ROOT / "scripts" / "hooks" / "templates" / "commit-msg",
        ]:
            content = hook_path.read_text(encoding="utf-8")
            self.assertIn("CODEMAP_PRECHECK_PROTOCOL:", content)
            self.assertIn("CODEMAP_AGENT_CONTEXT", content)
            self.assertIn("schema': 'codemap.commitmsg.v1'", content)
            self.assertIn("rewrite_commit_message", content)
            self.assertIn("commit-scope-message", content)


if __name__ == "__main__":
    unittest.main()
