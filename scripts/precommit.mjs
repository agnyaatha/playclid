#!/usr/bin/env node
/**
 * The production checks run before every commit. Fast checks on the staged files come first, so a mistake there fails
 * in under a second; then the typecheck, lint, tests and production build.
 *
 *   node scripts/precommit.mjs          checks staged files, then the whole project (what the hook runs)
 *   node scripts/precommit.mjs --all    checks every tracked file, then the whole project (npm run check)
 */
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const ALL = process.argv.includes("--all");
const MAX_FILE_BYTES = 1024 * 1024;
const BINARY = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".mp3", ".mp4", ".pdf", ".glb"]);

const FORBIDDEN_PATHS = [
  [/(^|\/)\.env(\.|$)/, "environment file"],
  [/\.(pem|key|p12|pfx)$/, "private key"],
  [/(^|\/)(node_modules|\.next|coverage|out|build)\//, "generated output"],
  [/\.tsbuildinfo$/, "generated output"],
];

const SECRETS = [
  [/\bghp_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, "GitHub token"],
  [/\bsk-[A-Za-z0-9_-]{24,}/, "API key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\b(api[_-]?key|secret|password|auth[_-]?token)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i, "hard-coded credential"],
];

/** Things that should never reach a commit, checked only on lines being added. */
const LEFTOVERS = [
  [/^(<{7}|>{7}) /, "merge conflict marker"],
  [/\b(describe|it|test)\.only\(/, "focused test"],
  [/^\s*debugger;?\s*$/, "debugger statement"],
];

const git = (...args) => {
  const r = spawnSync("git", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 256 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
};

const lines = (text) => text.split(/\r?\n/).filter(Boolean);

function fileChecks() {
  const files = ALL ? lines(git("ls-files")) : lines(git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-M"));
  const problems = [];

  for (const file of files) {
    for (const [pattern, what] of FORBIDDEN_PATHS) if (pattern.test(file)) problems.push(`${file}: ${what} must not be committed`);
    let size;
    try {
      size = statSync(file).size;
    } catch {
      continue; // listed by git but deleted from the working tree
    }
    if (size > MAX_FILE_BYTES) problems.push(`${file}: ${(size / MAX_FILE_BYTES).toFixed(1)} MB is over the 1 MB limit`);
    if (BINARY.has(extname(file).toLowerCase())) continue;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(file));
    } catch {
      problems.push(`${file}: not valid UTF-8`);
    }
  }

  // Added lines only, so a pattern already in the history does not block unrelated work.
  const added = ALL ? files.flatMap(addedLinesOfWholeFile) : addedLinesFromDiff();
  for (const { file, text } of added) {
    if (/precommit\.mjs$/.test(file)) continue; // this file necessarily describes the patterns
    for (const [pattern, what] of SECRETS) if (pattern.test(text)) problems.push(`${file}: possible ${what}: ${text.trim().slice(0, 60)}`);
    for (const [pattern, what] of LEFTOVERS) if (pattern.test(text)) problems.push(`${file}: ${what}`);
  }
  return { count: files.length, problems };
}

function addedLinesOfWholeFile(file) {
  if (BINARY.has(extname(file).toLowerCase())) return [];
  try {
    return readFileSync(file, "utf8").split(/\r?\n/).map((text) => ({ file, text }));
  } catch {
    return [];
  }
}

function addedLinesFromDiff() {
  const out = [];
  let file = "";
  for (const line of git("diff", "--cached", "-U0", "-M", "--diff-filter=ACMR").split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) file = line.slice(6);
    else if (line.startsWith("+") && !line.startsWith("+++")) out.push({ file, text: line.slice(1) });
  }
  return out;
}

const STEPS = [
  ["Typecheck", "npx tsc --noEmit"],
  ["Lint", "npx eslint . --max-warnings=0"],
  ["Tests", "npx vitest run"],
  ["Production build", "npx next build"],
];

function run() {
  const started = Date.now();
  const { count, problems } = fileChecks();
  if (problems.length) {
    console.error(`\nCommit blocked: ${problems.length} problem${problems.length === 1 ? "" : "s"} in the files.\n`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`✓ Files (${count} checked: paths, size, UTF-8, secrets, leftovers)`);

  for (const [name, command] of STEPS) {
    const t = Date.now();
    const r = spawnSync(command, { shell: true, encoding: "utf8", maxBuffer: 1024 * 1024 * 256 });
    if (r.status !== 0) {
      console.error(`\n✗ ${name} failed (${command})\n`);
      process.stderr.write(r.stdout ?? "");
      process.stderr.write(r.stderr ?? "");
      process.exit(1);
    }
    console.log(`✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  }
  console.log(`All checks passed in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
}

run();
