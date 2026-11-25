import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * A folha da OS: o documento que a equipe recebe. É a mesma na página da OS,
 * na impressão e na página do cliente — o que se vê é o que se imprime.
 *
 * Fundo branco e tipografia própria (não segue o tema escuro), largura de uma
 * A4; em telas menores a folha é reduzida por inteiro, como um PDF.
 */
const PAGE_WIDTH = 794; // A4 a 96 dpi

export interface SheetStep { step: number; title: string; start: number; duration: number; details: string | null; from: string | null; to: string | null; percent: number | null }
export interface SheetScopeItem { type: string; description: string; unit: string | null; quantity: number; workDays: number | null; overtimeHours: number; night: boolean; weekend: boolean; travel: boolean }
export interface SheetValues { sections: Array<{ title: string; items: Array<{ value: number; unitValue: number }>; total: number }>; subtotal: number; discount: number; total: number }
export interface OrderSheetData {
  company: { name: string; corporateName: string; cnpj: string; logoUrl: string | null; color: string; phone: string; email: string; address: string; registrations: string };
  order: {
    id: number; number: string; status: string; statusLabel: string; title: string; description: string | null; location: string | null; latitude: number | null; longitude: number | null;
    plannedStart: string | null; plannedEnd: string | null; startedAt: string | null; finishedAt: string | null; contactName: string | null; contactPhone: string | null;
    safety: string | null; notes: string | null; conclusionNotes: string | null;
  };
  customer: { name: string; corporateName: string; cnpj: string } | null;
  customerOrder: { number: string; date: string | null } | null;
  responsible: { name: string; phone: string | null } | null;
  schedule: { unit: string; start: string | null; end: string | null; steps: SheetStep[]; replanned: boolean } | null;
  scope: Array<{ title: string; kind: string; items: SheetScopeItem[] }>;
  team: Array<{ name: string | null; role: string; from: string | null; to: string | null; shift: string | null }>;
  checklist: Array<{ title: string; done: boolean }>;
  progress: { done: number; planned: number | null; lastReport: string | null } | null;
  // só na folha interna
  withValues?: boolean; canSeeValues?: boolean; values?: SheetValues | null; issuedAt?: string; issuedBy?: string | null; systemUrl?: string | null; publicUrl?: string | null;
}

const UNIT: Record<string, [string, string]> = { dia: ["dia", "dias"], semana: ["semana", "semanas"], mes: ["mês", "meses"] };
export const dateShort = (value: string | null | undefined) => (value ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : "");
export const dateFull = (value: string | null | undefined) => (value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : "");
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (value: number) => (Number.isInteger(value) ? String(value) : String(value).replace(".", ","));
const cnpjText = (value: string) => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 14) return `CNPJ ${digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`;
  if (digits.length === 11) return `CPF ${digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}`;
  return value;
};
const quantityText = (item: SheetScopeItem) => {
  if (item.type === "mao_de_obra") return `${num(item.quantity)} profissiona${item.quantity === 1 ? "l" : "is"}${item.workDays ? ` · ${item.workDays} dia${item.workDays === 1 ? "" : "s"}` : ""}`;
  return `${num(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`;
};
const tagsOf = (item: SheetScopeItem) => [item.night && "noturno", item.weekend && "fim de semana", item.travel && "com deslocamento", item.overtimeHours > 0 && `${num(item.overtimeHours)} h extras`].filter(Boolean).join(" · ");

/** Período da obra numa frase, do jeito que a equipe lê. */
export function sheetPeriod(order: OrderSheetData["order"], schedule: OrderSheetData["schedule"]): string {
  if (order.finishedAt) return `${dateFull(order.startedAt)} a ${dateFull(order.finishedAt)} (realizado)`;
  const start = order.startedAt ?? order.plannedStart;
  const end = order.plannedEnd ?? schedule?.end ?? null;
  if (!start) return "A definir";
  return `${dateFull(start)}${end ? ` a ${dateFull(end)}` : ""}${order.startedAt ? " · em andamento" : ""}`;
}

