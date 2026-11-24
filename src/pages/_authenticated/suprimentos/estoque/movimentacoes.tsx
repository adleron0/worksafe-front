import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { MANUAL_TYPES, ManualType, MovementRow, Pill, STOCK_ABILITY, STOCK_KEYS, stockApi, useStockOptions } from "../-shared/stock";
import { ImportCsvButton, MovementDetailDialog, NewMovementDialog } from "../-shared/stock-movements";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/movimentacoes")({
  component: MovementsPage,
});

const LIMIT = 30;

/** Todas as movimentações do estoque, os lançamentos à mão e a carga inicial por planilha. */
function MovementsPage() {
  const { can } = useVerify();
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState<ManualType | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const { data: options } = useStockOptions();

  const params = { page, limit: LIMIT, ...(type ? { type } : {}), ...(search.trim() ? { search: search.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.movements, params],
    queryFn: () => stockApi.get<{ rows: MovementRow[]; total: number }>("movements", params),
    placeholderData: (previous) => previous,
  });
  const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(0); };

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const manual = MANUAL_TYPES.filter((option) => option.permissions.some((permission) => can(permission)));
  const seesCost = !!data?.rows.some((row) => row.total !== null);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Movimentações</h1>
          <p className="text-sm text-muted-foreground">Tudo o que entrou, saiu ou mudou de lugar. Clique numa linha para ver os itens e estornar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportCsvButton />
          {manual.length > 0 && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><Button type="button" className="gap-1"><Icon name="plus" className="w-4 h-4" /> Novo lançamento <Icon name="chevron-down" className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {manual.map((option) => (
                  <DropdownMenuItem key={option.id} className="gap-2" onSelect={() => setCreating(option.id)}><Icon name={option.icon} className="w-3 h-3" /> {option.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center gap-3 my-4 p-4 rounded-card border bg-card">
        <div className="w-full xl:w-56"><Select name="type" options={options?.movementTypes ?? []} state={type} clearable modal={false} placeholder="Todos os tipos" onChange={(_, value) => reset(setType)(String(value ?? ""))} /></div>
        <div className="w-full xl:w-72"><Input name="search" value={search} onValueChange={(_, value) => reset(setSearch)(String(value))} placeholder="Buscar por número, item ou observação..." icon="search" /></div>
        <div className="w-full xl:w-44"><CalendarPicker mode="single" name="from" className="w-full" value={from} placeholder="De" fromYear={2020} toYear={2040} onValueChange={(_, value) => reset(setFrom)(String(value ?? ""))} /></div>
        <div className="w-full xl:w-44"><CalendarPicker mode="single" name="to" className="w-full" value={to} placeholder="Até" fromYear={2020} toYear={2040} onValueChange={(_, value) => reset(setTo)(String(value ?? ""))} /></div>
        {(from || to) && <Button type="button" variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setPage(0); }}>Limpar período</Button>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-card border bg-card overflow-x-auto">
          <div className="flex min-w-[880px] items-center py-2.5 border-b px-4 font-semibold text-[12.5px] text-muted-foreground">
            <div className="w-28">Data</div>
            <div className="w-32">Número</div>
            <div className="w-48">Tipo</div>
            <div className="flex-1">Itens</div>
            <div className="w-64">De → para</div>
            {seesCost && <div className="w-28 text-right">Custo</div>}
          </div>
          {isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">{type || search || from || to ? "Nenhuma movimentação com esses filtros." : "Nenhuma movimentação ainda."}</p>}
          {data?.rows.map((row) => (
            <button key={row.id} type="button" onClick={() => setOpened(row.id)} className="min-w-[880px] w-full text-left flex flex-row items-center gap-0 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm hover:bg-muted/40">
              <div className="w-28 tabular-nums">{dateBr(row.date)}</div>
              <div className="w-32 tabular-nums font-semibold">{row.number}</div>
              <div className="w-48 flex flex-wrap items-center gap-1">{row.typeLabel} {row.reversed && <Pill tone="red">Estornada</Pill>}</div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="truncate">{row.summary}</p>
                <p className="text-xs text-muted-foreground truncate">{[row.user, row.note].filter(Boolean).join(" · ") || " "}</p>
              </div>
              <div className="w-64 text-xs text-muted-foreground truncate">{row.from ?? "fora"} → {row.to ?? "fora"}</div>
              {seesCost && <div className="w-28 text-right tabular-nums">{row.total !== null ? money(row.total) : "—"}</div>}
            </button>
          ))}
        </div>
      )}
      {data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}

      {creating && <NewMovementDialog initialType={creating} onClose={() => setCreating(null)} onDone={(movement) => setOpened(movement.id)} />}
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </>
  );
}
