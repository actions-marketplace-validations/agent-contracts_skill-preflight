#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { scan } from "../dist/core/scan.js";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "benchmarks", "2026-08-public-skills");
const samplePath = path.join(outputDir, "sample.json");
const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const refresh = process.argv.includes("--refresh");
const reuseResults = process.argv.includes("--reuse-results");
const perQuery = parseIntegerOption("--per-query", 20);
const concurrency = parseIntegerOption("--concurrency", 3);

const searchGroups = [
  {
    id: "claude-project-skills",
    query: "SKILL.md path:.claude/skills"
  },
  {
    id: "skills-directories",
    query: "SKILL.md path:skills"
  }
];

await mkdir(outputDir, { recursive: true });

if (refresh && reuseResults) {
  throw new Error("--refresh and --reuse-results cannot be used together.");
}

const sample = refresh ? await discoverSample() : await loadOrDiscoverSample();
await writeJson(samplePath, sample);

const records = reuseResults
  ? await loadExistingResults()
  : await mapWithConcurrency(sample.items, concurrency, scanSampleWithProgress);
const aggregate = summarize(records);
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt,
  scanner: {
    name: packageJson.name,
    version: packageJson.version
  },
  methodology: {
    sampleType: "GitHub code-search convenience sample",
    searchGroups: sample.searchGroups,
    frozenAt: sample.frozenAt,
    oneSkillPerRepository: true
  },
  aggregate,
  results: records
};

await Promise.all([
  writeJson(path.join(outputDir, "results.json"), report),
  writeFile(path.join(outputDir, "results.csv"), renderCsv(records), "utf8"),
  writeFile(path.join(outputDir, "README.md"), renderReadme(report), "utf8"),
  writeFile(path.join(outputDir, "benchmark-summary.svg"), renderSummarySvg(report), "utf8")
]);

console.log(`Finished: ${aggregate.successful}/${aggregate.totalSamples} scanned, average ${aggregate.averageScore}/100, median ${aggregate.medianScore}/100.`);
if (aggregate.failed > 0) {
  console.log(`${aggregate.failed} sample(s) failed; see results.json for details.`);
}

async function loadOrDiscoverSample() {
  try {
    const existing = JSON.parse(await readFile(samplePath, "utf8"));
    console.log(`Reusing frozen sample from ${path.relative(rootDir, samplePath)}.`);
    return existing;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    return discoverSample();
  }
}

async function loadExistingResults() {
  const existingPath = path.join(outputDir, "results.json");
  const existing = JSON.parse(await readFile(existingPath, "utf8"));
  const matchesSample =
    Array.isArray(existing.results) &&
    existing.results.length === sample.items.length &&
    sample.items.every((item, index) => {
      const record = existing.results[index];
      return (
        record?.repository === item.repository &&
        record?.path === item.path &&
        record?.commit === item.commit &&
        record?.url === item.url
      );
    });
  if (!matchesSample) {
    throw new Error("Existing results do not match the frozen sample. Run the benchmark without --reuse-results.");
  }
  console.log(`Reusing ${existing.results.length} scan records from ${path.relative(rootDir, existingPath)}.`);
  return existing.results;
}

async function discoverSample() {
  console.log("Discovering a new public sample with GitHub code search...");
  const selectedRepositories = new Set(["agent-contracts/skill-preflight"]);
  const items = [];

  for (const group of searchGroups) {
    const results = await githubCodeSearch(group.query, Math.max(100, perQuery * 3));
    const selected = [];

    for (const result of results) {
      const repository = result.repository?.nameWithOwner;
      if (
        !repository ||
        result.repository.isFork ||
        result.repository.isPrivate ||
        path.posix.basename(result.path ?? "").toLowerCase() !== "skill.md" ||
        selectedRepositories.has(repository)
      ) {
        continue;
      }

      const commit = extractCommit(result.url);
      if (!commit) {
        continue;
      }

      selectedRepositories.add(repository);
      selected.push({
        group: group.id,
        repository,
        repositoryUrl: result.repository.url,
        path: result.path,
        commit,
        url: result.url
      });

      if (selected.length === perQuery) {
        break;
      }
    }

    if (selected.length < perQuery) {
      throw new Error(`GitHub search '${group.query}' returned only ${selected.length} eligible unique skills.`);
    }

    items.push(...selected);
  }

  return {
    schemaVersion: 1,
    frozenAt: new Date().toISOString(),
    selection: {
      perQuery,
      total: items.length,
      rules: [
        "Exact case-insensitive basename SKILL.md",
        "Public, non-fork repositories",
        "One skill per repository",
        "First eligible GitHub code-search results per query",
        "Each source URL pinned to the commit returned by GitHub"
      ]
    },
    searchGroups,
    items
  };
}

