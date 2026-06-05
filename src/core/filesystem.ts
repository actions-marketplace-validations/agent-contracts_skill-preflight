import { readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ResolvedTarget, ScannedFile, TextFile } from "./types.js";
import { isProbablyText, pathExists, toPosixPath } from "./utils.js";

const execFileAsync = promisify(execFile);

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "__pycache__"
]);

const MAX_TEXT_FILE_BYTES = 1024 * 1024;

export async function resolveTarget(target: string, keepTemp = false): Promise<ResolvedTarget> {
  if (isGitHubUrl(target)) {
    const tempRoot = path.join(os.tmpdir(), `skill-preflight-${randomUUID()}`);
    await execFileAsync("git", ["clone", "--depth", "1", target, tempRoot], {
      timeout: 120000,
      windowsHide: true
    });

    return {
      displayTarget: target,
      localPath: tempRoot,
      cleanup: keepTemp
        ? undefined
        : async () => {
            await rm(tempRoot, { recursive: true, force: true });
          }
    };
  }

  const localPath = path.resolve(target);
  if (!(await pathExists(localPath))) {
    throw new Error(`Target does not exist: ${target}`);
  }

  return {
    displayTarget: target,
    localPath
  };
}

export function isGitHubUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(value.trim());
}

export async function discoverSkillRoots(rootPath: string): Promise<string[]> {
  const directSkill = path.join(rootPath, "SKILL.md");
  if (await pathExists(directSkill)) {
    return [rootPath];
  }

  const roots: string[] = [];
  await walk(rootPath, async (filePath) => {
    if (path.basename(filePath).toLowerCase() === "skill.md") {
      roots.push(path.dirname(filePath));
    }
  });

  return [...new Set(roots)].sort();
}

export async function readSkillFiles(rootPath: string): Promise<{
  files: ScannedFile[];
  textFiles: TextFile[];
}> {
  const files: ScannedFile[] = [];
  const textFiles: TextFile[] = [];

  await walk(rootPath, async (absolutePath) => {
    const buffer = await readFile(absolutePath);
    const relativePath = toPosixPath(path.relative(rootPath, absolutePath));
    const isText = buffer.length <= MAX_TEXT_FILE_BYTES && isProbablyText(buffer);

    files.push({
      path: relativePath,
      absolutePath,
      bytes: buffer.length,
      isText
    });

    if (isText) {
      const content = buffer.toString("utf8");
      textFiles.push({
        path: relativePath,
        absolutePath,
        bytes: buffer.length,
        content,
        lines: content.split(/\r?\n/)
      });
    }
  });

  return { files, textFiles };
}

async function walk(rootPath: string, onFile: (filePath: string) => Promise<void>): Promise<void> {
  const entries = await readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walk(absolutePath, onFile);
      }
      continue;
    }

    if (entry.isFile()) {
      await onFile(absolutePath);
    }
  }
}

export function commonInstalledSkillDirs(): string[] {
  const home = os.homedir();
  const cwd = process.cwd();

  return [
    path.join(home, ".codex", "skills"),
    path.join(home, ".claude", "skills"),
    path.join(cwd, ".codex", "skills"),
    path.join(cwd, ".claude", "skills")
  ];
}
