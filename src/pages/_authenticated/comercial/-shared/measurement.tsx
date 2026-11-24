import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, money } from "./commercial";

/**
 * Medição de obra (plano 08, fase 8): a venda de serviço faturada por boletim
 * de medição (BM) em vez de parcelas. A obra é dividida em frentes com peso; a
 * mobilização é só a medição inicial (uma frente que sai no primeiro boletim,
 * pelo mesmo caminho de toda medição); a caução fica retida até o fim da obra.
 */
export type FrontRule = "percentual" | "conclusao";
export interface PlanFront { step: number | null; title: string; weight: number; rule: FrontRule }
export interface MeasurementPlanDraft {
  mode: "medicao"; fronts: PlanFront[]; mobilization: { rate: number }; depositRate: number; depositReleaseDays: number;
}
export interface ContractPlan {
  fronts: Array<PlanFront & { id: number; value: number; mobilization?: boolean }>;
  mobilization: { rate: number; value: number };
  depositRate: number; depositReleaseDays: number; total: number; problem?: string | null;
}

export const RULE_OPTIONS = [{ id: "percentual", name: "Pelo % concluído" }, { id: "conclusao", name: "Só ao concluir" }];

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/** Frentes a partir das etapas do cronograma, com peso pela duração. */
export function frontsFromSchedule(steps: Array<{ title: string; duration: number }>): PlanFront[] {
  const named = steps.filter((s) => s.title.trim());
  if (!named.length) return [{ step: null, title: "Execução do serviço", weight: 1, rule: "percentual" }];
  const sum = named.reduce((s, x) => s + Math.max(1, x.duration || 1), 0);
  const weights = named.map((s) => round6(Math.max(1, s.duration || 1) / sum));
  weights[weights.length - 1] = round6(1 - weights.slice(0, -1).reduce((a, b) => a + b, 0));
  return named.map((s, index) => ({ step: steps.indexOf(s), title: s.title.trim(), weight: weights[index], rule: "percentual" }));
}

export const defaultPlan = (steps: Array<{ title: string; duration: number }>): MeasurementPlanDraft => ({
  mode: "medicao", fronts: frontsFromSchedule(steps), mobilization: { rate: 0.3 }, depositRate: 0, depositReleaseDays: 0,
});

