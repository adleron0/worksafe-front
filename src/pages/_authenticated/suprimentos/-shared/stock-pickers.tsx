import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { InspectionDialog } from "./equipment";
import { STOCK_KEYS, qty, stockApi, useStockOptions } from "./stock";

/** Seletores de peça e de lote (romaneio, transferência, consumo, entrega de EPI, locação). */

export interface UnitOption {
  id: number; name: string; tag: string; itemId: number; item: string; status: string; holderType: string; holderId: number | null; where: string; usable: boolean;
  /** motivo em palavras ("inspeção venceu em 02/11") e o atalho que resolve */
  reason?: string | null; fix?: "inspecionar" | "calibrar" | null;
}
export interface LotOption { id: number; name: string; number: string; expiresAt: string | null; status: string; available: number }

const STATUS_REASON: Record<string, string> = {
  em_uso: "em uso", em_inspecao: "esperando inspeção", em_manutencao: "em manutenção", em_calibracao: "em calibração", bloqueado: "bloqueada", baixado: "baixada",
};
/** Por que a peça não pode sair (para a dica). */
export const unitBlockReason = (unit: UnitOption) =>
  unit.usable ? "" : unit.reason ?? (unit.status !== "disponivel" ? STATUS_REASON[unit.status] ?? unit.status : "inspeção, calibração ou vida útil vencida");

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
 * Escolhe uma peça. As que não podem sair aparecem embaixo, uma por linha, com o motivo
 * e o atalho que resolve ("Inspecionar agora" ou "Enviar para calibrar").
 * `exclude`: peças já escolhidas em outras linhas.
 */
export function UnitPicker({ name, itemId, holderType = "local", holderId, value, onChange, exclude = [], allowBlocked = false }: {
  name: string; itemId: string | number; holderType?: string; holderId?: string | number | null; value: string; onChange: (value: string) => void; exclude?: string[]; allowBlocked?: boolean;
}) {
  const { can } = useVerify();
  const [inspecting, setInspecting] = useState<UnitOption | null>(null);
  const { data = [], isLoading, error } = useUnitOptions({ itemId, holderType, holderId: holderType === "local" && !holderId ? null : holderId });
  if (error) return <p className="text-xs text-red-500 pb-2">Não foi possível listar as peças: {errorMessage(error)}</p>;
  const options = data.filter((unit) => !exclude.includes(String(unit.id)) || String(unit.id) === value);
  const usable = options.filter((unit) => allowBlocked || unit.usable);
  const blocked = allowBlocked ? [] : options.filter((unit) => !unit.usable);
  return (
    <div className="grid gap-1">
      <Select name={name} searchable options={usable.map((unit) => ({ id: unit.id, name: `${unit.name}${holderType === "local" && !holderId ? ` · ${unit.where}` : ""}` }))} state={value} isLoading={isLoading} modal
        onChange={(_, v) => onChange(String(v ?? ""))} placeholder={usable.length ? "Escolha a peça (etiqueta)" : "Nenhuma peça pode sair agora"} />
      {blocked.length > 0 && (
        <ul className="grid gap-1 text-xs">
          {blocked.map((unit) => (
            <li key={unit.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded bg-muted/60 px-2 py-1">
              <Icon name="lock" className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0"><span className="font-medium">{unit.tag}</span> — {unitBlockReason(unit)}</span>
              {unit.fix === "inspecionar" && can("inspecoes_equipamentos") && (
                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setInspecting(unit)}><Icon name="list-checks" className="w-3 h-3 mr-1" /> Inspecionar agora</Button>
              )}
              {unit.fix === "calibrar" && (
                <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(unit.id) }} className="text-primary underline">Enviar para calibrar</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {inspecting && (
        <InspectionDialog target={{ unitId: inspecting.id, label: `${inspecting.tag} · ${inspecting.item}`, kind: inspecting.status === "em_inspecao" ? "recebimento" : "periodica" }}
          onClose={() => setInspecting(null)} />
      )}
    </div>
  );
}

/**
 * Local de estoque nos diálogos: com um local só, vira texto ("Sai de: Almoxarifado");
 * com mais, um seletor já com o primeiro escolhido. `value` vazio = o primeiro.
 */
export function LocationField({ label, value, onChange, name = "locationId", exclude, required = true }: {
  label: string; value: string; onChange: (value: string) => void; name?: string; exclude?: string; required?: boolean;
}) {
  const { data, isLoading, isError } = useStockOptions();
  const locations = (data?.locations ?? []).filter((location) => String(location.id) !== exclude);
  if (isError || (!isLoading && !data)) return <p className="text-sm text-muted-foreground">{label}: o local padrão do estoque.</p>;
  if (!isLoading && locations.length === 1) return <p className="text-sm">{label}: <span className="font-medium">{locations[0].name}</span></p>;
  return (
    <div>
      <Label>{label}{required && <span> *</span>}</Label>
      <Select name={name} options={locations} state={value || (locations[0] ? String(locations[0].id) : "")} isLoading={isLoading} modal
        onChange={(_, v) => onChange(String(v ?? ""))} placeholder="Escolha o local" />
    </div>
  );
}

/** O local efetivo (o escolhido ou o primeiro), para mandar à API. */
export function useLocationValue(value: string, exclude?: string) {
  const { data } = useStockOptions();
  const first = (data?.locations ?? []).find((location) => String(location.id) !== exclude);
  return value || (first ? String(first.id) : "");
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
  return <Select name={name} searchable={options.length > 8} options={options} state={value} isLoading={isLoading} modal onChange={(_, v) => onChange(String(v ?? ""))} placeholder={options.length ? "Escolha o lote" : "Nenhum lote com saldo aqui"} />;
}