export const SHEET_CSS = `
  .os-sheet { background:#fff; color:#111; font-size:12.5px; line-height:1.4; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  .os-sheet * { box-sizing:border-box; }
  .os-sheet h2 { font-size:10.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin:16px 0 6px; color:#111; display:flex; align-items:center; gap:6px; }
  .os-sheet h2::before { content:""; width:4px; height:12px; background:var(--brand); border-radius:1px; }
  .os-sheet table { width:100%; border-collapse:collapse; }
  .os-sheet th { text-align:left; font-size:10px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:.04em; padding:4px 6px; border-bottom:1.5px solid #222; }
  .os-sheet td { padding:5px 6px; border-bottom:1px solid #ddd; vertical-align:top; }
  .os-sheet .num { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .os-sheet .muted { color:#666; }
  .os-sheet .small { font-size:11px; }
  .os-sheet .info { display:grid; grid-template-columns: 1fr 1fr; border:1px solid #bbb; border-radius:4px; }
  .os-sheet .info > div { padding:6px 8px; border-bottom:1px solid #ddd; }
  .os-sheet .info > div:nth-child(odd) { border-right:1px solid #ddd; }
  .os-sheet .info .wide { grid-column: 1 / -1; border-right:0 !important; }
  .os-sheet .info .label { font-size:9.5px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#666; }
  .os-sheet .info .value { font-size:13px; font-weight:600; }
  .os-sheet .bar { position:relative; height:9px; background:#eee; border-radius:2px; min-width:120px; }
  .os-sheet .bar span { position:absolute; top:0; bottom:0; border-radius:2px; }
  .os-sheet .box { display:inline-flex; width:13px; height:13px; border:1.5px solid #222; border-radius:2px; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; margin-top:1px; }
  .os-sheet .check { display:flex; gap:7px; align-items:flex-start; padding:3px 0; }
  .os-sheet button.check { background:none; border:0; text-align:left; width:100%; cursor:pointer; font:inherit; color:inherit; }
  .os-sheet button.check:hover .box { background:#f3f3f3; }
  .os-sheet .two { display:grid; grid-template-columns: 1fr 1fr; gap:18px; }
  .os-sheet .alert { border:1.5px solid #b45309; background:#fffbeb; border-radius:4px; padding:7px 9px; white-space:pre-wrap; }
  .os-sheet .note { border:1px solid #ccc; border-radius:4px; padding:7px 9px; white-space:pre-wrap; }
  .os-sheet .signs { display:grid; grid-template-columns: repeat(3, 1fr); gap:22px; margin-top:34px; }
  .os-sheet .signs div { border-top:1px solid #222; padding-top:4px; text-align:center; font-size:11px; color:#444; }
  .os-sheet .internal { border:1.5px dashed #b91c1c; color:#b91c1c; font-weight:700; font-size:10.5px; letter-spacing:.06em; text-align:center; padding:4px; border-radius:3px; margin-bottom:10px; }
  .os-sheet .foot { display:flex; gap:12px; align-items:center; margin-top:18px; padding-top:10px; border-top:1px solid #ddd; }
  .os-sheet .foot img { width:74px; height:74px; }
  .os-sheet tr, .os-sheet .check, .os-sheet .signs { page-break-inside:avoid; }
  .os-sheet h2 { page-break-after:avoid; }
  /* celular: a folha se rearranja em uma coluna, com letra de leitura (a impressão continua A4) */
  .os-sheet.os-fluid { font-size:15px; line-height:1.45; }
  .os-sheet.os-fluid .info, .os-sheet.os-fluid .two { grid-template-columns: 1fr; gap:0; }
  .os-sheet.os-fluid .info > div { border-right:0 !important; }
  .os-sheet.os-fluid .info .value { font-size:15px; }
  .os-sheet.os-fluid .col-bar { display:none; }
  .os-sheet.os-fluid .signs { grid-template-columns: 1fr; gap:30px; }
  .os-sheet.os-fluid .os-head { flex-direction:column; }
  .os-sheet.os-fluid .os-head > div:last-child { text-align:left !important; }
  .os-sheet.os-fluid h2 { font-size:12px; margin-top:20px; }
  .os-sheet.os-fluid td { padding:7px 4px; }
  .os-sheet.os-fluid .check { padding:6px 0; }
  .os-sheet.os-fluid .box { width:18px; height:18px; font-size:13px; }
  @media print {
    @page { size: A4; margin: 12mm 12mm 14mm; }
    html, body, #root, .h-dvh { height:auto !important; overflow:visible !important; background:#fff !important; }
    .no-print { display:none !important; }
    .os-sheet { zoom:1 !important; width:auto !important; padding:0 !important; border:0 !important; box-shadow:none !important; border-radius:0 !important; }
    .os-sheet, .os-sheet * { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    /* impresso do celular: volta ao desenho da A4 */
    .os-sheet.os-fluid { font-size:12.5px; line-height:1.4; }
    .os-sheet.os-fluid .info { grid-template-columns: 1fr 1fr; }
    .os-sheet.os-fluid .two { grid-template-columns: 1fr 1fr; gap:18px; }
    .os-sheet.os-fluid .info > div:nth-child(odd) { border-right:1px solid #ddd !important; }
    .os-sheet.os-fluid .info .wide { border-right:0 !important; }
    .os-sheet.os-fluid .col-bar { display:table-cell; }
    .os-sheet.os-fluid .signs { grid-template-columns: repeat(3, 1fr); gap:22px; }
    .os-sheet.os-fluid .os-head { flex-direction:row; }
    .os-sheet.os-fluid .os-head > div:last-child { text-align:right !important; }
  }
`;