/** Editor do plano de medição (na proposta e ao passar uma venda para medição). */
export function MeasurementPlanEditor({ plan, onChange, steps, values, readOnly }: {
  plan: MeasurementPlanDraft; onChange: (plan: MeasurementPlanDraft) => void;
  /** etapas do cronograma da proposta */
  steps: Array<{ title: string; duration: number }>;
  /** valores calculados pela API (frente, mobilização) com o total de agora */
  values?: ContractPlan | null; readOnly?: boolean;
}) {
  const sum = plan.fronts.reduce((s, f) => s + f.weight, 0);
  const off = Math.abs(sum - 1) > 0.0005;
  const setFront = (index: number, patch: Partial<PlanFront>) => onChange({ ...plan, fronts: plan.fronts.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  const stepOptions = [{ id: "", name: "Sem etapa" }, ...steps.map((s, i) => ({ id: String(i), name: s.title || `Etapa ${i + 1}` })).filter((o) => o.name.trim())];
  const equal = () => {
    const n = plan.fronts.length;
    if (!n) return;
    const w = round6(1 / n);
    onChange({ ...plan, fronts: plan.fronts.map((f, i) => ({ ...f, weight: i === n - 1 ? round6(1 - w * (n - 1)) : w })) });
  };
  return (
    <div className="grid gap-4">
      <section className="rounded-card border bg-card p-4" aria-label="Frentes da obra">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Frentes da obra</h3>
            <p className="text-xs text-muted-foreground">Cada boletim mede o % concluído de cada frente (sugerido pelo RDO da etapa ligada). "Só ao concluir" entra no boletim só quando chega a 100%.</p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...plan, fronts: frontsFromSchedule(steps) })}><Icon name="calendar-range" className="w-4 h-4 mr-1" /> Puxar do cronograma</Button>
              <Button type="button" variant="outline" size="sm" onClick={equal}>Dividir igual</Button>
            </div>
          )}
        </div>
        <div className="mt-3 divide-y">
          {plan.fronts.map((front, index) => (
            <div key={index} className="py-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2">
              <div className="sm:flex-1 sm:min-w-[200px]"><Label className="text-xs">Frente {index + 1}</Label>
                <ShadInput className="mt-1" value={front.title} maxLength={160} disabled={readOnly} aria-label={`Nome da frente ${index + 1}`} onChange={(e) => setFront(index, { title: e.target.value })} /></div>
              <div className="sm:w-44"><Label className="text-xs">Etapa do cronograma</Label>
                <div className="mt-1"><Select name={`front-step-${index}`} state={front.step === null ? "" : String(front.step)} options={stepOptions} disabled={readOnly} modal={false}
                  onChange={(_, value) => setFront(index, { step: value === "" || value === null ? null : Number(value) })} /></div></div>
              <div className="sm:w-28"><Label className="text-xs">Peso</Label>
                <NumField kind="percent" className="mt-1" value={front.weight} disabled={readOnly} ariaLabel={`Peso da frente ${index + 1}`} onChange={(weight) => setFront(index, { weight })} /></div>
              <div className="sm:w-40"><Label className="text-xs">Medição</Label>
                <div className="mt-1"><Select name={`front-rule-${index}`} state={front.rule} options={RULE_OPTIONS} disabled={readOnly} modal={false} onChange={(_, value) => setFront(index, { rule: value as FrontRule })} /></div></div>
              <div className="sm:w-28 text-sm sm:text-right"><p className="text-xs text-muted-foreground">Valor</p><p className="font-semibold tabular-nums sm:pb-2">{money(values?.fronts.filter((f) => !f.mobilization)[index]?.value)}</p></div>
              {!readOnly && plan.fronts.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 self-end" aria-label={`Remover a frente ${index + 1}`} onClick={() => onChange({ ...plan, fronts: plan.fronts.filter((_, i) => i !== index) })}>
                  <Icon name="trash-2" className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && plan.fronts.length < 60 && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange({ ...plan, fronts: [...plan.fronts, { step: null, title: "", weight: Math.max(0, round6(1 - sum)), rule: "percentual" }] })}>
            <Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar frente
          </Button>
        )}
        <p className={cn("mt-3 rounded-md border px-3 py-2 text-sm", off ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "text-muted-foreground")}>
          Pesos somam <b className="tabular-nums">{(Math.round(sum * 10000) / 100).toString().replace(".", ",")}%</b>{off ? ": precisam fechar 100% para enviar." : ". Fechado."}
          {plan.mobilization.rate > 0 ? ` As frentes dividem os ${(Math.round((1 - plan.mobilization.rate) * 10000) / 100).toString().replace(".", ",")}% que sobram da mobilização.` : ""}
        </p>
      </section>

      <section className="rounded-card border bg-card p-4 grid gap-3" aria-label="Mobilização">
        <div>
          <h3 className="font-semibold">Mobilização (medição inicial)</h3>
          <p className="text-xs text-muted-foreground">Um percentual fixo do contrato que sai no primeiro boletim, como uma medição qualquer: passa pelo A Faturar, vira nota e conta a receber, com retenções e caução. As frentes dividem o resto. Zero = sem mobilização.</p>
        </div>
        <div className="grid sm:grid-cols-[8rem_minmax(0,1fr)] gap-3 items-end">
          <div><Label className="text-xs">Percentual</Label>
            <NumField kind="percent" className="mt-1" value={plan.mobilization.rate} disabled={readOnly} ariaLabel="Percentual da mobilização"
              onChange={(rate) => onChange({ ...plan, mobilization: { rate: Math.min(0.9, Math.max(0, rate)) } })} onEmpty={() => onChange({ ...plan, mobilization: { rate: 0 } })} /></div>
          <p className="text-sm sm:pb-2">{plan.mobilization.rate > 0 ? <>= <b className="tabular-nums">{money(values?.mobilization.value)}</b> no primeiro boletim</> : "Sem mobilização: os boletins medem só as frentes."}</p>
        </div>
      </section>

      <section className="rounded-card border bg-card p-4 grid gap-3" aria-label="Caução contratual">
        <div>
          <h3 className="font-semibold">Caução contratual</h3>
          <p className="text-xs text-muted-foreground">Percentual que o cliente retém de cada boletim até o fim da obra. A caução acumulada vira uma conta a receber própria, para não sumir.</p>
        </div>
        <div className="grid sm:grid-cols-[8rem_12rem_minmax(0,1fr)] gap-3 items-end">
          <div><Label className="text-xs">Caução</Label>
            <NumField kind="percent" className="mt-1" value={plan.depositRate} disabled={readOnly} ariaLabel="Percentual da caução" onChange={(depositRate) => onChange({ ...plan, depositRate })} onEmpty={() => onChange({ ...plan, depositRate: 0 })} /></div>
          <div><Label className="text-xs">Liberada após a conclusão</Label>
            <NumField digits={0} suffix="dias" className="mt-1" value={plan.depositReleaseDays} disabled={readOnly || plan.depositRate <= 0} ariaLabel="Dias após a conclusão para liberar a caução"
              onChange={(days) => onChange({ ...plan, depositReleaseDays: Math.max(0, Math.round(days)) })} onEmpty={() => onChange({ ...plan, depositReleaseDays: 0 })} /></div>
          <p className="text-xs text-muted-foreground sm:pb-2">{plan.depositRate > 0 ? "Retida em cada boletim e paga no fim da obra." : "Sem caução."}</p>
        </div>
      </section>
    </div>
  );
}

