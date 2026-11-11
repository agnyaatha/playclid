import { describe, expect, it } from "vitest";
import { lintMessage, MAX_HEADER } from "./commit-lint.mjs";

describe("commit message format", () => {
  it.each([
    "feat: add a shot clock",
    "fix(physics): stop the cue ball sticking to cushions",
    "content(snooker): add notes on the plant",
    "feat(rules)!: score fouls as in the 2024 rulebook",
    "build(deps): bump next from 16.4.6 to 16.4.7",
    "docs: explain the event loop\n\nThe engine jumps from event to event, so...",
    "fix: handle a tie\n\n# Please enter the commit message for your changes.",
  ])("accepts %j", (msg) => {
    expect(lintMessage(msg)).toEqual([]);
  });

  it.each(['Merge branch "main"', 'Revert "feat: add a shot clock"', "fixup! fix: handle a tie", "squash! docs: notes"])("lets git's own message %j through", (msg) => {
    expect(lintMessage(msg)).toEqual([]);
  });

  it.each([
    ["", "empty"],
    ["fixed stuff", "type(scope): subject"],
    ["Fix: thing", "type(scope): subject"],
    ["feature: add a thing", 'Unknown type "feature"'],
    ["fix: Handle a tie", "lower case"],
    ["fix: handle a tie.", "full stop"],
    ["fix: fixed a tie", "as a command"],
    [`feat: ${"x".repeat(MAX_HEADER)}`, "keep it to"],
    ["fix: handle a tie\nno blank line", "blank line"],
    ["fix(Physics): handle a tie", "type(scope): subject"],
  ])("rejects %j", (msg, problem) => {
    expect(lintMessage(msg).join(" ")).toContain(problem);
  });
});
