import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination from "@/components/general-components/Pagination";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, commercialApi, errorMessage } from "../-shared/commercial";
import { ACTIVITIES_KEY, ActivityItem, ActivityList, useActivityDialogs, useActivityUsers } from "../-shared/activities";

export const Route = createFileRoute("/_authenticated/comercial/_acompanhamento/acompanhamento")({
  component: FollowUpPage,
});

type Filter = "atrasadas" | "hoje" | "proximas" | "feitas";
const FILTERS: Array<{ id: Filter; name: string; key: "overdue" | "today" | "upcoming" | "done"; empty: string }> = [
  { id: "atrasadas", name: "Atrasadas", key: "overdue", empty: "Nada atrasado." },
  { id: "hoje", name: "Para hoje", key: "today", empty: "Nada marcado para hoje." },
  { id: "proximas", name: "Próximas", key: "upcoming", empty: "Nada marcado para os próximos dias." },
  { id: "feitas", name: "Já feitas", key: "done", empty: "Nenhum contato registrado ainda." },
];
const LIMIT = 30;

/** Agenda do Comercial: tudo o que está marcado com os clientes, de todas as propostas. */
function FollowUpPage() {
  const { can } = useVerify();
  const users = useActivityUsers();
  const [filter, setFilter] = useState<Filter | null>(null);
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(0);
  const { dialogs, edit, complete } = useActivityDialogs({});

  // sem escolha, abre no que mais importa: atrasadas, senão hoje, senão próximas
  const { data: counts } = useQuery({
    queryKey: [ACTIVITIES_KEY, "summary", userId],
    queryFn: () => commercialApi.get<ActivityList>("activities", { limit: 1, ...(userId ? { userId } : {}) }),
  });
  const summary = counts?.summary;
  const active: Filter = filter ?? (summary ? (summary.overdue ? "atrasadas" : summary.today ? "hoje" : "proximas") : "hoje");
  const params = { status: active, page, limit: LIMIT, ...(userId ? { userId } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [ACTIVITIES_KEY, params], enabled: Boolean(summary),
    queryFn: () => commercialApi.get<ActivityList>("activities", params),
    placeholderData: (previous) => previous,
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canEdit = can(`update_${COMMERCIAL_ABILITY}`);
  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Acompanhamento</h1>
        <p className="text-sm text-muted-foreground">Retornos, reuniões e tarefas marcados com os clientes. Para registrar um contato ou agendar, abra a proposta.</p>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 my-4 p-4 rounded-lg border">
        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg w-fit">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" onClick={() => { setFilter(item.id); setPage(0); }}
              className={cn("rounded-md px-3 h-8 text-sm font-medium", active === item.id ? "bg-primary text-inverse-foreground" : "hover:bg-background")}>
              {item.name}
              <span className={cn("ml-1.5 tabular-nums", active !== item.id && item.id === "atrasadas" && (summary?.overdue ?? 0) > 0 ? "text-red-600 dark:text-red-400 font-semibold" : "opacity-70")}>
                {summary?.[item.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="w-full xl:w-64">
          <Select name="userId" state={userId} clearable placeholder="Todos os responsáveis" modal={false}
            options={users.map((user) => ({ id: String(user.id), name: user.name }))}
            onChange={(_, value) => { setUserId(String(value ?? "")); setPage(0); }} />
        </div>
      </div>

      <div className="rounded-lg border px-4">
        {(isLoading || !summary) && <Skeleton className="h-16 w-full my-3" />}
        {error && <p className="py-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
        {data && !data.rows.length && <p className="py-6 text-sm text-muted-foreground">{FILTERS.find((item) => item.id === active)?.empty}</p>}
        {data && data.rows.length > 0 && (
          <ul>{data.rows.map((activity) => <ActivityItem key={activity.id} activity={activity} canEdit={canEdit} showContext onComplete={complete} onEdit={edit} />)}</ul>
        )}
      </div>
      {data && data.total > LIMIT && (
        <div className="mt-4"><Pagination totalItems={data.total} itemsPerPage={LIMIT} currentPage={page} onPageChange={setPage} maxVisiblePages={5} /></div>
      )}
      {dialogs}
    </>
  );
}
