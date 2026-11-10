import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FAMILIES, GAMES } from "@/games/registry";

const root = process.cwd();
const docs = join(root, "docs");

function markdownIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownIn(path);
    return name.endsWith(".md") ? [path] : [];
  });
}

describe("documentation", () => {
  it.each(Object.keys(GAMES))("covers %s, with rules and physics pages", (id) => {
    expect(existsSync(join(docs, "games", id, "README.md"))).toBe(true);
    expect(existsSync(join(docs, "games", id, "physics.md"))).toBe(true);
  });

  it("lists every game in the games index", () => {
    const index = readFileSync(join(docs, "games", "README.md"), "utf8");
    for (const id of Object.keys(GAMES)) expect(index).toContain(`(${id}/README.md)`);
  });

  it("has no broken relative links", () => {
    const broken: string[] = [];
    // The research notes are kept as they were written.
    const pages = [join(root, "README.md"), ...markdownIn(docs).filter((p) => !p.includes("research"))];
    for (const page of pages) {
      for (const [, target] of readFileSync(page, "utf8").matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
        if (/^https?:/.test(target)) continue;
        if (!existsSync(resolve(dirname(page), target))) broken.push(`${page.slice(root.length + 1)} -> ${target}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("game registry", () => {
  it("puts every game in exactly one family", () => {
    const listed = FAMILIES.flatMap((f) => f.ids).sort();
    expect(listed).toEqual(Object.keys(GAMES).sort());
  });
});
