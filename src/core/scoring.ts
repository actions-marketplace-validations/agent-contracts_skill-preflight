import { CATEGORIES } from "./categories.js";
import type { CategoryScore, Finding } from "./types.js";
import { clamp, gradeForScore, recommendationForScore, severityRank } from "./utils.js";

export function scoreFindings(findings: Finding[]): {
  score: number;
  grade: string;
  recommendation: string;
  categories: CategoryScore[];
} {
  const categories = CATEGORIES.map((category) => {
    const impactByRule = new Map<string, number>();

    for (const finding of findings) {
      if (finding.category !== category.id) {
        continue;
      }

      impactByRule.set(finding.id, Math.max(impactByRule.get(finding.id) ?? 0, finding.scoreImpact));
    }

    const impact = [...impactByRule.values()].reduce((sum, scoreImpact) => sum + scoreImpact, 0);

    return {
      id: category.id,
      label: category.label,
      maxScore: category.maxScore,
      score: clamp(category.maxScore - impact, 0, category.maxScore)
    };
  });

  const score = Math.round(categories.reduce((sum, category) => sum + category.score, 0));

  return {
    score,
    grade: gradeForScore(score),
    recommendation: recommendationForScore(score),
    categories
  };
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    const impactDelta = b.scoreImpact - a.scoreImpact;
    if (impactDelta !== 0) {
      return impactDelta;
    }

    return a.id.localeCompare(b.id);
  });
}
