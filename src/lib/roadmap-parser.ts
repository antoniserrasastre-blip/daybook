export type RoadmapNode = {
  title: string;
  done: boolean;
  children: RoadmapNode[];
};

export type Phase = {
  title: string;
  nodes: RoadmapNode[];
  progress: number;
};

export type Roadmap = {
  projectTitle: string;
  phases: Phase[];
  totalProgress: number;
};

const CHECKBOX_RE = /^(\s*)[-*+] \[([ xX])\]\s+(.+?)\s*$/;
const H1_RE = /^#\s+(.+?)\s*$/;
const H2_RE = /^##\s+(.+?)\s*$/;
const INDENT_PER_LEVEL = 2;

export function parseRoadmap(markdown: string): Roadmap {
  const lines = markdown.split(/\r?\n/);
  let projectTitle = "";
  const phases: Phase[] = [];
  let currentPhase: Phase | null = null;
  let stack: { level: number; node: RoadmapNode }[] = [];

  for (const line of lines) {
    const h2 = line.match(H2_RE);
    if (h2) {
      currentPhase = { title: h2[1], nodes: [], progress: 0 };
      phases.push(currentPhase);
      stack = [];
      continue;
    }

    const h1 = line.match(H1_RE);
    if (h1) {
      if (!projectTitle) projectTitle = h1[1];
      continue;
    }

    const cb = line.match(CHECKBOX_RE);
    if (cb) {
      const level = Math.floor(cb[1].length / INDENT_PER_LEVEL);
      const done = cb[2].toLowerCase() === "x";
      const node: RoadmapNode = {
        title: cb[3].trim(),
        done,
        children: [],
      };

      if (!currentPhase) {
        currentPhase = { title: "", nodes: [], progress: 0 };
        phases.push(currentPhase);
      }

      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        currentPhase.nodes.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }
      stack.push({ level, node });
    }
  }

  for (const phase of phases) {
    phase.progress = progressOf(phase.nodes);
  }

  const allTotal = phases.reduce((s, p) => s + countAll(p.nodes), 0);
  const allDone = phases.reduce((s, p) => s + countDone(p.nodes), 0);
  const totalProgress = allTotal === 0 ? 0 : allDone / allTotal;

  return { projectTitle, phases, totalProgress };
}

function countAll(nodes: RoadmapNode[]): number {
  let n = 0;
  for (const node of nodes) n += 1 + countAll(node.children);
  return n;
}

function countDone(nodes: RoadmapNode[]): number {
  let n = 0;
  for (const node of nodes) n += (node.done ? 1 : 0) + countDone(node.children);
  return n;
}

function progressOf(nodes: RoadmapNode[]): number {
  const total = countAll(nodes);
  return total === 0 ? 0 : countDone(nodes) / total;
}
