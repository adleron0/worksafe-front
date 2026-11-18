import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, money, percent } from "../../comercial/-shared/commercial";
import { ItemDetail, RentalPreset, stockApi, useItemOptions } from "./stock";

type N = number | null;

/** Campos de locação do rascunho do item (plano 09). */
export interface RentalDraft {
  rentPriceMode: "calculado" | "manual"; rentMode: "locacao" | "com_operador" | "ambos"; minRentPeriod: "" | "dia" | "semana" | "mes";
  economicLifeMonths: N; residualRate: N; maintenanceRate: N; inspectionCost: N; calibrationCost: N; lossRate: N; handlingCost: N; occupancy: N;
  components: Array<{ itemId: number; quantity: number }>;
}

export const rentalDraftOf = (item?: ItemDetail): RentalDraft => ({
  rentPriceMode: item?.rentPriceMode ?? "calculado", rentMode: item?.rentMode ?? "ambos", minRentPeriod: item?.minRentPeriod ?? "",
  economicLifeMonths: item?.economicLifeMonths ?? null, residualRate: item?.residualRate ?? null, maintenanceRate: item?.maintenanceRate ?? null,
  inspectionCost: item?.inspectionCost ?? null, calibrationCost: item?.calibrationCost ?? null, lossRate: item?.lossRate ?? null,
  handlingCost: item?.handlingCost ?? null, occupancy: item?.occupancy ?? null,
  components: (item?.components ?? []).map((c) => ({ itemId: c.itemId, quantity: c.quantity })),
});

/** O que vai para a API: só quando o item é alugável (senão a conta não interessa). */
export const rentalPayload = (draft: RentalDraft & { rentable: boolean }) => (draft.rentable ? {
  rentPriceMode: draft.rentPriceMode, rentMode: draft.rentMode, minRentPeriod: draft.minRentPeriod || null,
  economicLifeMonths: draft.economicLifeMonths, residualRate: draft.residualRate, maintenanceRate: draft.maintenanceRate,
  inspectionCost: draft.inspectionCost, calibrationCost: draft.calibrationCost, lossRate: draft.lossRate, handlingCost: draft.handlingCost,
  occupancy: draft.occupancy, components: draft.components.filter((c) => c.itemId > 0),
} : {});

const PRICE_MODES = [{ id: "calculado", name: "Calculado pela base" }, { id: "manual", name: "Digitado à mão" }];
const RENT_MODES = [
  { id: "ambos", name: "Locação ou serviço" },
  { id: "locacao", name: "Só locação (o cliente opera)" },
  { id: "com_operador", name: "Só com operador nosso (é serviço)" },
];
const MIN_PERIODS = [{ id: "dia", name: "1 dia" }, { id: "semana", name: "1 semana" }, { id: "mes", name: "1 mês" }];
const MARKET_TONE = { abaixo: "text-amber-600 dark:text-amber-400", dentro: "text-green-600 dark:text-green-400", acima: "text-amber-600 dark:text-amber-400" } as const;

export type RentalFormDraft = RentalDraft & {
  rentDaily: N; rentWeekly: N; rentMonthly: N; replacementValue: N; inspectionIntervalDays: N; calibrationIntervalMonths: N; lifeMonths: N;
  requiresInspection: boolean; requiresCalibration: boolean;
};

interface Props {
  draft: RentalFormDraft;
  set: (key: keyof RentalFormDraft, value: unknown) => void;
  apply: (patch: Partial<RentalFormDraft>) => void;
  item?: ItemDetail;
  editable: boolean;
  canSeeCosts: boolean;
}

/**
 * Seção "Alugável" da ficha do item: valor de reposição, vida, inspeção e
 * ocupação que alimentam a base de cálculo da locação; preço calculado (ou
 * digitado) e, se for kit, os componentes.
 */
