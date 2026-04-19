import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRoadmap } from "./roadmap-parser";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (name: string) =>
  readFileSync(join(here, "__fixtures__", name), "utf8");

describe("parseRoadmap — simple", () => {
  const r = parseRoadmap(fx("simple.md"));

  it("extracts project title", () => {
    expect(r.projectTitle).toBe("My Project");
  });

  it("builds one phase with three flat tasks", () => {
    expect(r.phases).toHaveLength(1);
    expect(r.phases[0].title).toBe("Phase 1");
    expect(r.phases[0].nodes).toHaveLength(3);
    expect(r.phases[0].nodes.map((n) => n.title)).toEqual([
      "Task A",
      "Task B",
      "Task C",
    ]);
  });

  it("marks checkboxes done/undone correctly", () => {
    const [a, b, c] = r.phases[0].nodes;
    expect(a.done).toBe(false);
    expect(b.done).toBe(true);
    expect(c.done).toBe(false);
  });

  it("computes phase and total progress as 1/3", () => {
    expect(r.phases[0].progress).toBeCloseTo(1 / 3);
    expect(r.totalProgress).toBeCloseTo(1 / 3);
  });
});

describe("parseRoadmap — nested", () => {
  const r = parseRoadmap(fx("nested.md"));

  it("nests sub-tasks under parents by indent", () => {
    expect(r.phases).toHaveLength(1);
    const [install, configure] = r.phases[0].nodes;
    expect(install.title).toBe("Install");
    expect(install.children.map((n) => n.title)).toEqual(["Node", "npm"]);
    expect(configure.title).toBe("Configure");
    expect(configure.children.map((n) => n.title)).toEqual([
      "Env vars",
      "Database",
    ]);
  });

  it("counts every node (including parents) for progress", () => {
    // 6 total nodes: Install, Node, npm, Configure, Env vars, Database
    // 4 done:       Install, Node, npm, Database
    expect(r.totalProgress).toBeCloseTo(4 / 6);
  });
});

describe("parseRoadmap — messy (text between checkboxes)", () => {
  const r = parseRoadmap(fx("messy.md"));

  it("ignores prose between checkboxes", () => {
    expect(r.phases).toHaveLength(2);
    expect(r.phases[0].title).toBe("Backend");
    expect(r.phases[1].title).toBe("Frontend");
  });

  it("keeps checkbox nesting across intervening prose", () => {
    const [apiDesign, implementation] = r.phases[0].nodes;
    expect(apiDesign.title).toBe("API design");
    expect(apiDesign.children.map((n) => n.title)).toEqual(["Endpoints"]);
    expect(implementation.title).toBe("Implementation");
    expect(implementation.children).toHaveLength(0);
  });

  it("computes totalProgress across phases", () => {
    // Backend: API design (done), Endpoints (done), Implementation (pending) = 2/3
    // Frontend: UI (pending), UX research (done) = 1/2
    // Total: 3 done / 5 total
    expect(r.totalProgress).toBeCloseTo(3 / 5);
  });
});
