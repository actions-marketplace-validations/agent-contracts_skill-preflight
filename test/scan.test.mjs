import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { describe, it } from "node:test";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { scanSkillRoot } from "../dist/core/scan.js";
import { parseGitHubUrl } from "../dist/core/filesystem.js";
import { renderReport } from "../dist/report/render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

describe("SkillPreflight scanner", () => {
  it("parses GitHub repository URLs with optional .git suffix", () => {
    assert.deepEqual(parseGitHubUrl("https://github.com/affaan-m/ECC.git"), {
      owner: "affaan-m",
      repo: "ECC"
    });
    assert.deepEqual(parseGitHubUrl("https://github.com/agent-contracts/skill-preflight"), {
      owner: "agent-contracts",
      repo: "skill-preflight"
    });
  });

  it("scores a restrained skill highly", async () => {
    const report = await scanSkillRoot(path.join(projectRoot, "examples", "good-skill"), "good");

    assert.equal(report.skillName, "safe-doc-review");
    assert.ok(report.score >= 85, `expected score >= 85, got ${report.score}`);
    assert.equal(report.findings.filter((finding) => finding.severity === "critical").length, 0);
  });

  it("flags risky skill behavior", async () => {
    const report = await scanSkillRoot(path.join(projectRoot, "examples", "risky-skill"), "risky");

    assert.ok(report.score < 60, `expected score < 60, got ${report.score}`);
    assert.ok(report.findings.some((finding) => finding.id === "security.remote-script-execution"));
    assert.ok(report.findings.some((finding) => finding.id === "security.prompt-injection"));
    assert.ok(report.findings.some((finding) => finding.category === "permissions"));
    assert.ok(report.findings.some((finding) => finding.id === "dependencies.dangerous-lifecycle-script"));
    assert.ok(report.findings.some((finding) => finding.id === "dependencies.python-remote-reference"));
    assert.ok(report.findings.some((finding) => finding.id === "mcp.unpinned-tool-package"));
    assert.ok(report.findings.some((finding) => finding.id === "mcp.hardcoded-secret-env"));
  });

  it("renders json and markdown reports", async () => {
    const skill = await scanSkillRoot(path.join(projectRoot, "examples", "good-skill"), "good");
    const report = {
      generatedAt: "2026-06-05T00:00:00.000Z",
      target: "good",
      reports: [skill],
      summary: {
        count: 1,
        averageScore: skill.score,
        minScore: skill.score,
        highRiskCount: 0
      }
    };

    const json = renderReport(report, "json");
    const markdown = renderReport(report, "markdown");

    assert.equal(JSON.parse(json).reports[0].skillName, "safe-doc-review");
    assert.match(markdown, /SkillPreflight Report/);
  });

  it("renders SARIF for code scanning integrations", async () => {
    const skill = await scanSkillRoot(path.join(projectRoot, "examples", "risky-skill"), "risky");
    const report = {
      generatedAt: "2026-06-05T00:00:00.000Z",
      target: "risky",
      reports: [skill],
      summary: {
        count: 1,
        averageScore: skill.score,
        minScore: skill.score,
        highRiskCount: 1
      }
    };

    const sarif = JSON.parse(renderReport(report, "sarif"));

    assert.equal(sarif.version, "2.1.0");
    assert.equal(sarif.runs[0].tool.driver.name, "SkillPreflight");
    assert.ok(sarif.runs[0].results.some((result) => result.ruleId === "security.remote-script-execution"));
  });

  it("renders a Shields-compatible badge payload", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["dist/index.js", "badge", "examples/good-skill"],
      { cwd: projectRoot }
    );
    const badge = JSON.parse(stdout);

    assert.equal(badge.schemaVersion, 1);
    assert.equal(badge.label, "SkillPreflight");
    assert.match(badge.message, /^100\/100 A$/);
  });
});
