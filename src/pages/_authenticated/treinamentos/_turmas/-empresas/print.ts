/**
 * Imprime (ou salva em PDF pelo diálogo de impressão) um HTML simples num
 * iframe escondido, sem abrir outra aba. Para listas que o cliente pede em
 * papel: lista de presença assinada, relatório da empresa.
 */
export const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function printHtml(title: string, body: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4; margin: 14mm; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; font-size: 11px; }
    h1 { font-size: 16px; margin: 0 0 2px; } h2 { font-size: 13px; margin: 14px 0 4px; }
    .muted { color: #555; } .meta { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: 600; } td.c, th.c { text-align: center; }
    td.sign { width: 34%; height: 22px; } tr { page-break-inside: avoid; }
  </style></head><body>${body}</body></html>`);
  doc.close();
  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  if (doc.readyState === "complete") setTimeout(run, 50);
  else frame.onload = run;
}
