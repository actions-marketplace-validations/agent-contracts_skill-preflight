# JSON Report Schema

SkillPreflight JSON reports use a versioned, portable public shape. Generate one with:

```bash
skill-preflight scan ./my-skill --format json --out skill-preflight.json
```

Top-level fields:

| Field | Description |
| --- | --- |
| `schemaVersion` | Integer version of the public JSON report shape. |
| `tool` | Scanner name and semantic version. |
| `generatedAt` | ISO 8601 generation timestamp. |
| `target` | Target supplied to the scanner. |
| `reports` | Per-skill scores, metrics, findings, and suppressed findings. |
| `summary` | Aggregate skill count and score information. |
| `policy` | Effective exclusions and ignored rule patterns. |

Each item in `reports` contains a portable `path` relative to the scanned target. Internal absolute `rootPath` values and temporary download directories are intentionally omitted.

Consumers should reject unsupported future `schemaVersion` values instead of assuming that fields have not changed. New optional fields may be added without incrementing the schema version; removals or incompatible meaning changes require a new version.
