import { useEffect, useState } from "react";
import {
  RefreshCw, ChevronDown, ChevronRight, Folder,
  AlertCircle, Check,
} from "lucide-react";
import { PROJECTS, type Project } from "../config/projects";
import {
  parseRoadmap,
  type Roadmap, type RoadmapNode, type Phase,
} from "../lib/roadmap-parser";

type ProjectState = {
  loading: boolean;
  error: string | null;
  roadmap: Roadmap | null;
  fetchedAt: Date | null;
};

const REFRESH_MS = 5 * 60 * 1000;
const keyOf = (p: Project) => `${p.owner}/${p.repo}@${p.branch}`;

const initialState = (): ProjectState => ({
  loading: true, error: null, roadmap: null, fetchedAt: null,
});

export function ProjectsView() {
  const [states, setStates] = useState<Record<string, ProjectState>>(
    () => Object.fromEntries(PROJECTS.map((p) => [keyOf(p), initialState()]))
  );

  const fetchOne = async (p: Project) => {
    const k = keyOf(p);
    setStates((prev) => ({
      ...prev,
      [k]: { ...(prev[k] ?? initialState()), loading: true, error: null },
    }));
    try {
      const qs = new URLSearchParams({
        owner: p.owner, repo: p.repo, branch: p.branch,
      }).toString();
      const res = await fetch(`/api/roadmap?${qs}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status} — ${body || res.statusText}`);
      }
      const md = await res.text();
      const roadmap = parseRoadmap(md);
      setStates((prev) => ({
        ...prev,
        [k]: { loading: false, error: null, roadmap, fetchedAt: new Date() },
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setStates((prev) => ({
        ...prev,
        [k]: { ...(prev[k] ?? initialState()), loading: false, error: message },
      }));
    }
  };

  const fetchAll = () => { PROJECTS.forEach(fetchOne); };

  useEffect(() => {
    fetchAll();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchAll();
    }, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (PROJECTS.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-12 text-center text-zinc-500">
        <Folder size={32} className="mx-auto mb-3 text-zinc-700" />
        <div>No hay proyectos configurados</div>
        <div className="text-xs mt-2">
          Edita <code className="text-zinc-400">src/config/projects.ts</code> y añade tus repos.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PROJECTS.map((p) => (
        <ProjectCard
          key={keyOf(p)}
          project={p}
          state={states[keyOf(p)] ?? initialState()}
          onRefresh={() => fetchOne(p)}
        />
      ))}
    </div>
  );
}

function ProjectCard({
  project, state, onRefresh,
}: {
  project: Project;
  state: ProjectState;
  onRefresh: () => void;
}) {
  const { loading, error, roadmap, fetchedAt } = state;

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium">{project.label}</h3>
          <p className="text-xs text-zinc-500">
            {project.owner}/{project.repo} · {project.branch}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
          aria-label="Refrescar"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-sm text-red-300">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div className="break-words">{error}</div>
        </div>
      ) : !roadmap ? (
        <div className="text-sm text-zinc-500 py-4">Cargando…</div>
      ) : (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-zinc-400">
                {roadmap.projectTitle || "Sin título"}
              </span>
              <span className="text-zinc-300 font-mono">
                {Math.round(roadmap.totalProgress * 100)}%
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
                style={{ width: `${roadmap.totalProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {roadmap.phases.length === 0 ? (
              <div className="text-xs text-zinc-500 italic">Sin fases detectadas.</div>
            ) : (
              roadmap.phases.map((phase, i) => <PhaseBlock key={i} phase={phase} />)
            )}
          </div>
        </>
      )}

      {fetchedAt && (
        <div className="text-[10px] text-zinc-600 mt-3 pt-2 border-t border-zinc-800">
          Última lectura: {fetchedAt.toLocaleTimeString("es-ES")}
        </div>
      )}
    </div>
  );
}

function PhaseBlock({ phase }: { phase: Phase }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(phase.progress * 100);

  return (
    <div className="rounded-lg bg-zinc-800/30 border border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center gap-2 hover:bg-zinc-800/50 transition"
      >
        {open
          ? <ChevronDown size={14} className="text-zinc-500 flex-shrink-0" />
          : <ChevronRight size={14} className="text-zinc-500 flex-shrink-0" />}
        <span className="text-sm font-medium flex-1 text-left truncate">
          {phase.title || "Sin fase"}
        </span>
        <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden flex-shrink-0">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-500 font-mono w-10 text-right flex-shrink-0">
          {pct}%
        </span>
      </button>
      {open && phase.nodes.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-1">
          <NodeTree nodes={phase.nodes} depth={0} />
        </div>
      )}
    </div>
  );
}

function NodeTree({ nodes, depth }: { nodes: RoadmapNode[]; depth: number }) {
  return (
    <>
      {nodes.map((node, i) => (
        <div key={i}>
          <div
            className="flex items-start gap-2 text-sm py-0.5"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            <div
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                node.done
                  ? "bg-emerald-500/20 border-emerald-500/40"
                  : "bg-zinc-900 border-zinc-700"
              }`}
            >
              {node.done && <Check size={9} className="text-emerald-300" />}
            </div>
            <span
              className={
                node.done
                  ? "text-zinc-500 line-through"
                  : "text-zinc-300"
              }
            >
              {node.title}
            </span>
          </div>
          {node.children.length > 0 && (
            <NodeTree nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </>
  );
}
