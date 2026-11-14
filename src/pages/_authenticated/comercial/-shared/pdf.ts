import { commercialApi } from "./commercial";
import { DOCUMENT_CSS } from "./document";

interface ClientView { html: string; number: string; title: string; company: { name: string } }

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);

/**
 * PDF da proposta: monta a folha (o mesmo documento que o cliente vê) numa
 * página à parte, em A4, e abre a janela de impressão do navegador já com
 * "Salvar como PDF". O texto sai como texto (dá para selecionar e buscar) e a
 * quebra de página é a do navegador, sem cortar linha ao meio.
 *
 * O nome sugerido para o arquivo é o título da página: "PC-2026-0001 - Cliente".
 */
export async function downloadProposalPdf(id: number, customerName?: string): Promise<void> {
  const view = await commercialApi.get<ClientView>(`proposals/${id}/client-view`);
  const name = [view.number, customerName].filter(Boolean).join(" - ").replace(/[\\/:*?"<>|]/g, " ");
  const font = getComputedStyle(document.body).fontFamily;
  // fora da tela, com a largura de uma A4: o navegador pagina pelo papel, não pelo quadro
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none";
  frame.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(name)}</title><style>
    @page { size:A4; margin:14mm 13mm; }
    *, *::before, *::after { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    html, body { margin:0; padding:0; background:#fff; font-family:${font.replace(/[<>]/g, "")}; }
    img, svg { max-width:100%; }
    table { border-collapse:collapse; }
    ${DOCUMENT_CSS}
  </style></head><body><div class="proposal-doc">${view.html}</div></body></html>`;

  await new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error("Não foi possível montar o documento"));
    document.body.appendChild(frame);
  });
  const inner = frame.contentWindow;
  if (!inner) { frame.remove(); throw new Error("Não foi possível montar o documento"); }
  // espera as imagens (logo, fotos da proposta) para não sair folha com buraco
  await Promise.all(Array.from(inner.document.images).map((image) => (image.complete ? null : new Promise((done) => { image.onload = done; image.onerror = done; }))));
  await inner.document.fonts?.ready.catch(() => undefined);

  // alguns navegadores usam o título da página de fora como nome do arquivo
  const previousTitle = document.title;
  document.title = name;
  const cleanup = () => { document.title = previousTitle; frame.remove(); };
  inner.addEventListener("afterprint", () => setTimeout(cleanup, 300));
  // se o navegador não avisar o fim da impressão, limpa depois de um tempo
  setTimeout(() => { if (frame.isConnected) cleanup(); }, 10 * 60 * 1000);
  inner.focus();
  inner.print();
}
