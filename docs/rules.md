# Rule Catalog

SkillPreflight uses static analysis only. It reads files but does not execute skill scripts.

## Security

- Remote script execution, such as `curl ... | sh`.
- Dynamic shell, Node.js, or PowerShell execution.
- PowerShell encoded commands and execution policy bypasses.
- Broad destructive delete commands.
- Secret-like local data access, including `.env`, SSH keys, API keys, browser cookies, and login data.
- Suspicious webhook, paste, and ad-hoc upload endpoints.
- Prompt injection phrases that attempt to override system or developer instructions.

## Dependency and Install Risk

- npm lifecycle scripts: `preinstall`, `install`, `postinstall`, and `prepare`.
- Dangerous npm lifecycle scripts that download or dynamically execute code.
- Node dependencies using `*`, `latest`, `^`, `~`, Git URLs, HTTP URLs, or local file specs.
- Python `requirements.txt` dependencies that are unpinned.
- Python dependencies that install from remote URLs or Git repositories.
- Dependency manifests without lockfiles.

## MCP Config Risk

SkillPreflight detects common MCP JSON files, including `.mcp.json`, `mcp*.json`, and `claude_desktop_config.json`.

It flags:

- MCP servers launched through a shell, such as `bash`, `sh`, `cmd`, or `powershell`.
- `npx`, `uvx`, and `pipx` MCP servers without pinned package versions.
- Broad local paths such as user home directories.
- Hardcoded secret-like values in MCP `env`.

## Token Efficiency

- Large `SKILL.md` files.
- Large main skill files without a progressive disclosure structure.
- Repeated long instruction lines.

## Reliability and Maintainability

- Missing README.
- Missing license.
- Missing skill metadata frontmatter.
- Missing examples.
- Missing tests, fixtures, or evals.
- Vague operational language.

## Compatibility

- Hardcoded user paths.
- OS-specific commands without fallback guidance.
