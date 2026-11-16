import { useQuery } from "@tanstack/react-query";
import Select from "@/components/general-components/Select";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { STOCK_KEYS, qty, stockApi } from "./stock";

/** Seletores de peça e de lote (romaneio, transferência, consumo, entrega de EPI, locação). */

export interface UnitOption { id: number; name: string; tag: string; itemId: number; item: string; status: string; holderType: string; holderId: number | null; where: string; usable: boolean }
export interface LotOption { id: number; name: string; number: string; expiresAt: string | null; status: string; available: number }

const STATUS_REASON: Record<string, string> = {
  em_uso: "em uso", em_inspecao: "esperando inspeção", em_manutencao: "em manutenção", em_calibracao: "em calibração", bloqueado: "bloqueada", baixado: "baixada",
};
/** Por que a peça não pode sair (para a dica). */
export const unitBlockReason = (unit: UnitOption) =>
  unit.usable ? "" : unit.status !== "disponivel" ? `Peça ${STATUS_REASON[unit.status] ?? unit.status}` : "Inspeção, calibração ou vida útil vencida (ou inspeção pedida)";

/** Peças de um item, filtradas pela posição. `available`: só disponíveis em local. */
export function useUnitOptions(params: { itemId?: string | number | null; holderType?: string; holderId?: string | number | null; available?: boolean }, enabled = true) {
  const query = {
    ...(params.itemId ? { itemId: params.itemId } : {}), ...(params.holderType ? { holderType: params.holderType } : {}),
    ...(params.holderId ? { holderId: params.holderId } : {}), ...(params.available ? { available: "1" } : {}),
  };
  return useQuery({
    queryKey: [STOCK_KEYS.unitOptions, query],
    queryFn: () => stockApi.get<UnitOption[]>("units/options", query),
    enabled: enabled && !!params.itemId,
    retry: false,
  });
}

/**
 * Escolhe uma peça. As que não podem sair aparecem desabilitadas, com o motivo na dica.
 * `exclude`: peças já escolhidas em outras linhas.
 */
export function UnitPicker({ name, itemId, holderType = "local", holderId, value, onChange, exclude = [], allowBlocked = false }: {
  name: string; itemId: string | number; holderType?: string; holderId?: string | number | null; value: string; onChange: (value: string) => void; exclude?: string[]; allowBlocked?: boolean;
}) {
  const { data = [], isLoading, error } = useUnitOptions({ itemId, holderType, holderId: holderType === "local" && !holderId ? null : holderId });
  if (error) return <p className="text-xs text-red-500 pb-2">Não foi possível listar as peças: {errorMessage(error)}</p>;
  const options = data.filter((unit) => !exclude.includes(String(unit.id)) || String(unit.id) === value);
  const usable = options.filter((unit) => allowBlocked || unit.usable);
  const blocked = allowBlocked ? [] : options.filter((unit) => !unit.usable);
  return (
    <div className="grid gap-1">
      <Select name={name} options={usable.map((unit) => ({ id: unit.id, name: `${unit.name}${holderType === "local" && !holderId ? ` · ${unit.where}` : ""}` }))} state={value} isLoading={isLoading} modal
        onChange={(_, v) => onChange(String(v ?? ""))} placeholder={usable.length ? "Escolha a peça (etiqueta)" : "Nenhuma peça disponível aqui"} />
      {blocked.length > 0 && (
        <p className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
          Indisponíveis:
          {blocked.map((unit) => (
            <Tip key={unit.id} text={unitBlockReason(unit)}>
              <span className="rounded bg-muted px-1.5 py-0.5 line-through opacity-70 cursor-help">{unit.tag}</span>
            </Tip>
          ))}
        </p>
      )}
    </div>
  );
}

/** Lotes de um item com saldo num local (ou em outra posição). */
export function LotPicker({ name, itemId, locationId, holderType, value, onChange, unit = "" }: {
  name: string; itemId: string | number; locationId: string | number; holderType?: string; value: string; onChange: (value: string) => void; unit?: string;
}) {
  const params = { itemId, ...(locationId ? { locationId } : {}), ...(holderType ? { holderType } : {}) };
  const { data = [], isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.lotOptions, params],
    queryFn: () => stockApi.get<LotOption[]>("lots/options", params),
    enabled: !!itemId && !!locationId,
    retry: false,
  });
  if (!locationId) return <p className="text-xs text-muted-foreground pb-2">Escolha o local para ver os lotes.</p>;
  if (error) return <p className="text-xs text-red-500 pb-2">Não foi possível listar os lotes: {errorMessage(error)}</p>;
  const options = data.map((lot) => ({ id: lot.id, name: `${lot.number} · ${qty(lot.available)} ${unit}${lot.expiresAt ? ` · vence ${dateBr(lot.expiresAt)}` : ""}${lot.status !== "liberado" ? ` · ${lot.status}` : ""}`.replace(/\s+·/g, " ·") }));
  return <Select name={name} options={options} state={value} isLoading={isLoading} modal onChange={(_, v) => onChange(String(v ?? ""))} placeholder={options.length ? "Escolha o lote" : "Nenhum lote com saldo aqui"} />;
}
