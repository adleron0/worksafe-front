import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import {
  BaseResult, CostGroup, CostItem, CostParams, Defaults, NumField, ResultRow, Row, Sensitivity, decimal, money, newUid, percent,
} from "../-shared/commercial";

interface TabProps {
  params: CostParams;
  setParam: <K extends keyof CostParams>(key: K, value: CostParams[K]) => void;
  result?: BaseResult;
  disabled: boolean;
}

const Card = ({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-lg border p-4", className)}>
    <h3 className="font-semibold">{title}</h3>
    {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
    <div className="mt-2">{children}</div>
  </section>
);

/** A — de 365 dias até as horas úteis por mês. */
export function HoursTab({ params, setParam, result, disabled }: TabProps) {
  const field = (key: "daysInYear" | "restDays" | "vacationDays" | "holidays" | "hoursPerDay" | "monthsDivisor", label: string, hint?: string) => (
    <Row label={label} hint={hint} htmlFor={key}>
      <NumField id={key} value={params[key]} onChange={(value) => setParam(key, value)} disabled={disabled} digits={key === "hoursPerDay" ? 2 : 0} />
    </Row>
  );
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Horas produtivas por pessoa" description="Quantas horas por mês uma pessoa realmente produz. É o divisor de todo custo hora.">
        {field("daysInYear", "Dias no ano")}
        {field("restDays", "Descanso semanal (DSR)", "Dias de folga no ano. 88 = 8 por mês, em 11 meses.")}
        {field("vacationDays", "Férias")}
        {field("holidays", "Feriados")}
        {field("hoursPerDay", "Horas por dia")}
        <Row label="Índice de ociosidade" hint="Horas pagas em que a pessoa não está produzindo." htmlFor="idleRate">
          <NumField id="idleRate" kind="percent" value={params.idleRate} onChange={(value) => setParam("idleRate", value)} disabled={disabled} />
        </Row>
        {field("monthsDivisor", "Meses trabalhados no ano", "11: o mês de férias fica de fora.")}
      </Card>
      <Card title="Resultado">
        <ResultRow label="Dias disponíveis" value={decimal(result?.availableDays, 0)} />
        <ResultRow label="Horas por ano" value={decimal(result?.hoursYear, 0)} />
        <ResultRow label="Horas ociosas por ano" value={decimal(result?.idleHours, 1)} />
        <ResultRow label="Horas trabalhadas por ano" value={decimal(result?.workedHoursYear, 1)} />
        <ResultRow label="A — horas úteis por mês" value={decimal(result?.A)} strong />
      </Card>
      <Card title="Adicionais" description="Calculados sobre a hora de salário (salário ÷ divisor), com encargos." className="lg:col-span-2">
        <div className="grid sm:grid-cols-2 gap-x-8">
          <div>
            <Row label="Jornada semanal (horas)" hint="Só para registro: 44 h hoje, 42 h e depois 40 h com a emenda da jornada." htmlFor="weeklyHours">
              <NumField id="weeklyHours" value={params.weeklyHours ?? 44} onChange={(value) => setParam("weeklyHours", value)} disabled={disabled} digits={0} />
            </Row>
            <Row label="Divisor dos adicionais" hint="220 para 44 h · 210 para 42 h · 200 para 40 h." htmlFor="additionalDivisor">
              <NumField id="additionalDivisor" value={params.additionalDivisor} onChange={(value) => setParam("additionalDivisor", value)} disabled={disabled} digits={0} />
            </Row>
            <Row label="Adicional noturno" htmlFor="nightRate">
              <NumField id="nightRate" kind="percent" value={params.nightRate} onChange={(value) => setParam("nightRate", value)} disabled={disabled} />
            </Row>
          </div>
          <div>
            <Row label="Adicional de viagem" htmlFor="travelRate">
              <NumField id="travelRate" kind="percent" value={params.travelRate} onChange={(value) => setParam("travelRate", value)} disabled={disabled} />
            </Row>
            <Row label="Adicional de FDS/feriado" hint="200% = 100% + o dia de descanso." htmlFor="weekendRate">
              <NumField id="weekendRate" kind="percent" value={params.weekendRate} onChange={(value) => setParam("weekendRate", value)} disabled={disabled} />
            </Row>
            <Row label="FDS/feriado multiplica pela quantidade" hint="Desligado = igual à planilha (cobra um profissional só, mesmo com vários na linha).">
              <div className="flex justify-end">
                <Switch checked={params.weekendPerWorker} disabled={disabled} aria-label="FDS/feriado multiplica pela quantidade"
                  onCheckedChange={(checked) => setParam("weekendPerWorker", checked)} />
              </div>
            </Row>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** C — benefícios por hora, e F (desconto de vale-transporte). */
export function BenefitsTab({ params, setParam, result, disabled }: TabProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Benefícios" description="Custo por hora de alimentação e transporte.">
        <Row label="Alimentação por dia" htmlFor="mealPerDay">
          <NumField id="mealPerDay" kind="money" value={params.mealPerDay} onChange={(value) => setParam("mealPerDay", value)} disabled={disabled} />
        </Row>
        <Row label="Tarifa de transporte" hint="Valor de uma passagem." htmlFor="transportFare">
          <NumField id="transportFare" kind="money" value={params.transportFare} onChange={(value) => setParam("transportFare", value)} disabled={disabled} />
        </Row>
        <Row label="Passagens por dia" htmlFor="transportTrips">
          <NumField id="transportTrips" value={params.transportTrips} onChange={(value) => setParam("transportTrips", value)} disabled={disabled} digits={0} />
        </Row>
        <Row label="Parte do transporte fora do custo" hint="A planilha usa 60%, embora o rótulo dela diga 6%. Com 6%, o transporte sobe para R$ 3,17 por hora." htmlFor="transportDiscount">
          <NumField id="transportDiscount" kind="percent" value={params.transportDiscount} onChange={(value) => setParam("transportDiscount", value)} disabled={disabled} />
        </Row>
        <Row label="F — desconto de vale-transporte" hint="Percentual do salário descontado do funcionário; abate o custo hora." htmlFor="fareDiscountRate">
          <NumField id="fareDiscountRate" kind="percent" value={params.fareDiscountRate} onChange={(value) => setParam("fareDiscountRate", value)} disabled={disabled} />
        </Row>
      </Card>
      <Card title="Resultado">
        <ResultRow label="Alimentação por hora" value={money(result?.mealPerHour)} />
        <ResultRow label="Transporte por hora" value={money(result?.transportPerHour)} />
        <ResultRow label="C — benefícios por hora" value={money(result?.C)} strong />
      </Card>
    </div>
  );
}

interface ItemsProps {
  group: CostGroup;
  items: CostItem[];
  setItems: (updater: (items: CostItem[]) => CostItem[]) => void;
  result?: BaseResult;
  disabled: boolean;
  params: CostParams;
  setParam: TabProps["setParam"];
  sensitivity?: Sensitivity[];
}

const GROUP_TEXT: Record<CostGroup, { title: string; description: string; add: string }> = {
  encargo: { title: "Encargos sobre o salário", description: "Percentuais somados ao salário de cada profissional (resultado B).", add: "Adicionar encargo" },
  pessoal_indireto: { title: "Pessoal indireto", description: "Cargos administrativos e de gestão, rateados entre quem está em campo (resultado D).", add: "Adicionar cargo" },
  outro_custo: { title: "Outros custos mensais", description: "Estrutura, sistemas, veículos e demais custos, rateados por hora (resultado E).", add: "Adicionar custo" },
};

/** Editor das linhas de um grupo (encargos, pessoal indireto ou outros custos). */
export function ItemsTab({ group, items, setItems, result, disabled, params, setParam, sensitivity }: ItemsProps) {
  const rows = useMemo(() => items.filter((item) => item.group === group), [items, group]);
  const text = GROUP_TEXT[group];
  const update = (uid: string, patch: Partial<CostItem>) => setItems((list) => list.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  const remove = (uid: string) => setItems((list) => list.filter((item) => item.uid !== uid));
  const add = () => setItems((list) => [...list, {
    uid: newUid(), group, subgroup: rows[rows.length - 1]?.subgroup ?? null, name: "", rate: group === "encargo" ? 0 : null,
    amount: group === "encargo" ? null : 0, quantity: 1, withCharges: true, kind: "fixo", isDebt: false, endsAt: null,
  }]);
  const B = result?.B ?? 0;
  const staffCost = (item: CostItem) => Number(item.amount ?? 0) * (item.withCharges ? 1 + B : 1) * Number(item.quantity ?? 1);

  return (
    <div className="grid gap-4">
      <Card title={text.title} description={text.description}>
        <div className="hidden xl:flex gap-2 px-1 pb-1 text-xs font-medium text-muted-foreground">
          <div className="w-44">Grupo</div>
          <div className="flex-1">Descrição</div>
          {group === "encargo" && <div className="w-28 text-right">% do salário</div>}
          {group === "pessoal_indireto" && <><div className="w-20 text-right">Qtd</div><div className="w-32 text-right">Salário</div><div className="w-24 text-center">Encargos</div><div className="w-28 text-right">Custo</div></>}
          {group === "outro_custo" && <><div className="w-32 text-right">R$ por mês</div><div className="w-32">Rateio</div><div className="w-16 text-center">Dívida</div><div className="w-36">Termina em</div></>}
          <div className="w-8" />
        </div>
        {rows.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhum item.</p>}
        {rows.map((item) => (
          <div key={item.uid} className="flex flex-col xl:flex-row xl:items-center gap-2 py-2 border-t first:border-t-0 xl:border-t-0 xl:py-1">
            <ShadInput className="xl:w-44" value={item.subgroup ?? ""} disabled={disabled} placeholder="Grupo" aria-label="Grupo"
              maxLength={80} onChange={(event) => update(item.uid, { subgroup: event.target.value || null })} />
            <ShadInput className="xl:flex-1" value={item.name} disabled={disabled} placeholder="Descrição" aria-label="Descrição"
              maxLength={160} onChange={(event) => update(item.uid, { name: event.target.value })} />
            {group === "encargo" && (
              <NumField className="xl:w-28" kind="percent" ariaLabel={`Percentual de ${item.name}`} value={item.rate} disabled={disabled}
                onChange={(value) => update(item.uid, { rate: value })} />
            )}
            {group === "pessoal_indireto" && <>
              <NumField className="xl:w-20" ariaLabel={`Quantidade de ${item.name}`} value={item.quantity} disabled={disabled} digits={2}
                onChange={(value) => update(item.uid, { quantity: value })} />
              <NumField className="xl:w-32" kind="money" ariaLabel={`Salário de ${item.name}`} value={item.amount} disabled={disabled}
                onChange={(value) => update(item.uid, { amount: value })} />
              <label className="xl:w-24 flex items-center xl:justify-center gap-2 text-sm">
                <Switch checked={item.withCharges} disabled={disabled} aria-label={`Aplicar encargos em ${item.name}`}
                  onCheckedChange={(checked) => update(item.uid, { withCharges: checked })} />
                <span className="xl:hidden">Com encargos</span>
              </label>
              <div className="xl:w-28 text-sm xl:text-right tabular-nums"><span className="xl:hidden text-muted-foreground">Custo: </span>{money(staffCost(item))}</div>
            </>}
            {group === "outro_custo" && <>
              <NumField className="xl:w-32" kind="money" ariaLabel={`Valor de ${item.name}`} value={item.amount} disabled={disabled}
                onChange={(value) => update(item.uid, { amount: value })} />
              <select className="xl:w-32 h-9 rounded-md border bg-background px-2 text-sm" value={item.kind} disabled={disabled} aria-label={`Rateio de ${item.name}`}
                onChange={(event) => update(item.uid, { kind: event.target.value as CostItem["kind"] })}>
                <option value="fixo">Fixo (rateado)</option>
                <option value="por_pessoa">Por pessoa</option>
              </select>
              <label className="xl:w-16 flex items-center xl:justify-center gap-2 text-sm">
                <input type="checkbox" checked={item.isDebt} disabled={disabled} aria-label={`${item.name} é dívida`}
                  onChange={(event) => update(item.uid, { isDebt: event.target.checked, endsAt: event.target.checked ? item.endsAt : null })} />
                <span className="xl:hidden">É dívida</span>
              </label>
              <ShadInput type="date" className="xl:w-36" value={item.endsAt ?? ""} disabled={disabled || !item.isDebt} aria-label={`Término de ${item.name}`}
                onChange={(event) => update(item.uid, { endsAt: event.target.value || null })} />
            </>}
            {!disabled && (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 self-end xl:self-auto" aria-label={`Remover ${item.name || "item"}`} onClick={() => remove(item.uid)}>
                <Icon name="trash-2" className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        {!disabled && (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={add}>
            <Icon name="plus" className="w-4 h-4 mr-1" /> {text.add}
          </Button>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Resultado">
          {group === "encargo" && <ResultRow label="B — encargos sobre o salário" value={percent(result?.B)} strong />}
          {group === "pessoal_indireto" && <>
            <ResultRow label="Custo mensal do pessoal indireto" value={money(result?.indirectMonthly)} />
            <ResultRow label="Por pessoa em campo" value={money(result?.indirectPerWorker)} />
            <ResultRow label="D — pessoal indireto por hora" value={money(result?.D)} strong />
          </>}
          {group === "outro_custo" && <>
            <ResultRow label="Custo mensal" value={money(result?.otherMonthly)} />
            <ResultRow label="Por pessoa em campo" value={money(result?.otherPerWorker)} />
            <ResultRow label="E — outros custos por hora" value={money(result?.E)} strong />
            <ResultRow label="Parte de E que é dívida" value={`${money(result?.debtPerHour)} por hora · ${money(result?.debtMonthly)} por mês`} />
          </>}
        </Card>
        {group !== "encargo" && (
          <Card title="Efetivo médio em campo" description="Divide o custo da estrutura. É o número mais sensível da base: revise com a média real dos últimos meses.">
            <Row label="Pessoas trabalhando por mês" htmlFor={`headcount-${group}`}>
              <NumField id={`headcount-${group}`} value={params.headcount} onChange={(value) => setParam("headcount", value)} disabled={disabled} digits={2} />
            </Row>
            {Boolean(sensitivity?.length) && (
              <table className="w-full text-sm mt-3">
                <thead><tr className="text-xs text-muted-foreground"><th className="text-left font-medium py-1">Efetivo</th><th className="text-right font-medium">Rateio por hora (D + E)</th><th className="text-right font-medium">Custo hora{sensitivity![0].professional ? ` — ${sensitivity![0].professional}` : ""}</th></tr></thead>
                <tbody>
                  {sensitivity!.map((row) => (
                    <tr key={row.headcount} className={cn("border-t tabular-nums", row.current && "font-semibold")}>
                      <td className="py-1">{decimal(row.headcount, 0)}{row.current && " (em uso)"}</td>
                      <td className="text-right">{money(row.overhead)}</td>
                      <td className="text-right">{money(row.hourCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  mao_de_obra: "Mão de obra", locacao: "Locações", material: "Materiais de consumo", treinamento: "Treinamento", avulso: "Itens avulsos",
};

/** Padrões que uma proposta nova já traz preenchidos (tudo editável na proposta). */
export function DefaultsTab({ defaults, setDefaults, disabled }: { defaults: Defaults; setDefaults: (updater: (d: Defaults) => Defaults) => void; disabled: boolean }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Margem padrão por tipo de item" description="A proposta nasce com estas margens; cada seção pode mudar a sua.">
        {Object.keys(SECTION_LABELS).map((key) => (
          <Row key={key} label={SECTION_LABELS[key]} htmlFor={`margin-${key}`}>
            <NumField id={`margin-${key}`} kind="percent" value={defaults.margins[key] ?? 0} disabled={disabled}
              onChange={(value) => setDefaults((d) => ({ ...d, margins: { ...d.margins, [key]: value } }))} />
          </Row>
        ))}
      </Card>
      <div className="grid gap-4 content-start">
        <Card title="Imprevisibilidade" description="Percentual somado ao total, depois da margem. Aparece na proposta como contingência.">
          {defaults.contingencyLevels.map((level, index) => (
            <div key={index} className="flex items-center gap-2 py-1">
              <ShadInput value={level.label} disabled={disabled} maxLength={40} aria-label={`Nome do nível ${index + 1}`} className="flex-1"
                onChange={(event) => setDefaults((d) => ({ ...d, contingencyLevels: d.contingencyLevels.map((l, i) => (i === index ? { ...l, label: event.target.value } : l)) }))} />
              <NumField className="w-28" kind="percent" value={level.rate} disabled={disabled} ariaLabel={`Percentual do nível ${level.label}`}
                onChange={(value) => setDefaults((d) => ({ ...d, contingencyLevels: d.contingencyLevels.map((l, i) => (i === index ? { ...l, rate: value } : l)) }))} />
              <label className="flex items-center gap-1 text-xs w-20">
                <input type="radio" name="contingencyDefault" disabled={disabled} checked={defaults.contingencyRate === level.rate}
                  onChange={() => setDefaults((d) => ({ ...d, contingencyRate: level.rate }))} /> Padrão
              </label>
            </div>
          ))}
        </Card>
        <Card title="Comissão">
          <Row label="Comissão padrão" htmlFor="commissionRate">
            <NumField id="commissionRate" kind="percent" value={defaults.commission.rate} disabled={disabled}
              onChange={(value) => setDefaults((d) => ({ ...d, commission: { ...d.commission, rate: value } }))} />
          </Row>
          <Row label="Calculada sobre">
            <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" disabled={disabled} value={defaults.commission.base} aria-label="Base da comissão"
              onChange={(event) => setDefaults((d) => ({ ...d, commission: { ...d.commission, base: event.target.value as "faturado" | "lucro" } }))}>
              <option value="faturado">Valor faturado</option>
              <option value="lucro">Lucro</option>
            </select>
          </Row>
          <Row label="Comissão dentro do preço" hint="Ligado: a margem pedida já é líquida de comissão (só quando a base é o faturado). Desligado = igual à planilha.">
            <div className="flex justify-end">
              <Switch checked={defaults.commission.inPrice} disabled={disabled} aria-label="Comissão dentro do preço"
                onCheckedChange={(checked) => setDefaults((d) => ({ ...d, commission: { ...d.commission, inPrice: checked } }))} />
            </div>
          </Row>
        </Card>
      </div>
    </div>
  );
}