function useQr(url: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) { setSrc(null); return; }
    let alive = true;
    QRCode.toDataURL(url, { margin: 0, width: 160, errorCorrectionLevel: "M" }).then((data) => { if (alive) setSrc(data); }).catch(() => setSrc(null));
    return () => { alive = false; };
  }, [url]);
  return src;
}

/** Barrinha da etapa dentro do período da obra; com avanço, a parte feita por cima. */
function StepBar({ step, total, color }: { step: SheetStep; total: number; color: string }) {
  const left = ((step.start - 1) / total) * 100;
  const width = (step.duration / total) * 100;
  return (
    <div className="bar" aria-hidden="true">
      <span style={{ left: `${left}%`, width: `${width}%`, background: "#c9c9c9" }} />
      {step.percent !== null && step.percent > 0 && <span style={{ left: `${left}%`, width: `${(width * Math.min(100, step.percent)) / 100}%`, background: color }} />}
    </div>
  );
}

export interface OrderSheetProps {
  data: OrderSheetData;
  /** "cliente": a página aberta (sem assinaturas nem QR do sistema). */
  audience?: "equipe" | "cliente";
  /** Marcar a mobilização direto na folha (na tela). */
  onToggleCheck?: (index: number) => void;
  checking?: boolean;
  className?: string;
}

