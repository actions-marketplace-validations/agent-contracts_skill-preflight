import type { CategoryDefinition } from "./types.js";

export const CATEGORIES: CategoryDefinition[] = [
  { id: "security", label: "Security", maxScore: 35 },
  { id: "permissions", label: "Permission restraint", maxScore: 15 },
  { id: "token", label: "Token efficiency", maxScore: 15 },
  { id: "footprint", label: "Lightweight footprint", maxScore: 10 },
  { id: "maintainability", label: "Maintainability", maxScore: 10 },
  { id: "reliability", label: "Reliability", maxScore: 10 },
  { id: "compatibility", label: "Compatibility", maxScore: 5 }
];

export const MAX_SCORE = CATEGORIES.reduce((sum, category) => sum + category.maxScore, 0);
