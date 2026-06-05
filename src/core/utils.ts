import { stat } from "node:fs/promises";
import path from "node:path";
import type { Severity } from "./types.js";

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }

  const asciiChars = text.replace(/[^\x00-\x7F]/g, "").length;
  const nonAsciiChars = text.length - asciiChars;
  return Math.ceil(asciiChars / 4 + nonAsciiChars / 1.8);
}

export function severityRank(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "info":
      return 1;
  }
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function isProbablyText(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return true;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  let suspicious = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }
    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }

  return suspicious / sample.length < 0.08;
}

export function gradeForScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function recommendationForScore(score: number): string {
  if (score >= 90) return "Recommended";
  if (score >= 80) return "Good, review minor findings";
  if (score >= 70) return "Install with caution";
  if (score >= 60) return "Needs review before install";
  return "High risk, do not install blindly";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function firstMatchLine(lines: string[], pattern: RegExp): number | undefined {
  const index = lines.findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : undefined;
}