export function ItemRentalSection({ draft, set, apply, item, editable, canSeeCosts }: Props) {
  const { data: presets } = useQuery({ queryKey: ["stockRentalPresets"], queryFn: () => stockApi.get<RentalPreset[]>("items/rental-presets"), staleTime: Infinity });
  const { data: itemOptions } = useItemOptions(null, editable);
  const fillFromPreset = (key: string) => {
    const preset = presets?.find((p) => p.key === key);
    if (!preset) return;
    apply({
      replacementValue: preset.value, economicLifeMonths: preset.lifeMonths, residualRate: preset.residualRate, maintenanceRate: preset.maintenanceRate,
      occupancy: preset.occupancy, lossRate: preset.lossRate, handlingCost: preset.handlingCost, minRentPeriod: preset.minRentPeriod,
      inspectionCost: preset.inspectionCost ?? null, calibrationCost: preset.calibrationCost ?? null,
      ...(preset.inspectionCost ? { requiresInspection: true, inspectionIntervalDays: Math.round((preset.inspectionMonths ?? 6) * 30) } : {}),
      ...(preset.calibrationCost ? { calibrationIntervalMonths: preset.calibrationMonths ?? 6 } : {}),
    });
  };
  const num = (key: keyof RentalDraft | "replacementValue", label: string, opts: { kind?: "money" | "percent"; digits?: number; placeholder?: string; hint?: string } = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <NumField value={draft[key] as N} kind={opts.kind} digits={opts.digits ?? 2} placeholder={opts.placeholder ?? "Padrão da base"} disabled={!editable} ariaLabel={label}
        onChange={(value) => set(key, value)} onEmpty={() => set(key, null)} />
      {opts.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{opts.hint}</p>}
    </div>
  );
  const price = item?.rentalPrice && "month" in item.rentalPrice ? item.rentalPrice : null;
  const priceError = item?.rentalPrice && "error" in item.rentalPrice && item.rentalPrice.error ? item.rentalPrice.error : null;
  const options = (itemOptions ?? []).filter((o) => o.id !== item?.id && !o.isKit).map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="grid gap-4">
      {editable && (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/40 p-3">
          <div className="min-w-56 flex-1">
            <Label className="text-xs">Preencher com valores de pesquisa</Label>
            <Select name="rentalPreset" modal={false} placeholder="Escolha o equipamento" state=""
              options={(presets ?? []).map((p) => ({ id: p.key, name: `${p.label} — ${money(p.value)}` }))}
              onChange={(_, value) => fillFromPreset(String(value ?? ""))} />
          </div>
          <p className="text-xs text-muted-foreground flex-[2] min-w-64">
            Valor, vida útil, inspeção e ocupação de partida (SICRO, lojas e manuais, 18/11/2026). Ajuste com os números reais da empresa.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div><Label className="text-xs">Como pode ser alugado</Label>
          <Select name="rentMode" modal={false} options={RENT_MODES} state={draft.rentMode} disabled={!editable} onChange={(_, value) => set("rentMode", (String(value || "ambos")))} />
          <p className="text-[11px] text-muted-foreground mt-0.5">"Só com operador" não entra em proposta de locação: vira serviço.</p></div>
        <div><Label className="text-xs">Período mínimo</Label>
          <Select name="minRentPeriod" modal={false} options={MIN_PERIODS} state={draft.minRentPeriod} clearable placeholder="Sem mínimo" disabled={!editable}
            onChange={(_, value) => set("minRentPeriod", (String(value ?? "")))} /></div>
        <div><Label className="text-xs">Preço</Label>
          <Select name="rentPriceMode" modal={false} options={PRICE_MODES} state={draft.rentPriceMode} disabled={!editable} onChange={(_, value) => set("rentPriceMode", (String(value || "calculado")))} /></div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {num("replacementValue", "Valor de reposição", { kind: "money", placeholder: "Custo médio", hint: "Preço de comprar um novo hoje." })}
        {num("economicLifeMonths", "Vida até descartar (meses)", { digits: 0, placeholder: draft.lifeMonths ? `${draft.lifeMonths} (validade)` : "Padrão da categoria" })}
        {num("residualRate", "Valor residual", { kind: "percent" })}
        {num("maintenanceRate", "Manutenção ao ano", { kind: "percent" })}
        {num("inspectionCost", "Custo da inspeção periódica", { kind: "money", placeholder: "Sem custo", hint: draft.inspectionIntervalDays ? `A cada ${draft.inspectionIntervalDays} dias.` : "Intervalo padrão da base." })}
        {num("calibrationCost", "Custo da calibração", { kind: "money", placeholder: "Sem calibração", hint: draft.calibrationIntervalMonths ? `A cada ${draft.calibrationIntervalMonths} meses.` : undefined })}
        {num("occupancy", "Ocupação esperada", { kind: "percent", hint: "Parte do ano alugado." })}
        {num("lossRate", "Perdas por mês alugado", { kind: "percent" })}
        {num("handlingCost", "Preparação por locação", { kind: "money", hint: "Inspeção de devolução e limpeza." })}
      </div>

      <div className="rounded-md border p-3 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Kit (conjunto de itens)</p>
            <p className="text-xs text-muted-foreground">Ex.: kit de resgate. Alugar o kit entrega e devolve cada componente; o custo é a soma deles.</p>
          </div>
          {editable && (item?.partOf.length ?? 0) === 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set("components", [...draft.components, { itemId: 0, quantity: 1 }])}>
              <Icon name="plus" className="w-4 h-4 mr-1" /> Componente
            </Button>
          )}
        </div>
        {(item?.partOf.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">Este item é componente de: {item!.partOf.map((k) => `${k.code} — ${k.name}`).join(", ")}.</p>}
        {draft.components.map((component, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Select name={`component-${index}`} modal={false} searchable options={options} state={component.itemId ? String(component.itemId) : ""} placeholder="Escolha o item" disabled={!editable}
                onChange={(_, value) => set("components", draft.components.map((c, i) => (i === index ? { ...c, itemId: Number(value) || 0 } : c)))} />
            </div>
            <NumField className="w-24" digits={3} value={component.quantity} disabled={!editable} ariaLabel={`Quantidade do componente ${index + 1}`}
              onChange={(value) => set("components", draft.components.map((c, i) => (i === index ? { ...c, quantity: value } : c)))} />
            {editable && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover componente ${index + 1}`}
                onClick={() => set("components", draft.components.filter((_, i) => i !== index))}>
                <Icon name="trash-2" className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {draft.rentPriceMode === "manual" ? (
        <div className="grid sm:grid-cols-3 gap-4">
          {(["rentDaily", "rentWeekly", "rentMonthly"] as const).map((key) => (
            <div key={key}><Label className="text-xs">{key === "rentDaily" ? "Diária" : key === "rentWeekly" ? "Semanal" : "Mensal"}</Label>
              <NumField value={draft[key]} kind="money" disabled={!editable} ariaLabel={key} onChange={(value) => set(key, value)} onEmpty={() => set(key, null)} /></div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border p-3">
          {!item && <p className="text-sm text-muted-foreground">O preço aparece aqui depois de salvar o item.</p>}
          {priceError && <p className="text-sm text-amber-700 dark:text-amber-300">Sem preço calculado: {priceError}.</p>}
          {item && !price && !priceError && !canSeeCosts && (
            <p className="text-sm">Diária {money(item.rentDaily)} · semana {money(item.rentWeekly)} · mês {money(item.rentMonthly)}</p>
          )}
          {price && (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["Mês", price.month], ["Semana", price.week], ["Dia", price.day], ["Preparação", price.handling]].map(([label, value]) => (
                  <div key={label as string} className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold tabular-nums">{money(value as number)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Custo de ter {money(price.cost.ownMonthly)}/mês ÷ ocupação {percent(price.cost.occupancy, 0)} + perdas = {money(price.cost.perRentedMonth)} por mês alugado ·
                margem {percent(price.margin, 0)} · imposto {percent(price.tax.inside, 2)}{price.tax.rental ? " (locação)" : " (do serviço)"} ·{" "}
                <span className={cn("font-medium", MARKET_TONE[price.market])}>{percent(price.valueShare, 1)} do bem ao mês</span>
                {price.market !== "dentro" && ` (${price.market} da faixa de mercado)`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
