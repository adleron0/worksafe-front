import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { cn } from "@/lib/utils";
import {
  CostBaseVersion, Defaults, NumField, PreviewResult, ProfessionalRow, commercialApi, dateBr, errorMessage, money, percent, todayIso,
} from "../-shared/commercial";

interface Props { professionals: ProfessionalRow[]; versions: CostBaseVersion[]; defaults: Defaults; headcount: number; dirty: boolean }

interface Scenario { headcount: number | null; regime: "" | "tradicional" | "hibrido"; costBaseId: string; date: string }

/** "E se": o mesmo serviço em dois cenários, lado a lado. Nada é gravado. */
export default function SimulatorTab({ professionals, versions, defaults, headcount, dirty }: Props) {
  const [job, setJob] = useState({
    professionalId: professionals[0]?.id ?? 0, quantity: 1, workDays: 22,
    margin: defaults.margins.mao_de_obra ?? 0, contingencyRate: defaults.contingencyRate ?? 0,
  });
  const [alt, setAlt] = useState<Scenario>({ headcount: Math.max(1, Math.round(headcount * 0.7)), regime: "", costBaseId: "", date: todayIso() });

  const input = {
    workDays: job.workDays, contingencyRate: job.contingencyRate, commission: defaults.commission,
    sections: [{ margin: job.margin, items: [{ type: "mao_de_obra", professionalId: job.professionalId, quantity: job.quantity }] }],
  };
  const enabled = job.professionalId > 0 && job.workDays > 0 && job.quantity > 0;
  const current = useQuery({
    queryKey: ["commercialSim", "current", input], enabled, retry: false,
    queryFn: () => commercialApi.post<PreviewResult>("pricing/preview", { input }),
  });
  const scenario = {
    ...(alt.headcount ? { headcount: alt.headcount } : {}), ...(alt.regime ? { regime: alt.regime } : {}),
    ...(alt.costBaseId ? { costBaseId: Number(alt.costBaseId) } : {}),
  };
  const simulated = useQuery({
    queryKey: ["commercialSim", "alt", input, scenario, alt.date], enabled, retry: false,
    queryFn: () => commercialApi.post<PreviewResult>("pricing/preview", { input, scenario, date: alt.date || undefined }),
  });

  const rows: Array<[string, (run: PreviewResult) => string, boolean?]> = [
    ["Base de cálculo", (run) => run.costBase.name],
    ["Efetivo considerado", (run) => String(run.costBase.headcount)],
    ["Regime", (run) => run.taxProfile.name],
    ["Custo hora", (run) => money(run.sections[0]?.lines[0]?.hourCost)],
    ["Custo do serviço", (run) => money(run.totals.cost)],
    ["Preço na nota", (run) => money(run.totals.total), true],
    ["Custo para o cliente (após crédito)", (run) => money(run.totals.customerCost)],
    ["Margem real, sem usar a contingência", (run) => `${percent(run.margin.unusedRate, 1)} (${money(run.margin.unused)})`],
    ["Margem real, usando toda a contingência", (run) => `${percent(run.margin.usedRate, 1)} (${money(run.margin.used)})`],
    ["Preço mínimo (margem zero)", (run) => money(run.margin.minTotal)],
    ["Preço mínimo sem a parcela de dívida", (run) => money(run.margin.minTotalOperational)],
  ];
  const a = current.data, b = simulated.data;
  const delta = a && b && a.totals.total > 0 ? b.totals.total / a.totals.total - 1 : null;

  return (
    <div className="grid gap-4">
      {dirty && (
        <p className="text-xs rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2">
          Há alterações não salvas na base. O simulador usa a base salva: salve antes para simular com os valores novos.
        </p>
      )}
      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Serviço de exemplo</h3>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2"><Label className="text-xs">Profissional</Label>
            <div className="mt-1"><Select name="simPro" state={String(job.professionalId || "")} modal={false} placeholder="Selecione o profissional"
              options={professionals.map((p) => ({ id: p.id, name: p.name }))}
              onChange={(_, value) => setJob((j) => ({ ...j, professionalId: Number(value) }))} /></div></div>
          <div><Label htmlFor="simQty" className="text-xs">Quantidade</Label>
            <NumField id="simQty" className="mt-1" digits={0} value={job.quantity} onChange={(quantity) => setJob((j) => ({ ...j, quantity }))} /></div>
          <div><Label htmlFor="simDays" className="text-xs">Dias úteis</Label>
            <NumField id="simDays" className="mt-1" digits={0} value={job.workDays} onChange={(workDays) => setJob((j) => ({ ...j, workDays }))} /></div>
          <div><Label htmlFor="simMargin" className="text-xs">Margem</Label>
            <NumField id="simMargin" className="mt-1" kind="percent" value={job.margin} onChange={(margin) => setJob((j) => ({ ...j, margin }))} /></div>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Cenário a comparar</h3>
        <p className="text-xs text-muted-foreground">Deixe em branco o que não quiser mudar.</p>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><Label htmlFor="simHead" className="text-xs">Efetivo em campo</Label>
            <NumField id="simHead" className="mt-1" digits={0} value={alt.headcount} onChange={(value) => setAlt((s) => ({ ...s, headcount: value > 0 ? value : null }))} /></div>
          <div><Label className="text-xs">Regime tributário</Label>
            <div className="mt-1"><Select name="simRegime" state={alt.regime} modal={false} clearable placeholder="O mesmo de hoje"
              options={[{ id: "tradicional", name: "Simples tradicional" }, { id: "hibrido", name: "Simples híbrido" }]}
              onChange={(_, value) => setAlt((s) => ({ ...s, regime: String(value) as Scenario["regime"] }))} /></div></div>
          <div><Label className="text-xs">Versão da base</Label>
            <div className="mt-1"><Select name="simBase" state={alt.costBaseId} modal={false} clearable placeholder="A vigente na data"
              options={versions.filter((v) => !v.inactiveAt).map((v) => ({ id: v.id, name: `${v.name} (${dateBr(v.effectiveFrom)})` }))}
              onChange={(_, value) => setAlt((s) => ({ ...s, costBaseId: String(value) }))} /></div></div>
          <div><Label className="text-xs">Data do serviço</Label>
            <CalendarPicker mode="single" name="simDate" className="mt-1 w-full" value={alt.date} fromYear={2020} toYear={2040} onValueChange={(_, value) => setAlt((s) => ({ ...s, date: value ?? "" }))} /></div>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        {(current.error || simulated.error) && <p className="text-sm text-destructive mb-2">{errorMessage(current.error ?? simulated.error)}</p>}
        {a && b ? (
          <div className={cn("overflow-x-auto", (current.isFetching || simulated.isFetching) && "opacity-60")}>
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left font-medium py-2" /><th className="text-right font-medium">Hoje</th><th className="text-right font-medium">Cenário</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map(([label, pick, strong]) => (
                  <tr key={label} className={cn("border-b last:border-b-0", strong && "font-semibold")}>
                    <td className="py-1.5">{label}</td><td className="text-right">{pick(a)}</td><td className="text-right">{pick(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {delta !== null && (
              <p className="mt-3 text-sm">
                No cenário, o preço na nota fica <b>{delta === 0 ? "igual" : `${percent(Math.abs(delta), 1)} ${delta > 0 ? "mais caro" : "mais barato"}`}</b> para a mesma margem.
              </p>
            )}
          </div>
        ) : !current.error && !simulated.error && <p className="text-sm text-muted-foreground">{enabled ? "Calculando..." : "Escolha um profissional, a quantidade e os dias."}</p>}
      </section>
    </div>
  );
}
