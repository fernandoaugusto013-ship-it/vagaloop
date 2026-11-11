/** Só aceita caminhos internos (evita open redirect). */
export function safePath(p: string | null | undefined, fallback = "/") {
  if (!p || typeof p !== "string") return fallback;
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return fallback;
  return p;
}
