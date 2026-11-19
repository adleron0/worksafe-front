import { renderToStaticMarkup } from "react-dom/server";
import { WorkLine, pctBr } from "./measurement";

/** Boletim de medição com o relatório do período (RDOs), como a API devolve. */
export interface WorkReport {
  id?: number; label: string; status: string; periodStart: string | null; periodEnd: string | null; notes: string | null;
  contract: { number: string; title: string; value: number; customer: { name: string; corporateName?: string | null; cnpj?: string | null }; customerOrderNumber?: string | null };
  plan: { mobilization: { rate: number; value: number }; depositRate: number } | null;
  lines: WorkLine[]; value: number; invoiceValue: number; depositValue: number; measuredToDate: number; balance: number;
  decision: { decision: string; manual: boolean; name: string; role?: string | null; note?: string | null; at: string } | null;
  sentAt: string | null; decidedAt: string | null; invoiceNumber: string | null;
  order: { number: string; location: string | null } | null;
  rdo: {
    reports: number; hours: number; overtime: number; hoursLost: number;
    days: Array<{ date: string | null; shift: string; weather: string; people: number; hours: number; activities: string }>;
    roles: Array<{ role: string; people: number; hours: number; overtime: number }>;
    occurrences: Array<{ date: string | null; type: string; description: string; hoursLost: number }>;
    photos: Array<{ date: string | null; url: string; caption: string }>;
  };
  company?: { name: string; logoUrl: string | null; color: string | null };
  publicKey?: string | null;
}

