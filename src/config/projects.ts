export type Project = {
  owner: string;
  repo: string;
  label: string;
  branch: string;
};

export const PROJECTS: Project[] = [
  // Rellena con tus repos. Ejemplos:
  // { owner: "antoniserrasastre-blip", repo: "daybook",    label: "Daybook",     branch: "main" },
  // { owner: "antoniserrasastre-blip", repo: "otro-repo",  label: "Otro",        branch: "main" },
  // { owner: "antoniserrasastre-blip", repo: "experimento",label: "Experimento", branch: "develop" },
];

export function isAllowed(owner: string, repo: string): boolean {
  const o = owner.toLowerCase();
  const r = repo.toLowerCase();
  return PROJECTS.some(
    (p) => p.owner.toLowerCase() === o && p.repo.toLowerCase() === r
  );
}
