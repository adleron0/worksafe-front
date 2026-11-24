import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
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
  const { data, isLoading, error, refetch } = useQuery({ queryKey: [STOCK_KEYS.reorder], queryFn: () => stockApi.get<ReorderRow[]>("reorder") });
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

  const someChosen = rows.some((row) => chosen[row.id]);
  const columns: DataColumn<ReorderRow>[] = [
    {
      id: "item", header: "Item", cell: (row) => (
        <div className="min-w-0 max-w-sm">
          <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(row.id) }} className="font-medium hover:underline truncate block">{row.name}</Link>
          <p className="text-xs text-muted-foreground tabular-nums">{row.code}</p>
        </div>
      ),
    },
    { id: "available", header: "Disponível", align: "right", className: "w-28 whitespace-nowrap tabular-nums text-red-600 dark:text-red-400", cell: (row) => `${qty(row.available)} ${row.unit}` },
    { id: "min", header: "Mínimo", align: "right", className: "w-24 tabular-nums text-muted-foreground", cell: (row) => qty(row.min) },
    {
      id: "amount", header: "Comprar", className: "w-40", cell: (row) => (
        <div data-row-ignore>
          <NumField value={amounts[row.id] ?? row.suggested} digits={3} suffix={row.unit} ariaLabel={`Quantidade a comprar de ${row.name}`} onChange={(value) => setAmounts((current) => ({ ...current, [row.id]: value }))} />
        </div>
      ),
    },
    { id: "lastCost", header: "Último preço", align: "right", className: "w-28 tabular-nums", cell: (row) => (row.lastCost !== null ? money(row.lastCost) : "—") },
    { id: "supplier", header: "Último fornecedor", className: "text-xs text-muted-foreground", cell: (row) => <span className="truncate block max-w-[12rem]">{row.lastSupplier ?? "—"}</span> },
  ];

  return (
    <>
      <PageHeader title="Reposição" description="Itens com o disponível abaixo do mínimo. Ajuste as quantidades e gere o pedido de compra." />

      <ListCard>
        {canOrder && rows.length > 0 && (
          <ListToolbar>
            <Button type="button" disabled={!picked.length} onClick={createOrder}><Icon name="shopping-cart" className="w-4 h-4" /> Criar pedido de compra{picked.length ? ` (${picked.length})` : ""}</Button>
          </ListToolbar>
        )}

        <DataTable rows={data} columns={columns} getRowId={(row) => row.id} ariaLabel="Reposição" skeletonRows={4}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          selection={{
            isSelected: (row) => !!chosen[row.id],
            toggle: (row, on) => setChosen((current) => ({ ...current, [row.id]: on })),
            pageState: allChosen ? true : someChosen ? "indeterminate" : false,
            togglePage: (on) => setChosen(Object.fromEntries(rows.map((row) => [row.id, on]))),
          }}
          empty={<EmptyState icon="circle-check" title="Nenhum item abaixo do mínimo." description="Só entram aqui os itens com estoque mínimo definido na ficha." />} />

        {picked.length > 0 && total > 0 && (
          <p className="text-right text-sm">Estimativa pelo último preço: <span className="font-semibold tabular-nums">{money(total)}</span></p>
        )}
        {!canOrder && rows.length > 0 && <p className="text-xs text-muted-foreground">Para gerar o pedido de compra é preciso a permissão de criar pedidos de compra.</p>}
      </ListCard>
    </>
  );
}
