import { Checkbox } from "@/components/ui/checkbox";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, dateBr, money } from "../-shared/commercial";
import { ProposalDraft, RentPeriod, RentalAvailability, RentalTerms } from "../-shared/proposals";

const PERIODS: Array<{ id: RentPeriod; name: string }> = [{ id: "mes", name: "Mês" }, { id: "semana", name: "Semana" }, { id: "dia", name: "Dia" }];
const WORD: Record<RentPeriod, [string, string, string]> = { dia: ["dia", "dias", "diária"], semana: ["semana", "semanas", "semanal"], mes: ["mês", "meses", "mensal"] };
export const DEFAULT_RENTAL: RentalTerms = { period: "mes", periods: 1, untilReturn: false, billing: "periodo", deposit: null, deliveryAddress: null };

/** Termos da locação do rascunho (os antigos, sem termos, herdam o período da primeira linha). */
export function rentalOf(draft: ProposalDraft): RentalTerms {
  if (draft.rental) return draft.rental;
  const first = draft.sections.flatMap((section) => section.items).find((item) => item.type === "locacao_cliente");
  return { ...DEFAULT_RENTAL, period: first?.extra?.period ?? "mes", periods: first?.extra?.periods ?? 1 };
}

interface Props {
  draft: ProposalDraft;
  setDraft: (updater: (draft: ProposalDraft) => ProposalDraft) => void;
  readOnly: boolean;
  availability?: RentalAvailability | null;
}

/**
 * Período da proposta de locação (vale para todas as linhas: uma proposta, uma
 * OL): unidade, quantos períodos ou "até devolver", e a disponibilidade dos
 * equipamentos nesse período. Fica no topo do passo de itens.
 */
