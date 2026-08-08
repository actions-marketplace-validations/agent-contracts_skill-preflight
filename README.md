# SkillPreflight

[English](README.md) | [简体中文](README.zh-CN.md)

SkillPreflight is a pre-install safety, token, and maintainability scorecard for AI agent skills.

It helps users decide whether a Codex, Claude Code, Cursor, Gemini CLI, or other agent skill is safe and lightweight enough to install.

## Quick Start

Run without installing:

```bash
npx skill-preflight scan ./my-skill
```

Scan a GitHub repository before installing it:

```bash
npx skill-preflight scan https://github.com/user/some-skill
```

Scan one skill inside a large repository by pasting its GitHub directory or `SKILL.md` URL:

```bash
npx skill-preflight scan https://github.com/user/skills/tree/main/skills/my-skill
npx skill-preflight scan https://github.com/user/skills/blob/main/skills/my-skill/SKILL.md
```

Scan common local skill directories:

```bash
npx skill-preflight scan --installed
```

For repositories containing many skills, show a compact list of the 20 lowest-scoring skills:

```bash
npx skill-preflight scan https://github.com/user/skill-collection --summary --top 20
```

Apply a local policy when scanning a repository:

```bash
npx skill-preflight scan . --config skill-preflight.json
```

## Local Development

```bash
npm install
npm run build
npm test
npm run dev -- scan examples/risky-skill
```

## Score Model

SkillPreflight uses a 100-point score:

| Category | Points | What it checks |
| --- | ---: | --- |
| Security | 35 | Dangerous commands, secret access, exfiltration, prompt injection, remote script execution |
| Permission restraint | 15 | Over-broad activation, unnecessary shell/network/file access |
| Token efficiency | 15 | Oversized `SKILL.md`, repeated content, poor progressive disclosure |
| Lightweight footprint | 10 | File count, total size, dependencies, large assets |
| Maintainability | 10 | README, license, frontmatter, examples, documentation hygiene |
| Reliability | 10 | Tests, fixtures, deterministic workflow, error handling |
| Compatibility | 5 | Hardcoded local paths, OS-specific assumptions, fragile shell usage |

Repeated locations for the same rule remain visible, but each rule ID deducts points only once per skill. This keeps large repositories from receiving a lower score merely because the same issue appears in several files.

When one skill directory contains other skills, SkillPreflight reports each `SKILL.md` as a separate skill and excludes child-skill files from the parent score.

## CLI

```bash
skill-preflight scan <target>
```

Options:

```text
--installed             Scan common installed skill directories.
--format <format>       text, json, markdown, html, or sarif. Default: text.
--out <file>            Write report to a file.
--fail-below <score>    Exit with code 1 if any scanned skill is below this score.
--fail-on <severity>    Exit for findings at or above info, low, medium, high, or critical.
--config <file>         Load an explicit JSON policy file.
--exclude <glob>        Exclude a target-relative path glob. Repeat as needed.
--ignore-rule <id>      Suppress a rule ID or wildcard pattern. Repeat as needed.
--keep-temp             Keep temporary clones for debugging.
--summary               Show aggregate results and the lowest-scoring skills only.
--top <count>           Number of skills shown with --summary. Default: 20.
```

Summary mode supports text, JSON, Markdown, and HTML output. SARIF always contains the full set of findings for code scanning.

## Policy and CI Gates

Use an explicit JSON policy to keep generated files and reviewed false positives out of a scan:

```json
{
  "exclude": ["fixtures/**", "vendor/**"],
  "ignoreRules": ["compatibility.os-specific-command"],
  "failBelow": 70,
  "failOn": "high"
}
```

```bash
skill-preflight scan . --config skill-preflight.json
```

Config files are never loaded from a scanned repository automatically. This prevents an untrusted remote skill from suppressing its own findings. CLI exclusions and ignored rules are merged with the config; CLI score and severity gates take precedence.

Suppressed findings remain counted in the report so policy decisions are visible. See `docs/policy.md` for glob behavior and CI examples.

Generate Shields-compatible badge JSON:

```bash
skill-preflight badge ./my-skill --out skill-preflight-badge.json
```

The badge payload can be served through a static endpoint or GitHub Pages:

```json
{
  "schemaVersion": 1,
  "label": "SkillPreflight",
  "message": "91/100 A",
  "color": "brightgreen"
}
```

## GitHub Action

After the package is published to npm and the repository is tagged, skill authors can scan every PR:

```yaml
name: SkillPreflight

on: [pull_request, push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: agent-contracts/skill-preflight@v1
        with:
          target: "."
          config: skill-preflight.json
```

Without a config, the Action fails below 70 by default. A policy file's `failBelow` value is used when `config` is provided; an explicit `fail-below` input overrides both.

For GitHub code scanning, emit SARIF:

```bash
skill-preflight scan . --format sarif --out skill-preflight.sarif
```

See `docs/github-action.md` for the full workflow.

## Safety Principle

SkillPreflight does not execute scripts inside scanned skills. It only reads files and performs static analysis. Oversized files are measured without being loaded into text analysis.

## Example Output

```text
shell-super-agent: 35/100 (F) - High risk, do not install blindly

Top findings:
- [CRITICAL] Remote script execution pattern (SKILL.md:15)
- [HIGH] Prompt injection language (SKILL.md:8)
- [HIGH] Potential secret or credential access (SKILL.md:10)
```

## Rule Catalog

See `docs/rules.md` for the current static analysis rule catalog, including dependency, install-script, MCP config, token, and compatibility checks.

## Publishing

See `docs/release.md` for the first npm and GitHub release checklist.
