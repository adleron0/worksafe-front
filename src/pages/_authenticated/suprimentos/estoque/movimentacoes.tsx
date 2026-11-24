import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import Select from "@/components/general-components/Select";
import { dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { MANUAL_TYPES, ManualType, MovementRow, STOCK_ABILITY, STOCK_KEYS, stockApi, useStockOptions } from "../-shared/stock";
import { ImportCsvButton, MovementDetailDialog, NewMovementDialog } from "../-shared/stock-movements";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/movimentacoes")({
  component: MovementsPage,
});

const LIMITS = [10, 30, 50, 100];

/** Todas as movimentações do estoque, os lançamentos à mão e a carga inicial por planilha. */
function MovementsPage() {
  const { can } = useVerify();
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(30);
  const [creating, setCreating] = useState<ManualType | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const { data: options } = useStockOptions();

  const params = { page, limit, ...(type ? { type } : {}), ...(search.trim() ? { search: search.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [STOCK_KEYS.movements, params],
    queryFn: () => stockApi.get<{ rows: MovementRow[]; total: number }>("movements", params),
    placeholderData: (previous) => previous,
  });
  const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const manual = MANUAL_TYPES.filter((option) => option.permissions.some((permission) => can(permission)));
  const seesCost = !!data?.rows.some((row) => row.total !== null);

  const filtered = !!(type || search || from || to);
  const columns: DataColumn<MovementRow>[] = [
    { id: "date", header: "Data", className: "w-24 tabular-nums", cell: (row) => dateBr(row.date) },
    { id: "number", header: "Número", className: "w-28 tabular-nums font-semibold", cell: (row) => row.number },
    { id: "type", header: "Tipo", className: "whitespace-nowrap", cell: (row) => <span className="inline-flex items-center gap-1.5">{row.typeLabel} {row.reversed && <StatusBadge tone="danger">Estornada</StatusBadge>}</span> },
    {
      id: "summary", header: "Itens", cell: (row) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate">{row.summary}</p>
          {(row.user || row.note) && <p className="text-xs text-muted-foreground truncate">{[row.user, row.note].filter(Boolean).join(" · ")}</p>}
        </div>
      ),
    },
    { id: "route", header: "De → para", cell: (row) => <span className="text-xs text-muted-foreground truncate block max-w-xs">{row.from ?? "fora"} → {row.to ?? "fora"}</span> },
    ...(seesCost ? [{ id: "total", header: "Custo", align: "right" as const, className: "w-28 tabular-nums", cell: (row: MovementRow) => (row.total !== null ? money(row.total) : "—") }] : []),
  ];

  return (
    <>
      <PageHeader title="Movimentações" description="Tudo o que entrou, saiu ou mudou de lugar. Clique numa linha para ver os itens e estornar." />

      <ListCard>
        <ListToolbar search={{ value: search, onChange: (text) => reset(setSearch)(text), placeholder: "Buscar por número, item ou observação..." }}>
          <ImportCsvButton />
          {manual.length > 0 && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><Button type="button" className="gap-1"><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo lançamento</span> <Icon name="chevron-down" className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {manual.map((option) => (
                  <DropdownMenuItem key={option.id} className="gap-2" onSelect={() => setCreating(option.id)}><Icon name={option.icon} className="w-3 h-3" /> {option.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </ListToolbar>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56"><Select name="type" options={options?.movementTypes ?? []} state={type} clearable modal={false} placeholder="Todos os tipos" onChange={(_, value) => reset(setType)(String(value ?? ""))} /></div>
          <div className="w-full sm:w-44"><CalendarPicker mode="single" name="from" className="w-full" value={from} placeholder="De" fromYear={2020} toYear={2040} onValueChange={(_, value) => reset(setFrom)(String(value ?? ""))} /></div>
          <div className="w-full sm:w-44"><CalendarPicker mode="single" name="to" className="w-full" value={to} placeholder="Até" fromYear={2020} toYear={2040} onValueChange={(_, value) => reset(setTo)(String(value ?? ""))} /></div>
          {(from || to) && <Button type="button" variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setPage(0); }}>Limpar período</Button>}
        </div>

        <DataTable rows={data?.rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Movimentações"
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={(row) => setOpened(row.id)}
          empty={filtered ? <EmptyState icon="search-x" title="Nenhuma movimentação com esses filtros." /> : <EmptyState title="Nenhuma movimentação ainda." />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(0); }} />
      </ListCard>

      {creating && <NewMovementDialog initialType={creating} onClose={() => setCreating(null)} onDone={(movement) => setOpened(movement.id)} />}
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </>
  );
}