export function RentalPeriodPanel({ draft, setDraft, readOnly, availability }: Props) {
  const rental = rentalOf(draft);
  const change = (patch: Partial<RentalTerms>) => setDraft((d) => {
    const next = { ...rentalOf(d), ...patch };
    const periodChanged = patch.period && patch.period !== rentalOf(d).period;
    return {
      ...d, rental: next,
      // as linhas seguem o período da proposta; trocar a unidade volta o valor do período para a base (ou o preço do cadastro)
      sections: d.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => (item.type === "locacao_cliente"
          ? { ...item, extra: { ...item.extra, period: next.period, periods: next.periods, closed: next.period === "mes" ? item.extra?.closed : false, ...(periodChanged ? { rate: null } : {}) } }
          : item)),
      })),
    };
  });
  const closed = draft.sections.some((section) => section.items.some((item) => item.type === "locacao_cliente" && item.extra?.closed));
  const setClosed = (value: boolean) => setDraft((d) => ({
    ...d, sections: d.sections.map((section) => ({ ...section, items: section.items.map((item) => (item.type === "locacao_cliente" ? { ...item, extra: { ...item.extra, closed: value } } : item)) })),
  }));
  return (
    <section className="rounded-lg border p-4 grid gap-3" aria-label="Período da locação">
      <div>
        <h3 className="font-semibold">Período da locação</h3>
        <p className="text-xs text-muted-foreground">Vale para todos os equipamentos desta proposta. O período conta da entrega.</p>
      </div>
      <div className="grid sm:grid-cols-4 gap-3 items-end">
        <div><Label className="text-xs">Cobrado por</Label>
          <div className="mt-1"><Select name="rentalPeriod" state={rental.period} disabled={readOnly} modal={false} options={PERIODS} onChange={(_, value) => change({ period: (String(value || "mes")) as RentPeriod })} /></div></div>
        <div><Label className="text-xs">{rental.untilReturn ? `Previsão (${WORD[rental.period][1]})` : `Quantos ${WORD[rental.period][1]}`}</Label>
          <NumField className="mt-1" digits={0} value={rental.periods} disabled={readOnly} ariaLabel="Quantidade de períodos"
            onChange={(periods) => change({ periods: Math.max(1, Math.round(periods || 1)) })} onEmpty={() => change({ periods: 1 })} /></div>
        <label className={cn("flex items-center gap-2 text-sm h-9", readOnly && "opacity-60")}>
          <Checkbox checked={rental.untilReturn} disabled={readOnly} onCheckedChange={(value) => change({ untilReturn: value === true })} aria-label="Até devolver" />
          Até devolver
        </label>
        {rental.period === "mes" && (
          <label className={cn("flex items-center gap-2 text-sm h-9", readOnly && "opacity-60")}>
            <Checkbox checked={closed} disabled={readOnly} onCheckedChange={(value) => setClosed(value === true)} aria-label="Período fechado" />
            Período fechado (desconto do prazo)
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {rental.untilReturn
          ? `Sem data de devolução: a OL fica com o cliente até ele devolver e é cobrada período a período. Os ${rental.periods} ${rental.periods === 1 ? WORD[rental.period][0] : WORD[rental.period][1]} são só a previsão do orçamento.`
          : `${rental.periods} ${rental.periods === 1 ? WORD[rental.period][0] : WORD[rental.period][1]} contratados. Prorrogar é só continuar faturando.`}
      </p>
      <AvailabilityList availability={availability} />
    </section>
  );
}

/** Disponibilidade dos equipamentos no período (frota menos o que outras OL ocupam). */
export function AvailabilityList({ availability }: { availability?: RentalAvailability | null }) {
  if (!availability || !availability.items.length) return null;
  return (
    <div className={cn("rounded-md border px-3 py-2 text-sm", availability.ok ? "border-green-300 dark:border-green-800" : "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200")}>
      <p className="font-medium flex items-center gap-1.5">
        <Icon name={availability.ok ? "circle-check" : "triangle-alert"} className="w-4 h-4 shrink-0" />
        {availability.ok ? "Disponível" : "Falta equipamento"} de {dateBr(availability.start)} {availability.end ? `a ${dateBr(availability.end)}` : `em diante (previsão até ${dateBr(availability.estimatedEnd)})`}
      </p>
      <ul className="mt-1 grid gap-0.5 text-xs">
        {availability.items.map((item) => (
          <li key={item.itemId} className={item.ok ? "text-muted-foreground" : "font-medium"}>
            {item.name}: pede {item.requested}, {item.available} livre(s){item.detail ? ` · ${item.detail}` : ""}
          </li>
        ))}
      </ul>
      {!availability.ok && <p className="mt-1 text-xs">Dá para enviar mesmo assim (compra, sublocação ou outra data), mas confira antes de prometer ao cliente.</p>}
    </div>
  );
}

/**
 * Condições da locação, no passo de pagamento: como cobra (a cada período
 * vencido ou de uma vez), caução e endereço de entrega. Locação não tem
 * parcelas: cada medição vira uma conta a receber.
 */
export function RentalConditionsPanel({ draft, setDraft, readOnly, total, rentTotal }: Props & { total: number; rentTotal: number }) {
  const rental = rentalOf(draft);
  const change = (patch: Partial<RentalTerms>) => setDraft((d) => ({ ...d, rental: { ...rentalOf(d), ...patch } }));
  const word = WORD[rental.period];
  // só os equipamentos: o frete e os avulsos saem uma vez, na primeira medição
  const perPeriod = (rentTotal || total) / Math.max(1, rental.periods);
  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Cobrança</Label>
          <div className="mt-1"><Select name="rentalBilling" state={rental.billing} disabled={readOnly} modal={false} onChange={(_, value) => change({ billing: value === "unico" ? "unico" : "periodo" })}
            options={[{ id: "periodo", name: `A cada período vencido (${word[2]})` }, { id: "unico", name: rental.untilReturn ? "Pagamento único na devolução" : "Pagamento único pelo período" }]} /></div></div>
        <div><Label>Caução</Label>
          <NumField kind="money" className="mt-1" value={rental.deposit} disabled={readOnly} placeholder="Sem caução" ariaLabel="Caução"
            onChange={(deposit) => change({ deposit: deposit > 0 ? deposit : null })} onEmpty={() => change({ deposit: null })} /></div>
        <div className="sm:col-span-2"><Label htmlFor="rentalAddress">Endereço de entrega</Label>
          <ShadInput id="rentalAddress" className="mt-1" maxLength={300} value={rental.deliveryAddress ?? ""} disabled={readOnly} placeholder="Opcional: vai para a OL e para o documento"
            onChange={(event) => change({ deliveryAddress: event.target.value || null })} /></div>
      </div>
      <ul className="rounded-md bg-muted/50 p-3 text-sm grid gap-1">
        <li>{rental.billing === "unico"
          ? rental.untilReturn ? <>Uma nota só, na devolução, pelos {word[1]} usados.</> : <>Uma nota só, na entrega, de <b className="tabular-nums">{money(total)}</b> pelos {rental.periods} {rental.periods === 1 ? word[0] : word[1]}.</>
          : <>Uma nota a cada {word[0]} vencido, de cerca de <b className="tabular-nums">{money(perPeriod)}</b> (o frete vai na primeira).</>}</li>
        <li>Avarias e faltas da devolução entram na medição seguinte.</li>
        {rental.deposit ? <li>Caução de <b className="tabular-nums">{money(rental.deposit)}</b>: cobrada na entrega, abate avarias e o resto volta ao cliente.</li> : null}
        <li className="text-muted-foreground">Locação não usa parcelas: cada medição (Financeiro → A Faturar) vira uma conta a receber.</li>
      </ul>
    </div>
  );
}
