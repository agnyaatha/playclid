#!/usr/bin/env node
/**
 * Checks a commit message, or a pull request title, against the project's format (Conventional Commits):
 *
 *   type(scope)!: subject
 *
 * Used three ways:
 *   node scripts/commit-lint.mjs <file>     the commit-msg hook passes the message file
 *   node scripts/commit-lint.mjs --title    CI checks the PR title, read from the PR_TITLE environment variable
 *   import { lintMessage } from ...         the tests
 *
 * Plain Node with no dependencies, like the other scripts. See CONTRIBUTING.md for the rules in prose.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const TYPES = {
  feat: "A new feature players or contributors can see",
  fix: "A bug fix",
  physics: "A change to the simulation or a game's physical parameters",
  content: "Lessons, drills, challenges or their notes",
  perf: "A speed or memory improvement with no change in behaviour",
  refactor: "Restructured code with no change in behaviour",
  docs: "Documentation only",
  test: "Tests only",
  style: "Formatting only, no code change",
  build: "Dependencies, the build or tooling",
  ci: "GitHub workflows and repository configuration",
  chore: "Anything else that does not touch the app",
  revert: "Reverts an earlier commit",
};

export const MAX_HEADER = 72;
const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9-]*)\))?(?<breaking>!)?: (?<subject>.+)$/;

/** Messages git writes itself, which follow their own conventions. */
const GENERATED = /^(Merge |Revert "|fixup! |squash! |amend! )/;

/** The problems with a message, or an empty list when it is fine. Comment lines (from the template) are ignored. */
export function lintMessage(raw) {
  const lines = raw
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .join("\n")
    .replace(/\s+$/, "")
    .split("\n");
  const header = lines[0] ?? "";
  if (!header.trim()) return ["The message is empty."];
  if (GENERATED.test(header)) return [];

  const problems = [];
  const m = HEADER.exec(header);
  if (!m) {
    return [`The first line should look like "type(scope): subject", for example "fix(physics): stop the cue ball sticking to cushions". Got: "${header}"`];
  }
  const { type, subject } = m.groups;
  if (!(type in TYPES)) problems.push(`Unknown type "${type}". Use one of: ${Object.keys(TYPES).join(", ")}.`);
  if (header.length > MAX_HEADER) problems.push(`The first line is ${header.length} characters; keep it to ${MAX_HEADER}.`);
  if (/^[A-Z][a-z]/.test(subject)) problems.push(`Start the subject in lower case: "${subject[0].toLowerCase()}${subject.slice(1)}".`);
  if (/[.!?]$/.test(subject)) problems.push("Leave the full stop off the end of the subject.");
  if (/^(added|adds|fixed|fixes|updated|updates|changed|changes|removed|removes)\b/i.test(subject)) {
    problems.push('Write the subject as a command: "add", "fix", "update", not "added" or "fixes".');
  }
  if (lines.length > 1 && lines[1].trim() !== "") problems.push("Leave a blank line between the first line and the body.");
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const title = args[0] === "--title";
  const message = title ? (process.env.PR_TITLE ?? "") : readFileSync(args[0], "utf8");
  const problems = lintMessage(message);
  if (problems.length === 0) return;
  const what = title ? "Pull request title" : "Commit message";
  console.error(`\n✗ ${what} does not follow the project format:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`\n  Format: type(scope): subject   e.g. "feat(lessons): add a safety drill for 9-ball"`);
  console.error(`  Types: ${Object.keys(TYPES).join(", ")}`);
  console.error(`  See CONTRIBUTING.md#commit-messages.${title ? "" : " Your message was kept in .git/COMMIT_EDITMSG."}\n`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
