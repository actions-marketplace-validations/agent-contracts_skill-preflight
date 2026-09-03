# Public Agent Skill Benchmark: August 2026

![SkillPreflight public skill benchmark](./benchmark-summary.svg)

This snapshot applies SkillPreflight 0.4.0 to 40 public agent skills discovered through GitHub code search. It is a transparent convenience sample, not a ranking or a claim about the wider ecosystem.

## Results

| Metric | Result |
| --- | ---: |
| Successfully scanned | 40/40 |
| Average score | 80.8/100 |
| Median score | 85.5/100 |
| Score range | 49-90 |
| High-risk review recommended | 2 |
| Median activation tokens | 840.5 |
| 90th percentile activation tokens | 2699 |

## Grade Distribution

| Grade | Skills |
| --- | ---: |
| A | 1 |
| B | 29 |
| C | 5 |
| D | 3 |
| F | 2 |

## Category Averages

| Category | Average | Percent of category maximum |
| --- | ---: | ---: |
| Security | 33.3/35 | 95.1% |
| Permission restraint | 14.3/15 | 95.3% |
| Token efficiency | 12.2/15 | 81.3% |
| Lightweight footprint | 9.8/10 | 98% |
| Maintainability | 4/10 | 40% |
| Reliability | 2.9/10 | 29% |
| Compatibility | 4.3/5 | 86% |

## Most Common Static Findings

| Rule | Severity | Skills affected | Occurrences |
| --- | --- | ---: | ---: |
| `reliability.missing-examples` | low | 40 | 40 |
| `reliability.missing-tests` | medium | 40 | 40 |
| `maintainability.missing-license` | medium | 39 | 39 |
| `maintainability.missing-readme` | medium | 35 | 35 |
| `compatibility.hardcoded-user-path` | medium | 9 | 11 |
| `maintainability.missing-frontmatter` | low | 9 | 9 |
| `token.no-progressive-disclosure` | medium | 9 | 9 |
| `security.secret-access` | high | 5 | 119 |
| `token.skill-md-huge` | high | 4 | 4 |
| `token.skill-md-large` | medium | 4 | 4 |

## Methodology

- Discovery queries: `SKILL.md path:.claude/skills` and `SKILL.md path:skills`.
- The first eligible results from each query were selected after filtering to public, non-fork repositories and one skill per repository.
- Every GitHub blob URL is pinned to the commit returned by code search. The sample was frozen at 2026-08-08T17:08:45.236Z.
- Scans were generated on 2026-08-08 with SkillPreflight 0.4.0 and its default rules.
- The report presents aggregate results. Raw records are retained for reproducibility, not for naming and shaming.

## Reproduce

From the repository root with Node.js 20+, Git, GitHub CLI, and an authenticated `gh` session:

```bash
npm ci
npm run benchmark:public
```

The committed `sample.json` is reused by default. To discover and freeze a new sample:

```bash
npm run benchmark:public -- --refresh
```

To regenerate the aggregate files and chart from the existing raw scan records without making network requests:

```bash
npm run benchmark:public -- --reuse-results
```

## Data

- [Frozen source sample](./sample.json)
- [Raw JSON results](./results.json)
- [CSV results](./results.csv)

## Important Limitations

SkillPreflight is static, heuristic pre-install analysis. A high score does not prove that a skill is safe, and a low score does not prove malicious intent. Findings can require context and manual review. GitHub code search ordering introduces selection bias, the sample is small, and repository contents outside each selected skill directory are intentionally excluded.
