/** "/comercial/propostas/:id" casa "/comercial/propostas/12" (e não "/comercial/propostas/12/x"). */
export function matchRoute(pattern: string, path: string): boolean {
  const clean = (value: string) => value.replace(/\/+$/, "") || "/";
  const parts = clean(pattern).split("/");
  const actual = clean(path).split("/");
  if (parts.length !== actual.length) return false;
  return parts.every((part, i) => (part.startsWith(":") ? actual[i] !== "" : part === actual[i]));
}
export const matchesAny = (patterns: string[], path: string) => patterns.some((pattern) => matchRoute(pattern, path));