async function githubCodeSearch(query, limit) {
  const { stdout } = await execFileAsync(
    "gh",
    ["search", "code", query, "--limit", String(limit), "--json", "path,repository,url"],
    {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
      windowsHide: true
    }
  );
  return JSON.parse(stdout);
}

async function scanSampleWithProgress(item, index) {
  if (index === 0) {
    console.log(`Scanning ${sample.items.length} frozen public skill URLs with concurrency ${concurrency}...`);
  }
  const label = `[${index + 1}/${sample.items.length}] ${item.repository}/${item.path}`;
  try {
    const scanReport = await scan({ target: item.url });
    const skill = scanReport.reports.find((candidate) => candidate.displayPath === ".") ?? scanReport.reports[0];
    if (!skill) {
      throw new Error("No skill report was returned.");
    }

    console.log(`${label}: ${skill.score}/100 (${skill.grade})`);
    return {
      ...item,
      status: "success",
      skillName: skill.skillName,
      score: skill.score,
      grade: skill.grade,
      recommendation: skill.recommendation,
      categories: skill.categories,
      metrics: skill.metrics,
      findings: skill.findings.map(({ id, category, severity, title, description, recommendation, scoreImpact, file, line }) => ({
        id,
        category,
        severity,
        title,
        description,
        recommendation,
        scoreImpact,
        ...(file ? { file } : {}),
        ...(line ? { line } : {})
      }))
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${label}: FAILED - ${message.split("\n")[0]}`);
    return {
      ...item,
      status: "failed",
      error: message
    };
  }
}

function summarize(records) {
  const successful = records.filter((record) => record.status === "success");
  const scores = successful.map((record) => record.score);
  const categoryRows = new Map();
  const findingCounts = new Map();
  const gradeDistribution = countBy(successful, (record) => record.grade);
  const recommendationDistribution = countBy(successful, (record) => record.recommendation);
  const severityDistribution = {};

  for (const record of successful) {
    for (const category of record.categories) {
      const current = categoryRows.get(category.id) ?? {
        id: category.id,
        label: category.label,
        maxScore: category.maxScore,
        total: 0
      };
      current.total += category.score;
      categoryRows.set(category.id, current);
    }

    for (const finding of record.findings) {
      const current = findingCounts.get(finding.id) ?? {
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        category: finding.category,
        affectedSkills: new Set(),
        occurrences: 0
      };
      current.affectedSkills.add(`${record.repository}:${record.path}`);
      current.occurrences += 1;
      findingCounts.set(finding.id, current);
      severityDistribution[finding.severity] = (severityDistribution[finding.severity] ?? 0) + 1;
    }
  }

  const categoryAverages = [...categoryRows.values()].map((category) => {
    const averageScore = round(category.total / Math.max(successful.length, 1), 1);
    return {
      id: category.id,
      label: category.label,
      averageScore,
      maxScore: category.maxScore,
      averagePercent: round((averageScore / category.maxScore) * 100, 1)
    };
  });

  const topFindings = [...findingCounts.values()]
    .map((finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      affectedSkills: finding.affectedSkills.size,
      occurrences: finding.occurrences
    }))
    .sort(
      (left, right) =>
        right.affectedSkills - left.affectedSkills || right.occurrences - left.occurrences || left.id.localeCompare(right.id)
    )
    .slice(0, 10);

  return {
    totalSamples: records.length,
    successful: successful.length,
    failed: records.length - successful.length,
    averageScore: round(average(scores), 1),
    medianScore: round(median(scores), 1),
    minScore: scores.length ? Math.min(...scores) : 0,
    maxScore: scores.length ? Math.max(...scores) : 0,
    highRiskCount: successful.filter(
      (record) => record.score < 60 || record.findings.some((finding) => finding.severity === "critical")
    ).length,
    gradeDistribution,
    recommendationDistribution,
    severityDistribution,
    categoryAverages,
    topFindings,
    metrics: {
      medianActivationTokens: round(median(successful.map((record) => record.metrics.estimatedActivationTokens)), 1),
      p90ActivationTokens: round(percentile(successful.map((record) => record.metrics.estimatedActivationTokens), 0.9), 1),
      medianFiles: round(median(successful.map((record) => record.metrics.totalFiles)), 1),
      medianBytes: round(median(successful.map((record) => record.metrics.totalBytes)), 1)
    }
  };
}

function renderReadme(report) {
  const { aggregate } = report;
  const date = report.generatedAt.slice(0, 10);
  const grades = Object.entries(aggregate.gradeDistribution)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([grade, count]) => `| ${grade} | ${count} |`)
    .join("\n");
  const categories = aggregate.categoryAverages
    .map(
      (category) =>
        `| ${category.label} | ${category.averageScore}/${category.maxScore} | ${category.averagePercent}% |`
    )
    .join("\n");
  const findings = aggregate.topFindings
    .map(
      (finding) =>
        `| \`${finding.id}\` | ${finding.severity} | ${finding.affectedSkills} | ${finding.occurrences} |`
    )
    .join("\n");

  return `# Public Agent Skill Benchmark: August 2026

![SkillPreflight public skill benchmark](./benchmark-summary.svg)

This snapshot applies SkillPreflight ${report.scanner.version} to ${aggregate.totalSamples} public agent skills discovered through GitHub code search. It is a transparent convenience sample, not a ranking or a claim about the wider ecosystem.

## Results

| Metric | Result |
| --- | ---: |
| Successfully scanned | ${aggregate.successful}/${aggregate.totalSamples} |
| Average score | ${aggregate.averageScore}/100 |
| Median score | ${aggregate.medianScore}/100 |
| Score range | ${aggregate.minScore}-${aggregate.maxScore} |
| High-risk review recommended | ${aggregate.highRiskCount} |
| Median activation tokens | ${aggregate.metrics.medianActivationTokens} |
| 90th percentile activation tokens | ${aggregate.metrics.p90ActivationTokens} |

## Grade Distribution

| Grade | Skills |
| --- | ---: |
${grades}

## Category Averages

| Category | Average | Percent of category maximum |
| --- | ---: | ---: |
${categories}

## Most Common Static Findings

| Rule | Severity | Skills affected | Occurrences |
| --- | --- | ---: | ---: |
${findings}

## Methodology

- Discovery queries: ${report.methodology.searchGroups.map((group) => `\`${group.query}\``).join(" and ")}.
- The first ${report.methodology.searchGroups.length > 1 ? "eligible results from each query" : "eligible results"} were selected after filtering to public, non-fork repositories and one skill per repository.
- Every GitHub blob URL is pinned to the commit returned by code search. The sample was frozen at ${report.methodology.frozenAt}.
- Scans were generated on ${date} with SkillPreflight ${report.scanner.version} and its default rules.
- The report presents aggregate results. Raw records are retained for reproducibility, not for naming and shaming.

