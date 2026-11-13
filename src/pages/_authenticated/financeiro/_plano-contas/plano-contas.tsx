import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { ApiError } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { CHART_KEY, ChartAccount, FINANCIAL_ABILITY, financialApi, formatMoney, useChartAccounts } from "../-shared/financial";
import { AccountFormDialog, MoveAccountDialog } from "./-AccountDialogs";
import ClassificationCard from "./-ClassificationCard";

export const Route = createFileRoute("/_authenticated/financeiro/_plano-contas/plano-contas")({
  component: ChartOfAccounts,
});

type NatureFilter = "todas" | "receita" | "despesa";
const COLLAPSED_KEY = "financeiro.planoContas.recolhidas";
const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const loadCollapsed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || "[]"); } catch { return []; }
};

function ChartOfAccounts() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<string | null>(currentMonth());
  const [showInactive, setShowInactive] = useState(false);
  const [nature, setNature] = useState<NatureFilter>("todas");
  const [search, setSearch] = useState("");
  // guardado por código: sobrevive a recarregar a página
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(loadCollapsed()));
  const [form, setForm] = useState<{ account?: ChartAccount; parentId?: number } | null>(null);
  const [moving, setMoving] = useState<ChartAccount | null>(null);

  const { data, isLoading, isError, error } = useChartAccounts({ month, inactive: showInactive });
  const accounts = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed])); } catch { /* sem armazenamento: só não lembra */ }
  }, [collapsed]);

  const { mutate: setStatus } = useMutation({
    mutationFn: ({ account, action }: { account: ChartAccount; action: "inactive" | "active" }) =>
      financialApi.patch(`chart-accounts/${action}/${account.id}`),
    onSuccess: (_, { action }) => {
      toast({ title: action === "active" ? "Conta reativada!" : "Conta inativada!", variant: "success" });
      queryClient.invalidateQueries({ queryKey: [CHART_KEY] });
    },
    onError: (err: ApiError) => toast({
      title: "Não foi possível concluir", description: (err as ApiError).response?.data?.message || "Erro desconhecido.", variant: "destructive",
    }),
  });

  const term = normalize(search.trim());
  const rows = useMemo(() => {
    const pool = accounts.filter((a) => nature === "todas" || a.nature === nature);
    if (term) {
      // busca: mostra quem bateu e todas as mães, ignorando o que está recolhido
      const keep = new Set<string>();
      for (const account of pool) {
        if (!normalize(account.name).includes(term) && !account.code.startsWith(term)) continue;
        const parts = account.code.split(".");
        for (let i = 1; i <= parts.length; i++) keep.add(parts.slice(0, i).join("."));
      }
      return pool.filter((a) => keep.has(a.code));
    }
    return pool.filter((a) => {
      const parts = a.code.split(".");
      for (let i = 1; i < parts.length; i++) if (collapsed.has(parts.slice(0, i).join("."))) return false;
      return true;
    });
  }, [accounts, nature, term, collapsed]);

  const toggle = (code: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const parentsWithChildren = accounts.filter((a) => a.children > 0).map((a) => a.code);
  const allCollapsed = parentsWithChildren.length > 0 && parentsWithChildren.every((code) => collapsed.has(code));

  if (!can(`view_${FINANCIAL_ABILITY}`)) return null;
  const canCreate = can(`create_${FINANCIAL_ABILITY}`);
  const canUpdate = can(`update_${FINANCIAL_ABILITY}`);

  const highlight = (text: string) => {
    if (!term) return text;
    const index = normalize(text).indexOf(term);
    if (index < 0) return text;
    return <>{text.slice(0, index)}<mark className="bg-yellow-200 dark:bg-yellow-700 rounded-sm">{text.slice(index, index + term.length)}</mark>{text.slice(index + term.length)}</>;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Plano de Contas</h1>
          <p className="text-sm text-muted-foreground">Contas mãe e filhas que classificam receitas e despesas. Lançamentos entram sempre na conta filha.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setForm({})} className="shrink-0">
            <Icon name="plus" className="w-4 h-4 mr-1" /> Nova conta
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex rounded-md border overflow-hidden w-fit" role="tablist" aria-label="Natureza">
          {([["todas", "Todas"], ["receita", "Receitas"], ["despesa", "Despesas"]] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={nature === value} onClick={() => setNature(value)}
              className={cn("px-3 py-1.5 text-sm", nature === value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
              {label}
            </button>
          ))}
        </div>
        <div className="w-full lg:w-64">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))}
            placeholder="Buscar por nome ou código..." icon="search" />
        </div>
        <div className="flex items-center gap-2">
          <CalendarPicker mode="month" name="month" value={month} onValueChange={(_, value) => setMonth(value)}
            placeholder="Todos os meses" fromYear={2020} toYear={2035} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Mostrar inativas
        </label>
        <Button type="button" variant="ghost" size="sm" className="lg:ml-auto w-fit" disabled={Boolean(term)}
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(parentsWithChildren))}>
          <Icon name={allCollapsed ? "chevrons-up-down" : "chevrons-down-up"} className="w-4 h-4 mr-1" />
          {allCollapsed ? "Expandir tudo" : "Recolher tudo"}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden" role="treegrid" aria-label="Plano de contas">
        <div className="hidden md:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground" role="row">
          <div className="flex-1">Conta</div>
          <div className="w-28 text-right">Lançamentos</div>
          <div className="w-40 text-right">{month ? "Valor no mês" : "Valor total"}</div>
          <div className="w-24 text-right">Ações</div>
        </div>

        {isLoading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full my-1" />)}
        {isError && <p className="p-4 text-destructive font-medium">Erro: {(error as ApiError)?.response?.data?.message || "não foi possível carregar o plano de contas"}</p>}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">{term ? "Nenhuma conta encontrada para a busca." : "Nenhuma conta para mostrar."}</p>
        )}

        {rows.map((account) => {
          const isParent = account.children > 0;
          const isCollapsed = collapsed.has(account.code) && !term;
          const inactive = Boolean(account.inactiveAt);
          return (
            <div key={account.id} role="row" aria-level={account.level} aria-expanded={isParent ? !isCollapsed : undefined}
              className={cn(
                "group flex flex-col md:flex-row md:items-center gap-1 md:gap-0 px-4 py-2 border-b last:border-b-0 border-l-4 text-sm",
                account.nature === "receita" ? "border-l-emerald-500" : "border-l-rose-500",
                account.level === 1 && "bg-muted/60",
                inactive && "opacity-60",
              )}>
              <div className="flex-1 flex items-center min-w-0" style={{ paddingLeft: `${(account.level - 1) * 1.5}rem` }}>
                {isParent ? (
                  <button type="button" onClick={() => toggle(account.code)} disabled={Boolean(term)}
                    aria-label={isCollapsed ? `Expandir ${account.name}` : `Recolher ${account.name}`}
                    className="w-6 h-6 shrink-0 flex items-center justify-center rounded hover:bg-muted">
                    <Icon name={isCollapsed ? "chevron-right" : "chevron-down"} className="w-4 h-4" />
                  </button>
                ) : <span className="w-6 shrink-0" />}
                <span className="tabular-nums text-xs text-muted-foreground mr-2 shrink-0">{account.code}</span>
                <span className={cn("truncate", account.level < 3 && (isParent || account.level === 1) ? "font-semibold" : "")}>{highlight(account.name)}</span>
                {inactive && <span className="ml-2 text-xs rounded bg-muted px-1.5 py-0.5 shrink-0">Inativa</span>}
                {isParent && isCollapsed && <span className="ml-2 text-xs text-muted-foreground shrink-0">{account.children} conta(s)</span>}
              </div>
              {/* no celular: lançamentos, valor e ações numa linha só; no desktop viram colunas */}
              <div className="flex items-center gap-3 pl-8 md:pl-0 md:contents">
                <div className="md:w-28 md:text-right tabular-nums text-muted-foreground">
                  {account.entries > 0 ? <><span className="md:hidden text-xs">{account.entries} lanç. · </span><span className="hidden md:inline">{account.entries}</span></> : <span className="hidden md:inline">—</span>}
                </div>
                <div className={cn("md:w-40 md:text-right tabular-nums", isParent || account.level === 1 ? "font-semibold" : "")}>
                  {account.entries > 0 ? formatMoney(account.total) : <span className="hidden md:inline">—</span>}
                </div>
                <div className="md:w-24 flex md:justify-end items-center gap-1 ml-auto md:ml-0">
                  {canCreate && account.level < 3 && !inactive && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title={`Nova conta em ${account.name}`}
                      aria-label={`Nova conta em ${account.name}`} onClick={() => setForm({ parentId: account.id })}>
                      <Icon name="plus" className="w-4 h-4" />
                    </Button>
                  )}
                  {!account.isSystem && (canUpdate || can(`inactive_${FINANCIAL_ABILITY}`) || can(`activate_${FINANCIAL_ABILITY}`)) && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Ações de ${account.name}`}>
                          <Icon name="ellipsis-vertical" className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && !inactive && (
                          <DropdownMenuItem className="gap-2" onSelect={() => setForm({ account })}>
                            <Icon name="pencil" className="w-3 h-3" /> Renomear
                          </DropdownMenuItem>
                        )}
                        {canUpdate && !inactive && (
                          <DropdownMenuItem className="gap-2" onSelect={() => setMoving(account)}>
                            <Icon name="corner-down-right" className="w-3 h-3" /> Mover para outra conta mãe
                          </DropdownMenuItem>
                        )}
                        {!inactive && can(`inactive_${FINANCIAL_ABILITY}`) && (
                          <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                            <ConfirmDialog
                              title={`Inativar ${account.code} ${account.name}?`}
                              description="A conta deixa de aparecer para novos lançamentos. Os lançamentos já feitos continuam classificados nela."
                              onConfirm={() => setStatus({ account, action: "inactive" })}
                              titleBttn="Inativar" iconBttn="power-off"
                            />
                          </DropdownMenuItem>
                        )}
                        {inactive && can(`activate_${FINANCIAL_ABILITY}`) && (
                          <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                            <ConfirmDialog
                              title={`Reativar ${account.code} ${account.name}?`}
                              description="A conta volta a aparecer para novos lançamentos."
                              onConfirm={() => setStatus({ account, action: "active" })}
                              titleBttn="Reativar" iconBttn="power"
                            />
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ClassificationCard accounts={accounts} />

      {form && (
        <AccountFormDialog key={`${form.account?.id ?? "new"}-${form.parentId ?? 0}`} accounts={accounts} open
          onOpenChange={(open) => { if (!open) setForm(null); }} account={form.account} parentId={form.parentId} />
      )}
      {moving && (
        <MoveAccountDialog key={moving.id} accounts={accounts} account={moving} open onOpenChange={(open) => { if (!open) setMoving(null); }} />
      )}
    </>
  );
}