const money = (value: number | null | undefined) => (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const br = (value: string | null | undefined) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "");
const WEATHER: Record<string, string> = { bom: "Bom", nublado: "Nublado", chuva: "Chuva", impraticavel: "Impraticável" };
const SHIFT: Record<string, string> = { integral: "Integral", manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const STATUS: Record<string, string> = { rascunho: "Rascunho", enviada: "Aguardando aprovação", aprovada: "Aprovado", contestada: "Contestado", faturada: "Faturado" };

const TH: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 11, color: "#555", borderBottom: "1px solid #ddd", background: "#f6f6f6" };
const TD: React.CSSProperties = { padding: "6px 8px", fontSize: 12, borderBottom: "1px solid #eee", verticalAlign: "top" };
const NUM: React.CSSProperties = { ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const H2: React.CSSProperties = { fontSize: 14, margin: "18px 0 6px", fontWeight: 700 };

/**
 * O boletim em papel: cabeçalho, tabela de medição por frente, totais (nota,
 * caução, a receber), acumulado do contrato e o relatório do período tirado dos
 * RDOs fechados (efetivo e horas, atividades, ocorrências, clima e fotos).
 * Estilos inline: o mesmo componente vai para a tela, para o link do cliente e
 * para a impressão em PDF.
 */
export function WorkReportPaper({ report }: { report: WorkReport }) {
  const lines = report.lines.filter((l) => l.kind !== "caucao");
  const deposit = report.lines.find((l) => l.kind === "caucao");
  return (
    <div style={{ fontFamily: "inherit", color: "#111", background: "#fff", padding: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "flex-start", borderBottom: `3px solid ${report.company?.color || "#149E5E"}`, paddingBottom: 10 }}>
        <div>
          {report.company?.logoUrl ? <img src={report.company.logoUrl} alt={report.company.name} style={{ maxHeight: 48, maxWidth: 180 }} /> : report.company?.name ? <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{report.company.name}</p> : null}
          <p style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 0" }}>Boletim de medição {report.label}</p>
          <p style={{ fontSize: 12, margin: "2px 0 0", color: "#444" }}>Período de {br(report.periodStart)} a {br(report.periodEnd)} · {STATUS[report.status] ?? report.status}</p>
        </div>
        <div style={{ fontSize: 12, color: "#333", marginLeft: "auto" }}>
          <p style={{ margin: 0 }}><b>{report.contract.customer.corporateName || report.contract.customer.name}</b></p>
          <p style={{ margin: 0 }}>Contrato {report.contract.number}{report.order ? ` · ${report.order.number}` : ""}</p>
          <p style={{ margin: 0 }}>{report.contract.title}</p>
          {report.contract.customerOrderNumber && <p style={{ margin: 0 }}>Pedido do cliente {report.contract.customerOrderNumber}</p>}
          {report.order?.location && <p style={{ margin: 0 }}>{report.order.location}</p>}
        </div>
      </div>

      <h2 style={H2}>Medição do período</h2>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
        <thead><tr><th style={TH}>Item</th><th style={{ ...TH, textAlign: "right" }}>Anterior</th><th style={{ ...TH, textAlign: "right" }}>No período</th><th style={{ ...TH, textAlign: "right" }}>Acumulado</th><th style={{ ...TH, textAlign: "right" }}>Valor</th></tr></thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td style={TD}>{line.description}{line.kind === "frente" && line.base ? <span style={{ display: "block", fontSize: 10, color: "#666" }}>frente de {money(line.base)}{line.rule === "conclusao" ? " · medida ao concluir" : ""}</span> : null}</td>
              <td style={NUM}>{line.kind === "frente" ? pctBr(line.prevPercent) : ""}</td>
              <td style={NUM}>{line.kind === "frente" ? pctBr(line.percent) : ""}</td>
              <td style={NUM}>{line.kind === "frente" ? pctBr(line.accPercent) : ""}</td>
              <td style={NUM}>{money(line.value)}</td>
            </tr>
          ))}
          <tr><td style={{ ...TD, fontWeight: 700 }} colSpan={4}>Valor da nota fiscal deste boletim</td><td style={{ ...NUM, fontWeight: 700 }}>{money(report.invoiceValue)}</td></tr>
          {report.depositValue > 0 && <tr><td style={TD} colSpan={4}>{deposit?.description ?? "Caução contratual retida"}</td><td style={NUM}>{money(-report.depositValue)}</td></tr>}
          {report.depositValue > 0 && <tr><td style={{ ...TD, fontWeight: 700 }} colSpan={4}>A pagar neste boletim (sem a caução)</td><td style={{ ...NUM, fontWeight: 700 }}>{money(report.value)}</td></tr>}
        </tbody>
      </table></div>
      <p style={{ fontSize: 12, margin: "8px 0 0", color: "#333" }}>
        Contrato: {money(report.contract.value)} · medido até este boletim: {money(report.measuredToDate)} · saldo a medir: {money(report.balance)}
      </p>
      {report.notes && <p style={{ fontSize: 12, margin: "6px 0 0" }}><b>Observações:</b> {report.notes}</p>}

      <h2 style={H2}>Relatório do período</h2>
      {report.rdo.reports === 0 ? <p style={{ fontSize: 12, color: "#555" }}>Nenhum relatório diário de obra (RDO) fechado no período.</p> : (
        <>
          <p style={{ fontSize: 12, margin: 0 }}>{report.rdo.reports} RDO(s) · {report.rdo.hours.toLocaleString("pt-BR")} h trabalhadas{report.rdo.overtime ? ` + ${report.rdo.overtime.toLocaleString("pt-BR")} h extras` : ""}{report.rdo.hoursLost ? ` · ${report.rdo.hoursLost.toLocaleString("pt-BR")} h paradas` : ""}</p>
          {report.rdo.roles.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
              <thead><tr><th style={TH}>Efetivo (função)</th><th style={{ ...TH, textAlign: "right" }}>Diárias</th><th style={{ ...TH, textAlign: "right" }}>Horas</th><th style={{ ...TH, textAlign: "right" }}>Extras</th></tr></thead>
              <tbody>{report.rdo.roles.map((r) => <tr key={r.role}><td style={TD}>{r.role}</td><td style={NUM}>{r.people}</td><td style={NUM}>{r.hours.toLocaleString("pt-BR")}</td><td style={NUM}>{r.overtime.toLocaleString("pt-BR")}</td></tr>)}</tbody>
            </table>
          )}
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, minWidth: 420 }}>
            <thead><tr><th style={TH}>Dia</th><th style={TH}>Clima</th><th style={{ ...TH, textAlign: "right" }}>Equipe</th><th style={TH}>Atividades</th></tr></thead>
            <tbody>{report.rdo.days.map((d, i) => <tr key={i}><td style={{ ...TD, whiteSpace: "nowrap" }}>{br(d.date)}{d.shift !== "integral" ? ` (${SHIFT[d.shift] ?? d.shift})` : ""}</td><td style={TD}>{WEATHER[d.weather] ?? d.weather}</td><td style={NUM}>{d.people} · {d.hours.toLocaleString("pt-BR")} h</td><td style={TD}>{d.activities}</td></tr>)}</tbody>
          </table></div>
          {report.rdo.occurrences.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, margin: "10px 0 4px" }}>Ocorrências</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>{report.rdo.occurrences.map((o, i) => <li key={i}>{br(o.date)}: {o.description}{o.hoursLost ? ` (${o.hoursLost.toLocaleString("pt-BR")} h)` : ""}</li>)}</ul>
            </>
          )}
          {report.rdo.photos.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, margin: "10px 0 4px" }}>Fotos</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                {report.rdo.photos.map((p, i) => (
                  <figure key={i} style={{ margin: 0, breakInside: "avoid" }}>
                    <img src={p.url} alt={p.caption || `Foto de ${br(p.date)}`} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4 }} />
                    <figcaption style={{ fontSize: 10, color: "#555" }}>{br(p.date)}{p.caption ? ` · ${p.caption}` : ""}</figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {report.decision && (
        <p style={{ fontSize: 12, marginTop: 16, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 4 }}>
          {report.decision.decision === "aprovada" ? "Aprovado" : "Contestado"} por <b>{report.decision.name}</b>{report.decision.role ? ` (${report.decision.role})` : ""} em {new Date(report.decision.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          {report.decision.manual ? " · registrado no sistema" : " · pelo link"}{report.decision.note ? ` · "${report.decision.note}"` : ""}
        </p>
      )}
    </div>
  );
}

/** Abre a janela de impressão com o boletim (o navegador oferece "Salvar como PDF"). */
export async function printWorkReport(report: WorkReport) {
  const name = `${report.contract.number} ${report.label} - ${report.contract.customer.name}`.replace(/[\\/:*?"<>|]/g, " ");
  const html = renderToStaticMarkup(<WorkReportPaper report={report} />);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none";
  const font = getComputedStyle(document.body).fontFamily.replace(/[<>]/g, "");
  frame.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${name.replace(/[&<>"]/g, "")}</title><style>
    @page { size:A4; margin:12mm; } *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; box-sizing:border-box; }
    html,body{ margin:0; background:#fff; font-family:${font}; } tr{ break-inside:avoid; }
  </style></head><body>${html}</body></html>`;
  await new Promise<void>((resolve) => { frame.onload = () => resolve(); document.body.appendChild(frame); });
  const inner = frame.contentWindow;
  if (!inner) { frame.remove(); return; }
  await Promise.all(Array.from(inner.document.images).map((image) => (image.complete ? null : new Promise((done) => { image.onload = done; image.onerror = done; }))));
  const previous = document.title;
  document.title = name;
  const cleanup = () => { document.title = previous; frame.remove(); };
  inner.addEventListener("afterprint", () => setTimeout(cleanup, 300));
  setTimeout(() => { if (frame.isConnected) cleanup(); }, 10 * 60 * 1000);
  inner.focus();
  inner.print();
}
