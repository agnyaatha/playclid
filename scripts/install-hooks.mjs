#!/usr/bin/env node
/** Runs on `npm install`: points git at the versioned hooks. Does nothing where there is no git, such as a deploy. */
import { spawnSync } from "node:child_process";

const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
if (inside.status === 0) spawnSync("git", ["config", "core.hooksPath", ".githooks"]);
