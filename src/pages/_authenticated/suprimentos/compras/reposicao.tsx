import { clickableRow } from "@/utils/clickable-row";
import tailwindUtils from "@/utils/tailwind.utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { NumField, errorMessage, money } from "../../comercial/-shared/commercial";
import { PURCHASES_ABILITY } from "../-shared/purchases";
import { REORDER_STORAGE_KEY, ReorderDraft, ReorderRow, STOCK_ABILITY, STOCK_KEYS, qty, stockApi } from "../-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/compras/reposicao")({
  component: ReorderPage,
});

/** Itens abaixo do mínimo, com a quantidade sugerida; os escolhidos viram um pedido de compra. */
function ReorderPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [chosen, setChosen] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const { data, isLoading, error } = useQuery({ queryKey: [STOCK_KEYS.reorder], queryFn: () => stockApi.get<ReorderRow[]>("reorder") });
  // começa com tudo marcado e a quantidade sugerida
  useEffect(() => {
    if (!data) return;
    setChosen(Object.fromEntries(data.map((row) => [row.id, true])));
    setAmounts(Object.fromEntries(data.map((row) => [row.id, row.suggested])));
  }, [data]);

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const rows = data ?? [];
  const picked = rows.filter((row) => chosen[row.id] && (amounts[row.id] ?? 0) > 0);
  const allChosen = rows.length > 0 && rows.every((row) => chosen[row.id]);
  const total = picked.reduce((sum, row) => sum + (amounts[row.id] ?? 0) * (row.lastCost ?? 0), 0);
  const canOrder = can(`create_${PURCHASES_ABILITY}`);

  const createOrder = () => {
    if (!picked.length) return toast({ title: "Escolha pelo menos um item com quantidade", variant: "destructive" });
    const suppliers = [...new Set(picked.map((row) => row.lastSupplierId).filter(Boolean))];
    const draft: ReorderDraft = {
      supplierId: suppliers.length === 1 ? (suppliers[0] as number) : null,
      items: picked.map((row) => ({ description: row.name, unit: row.unit, quantity: amounts[row.id], unitPrice: row.lastCost ?? 0, itemId: row.id })),
    };
    try { sessionStorage.setItem(REORDER_STORAGE_KEY, JSON.stringify(draft)); } catch { return toast({ title: "Não foi possível preparar o pedido neste navegador", variant: "destructive" }); }
    navigate({ to: "/suprimentos/pedidos-de-compra/$purchaseId", params: { purchaseId: "novo" }, search: { reposicao: "1" } });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Reposição</h1>
          <p className="text-sm text-muted-foreground">Itens com o disponível abaixo do mínimo. Ajuste as quantidades e gere o pedido de compra.</p>
        </div>
        {canOrder && rows.length > 0 && (
          <Button type="button" disabled={!picked.length} onClick={createOrder}><Icon name="shopping-cart" className="w-4 h-4 mr-1" /> Criar pedido de compra{picked.length ? ` (${picked.length})` : ""}</Button>
        )}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="mt-4 rounded-card border bg-card overflow-x-auto">
          <div className="flex min-w-[880px] items-center py-2.5 border-b px-4 font-semibold text-[12.5px] text-muted-foreground">
            <div className="w-10">
              <Checkbox aria-label="Marcar todos" checked={allChosen} className="min-w-[880px] border-inverse-foreground" onCheckedChange={(checked) => setChosen(Object.fromEntries(rows.map((row) => [row.id, checked === true])))} />
            </div>
            <div className="flex-1">Item</div>
            <div className="w-32 text-right">Disponível</div>
            <div className="w-28 text-right">Mínimo</div>
            <div className="w-40 text-right">Comprar</div>
            <div className="w-32 text-right">Último preço</div>
            <div className="w-48 pl-4">Último fornecedor</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhum item abaixo do mínimo. Só entram aqui os itens com estoque mínimo definido na ficha.</p>}
          {rows.map((row) => (
            <div key={row.id} {...clickableRow()} className={`flex flex-row items-center gap-0 px-4 py-3 last:border-b-0 text-sm ${tailwindUtils.itemClickable}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 shrink-0 -mr-3">
                  <Checkbox aria-label={`Comprar ${row.name}`} checked={!!chosen[row.id]} onCheckedChange={(checked) => setChosen((current) => ({ ...current, [row.id]: checked === true }))} />
                </div>
                <div className="min-w-0">
                  <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(row.id) }} className="font-medium hover:underline truncate block">{row.name}</Link>
                  <p className="text-xs text-muted-foreground tabular-nums">{row.code}</p>
                </div>
              </div>
              <div className="w-32 text-right tabular-nums text-red-600 dark:text-red-400"><span className="hidden text-xs text-muted-foreground">Disponível: </span>{qty(row.available)} {row.unit}</div>
              <div className="w-28 text-right tabular-nums text-muted-foreground"><span className="hidden text-xs">Mínimo: </span>{qty(row.min)}</div>
              <div className="w-40 pl-4">
                <NumField value={amounts[row.id] ?? row.suggested} digits={3} suffix={row.unit} ariaLabel={`Quantidade a comprar de ${row.name}`} onChange={(value) => setAmounts((current) => ({ ...current, [row.id]: value }))} />
              </div>
              <div className="w-32 text-right tabular-nums"><span className="hidden text-xs text-muted-foreground">Último preço: </span>{row.lastCost !== null ? money(row.lastCost) : "—"}</div>
              <div className="w-48 pl-4 text-xs text-muted-foreground truncate">{row.lastSupplier ?? "—"}</div>
            </div>
          ))}
          {picked.length > 0 && total > 0 && (
            <p className="px-4 py-2 border-t text-right text-sm">Estimativa pelo último preço: <span className="font-semibold tabular-nums">{money(total)}</span></p>
          )}
        </div>
      )}
      {!canOrder && rows.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Para gerar o pedido de compra é preciso a permissão de criar pedidos de compra.</p>}
    </>
  );
}
