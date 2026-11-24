import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ImportCsvButton } from "../-shared/stock-movements";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import Select from "@/components/general-components/Select";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { FLAG_OPTIONS, ItemList, STOCK_ABILITY, StockItem, STOCK_KEYS, TRACKING_LABEL, TRACKING_OPTIONS, qty, stockApi, toOptions, useStockOptions } from "../-shared/stock";

interface ItemsSearch { low?: "1"; flag?: string; categoryId?: number }
export const Route = createFileRoute("/_authenticated/suprimentos/estoque/itens")({
  component: ItemsPage,
  validateSearch: (search: Record<string, unknown>): ItemsSearch => ({
    ...(search.low === "1" || search.low === 1 ? { low: "1" as const } : {}),
    ...(typeof search.flag === "string" && search.flag ? { flag: search.flag } : {}),
    ...(Number(search.categoryId) > 0 ? { categoryId: Number(search.categoryId) } : {}),
  }),
});

const LIMITS = [10, 30, 50, 100];
const STATUS_OPTIONS = [{ id: "ativos", name: "Ativos" }, { id: "inativos", name: "Inativos" }, { id: "todos", name: "Todos" }];

/** Catálogo do estoque: o que existe, quanto tem e o que está abaixo do mínimo. */
function ItemsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const initial = Route.useSearch();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(initial.categoryId ? String(initial.categoryId) : "");
  const [tracking, setTracking] = useState("");
  const [flag, setFlag] = useState(initial.flag ?? "");
  const [low, setLow] = useState(initial.low === "1");
  const [status, setStatus] = useState("ativos");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(30);
  const { data: options } = useStockOptions();

  const params = {
    page, limit, status,
    ...(search.trim() ? { search: search.trim() } : {}), ...(categoryId ? { categoryId } : {}), ...(tracking ? { tracking } : {}),
    ...(flag ? { flag } : {}), ...(low ? { low: "1" } : {}),
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [STOCK_KEYS.items, params],
    queryFn: () => stockApi.get<ItemList>("items", params),
    placeholderData: (previous) => previous,
  });
  const open = (id: number | "novo") => navigate({ to: "/suprimentos/estoque/itens/$itemId", params: { itemId: String(id) } });
  const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const seesCost = data?.value !== null && data?.value !== undefined;
  const filtered = !!(search || categoryId || tracking || flag || low || status !== "ativos");

  const canCreate = can(`create_${STOCK_ABILITY}`);
  const columns: DataColumn<StockItem>[] = [
    { id: "code", header: "Código", className: "w-28", cell: (item) => <span className="font-semibold tabular-nums">{item.code}</span> },
    {
      id: "name", header: "Item", cell: (item) => (
        <div className="min-w-0 max-w-md">
          <p className="font-medium truncate flex items-center gap-2">{item.name} {!item.active && <StatusBadge tone="neutral">Inativo</StatusBadge>} {item.low && <StatusBadge tone="danger">Abaixo do mínimo</StatusBadge>}</p>
          <p className="text-xs text-muted-foreground truncate">{[item.category ?? "Sem categoria", TRACKING_LABEL[item.tracking], item.isPpe && "EPI", item.requiresInspection && "inspeção", item.requiresCalibration && "calibração", item.rentable && "alugável"].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { id: "inStock", header: "Em estoque", align: "right", className: "w-28 whitespace-nowrap tabular-nums", cell: (item) => `${qty(item.inStock)} ${item.unit}` },
    { id: "available", header: "Disponível", align: "right", className: "w-28 whitespace-nowrap tabular-nums", cell: (item) => `${qty(item.available)} ${item.unit}` },
    { id: "out", header: "Fora", align: "right", className: "w-20 tabular-nums text-muted-foreground", cell: (item) => (item.out ? qty(item.out) : "—") },
    { id: "min", header: "Mínimo", align: "right", className: "w-20 tabular-nums text-muted-foreground", cell: (item) => (item.minQuantity !== null ? qty(item.minQuantity) : "—") },
    ...(seesCost ? [{ id: "cost", header: "Custo médio", align: "right" as const, className: "w-28 tabular-nums", cell: (item: StockItem) => (item.averageCost !== null ? money(item.averageCost) : "—") }] : []),
  ];
  const clearFilters = () => { setSearch(""); setCategoryId(""); setTracking(""); setFlag(""); setLow(false); setStatus("ativos"); setPage(0); };

  return (
    <>
      <PageHeader title="Itens do estoque" description="Materiais, consumíveis, EPIs e equipamentos: quanto tem, onde e o que precisa repor." />

      <ListCard>
        <ListToolbar search={{ value: search, onChange: (text) => reset(setSearch)(text), placeholder: "Buscar por nome, código ou fabricante..." }}>
          <Button asChild variant="outline"><Link to="/suprimentos/estoque/saldos"><Icon name="boxes" className="w-4 h-4" /> <span className="hidden sm:inline">Ver por local</span></Link></Button>
          <ImportCsvButton label="Importar planilha" showTemplate={false} />
          {canCreate && <Button onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo item</span></Button>}
        </ListToolbar>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56"><Select name="categoryId" searchable options={toOptions(options?.categories)} state={categoryId} clearable modal={false} placeholder="Todas as categorias" onChange={(_, value) => reset(setCategoryId)(String(value ?? ""))} /></div>
          <div className="w-full sm:w-48"><Select name="tracking" options={TRACKING_OPTIONS} state={tracking} clearable modal={false} placeholder="Qualquer forma de contar" onChange={(_, value) => reset(setTracking)(String(value ?? ""))} /></div>
          <div className="w-full sm:w-44"><Select name="flag" options={FLAG_OPTIONS} state={flag} clearable modal={false} placeholder="Qualquer exigência" onChange={(_, value) => reset(setFlag)(String(value ?? ""))} /></div>
          <div className="w-full sm:w-36"><Select name="status" options={STATUS_OPTIONS} state={status} modal={false} onChange={(_, value) => reset(setStatus)(String(value || "ativos"))} /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="low" checked={low} onCheckedChange={(checked) => reset(setLow)(checked === true)} />
            <Label htmlFor="low">Só abaixo do mínimo{data ? ` (${data.lowCount})` : ""}</Label>
          </div>
          {seesCost && <p className="sm:ml-auto text-sm text-muted-foreground">Valor da lista: <span className="font-semibold text-foreground tabular-nums">{money(data?.value)}</span></p>}
        </div>

        <DataTable rows={data?.rows} columns={columns} getRowId={(item) => item.id} ariaLabel="Itens do estoque"
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={(item) => open(item.id)} rowClassName={(item) => (item.active ? undefined : "opacity-60")}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhum item com esses filtros." action={<Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum item cadastrado ainda." description="Cadastre um a um ou traga tudo de uma vez por planilha (nome, quantidade e local já bastam)."
              action={<div className="flex flex-wrap items-center justify-center gap-2">
                {canCreate && <Button size="sm" onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4" /> Cadastrar item</Button>}
                <ImportCsvButton label="Importar planilha" />
              </div>} />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(0); }} />
      </ListCard>
    </>
  );
}
