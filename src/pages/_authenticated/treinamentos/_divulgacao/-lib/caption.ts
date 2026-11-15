/**
 * Motor da legenda:
 *  - `{{chave}}` vira o valor;
 *  - linha com alguma variável vazia some inteira (assim "💰 Investimento: {{preco}}"
 *    desaparece quando a turma não tem preço);
 *  - `{{#chave}} … {{/chave}}` só aparece se a chave tiver valor;
 *    `{{^chave}} … {{/chave}}` só aparece se estiver vazia;
 *  - sobra de linhas em branco é reduzida a uma.
 */
const filled = (values: Record<string, string>, key: string) => String(values[key.trim()] ?? "").trim() !== "";

function resolveBlocks(text: string, values: Record<string, string>): string {
  const block = /\{\{([#^])\s*([\w]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/;
  let out = text;
  for (let guard = 0; guard < 200; guard++) {
    const m = out.match(block);
    if (!m || m.index === undefined) break;
    const show = m[1] === "#" ? filled(values, m[2]) : !filled(values, m[2]);
    let inner = show ? m[3] : "";
    // o bloco em linha própria não deixa linha vazia para trás
    if (inner.startsWith("\n")) inner = inner.slice(1);
    let start = m.index;
    let end = m.index + m[0].length;
    if (!show) {
      const lineStart = out.lastIndexOf("\n", start - 1) + 1;
      const after = out.indexOf("\n", end);
      const before = out.slice(lineStart, start);
      const rest = out.slice(end, after === -1 ? out.length : after);
      if (!before.trim() && !rest.trim()) {
        start = lineStart;
        end = after === -1 ? out.length : after + 1;
      }
    } else if (out[end] === "\n" && inner.endsWith("\n")) {
      end += 1;
    }
    out = out.slice(0, start) + inner + out.slice(end);
  }
  return out;
}

export function renderCaption(template: string, values: Record<string, string>): string {
  const withBlocks = resolveBlocks(template.replace(/\r\n/g, "\n"), values);
  const lines = withBlocks.split("\n").flatMap((line) => {
    const keys = [...line.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)].map((m) => m[1]);
    if (keys.length && keys.some((k) => !filled(values, k))) return [];
    const replaced = line.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k: string) => String(values[k] ?? ""));
    // variável com várias linhas (lista do incluso, preços por nível)
    return replaced.split("\n").map((l) => l.replace(/\s+$/, ""));
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Legenda sugerida para cada situação da turma. */
export const KIND_FOR_SITUATION: Record<string, string> = {
  vagas_abertas: "turma_nova",
  ultimas_vagas: "ultimas_vagas",
  promocao: "promocao",
  lotada: "turma_nova",
};

export const CAPTION_KIND_LABELS: Record<string, string> = {
  turma_nova: "Turma nova",
  ultimas_vagas: "Últimas vagas",
  promocao: "Promoção",
  curso_rapido: "Curso rápido",
  story: "Story / WhatsApp",
  outro: "Outro",
};
