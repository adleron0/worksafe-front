/** Quantos filtros do painel estão preenchidos (para o contador do botão "Filtros"). */
export function countFilters(params: object, keys: string[]) {
  const values = params as Record<string, unknown>;
  return keys.filter((key) => {
    const value = values[key];
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.some((part) => part !== undefined && part !== null && part !== "");
    return true;
  }).length;
}
