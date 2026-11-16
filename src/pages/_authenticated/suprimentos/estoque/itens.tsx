import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { FLAG_OPTIONS, ItemList, Pill, STOCK_ABILITY, STOCK_KEYS, TRACKING_LABEL, TRACKING_OPTIONS, qty, stockApi, toOptions, useStockOptions } from "../-shared/stock";

interface ItemsSearch { low?: "1"; flag?: string; categoryId?: number }
export const Route = createFileRoute("/_authenticated/suprimentos/estoque/itens")({
  component: ItemsPage,
  validateSearch: (search: Record<string, unknown>): ItemsSearch => ({
    ...(search.low === "1" || search.low === 1 ? { low: "1" as const } : {}),
    ...(typeof search.flag === "string" && search.flag ? { flag: search.flag } : {}),
    ...(Number(search.categoryId) > 0 ? { categoryId: Number(search.categoryId) } : {}),
  }),
});

const LIMIT = 30;
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
  const { data: options } = useStockOptions();

  const params = {
    page, limit: LIMIT, status,
    ...(search.trim() ? { search: search.trim() } : {}), ...(categoryId ? { categoryId } : {}), ...(tracking ? { tracking } : {}),
    ...(flag ? { flag } : {}), ...(low ? { low: "1" } : {}),
  };
  const { data, isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.items, params],
    queryFn: () => stockApi.get<ItemList>("items", params),
    placeholderData: (previous) => previous,
  });
  const open = (id: number | "novo") => navigate({ to: "/suprimentos/estoque/itens/$itemId", params: { itemId: String(id) } });
  const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const seesCost = data?.value !== null && data?.value !== undefined;
  const filtered = !!(search || categoryId || tracking || flag || low || status !== "ativos");

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Itens do estoque</h1>
          <p className="text-sm text-muted-foreground">Materiais, consumíveis, EPIs e equipamentos: quanto tem, onde e o que precisa repor.</p>
        </div>
        {can(`create_${STOCK_ABILITY}`) && <Button onClick={() => open("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo item</Button>}
      </div>

      <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-72"><Input name="search" value={search} onValueChange={(_, value) => reset(setSearch)(String(value))} placeholder="Buscar por nome, código ou fabricante..." icon="search" /></div>
        <div className="w-full xl:w-56"><Select name="categoryId" options={toOptions(options?.categories)} state={categoryId} clearable modal={false} placeholder="Todas as categorias" onChange={(_, value) => reset(setCategoryId)(String(value ?? ""))} /></div>
        <div className="w-full xl:w-44"><Select name="tracking" options={TRACKING_OPTIONS} state={tracking} clearable modal={false} placeholder="Qualquer controle" onChange={(_, value) => reset(setTracking)(String(value ?? ""))} /></div>
        <div className="w-full xl:w-44"><Select name="flag" options={FLAG_OPTIONS} state={flag} clearable modal={false} placeholder="Qualquer marca" onChange={(_, value) => reset(setFlag)(String(value ?? ""))} /></div>
        <div className="w-full xl:w-36"><Select name="status" options={STATUS_OPTIONS} state={status} modal={false} onChange={(_, value) => reset(setStatus)(String(value || "ativos"))} /></div>
        <div className="flex items-center gap-2">
          <Checkbox id="low" checked={low} onCheckedChange={(checked) => reset(setLow)(checked === true)} />
          <Label htmlFor="low">Só abaixo do mínimo{data ? ` (${data.lowCount})` : ""}</Label>
        </div>
        {seesCost && <p className="xl:ml-auto text-sm text-muted-foreground">Valor da lista: <span className="font-semibold text-foreground tabular-nums">{money(data?.value)}</span></p>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="w-32">Código</div>
            <div className="flex-1">Item</div>
            <div className="w-32 text-right">Em estoque</div>
            <div className="w-32 text-right">Disponível</div>
            <div className="w-28 text-right">Fora</div>
            <div className="w-24 text-right">Mínimo</div>
            {seesCost && <div className="w-32 text-right">Custo médio</div>}
          </div>
          {isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">{filtered ? "Nenhum item com esses filtros." : "Nenhum item cadastrado ainda. Cadastre um a um ou use a carga por planilha em Movimentações."}</p>}
          {data?.rows.map((item) => (
            <button key={item.id} type="button" onClick={() => open(item.id)} className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
              <div className="lg:w-32 font-semibold tabular-nums">{item.code}</div>
              <div className="flex-1 min-w-0 lg:pr-4">
                <p className="font-medium truncate flex items-center gap-2">{item.name} {!item.active && <Pill>Inativo</Pill>} {item.low && <Pill tone="red">Abaixo do mínimo</Pill>}</p>
                <p className="text-xs text-muted-foreground truncate">{[item.category ?? "Sem categoria", TRACKING_LABEL[item.tracking], item.isPpe && "EPI", item.requiresInspection && "inspeção", item.requiresCalibration && "calibração", item.rentable && "alugável"].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="lg:w-32 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Em estoque: </span>{qty(item.inStock)} {item.unit}</div>
              <div className="lg:w-32 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Disponível: </span>{qty(item.available)} {item.unit}</div>
              <div className="lg:w-28 lg:text-right tabular-nums text-muted-foreground"><span className="lg:hidden text-xs">Fora: </span>{item.out ? qty(item.out) : "—"}</div>
              <div className="lg:w-24 lg:text-right tabular-nums text-muted-foreground"><span className="lg:hidden text-xs">Mínimo: </span>{item.minQuantity !== null ? qty(item.minQuantity) : "—"}</div>
              {seesCost && <div className="lg:w-32 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Custo médio: </span>{item.averageCost !== null ? money(item.averageCost) : "—"}</div>}
            </button>
          ))}
        </div>
      )}
      {data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
    </>
  );
}
