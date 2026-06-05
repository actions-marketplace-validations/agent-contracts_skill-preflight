import type { Finding, ScanReport, SkillReport } from "../core/types.js";

export type ReportFormat = "text" | "json" | "markdown" | "html" | "sarif";

export function renderReport(report: ScanReport, format: ReportFormat): string {
  switch (format) {
    case "json":
      return `${JSON.stringify(report, null, 2)}\n`;
    case "markdown":
      return renderMarkdown(report);
    case "html":
      return renderHtml(report);
    case "sarif":
      return renderSarif(report);
    case "text":
      return renderText(report);
  }
}

export function parseFormat(value: string): ReportFormat {
  if (value === "text" || value === "json" || value === "markdown" || value === "html" || value === "sarif") {
    return value;
  }

  throw new Error(`Unsupported format: ${value}. Use text, json, markdown, html, or sarif.`);
}

function renderText(report: ScanReport): string {
  const lines: string[] = [];
  lines.push("SkillPreflight Report");
  lines.push(`Target: ${report.target}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Skills scanned: ${report.summary.count}`);
  lines.push(`Average score: ${report.summary.averageScore}/100`);
  lines.push("");

  for (const skill of report.reports) {
    lines.push(`${skill.skillName}: ${skill.score}/100 (${skill.grade}) - ${skill.recommendation}`);
    lines.push(`Path: ${skill.rootPath}`);
    lines.push("Category scores:");

    for (const category of skill.categories) {
      lines.push(`  - ${category.label}: ${category.score}/${category.maxScore}`);
    }

    lines.push("Metrics:");
    lines.push(`  - Files: ${skill.metrics.totalFiles}`);
    lines.push(`  - Size: ${formatBytes(skill.metrics.totalBytes)}`);
    lines.push(`  - Estimated activation tokens: ${skill.metrics.estimatedActivationTokens}`);

    if (skill.findings.length === 0) {
      lines.push("Findings: none");
    } else {
      lines.push("Top findings:");
      for (const finding of skill.findings.slice(0, 8)) {
        lines.push(`  - [${finding.severity.toUpperCase()}] ${finding.title}${formatLocation(finding)}`);
        lines.push(`    ${finding.description}`);
        lines.push(`    Fix: ${finding.recommendation}`);
      }

      if (skill.findings.length > 8) {
        lines.push(`  - ... ${skill.findings.length - 8} more findings`);
      }
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderMarkdown(report: ScanReport): string {
  const lines: string[] = [];
  lines.push("# SkillPreflight Report");
  lines.push("");
  lines.push(`- Target: \`${report.target}\``);
  lines.push(`- Generated: \`${report.generatedAt}\``);
  lines.push(`- Skills scanned: ${report.summary.count}`);
  lines.push(`- Average score: ${report.summary.averageScore}/100`);
  lines.push(`- High risk skills: ${report.summary.highRiskCount}`);
  lines.push("");

  for (const skill of report.reports) {
    lines.push(`## ${skill.skillName}: ${skill.score}/100 (${skill.grade})`);
    lines.push("");
    lines.push(`**Recommendation:** ${skill.recommendation}`);
    lines.push("");
    lines.push(`**Path:** \`${skill.rootPath}\``);
    lines.push("");
    lines.push("| Category | Score |");
    lines.push("| --- | ---: |");
    for (const category of skill.categories) {
      lines.push(`| ${category.label} | ${category.score}/${category.maxScore} |`);
    }
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("| --- | ---: |");
    lines.push(`| Files | ${skill.metrics.totalFiles} |`);
    lines.push(`| Size | ${formatBytes(skill.metrics.totalBytes)} |`);
    lines.push(`| Estimated activation tokens | ${skill.metrics.estimatedActivationTokens} |`);
    lines.push("");
    lines.push("### Findings");
    lines.push("");

    if (skill.findings.length === 0) {
      lines.push("No findings.");
      lines.push("");
      continue;
    }

    for (const finding of skill.findings) {
      lines.push(`- **[${finding.severity.toUpperCase()}] ${finding.title}**${formatLocation(finding)}`);
      lines.push(`  ${finding.description}`);
      lines.push(`  Recommendation: ${finding.recommendation}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report: ScanReport): string {
  const skillSections = report.reports.map(renderSkillHtml).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkillPreflight Report</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f7f9; color: #17202a; }
    main { max-width: 1040px; margin: 0 auto; padding: 32px 20px 56px; }
    header { margin-bottom: 24px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 22px; margin: 0 0 12px; }
    .summary, .skill { background: #fff; border: 1px solid #d9dee7; border-radius: 8px; padding: 18px; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .metric { background: #f0f3f7; border-radius: 6px; padding: 12px; }
    .metric span { display: block; color: #5f6b7a; font-size: 12px; }
    .metric strong { display: block; font-size: 20px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border-bottom: 1px solid #e5e8ef; padding: 9px; text-align: left; }
    th:last-child, td:last-child { text-align: right; }
    .finding { border-left: 4px solid #8a97a8; padding: 10px 12px; background: #f8fafc; margin: 10px 0; border-radius: 4px; }
    .critical, .high { border-left-color: #c0392b; }
    .medium { border-left-color: #d9822b; }
    .low { border-left-color: #3978c3; }
    code { background: #eef1f5; padding: 2px 5px; border-radius: 4px; }
    @media (prefers-color-scheme: dark) {
      body { background: #11161d; color: #e8edf4; }
      .summary, .skill { background: #18212b; border-color: #2b3847; }
      .metric, .finding { background: #202b36; }
      th, td { border-bottom-color: #2b3847; }
      code { background: #263240; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>SkillPreflight Report</h1>
      <div>Target: <code>${escapeHtml(report.target)}</code></div>
      <div>Generated: <code>${escapeHtml(report.generatedAt)}</code></div>
    </header>
    <section class="summary">
      <div class="grid">
        <div class="metric"><span>Skills scanned</span><strong>${report.summary.count}</strong></div>
        <div class="metric"><span>Average score</span><strong>${report.summary.averageScore}/100</strong></div>
        <div class="metric"><span>Minimum score</span><strong>${report.summary.minScore}/100</strong></div>
        <div class="metric"><span>High risk</span><strong>${report.summary.highRiskCount}</strong></div>
      </div>
    </section>
    ${skillSections}
  </main>
</body>
</html>
`;
}

function renderSarif(report: ScanReport): string {
  const ruleMap = new Map<string, Finding>();
  const results = [];

  for (const skill of report.reports) {
    for (const finding of skill.findings) {
      ruleMap.set(finding.id, finding);
      results.push({
        ruleId: finding.id,
        level: sarifLevel(finding),
        message: {
          text: `${finding.title}: ${finding.description} Recommendation: ${finding.recommendation}`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: finding.file ? normalizeSarifUri(finding.file) : normalizeSarifUri(skill.rootPath)
              },
              region: finding.line ? { startLine: finding.line } : undefined
            }
          }
        ],
        properties: {
          category: finding.category,
          severity: finding.severity,
          scoreImpact: finding.scoreImpact,
          skillName: skill.skillName,
          skillScore: skill.score
        }
      });
    }
  }

  const rules = [...ruleMap.values()].map((finding) => ({
    id: finding.id,
    name: finding.title,
    shortDescription: {
      text: finding.title
    },
    fullDescription: {
      text: finding.description
    },
    help: {
      text: finding.recommendation
    },
    properties: {
      category: finding.category,
      severity: finding.severity
    }
  }));

  return `${JSON.stringify(
    {
      version: "2.1.0",
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "SkillPreflight",
              informationUri: "https://github.com/YOUR_ORG/skill-preflight",
              rules
            }
          },
          automationDetails: {
            id: "skill-preflight"
          },
          properties: {
            target: report.target,
            generatedAt: report.generatedAt,
            averageScore: report.summary.averageScore,
            highRiskCount: report.summary.highRiskCount
          },
          results
        }
      ]
    },
    null,
    2
  )}\n`;
}

function renderSkillHtml(skill: SkillReport): string {
  const categories = skill.categories
    .map((category) => `<tr><td>${escapeHtml(category.label)}</td><td>${category.score}/${category.maxScore}</td></tr>`)
    .join("");

  const findings =
    skill.findings.length === 0
      ? "<p>No findings.</p>"
      : skill.findings
          .map(
            (finding) => `<div class="finding ${finding.severity}">
  <strong>[${finding.severity.toUpperCase()}] ${escapeHtml(finding.title)}</strong>
  <div>${escapeHtml(formatLocation(finding))}</div>
  <p>${escapeHtml(finding.description)}</p>
  <p><strong>Recommendation:</strong> ${escapeHtml(finding.recommendation)}</p>
</div>`
          )
          .join("\n");

  return `<section class="skill">
  <h2>${escapeHtml(skill.skillName)}: ${skill.score}/100 (${skill.grade})</h2>
  <p><strong>Recommendation:</strong> ${escapeHtml(skill.recommendation)}</p>
  <p><strong>Path:</strong> <code>${escapeHtml(skill.rootPath)}</code></p>
  <div class="grid">
    <div class="metric"><span>Files</span><strong>${skill.metrics.totalFiles}</strong></div>
    <div class="metric"><span>Size</span><strong>${formatBytes(skill.metrics.totalBytes)}</strong></div>
    <div class="metric"><span>Activation tokens</span><strong>${skill.metrics.estimatedActivationTokens}</strong></div>
  </div>
  <table>
    <thead><tr><th>Category</th><th>Score</th></tr></thead>
    <tbody>${categories}</tbody>
  </table>
  <h3>Findings</h3>
  ${findings}
</section>`;
}

function formatLocation(finding: Finding): string {
  if (!finding.file) {
    return "";
  }

  return finding.line ? ` (${finding.file}:${finding.line})` : ` (${finding.file})`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sarifLevel(finding: Finding): "error" | "warning" | "note" {
  if (finding.severity === "critical" || finding.severity === "high") {
    return "error";
  }

  if (finding.severity === "medium") {
    return "warning";
  }

  return "note";
}

function normalizeSarifUri(value: string): string {
  return value.replaceAll("\\", "/");
}