export function OrderSheet({ data, audience = "equipe", onToggleCheck, checking, className }: OrderSheetProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fluid, setFluid] = useState(false);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => { setScale(Math.min(1, element.clientWidth / PAGE_WIDTH)); setFluid(element.clientWidth < 640); };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const qr = useQr(audience === "equipe" ? data.systemUrl : null);
  const { company, order, schedule, values } = data;
  const color = company.color || "#149E5E";
  const unit = UNIT[schedule?.unit ?? "dia"] ?? UNIT.dia;
  const span = schedule ? Math.max(...schedule.steps.map((step) => step.start + step.duration - 1), 1) : 1;
  const running = data.progress !== null;
  // a proposta soma imprevisibilidade (e arredondamentos) ao total: a diferença aparece numa linha própria para a conta fechar
  const adjust = values ? Math.round((values.total - values.subtotal + values.discount) * 100) / 100 : 0;
  const mapUrl = order.latitude !== null && order.longitude !== null ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : null;

  return (
    <>
      <style>{SHEET_CSS}</style>
      <div ref={frame} className="w-full min-w-0 overflow-hidden">
        <article className={cn("os-sheet mx-auto rounded-md border shadow-sm", fluid ? "os-fluid p-4" : "p-10", className)} style={fluid ? { width: "100%", ["--brand" as string]: color } : { width: PAGE_WIDTH, zoom: scale, ["--brand" as string]: color }} aria-label={`Ordem de serviço ${order.number}`}>
          {data.withValues && <div className="internal">CONTÉM VALORES — USO INTERNO</div>}

          {/* cabeçalho */}
          <header className="os-head" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", paddingBottom: 10, borderBottom: `3px solid ${color}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
              {company.logoUrl && <img src={company.logoUrl} alt="" style={{ maxHeight: 54, maxWidth: 150, objectFit: "contain" }} />}
              <div className="small" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{company.corporateName || company.name}</div>
                {company.cnpj && <div className="muted">{cnpjText(company.cnpj)}</div>}
                <div className="muted">{[company.phone, company.email].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "#555" }}>ORDEM DE SERVIÇO</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{order.number}</div>
              <div className="small muted">{order.statusLabel}{data.issuedAt ? ` · emitida em ${new Date(data.issuedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</div>
            </div>
          </header>

          {/* o serviço */}
          <div style={{ margin: "12px 0 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{order.title}</div>
            {order.description && <div className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{order.description}</div>}
          </div>

          <div className="info">
            <div><div className="label">Cliente</div><div className="value">{data.customer?.corporateName || data.customer?.name}</div>{data.customer?.cnpj && <div className="small muted">{cnpjText(data.customer.cnpj)}</div>}</div>
            <div><div className="label">Pedido do cliente</div><div className="value">{data.customerOrder ? data.customerOrder.number : "—"}</div>{data.customerOrder?.date && <div className="small muted">de {dateFull(data.customerOrder.date)}</div>}</div>
            <div className="wide"><div className="label">Local do serviço</div><div className="value">{order.location || "—"}</div>{mapUrl && audience === "equipe" && <div className="small muted">Mapa: {mapUrl}</div>}</div>
            <div><div className="label">Período</div><div className="value">{sheetPeriod(order, schedule)}</div></div>
            <div><div className="label">Responsável</div><div className="value">{data.responsible?.name || "—"}</div>{data.responsible?.phone && <div className="small muted">{data.responsible.phone}</div>}</div>
            <div className="wide" style={{ borderBottom: 0 }}><div className="label">Contato no cliente</div><div className="value">{[order.contactName, order.contactPhone].filter(Boolean).join(" · ") || "—"}</div></div>
          </div>

          {/* o que fazer, por etapa */}
          {schedule && schedule.steps.length > 0 && (
            <>
              <h2>O que fazer{schedule.replanned ? " (cronograma replanejado)" : ""}</h2>
              <table>
                <thead><tr><th style={{ width: 22 }}>#</th><th>Etapa</th><th style={{ width: 120 }}>Quando</th><th className="col-bar" style={{ width: 150 }}>Cronograma</th>{running && <th className="num" style={{ width: 50 }}>Feito</th>}</tr></thead>
                <tbody>
                  {schedule.steps.map((step) => (
                    <tr key={step.step}>
                      <td className="muted">{step.step + 1}</td>
                      <td><div style={{ fontWeight: 600 }}>{step.title}</div>{step.details && <div className="small muted" style={{ whiteSpace: "pre-wrap" }}>{step.details}</div>}</td>
                      <td className="small">{step.from ? `${dateShort(step.from)}${step.to && step.to !== step.from ? ` a ${dateShort(step.to)}` : ""}` : `${unit[0]} ${step.start}${step.duration > 1 ? ` a ${step.start + step.duration - 1}` : ""}`}<div className="muted">{step.duration} {step.duration === 1 ? unit[0] : unit[1]}</div></td>
                      <td className="col-bar" style={{ verticalAlign: "middle" }}><StepBar step={step} total={span} color={color} /></td>
                      {running && <td className="num" style={{ fontWeight: 600 }}>{step.percent ?? 0}%</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.progress && (
                <div className="small muted" style={{ marginTop: 4 }}>
                  Avanço da obra: <b style={{ color: "#111" }}>{num(Math.round(data.progress.done))}%</b>{data.progress.planned !== null ? ` · previsto para hoje ${num(Math.round(data.progress.planned))}%` : ""}{data.progress.lastReport ? ` · último RDO em ${dateFull(data.progress.lastReport)}` : ""}
                </div>
              )}
            </>
          )}

          {/* escopo contratado */}
          {data.scope.length > 0 && (
            <>
              <h2>Escopo contratado</h2>
              <table>
                <thead><tr><th>Item</th><th className="num" style={{ width: 150 }}>Quantidade</th>{values && <><th className="num" style={{ width: 95 }}>Unitário</th><th className="num" style={{ width: 105 }}>Total</th></>}</tr></thead>
                <tbody>
                  {data.scope.map((section, sectionIndex) => (
                    <SectionRows key={sectionIndex} section={section} values={values?.sections[sectionIndex] ?? null} withValues={!!values} />
                  ))}
                </tbody>
                {values && (
                  <tfoot>
                    {(values.discount > 0 || Math.abs(adjust) >= 0.01) && <tr><td colSpan={3} className="num muted">Subtotal dos itens</td><td className="num">{money(values.subtotal)}</td></tr>}
                    {Math.abs(adjust) >= 0.01 && <tr><td colSpan={3} className="num muted">Imprevistos e ajustes da proposta</td><td className="num">{adjust < 0 ? "− " : ""}{money(Math.abs(adjust))}</td></tr>}
                    {values.discount > 0 && <tr><td colSpan={3} className="num muted">Desconto</td><td className="num">− {money(values.discount)}</td></tr>}
                    <tr><td colSpan={3} className="num" style={{ fontWeight: 700, borderBottom: 0 }}>Total da venda</td><td className="num" style={{ fontWeight: 700, borderBottom: 0 }}>{money(values.total)}</td></tr>
                  </tfoot>
                )}
              </table>
            </>
          )}

          {/* equipe e mobilização */}
          <div className="two">
            <div>
              <h2>Equipe</h2>
              {data.team.length === 0 ? <div className="muted">A definir</div> : (
                <table>
                  <tbody>
                    {data.team.map((member, index) => (
                      <tr key={index}>
                        <td style={{ paddingLeft: 0 }}><span style={{ fontWeight: 600 }}>{member.name ?? member.role}</span>{member.name && <span className="muted"> · {member.role}</span>}</td>
                        <td className="num small muted">{[member.from || member.to ? `${dateShort(member.from)}–${dateShort(member.to)}` : "", member.shift ?? ""].filter(Boolean).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {audience === "equipe" && (
              <div>
                <h2>Mobilização — conferir antes de sair</h2>
                {data.checklist.length === 0 && <div className="muted">Nada a conferir</div>}
                {data.checklist.map((item, index) => onToggleCheck ? (
                  <button key={index} type="button" className="check" disabled={checking} onClick={() => onToggleCheck(index)} aria-pressed={item.done}>
                    <span className="box">{item.done ? "✓" : ""}</span><span style={item.done ? { textDecoration: "line-through", color: "#666" } : undefined}>{item.title}</span>
                  </button>
                ) : (
                  <div key={index} className="check"><span className="box">{item.done ? "✓" : ""}</span><span>{item.title}</span></div>
                ))}
              </div>
            )}
          </div>

          {order.safety && (<><h2>Segurança — riscos e EPIs obrigatórios</h2><div className="alert">{order.safety}</div></>)}
          {order.notes && (<><h2>Observações</h2><div className="note">{order.notes}</div></>)}
          {order.conclusionNotes && (<><h2>Entrega</h2><div className="note">{order.conclusionNotes}</div></>)}

          {audience === "equipe" && (
            <div className="signs">
              <div>Responsável{data.responsible?.name ? ` — ${data.responsible.name}` : ""}</div>
              <div>Encarregado</div>
              <div>Cliente (recebimento)</div>
            </div>
          )}

          <footer className="foot">
            {qr && <img src={qr} alt="QR Code da OS" />}
            <div className="small muted" style={{ flex: 1 }}>
              {qr && <div><b style={{ color: "#111" }}>Aponte a câmera</b> para abrir esta OS no sistema e lançar o RDO do dia.</div>}
              <div>{company.address}{company.registrations ? ` · ${company.registrations}` : ""}</div>
              {data.issuedBy && <div>Emitida por {data.issuedBy}.</div>}
            </div>
          </footer>
        </article>
      </div>
    </>
  );
}

function SectionRows({ section, values, withValues }: { section: OrderSheetData["scope"][number]; values: SheetValues["sections"][number] | null; withValues: boolean }) {
  return (
    <>
      <tr><td colSpan={withValues ? 4 : 2} style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#444", background: "#f6f6f6" }}>{section.title}</td></tr>
      {section.items.map((item, index) => (
        <tr key={index}>
          <td>{item.description}{tagsOf(item) && <span className="small muted"> · {tagsOf(item)}</span>}</td>
          <td className="num">{quantityText(item)}</td>
          {withValues && <><td className="num">{values?.items[index] ? money(values.items[index].unitValue) : "—"}</td><td className="num">{values?.items[index] ? money(values.items[index].value) : "—"}</td></>}
        </tr>
      ))}
    </>
  );
}
