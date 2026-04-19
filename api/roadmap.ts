import { isAllowed } from "../src/config/projects";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return text("Method not allowed", 405);
  }

  const url = new URL(req.url);
  const owner = url.searchParams.get("owner")?.trim();
  const repo = url.searchParams.get("repo")?.trim();
  const branch = url.searchParams.get("branch")?.trim() || "main";

  if (!owner || !repo) {
    return text("owner and repo query params required", 400);
  }
  if (!isAllowed(owner, repo)) {
    return text("Repo not in allowlist", 403);
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return text("GITHUB_PAT env var not configured", 500);
  }

  const ghUrl =
    `https://api.github.com/repos/${encodeURIComponent(owner)}` +
    `/${encodeURIComponent(repo)}/contents/ROADMAP.md` +
    `?ref=${encodeURIComponent(branch)}`;

  let ghRes: Response;
  try {
    ghRes = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "daybook-dashboard",
      },
    });
  } catch {
    return text("Network error reaching GitHub", 502);
  }

  if (ghRes.status === 401) return text("GitHub rejected the PAT", 401);
  if (ghRes.status === 403) return text("GitHub forbade the request (rate limit or scope)", 403);
  if (ghRes.status === 404) return text("ROADMAP.md not found in that repo/branch", 404);
  if (!ghRes.ok) return text(`GitHub upstream error: ${ghRes.status}`, 502);

  const markdown = await ghRes.text();
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
