import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { dateBr, errorMessage, money, todayIso } from "../../comercial/-shared/commercial";
import { BalanceRow, HOLDER_LABEL, HOLDER_OPTIONS, STOCK_ABILITY, STOCK_KEYS, downloadCsv, qty, stockApi, toOptions, useStockOptions } from "../-shared/stock";

interface BalancesSearch { holderType?: string; outside?: "1" }
export const Route = createFileRoute("/_authenticated/suprimentos/estoque/saldos")({
  component: BalancesPage,
  validateSearch: (search: Record<string, unknown>): BalancesSearch => ({
    ...(typeof search.holderType === "string" && search.holderType ? { holderType: search.holderType } : {}),
    ...(search.outside === "1" || search.outside === 1 ? { outside: "1" as const } : {}),
  }),
});

/** Saldos: item × posição (local, obra, funcionário, locação, fornecedor), com exportação em planilha. */
function BalancesPage() {
  const { can } = useVerify();
  const initial = Route.useSearch();
  const [holderType, setHolderType] = useState(initial.holderType ?? "");
  const [holderId, setHolderId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [outside, setOutside] = useState(initial.outside === "1");
  const { data: options } = useStockOptions();

  const params = {
    ...(holderType ? { holderType } : {}), ...(holderType === "local" && holderId ? { holderId } : {}), ...(categoryId ? { categoryId } : {}),
    ...(search.trim() ? { search: search.trim() } : {}), ...(outside && !holderType ? { outside: "1" } : {}),
  };
  const { data, isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.balances, params],
    queryFn: () => stockApi.get<{ rows: BalanceRow[]; value: number | null }>("balances", params),
    placeholderData: (previous) => previous,
  });

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const rows = data?.rows ?? [];
  const seesCost = data?.value !== null && data?.value !== undefined;
  const exportCsv = () => downloadCsv(`saldos-estoque-${todayIso()}.csv`,
    ["Código", "Item", "Onde", "Tipo", "Lote", "Validade", "Quantidade", "Unidade", ...(seesCost ? ["Valor"] : [])],
    rows.map((row) => [row.code, row.item, row.holder, HOLDER_LABEL[row.holderType], row.lot, row.expiresAt ? dateBr(row.expiresAt) : "", row.quantity, row.unit, ...(seesCost ? [row.value] : [])]));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Saldos</h1>
          <p className="text-sm text-muted-foreground">Quanto de cada item há em cada lugar. Sem filtro, mostra só os locais de estoque.</p>
        </div>
        <Button type="button" variant="outline" disabled={!rows.length} onClick={exportCsv}><Icon name="download" className="w-4 h-4 mr-1" /> Exportar planilha</Button>
      </div>

      <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-52"><Select name="holderType" options={HOLDER_OPTIONS} state={holderType} clearable modal={false} placeholder="Locais de estoque" onChange={(_, value) => { setHolderType(String(value ?? "")); setHolderId(""); }} /></div>
        {holderType === "local" && <div className="w-full xl:w-52"><Select name="holderId" options={options?.locations ?? []} state={holderId} clearable modal={false} placeholder="Todos os locais" onChange={(_, value) => setHolderId(String(value ?? ""))} /></div>}
        <div className="w-full xl:w-56"><Select name="categoryId" options={toOptions(options?.categories)} state={categoryId} clearable modal={false} placeholder="Todas as categorias" onChange={(_, value) => setCategoryId(String(value ?? ""))} /></div>
        <div className="w-full xl:w-72"><Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar item por nome ou código..." icon="search" /></div>
        {!holderType && (
          <div className="flex items-center gap-2">
            <Checkbox id="outside" checked={outside} onCheckedChange={(checked) => setOutside(checked === true)} />
            <Label htmlFor="outside">Incluir o que está fora do estoque</Label>
          </div>
        )}
        {seesCost && <p className="xl:ml-auto text-sm text-muted-foreground">Valor: <span className="font-semibold text-foreground tabular-nums">{money(data?.value)}</span></p>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-32">Código</div>
            <div className="flex-1">Item</div>
            <div className="w-64">Onde</div>
            <div className="w-40">Lote</div>
            <div className="w-32 text-right">Quantidade</div>
            {seesCost && <div className="w-32 text-right">Valor</div>}
          </div>
          {isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhum saldo com esses filtros.</p>}
          {rows.map((row, index) => (
            <div key={`${row.itemId}-${row.lotId}-${row.holderType}-${row.holderId}-${index}`} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2.5 border-b last:border-b-0 text-sm">
              <div className="lg:w-32 tabular-nums font-medium">{row.code}</div>
              <div className="flex-1 min-w-0 lg:pr-4 truncate">
                <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(row.itemId) }} className="hover:underline">{row.item}</Link>
              </div>
              <div className="lg:w-64 min-w-0 truncate">{row.holder} {row.holderType !== "local" && <span className="text-xs text-muted-foreground">({HOLDER_LABEL[row.holderType]})</span>}</div>
              <div className="lg:w-40 text-xs text-muted-foreground">{row.lot ? `${row.lot}${row.expiresAt ? ` · vence ${dateBr(row.expiresAt)}` : ""}` : "—"}</div>
              <div className="lg:w-32 lg:text-right tabular-nums font-medium">{qty(row.quantity)} {row.unit}</div>
              {seesCost && <div className="lg:w-32 lg:text-right tabular-nums">{money(row.value)}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
