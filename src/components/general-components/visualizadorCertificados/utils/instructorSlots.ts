/**
 * Espaços de instrutor que se ajustam à turma.
 *
 * No editor, cada objeto do bloco de um instrutor (nome, registro, currículo,
 * assinatura, linha…) leva `instructorSlot: n` (1 a 4). O modelo é desenhado
 * com todos os espaços lado a lado; na hora de gerar a imagem, os espaços sem
 * instrutor (`instrutor_nome_n` vazio) saem e os que sobram são redistribuídos
 * em colunas iguais na mesma largura, preservando o desenho interno de cada um.
 *
 * Modelo sem `instructorSlot` não muda nada. Porte da API
 * (`render/instructor-slots.ts`) — manter os dois iguais.
 */
import type { VariableToReplace } from '../types';

type CertificateVariables = VariableToReplace;

type Box = { left: number; right: number };

function slotOf(obj: any): number | null {
  const n = Number(obj?.instructorSlot);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Extensão horizontal do objeto, considerando escala e origem. */
function horizontalBox(obj: any): Box {
  const w = (Number(obj.width) || 0) * (Number(obj.scaleX) || 1);
  const left = Number(obj.left) || 0;
  const start =
    obj.originX === 'center'
      ? left - w / 2
      : obj.originX === 'right'
        ? left - w
        : left;
  return { left: start, right: start + w };
}

function hasValue(variables: CertificateVariables, key: string) {
  const v = variables[key];
  return v != null && v.value != null && String(v.value).trim() !== '';
}

export function layoutInstructorSlots(
  json: any,
  variables: CertificateVariables,
): any {
  const objects: any[] = Array.isArray(json?.objects) ? json.objects : [];
  const boxes = new Map<number, Box>();
  for (const o of objects) {
    const n = slotOf(o);
    if (n == null) continue;
    const b = horizontalBox(o);
    const cur = boxes.get(n);
    boxes.set(
      n,
      cur
        ? { left: Math.min(cur.left, b.left), right: Math.max(cur.right, b.right) }
        : b,
    );
  }
  if (boxes.size === 0) return json;

  const slots = [...boxes.keys()].sort((a, b) => a - b);
  const active = slots.filter((n) => hasValue(variables, `instrutor_nome_${n}`));
  // nenhum instrutor preenchido: mantém o primeiro espaço (modelo em branco)
  const keep = active.length ? active : [slots[0]];

  const spanLeft = Math.min(...slots.map((n) => boxes.get(n)!.left));
  const spanRight = Math.max(...slots.map((n) => boxes.get(n)!.right));
  const col = (spanRight - spanLeft) / keep.length;
  const shift = new Map<number, number>();
  keep.forEach((n, i) => {
    const b = boxes.get(n)!;
    const target = spanLeft + col * (i + 0.5);
    shift.set(n, target - (b.left + b.right) / 2);
  });

  return {
    ...json,
    objects: objects.flatMap((o) => {
      const n = slotOf(o);
      if (n == null) return [o];
      if (!shift.has(n)) return [];
      return [{ ...o, left: (Number(o.left) || 0) + shift.get(n)! }];
    }),
  };
}
