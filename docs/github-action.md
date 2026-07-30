# GitHub Action

SkillPreflight can run in a skill repository before users install the skill.

## Basic Workflow

```yaml
name: SkillPreflight

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: agent-contracts/skill-preflight@v1
        with:
          target: "."
          fail-below: "70"
          fail-on: high
```

## SARIF Upload

Use SARIF when you want findings to appear in GitHub code scanning.

```yaml
name: SkillPreflight

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  security-events: write
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: agent-contracts/skill-preflight@v1
        with:
          target: "."
          format: sarif
          out: skill-preflight.sarif
          fail-below: "70"

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: skill-preflight.sarif
```

## Large Skill Collections

For repositories containing many skills, use summary mode to keep the workflow log focused on the lowest-scoring entries:

```yaml
- uses: agent-contracts/skill-preflight@v1
  with:
    target: "."
    summary: "true"
    top: "20"
    fail-below: "70"
```

## Policy and Exclusions

Use an explicit policy file when the repository contains generated fixtures or reviewed false positives:

```yaml
- uses: agent-contracts/skill-preflight@v1
  with:
    target: "."
    config: skill-preflight.json
    fail-below: "70"
    fail-on: high
```

For small overrides, `exclude` and `ignore-rules` accept newline-separated values:

```yaml
- uses: agent-contracts/skill-preflight@v1
  with:
    target: "."
    exclude: |
      fixtures/**
      vendor/**
    ignore-rules: |
      compatibility.os-specific-command
```

See `docs/policy.md` for precedence and suppression visibility.

## Notes

The composite action runs the published npm package with `npx`.
Use `package-version` to pin a specific npm release when reproducible builds are required.