## Reproduce

From the repository root with Node.js 20+, Git, GitHub CLI, and an authenticated \`gh\` session:

\`\`\`bash
npm ci
npm run benchmark:public
\`\`\`

The committed \`sample.json\` is reused by default. To discover and freeze a new sample:

\`\`\`bash
npm run benchmark:public -- --refresh
\`\`\`

To regenerate the aggregate files and chart from the existing raw scan records without making network requests:

\`\`\`bash
npm run benchmark:public -- --reuse-results
\`\`\`

## Data

- [Frozen source sample](./sample.json)
- [Raw JSON results](./results.json)
- [CSV results](./results.csv)

## Important Limitations

SkillPreflight is static, heuristic pre-install analysis. A high score does not prove that a skill is safe, and a low score does not prove malicious intent. Findings can require context and manual review. GitHub code search ordering introduces selection bias, the sample is small, and repository contents outside each selected skill directory are intentionally excluded.
`;
}

function renderSummarySvg(report) {
  const { aggregate } = report;
  const gradeOrder = ["A", "B", "C", "D", "F"];
  const gradeColors = {
    A: "#0f9d73",
    B: "#2878d0",
    C: "#d99716",
    D: "#df6a32",
    F: "#cb3d4d"
  };
  const maxGradeCount = Math.max(1, ...gradeOrder.map((grade) => aggregate.gradeDistribution[grade] ?? 0));
  const bars = gradeOrder
    .map((grade, index) => {
      const count = aggregate.gradeDistribution[grade] ?? 0;
      const width = Math.round((count / maxGradeCount) * 350);
      const y = 349 + index * 47;
      return `
        <text x="746" y="${y + 18}" class="grade">${grade}</text>
        <rect x="784" y="${y}" width="350" height="22" rx="3" fill="#e7e9ee"/>
        <rect x="784" y="${y}" width="${width}" height="22" rx="3" fill="${gradeColors[grade]}"/>
        <text x="1180" y="${y + 18}" class="count">${count}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">SkillPreflight public agent skill benchmark</title>
  <desc id="desc">Aggregate results for ${aggregate.successful} successfully scanned public agent skills.</desc>
  <style>
    text { font-family: Inter, Segoe UI, Arial, sans-serif; fill: #171a21; letter-spacing: 0; }
    .eyebrow { font-size: 18px; font-weight: 700; fill: #526171; }
    .heading { font-size: 48px; font-weight: 760; }
    .subhead { font-size: 21px; fill: #526171; }
    .metric { font-size: 72px; font-weight: 780; }
    .metric-label { font-size: 18px; font-weight: 650; fill: #526171; }
    .section { font-size: 21px; font-weight: 720; }
    .grade { font-size: 17px; font-weight: 750; }
    .count { font-size: 17px; font-weight: 700; text-anchor: end; }
    .foot { font-size: 15px; fill: #687583; }
  </style>
  <rect width="1280" height="720" fill="#f7f8fa"/>
  <rect x="0" y="0" width="12" height="720" fill="#12a879"/>
  <g transform="translate(72 58)">
    <path d="M22 0 44 9v17c0 17-9 30-22 38C9 56 0 43 0 26V9L22 0Z" fill="#171a21"/>
    <path d="m13 31 6 6 13-16" fill="none" stroke="#f7f8fa" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="62" y="27" class="section">SkillPreflight</text>
    <text x="62" y="50" class="eyebrow">PUBLIC BENCHMARK / AUGUST 2026</text>
  </g>
  <text x="72" y="186" class="heading">What do public agent skills look like</text>
  <text x="72" y="244" class="heading">before installation?</text>
  <text x="72" y="287" class="subhead">A reproducible GitHub code-search sample, scanned with SkillPreflight ${escapeXml(report.scanner.version)}.</text>
  <line x1="72" y1="318" x2="1208" y2="318" stroke="#d8dce3"/>
  <g transform="translate(72 362)">
    <text x="0" y="0" class="metric-label">SKILLS SCANNED</text>
    <text x="0" y="78" class="metric">${aggregate.successful}</text>
    <text x="0" y="137" class="metric-label">AVERAGE SCORE</text>
    <text x="0" y="215" class="metric">${aggregate.averageScore}<tspan font-size="30" fill="#687583"> / 100</tspan></text>
    <text x="300" y="0" class="metric-label">MEDIAN SCORE</text>
    <text x="300" y="78" class="metric">${aggregate.medianScore}<tspan font-size="30" fill="#687583"> / 100</tspan></text>
    <text x="300" y="137" class="metric-label">REVIEW RECOMMENDED</text>
    <text x="300" y="215" class="metric">${aggregate.highRiskCount}</text>
  </g>
  <text x="746" y="344" class="section">Grade distribution</text>
  ${bars}
  <line x1="72" y1="646" x2="1208" y2="646" stroke="#d8dce3"/>
  <text x="72" y="681" class="foot">Convenience sample, not an ecosystem ranking. Static findings require manual review.</text>
  <text x="1208" y="681" text-anchor="end" class="foot">github.com/agent-contracts/skill-preflight</text>
</svg>`;
}

function renderCsv(records) {
  const categoryIds = ["security", "permissions", "token", "footprint", "maintainability", "reliability", "compatibility"];
  const headers = [
    "repository",
    "path",
    "commit",
    "url",
    "status",
    "skill_name",
    "score",
    "grade",
    "recommendation",
    ...categoryIds.flatMap((id) => [`${id}_score`, `${id}_max`]),
    "finding_count",
    "critical_findings",
    "high_findings",
    "estimated_activation_tokens",
    "total_files",
    "total_bytes",
    "error"
  ];
  const rows = records.map((record) => {
    const categories = new Map((record.categories ?? []).map((category) => [category.id, category]));
    return [
      record.repository,
      record.path,
      record.commit,
      record.url,
      record.status,
      record.skillName ?? "",
      record.score ?? "",
      record.grade ?? "",
      record.recommendation ?? "",
      ...categoryIds.flatMap((id) => [categories.get(id)?.score ?? "", categories.get(id)?.maxScore ?? ""]),
      record.findings?.length ?? "",
      record.findings?.filter((finding) => finding.severity === "critical").length ?? "",
      record.findings?.filter((finding) => finding.severity === "high").length ?? "",
      record.metrics?.estimatedActivationTokens ?? "",
      record.metrics?.totalFiles ?? "",
      record.metrics?.totalBytes ?? "",
      record.error ?? ""
    ].map(csvCell).join(",");
  });
  return `${headers.join(",")}\n${rows.join("\n")}\n`;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function countBy(items, keyFor) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      const key = keyFor(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => String(left).localeCompare(String(right)))
  );
}

function parseIntegerOption(name, fallback) {
  const prefix = `${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  const index = process.argv.indexOf(name);
  const value = inline?.slice(prefix.length) ?? (index >= 0 ? process.argv[index + 1] : undefined);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function extractCommit(url) {
  return url.match(/\/blob\/([0-9a-f]{40})\//i)?.[1];
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, quantile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(quantile * sorted.length) - 1];
}

function round(value, decimals) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
