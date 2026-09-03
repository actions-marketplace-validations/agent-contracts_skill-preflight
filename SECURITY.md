# Security Policy

## Supported Versions

Security fixes are released for the latest published SkillPreflight version. Reproduce reports with `skill-preflight@latest` before submitting them.

## Reporting A Vulnerability

Use [GitHub private vulnerability reporting](https://github.com/agent-contracts/skill-preflight/security/advisories/new) for vulnerabilities in SkillPreflight itself. Do not open a public issue before a fix is available.

Useful reports include:

- The affected version and operating system
- A minimal target or fixture that reproduces the issue
- The command used and the observed output
- The security impact
- A suggested fix, when available

Relevant issues include unintended execution of scanned content, path traversal, unsafe archive extraction, credential exposure, report injection, or bypasses that suppress material findings without an explicit local policy.

Static-analysis false positives and missing detection rules are normally suitable for public issues unless disclosing them would expose an unpatched vulnerability.
