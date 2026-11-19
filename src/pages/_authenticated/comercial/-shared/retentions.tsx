import { NumField, money } from "./commercial";

/**
 * Impostos retidos pelo cliente na nota (ISS, INSS, IR, PIS, COFINS, CSLL).
 * O cliente desconta do pagamento e recolhe ele mesmo: a conta a receber fica
 * com o líquido e o retido entra no relatório "Impostos retidos", para não ser
 * pago de novo na guia.
 */
export const RETENTION_TAXES = [
  { id: "iss", name: "ISS", hint: "imposto municipal (em geral 2% a 5%)" },
  { id: "inss", name: "INSS", hint: "11% sobre mão de obra cedida" },
  { id: "ir", name: "IR", hint: "IRRF (em geral 1,5%)" },
  { id: "pis", name: "PIS", hint: "0,65%" },
  { id: "cofins", name: "COFINS", hint: "3%" },
  { id: "csll", name: "CSLL", hint: "1%" },
] as const;
export type RetentionTax = (typeof RETENTION_TAXES)[number]["id"];
export const TAX_LABEL: Record<string, string> = Object.fromEntries(RETENTION_TAXES.map((t) => [t.id, t.name]));

export type RetentionRates = Partial<Record<RetentionTax, number>>;
export type RetentionState = Record<RetentionTax, { rate: number | null; value: number | null }>;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Estado inicial: alíquotas que o cliente costuma reter (do contrato), aplicadas sobre a base. */
export function retentionState(base: number, rates: RetentionRates = {}, current?: Array<{ tax: string; rate: number | null; value: number }>): RetentionState {
  const out = {} as RetentionState;
  for (const tax of RETENTION_TAXES) {
    const saved = current?.find((r) => r.tax === tax.id);
    const rate = saved ? saved.rate : rates[tax.id] ?? null;
    out[tax.id] = { rate, value: saved ? saved.value : rate !== null ? round2((base * rate) / 100) : null };
  }
  return out;
}

/** Recalcula os valores pela alíquota quando a base muda (ex.: o boletim mudou). */
export function rebase(state: RetentionState, base: number): RetentionState {
  const out = { ...state };
  for (const tax of RETENTION_TAXES) {
    const row = state[tax.id];
    if (row.rate !== null) out[tax.id] = { rate: row.rate, value: round2((base * row.rate) / 100) };
  }
  return out;
}

export const retentionList = (state: RetentionState) =>
  RETENTION_TAXES.map((t) => ({ tax: t.id, rate: state[t.id].rate, value: state[t.id].value })).filter((r) => (r.value ?? 0) > 0);
export const retentionSum = (state: RetentionState) => round2(retentionList(state).reduce((sum, r) => sum + (r.value ?? 0), 0));

/**
 * Campos das retenções: alíquota (%) ou valor (R$) por imposto. Vazio = o
 * cliente não reteve aquele imposto.
 */
export function RetentionFields({ base, receivable, state, onChange, idPrefix = "ret" }: {
  /** valor da nota (base do imposto) */
  base: number;
  /** o que fica a receber antes das retenções (na obra, a nota menos a caução) */
  receivable?: number;
  state: RetentionState; onChange: (state: RetentionState) => void; idPrefix?: string;
}) {
  const total = retentionSum(state);
  const gross = receivable ?? base;
  const set = (tax: RetentionTax, patch: { rate: number | null; value: number | null }) => onChange({ ...state, [tax]: patch });
  return (
    <section className="rounded-md border p-3 grid gap-2" aria-label="Impostos retidos pelo cliente">
      <div>
        <p className="text-sm font-medium">Impostos retidos pelo cliente</p>
        <p className="text-xs text-muted-foreground">Preencha só o que vier destacado como retido na nota. O cliente recolhe esses impostos: eles entram no relatório "Impostos retidos" para não serem pagos de novo na guia.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
        {RETENTION_TAXES.map((tax) => (
          <div key={tax.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-2">
            <label htmlFor={`${idPrefix}-${tax.id}`} className="text-sm font-medium">{tax.name}</label>
            <NumField id={`${idPrefix}-${tax.id}`} kind="number" digits={2} suffix="%" value={state[tax.id].rate} placeholder="—" ariaLabel={`Alíquota de ${tax.name} retido`}
              onChange={(rate) => set(tax.id, { rate, value: round2((base * rate) / 100) })} onEmpty={() => set(tax.id, { rate: null, value: null })} />
            <NumField kind="money" value={state[tax.id].value} placeholder="0,00" ariaLabel={`Valor de ${tax.name} retido`}
              onChange={(value) => set(tax.id, { rate: null, value })} onEmpty={() => set(tax.id, { rate: null, value: null })} />
          </div>
        ))}
      </div>
      <p className="text-sm flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t">
        <span>Retido: <b className="tabular-nums">{money(total)}</b></span>
        <span>Líquido a receber: <b className="tabular-nums">{money(round2(gross - total))}</b></span>
        {total >= gross && <span className="text-red-600">As retenções passam do valor a receber.</span>}
      </p>
    </section>
  );
}
