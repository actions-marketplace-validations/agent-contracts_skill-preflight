# Contributing to SkillPreflight

SkillPreflight welcomes focused improvements to rules, fixtures, reports, documentation, and integrations.

## Before Opening A Change

- Search existing issues and pull requests.
- Open an issue first for scoring-model changes or broad behavior changes.
- For a new rule, include both a positive fixture and a false-positive fixture.
- Keep findings evidence-based and include an actionable remediation message.

Security vulnerabilities must follow [SECURITY.md](SECURITY.md) instead of a public issue.

## Development

Use Node.js 20 or newer:

```bash
npm ci
npm test
npm run test:coverage
npm pack --dry-run
```

Scan the bundled fixtures while developing:

```bash
npm run scan:good
npm run scan:risky
```

## Pull Requests

- Keep the change scoped and explain the user-visible behavior.
- Add regression coverage for fixes and new rules.
- Update English and Chinese documentation when the public CLI changes.
- Do not commit credentials, local npm auth files, generated packages, or temporary scan reports.