/** Boletim de medição de obra, como a tela lê. */
export interface WorkLine {
  kind: "frente" | "caucao"; description: string; value: number;
  frontId?: number; mobilization?: boolean; base?: number; prevPercent?: number; percent?: number; accPercent?: number; reportedPercent?: number; rule?: FrontRule;
}
export type WorkStatus = "rascunho" | "enviada" | "aprovada" | "contestada" | "faturada";
export interface WorkMeasurement {
  id: number; number: number; label: string; status: WorkStatus; periodStart: string | null; periodEnd: string | null;
  value: number; invoiceValue: number; depositValue: number; lines: WorkLine[]; notes: string | null; publicKey: string | null;
  sentAt: string | null; decidedAt: string | null;
  decision: { decision: string; manual: boolean; name: string; role?: string | null; note?: string | null; ip?: string | null; at: string } | null;
  record: { id: number; status: string; dueDate: string | null; paidAt: string | null; invoiceNumber: string | null; invoiceIssuedAt: string | null; hasInvoiceFile: boolean; paid: boolean; netValue: number | null } | null;
}
export interface WorkSummary {
  measured: number; balance: number; invoiced: number; deposit: number; open: number | null;
  depositRecord: { id: number; status: string; value: number; dueDate: string | null; paid: boolean } | null;
}
export const WORK_STATUS: Record<WorkStatus, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  enviada: { label: "Com o cliente", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  contestada: { label: "Contestado", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  aprovada: { label: "Aprovado", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  faturada: { label: "Faturado", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
};
export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  const s = WORK_STATUS[status] ?? WORK_STATUS.rascunho;
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", s.className)}>{s.label}</span>;
}
export const pctBr = (value: number | undefined | null) => `${(Math.round((value ?? 0) * 100) / 100).toString().replace(".", ",")}%`;

/** Tabela do boletim: frente (a mobilização é uma delas), % anterior, do período, acumulado e valor; e a caução. */
export function WorkLinesTable({ lines, invoiceValue, depositValue, value }: { lines: WorkLine[]; invoiceValue: number; depositValue: number; value: number }) {
  return (
    <div className="rounded border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-3 py-1.5">Item</th>
            <th className="text-right font-medium px-2 py-1.5">Anterior</th>
            <th className="text-right font-medium px-2 py-1.5">No período</th>
            <th className="text-right font-medium px-2 py-1.5">Acumulado</th>
            <th className="text-right font-medium px-3 py-1.5">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.filter((l) => l.kind !== "caucao").map((line, index) => (
            <tr key={index}>
              <td className="px-3 py-1.5">{line.description}{line.kind === "frente" && line.rule === "conclusao" && (line.accPercent ?? 0) < 100 ? <span className="block text-xs text-muted-foreground">só entra ao concluir ({pctBr(line.reportedPercent)} feito)</span> : null}{line.kind === "frente" && line.base ? <span className="block text-xs text-muted-foreground">frente de {money(line.base)}</span> : null}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{line.kind === "frente" ? pctBr(line.prevPercent) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{line.kind === "frente" ? pctBr(line.percent) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{line.kind === "frente" ? pctBr(line.accPercent) : ""}</td>
              <td className={cn("px-3 py-1.5 text-right tabular-nums", line.value < 0 && "text-green-700 dark:text-green-400")}>{money(line.value)}</td>
            </tr>
          ))}
          <tr className="font-semibold"><td className="px-3 py-1.5" colSpan={4}>Valor da nota fiscal</td><td className="px-3 py-1.5 text-right tabular-nums">{money(invoiceValue)}</td></tr>
          {depositValue > 0 && <tr><td className="px-3 py-1.5" colSpan={4}>{lines.find((l) => l.kind === "caucao")?.description ?? "Caução retida"}</td><td className="px-3 py-1.5 text-right tabular-nums text-green-700 dark:text-green-400">{money(-depositValue)}</td></tr>}
          {depositValue > 0 && <tr className="font-semibold"><td className="px-3 py-1.5" colSpan={4}>A receber neste boletim</td><td className="px-3 py-1.5 text-right tabular-nums">{money(value)}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
