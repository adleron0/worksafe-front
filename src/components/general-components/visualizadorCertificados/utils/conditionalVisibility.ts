/**
 * Objetos condicionais: mostrar só quando uma variável tiver valor.
 *
 * Qualquer objeto do modelo pode levar `showIf: 'inscricao_empresa'` (ou várias
 * chaves separadas por vírgula, todas obrigatórias). Se alguma estiver vazia, o
 * objeto sai na geração. Porte da API (`render/conditional-visibility.ts`) —
 * manter os dois iguais.
 */
import type { VariableToReplace } from '../types';

export function showIfKeys(obj: any): string[] {
  const raw = obj?.showIf;
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((k) => k.trim().replace(/^\{\{|\}\}$/g, ''))
    .filter(Boolean);
}

function hasValue(variables: VariableToReplace, key: string) {
  const v = variables[key];
  return v != null && v.value != null && String(v.value).trim() !== '';
}

export function applyConditionalVisibility(json: any, variables: VariableToReplace): any {
  const objects: any[] = Array.isArray(json?.objects) ? json.objects : [];
  if (!objects.some((o) => showIfKeys(o).length)) return json;
  return {
    ...json,
    objects: objects.filter((o) => showIfKeys(o).every((k) => hasValue(variables, k))),
  };
}
