import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListFooter from "@/components/general-components/ListFooter";
import StatusChips from "@/components/general-components/StatusChips";
import { EmptyState } from "@/components/general-components/DataTable";
import Select from "@/components/general-components/Select";
import { COMMERCIAL_ABILITY, commercialApi, errorMessage } from "../-shared/commercial";
import { ACTIVITIES_KEY, ACTIVITY_PERMISSION, ActivityItem, ActivityList, useActivityDialogs, useActivityUsers } from "../-shared/activities";
import { ProposalPanelSheet } from "../-shared/proposal-panel";

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
const LIMITS = [10, 30, 50, 100];

/** Agenda do Comercial: tudo o que está marcado com os clientes, de todas as propostas. */
function FollowUpPage() {
  const { can } = useVerify();
  const users = useActivityUsers();
  const [filter, setFilter] = useState<Filter | null>(null);
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(30);
  const { dialogs, edit, complete } = useActivityDialogs({});
  const [panel, setPanel] = useState<number | null>(null);

  // sem escolha, abre no que mais importa: atrasadas, senão hoje, senão próximas
  const { data: counts } = useQuery({
    queryKey: [ACTIVITIES_KEY, "summary", userId],
    queryFn: () => commercialApi.get<ActivityList>("activities", { limit: 1, ...(userId ? { userId } : {}) }),
  });
  const summary = counts?.summary;
  const active: Filter = filter ?? (summary ? (summary.overdue ? "atrasadas" : summary.today ? "hoje" : "proximas") : "hoje");
  const params = { status: active, page, limit, ...(userId ? { userId } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [ACTIVITIES_KEY, params], enabled: Boolean(summary),
    queryFn: () => commercialApi.get<ActivityList>("activities", params),
    placeholderData: (previous) => previous,
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canEdit = can(ACTIVITY_PERMISSION);
  return (
    <>
      <PageHeader title="Acompanhamento" description="Retornos, reuniões e tarefas marcados com os clientes. Para registrar um contato ou agendar, abra a proposta." />

      <ListCard>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <StatusChips<Filter> value={active} onChange={(value) => { setFilter(value); setPage(0); }} ariaLabel="Quando" className="lg:flex-1"
            options={FILTERS.map((item) => ({
              value: item.id, label: item.name, count: summary?.[item.key] ?? 0,
              // atrasadas ganham o quadradinho vermelho quando há alguma
              ...(item.id === "atrasadas" && (summary?.overdue ?? 0) > 0 ? { color: "#ef4444" } : {}),
            }))} />
          <div className="w-full lg:w-64">
            <Select name="userId" state={userId} clearable placeholder="Todos os responsáveis" modal={false}
              options={users.map((user) => ({ id: String(user.id), name: user.name }))}
              onChange={(_, value) => { setUserId(String(value ?? "")); setPage(0); }} />
          </div>
        </div>

        <div>
          {(isLoading || !summary) && <Skeleton className="h-16 w-full my-3" />}
          {error && (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-destructive">Não foi possível carregar: {errorMessage(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}><Icon name="rotate-cw" className="w-3.5 h-3.5" /> Tentar de novo</Button>
            </div>
          )}
          {data && !data.rows.length && !error && <EmptyState icon="calendar-check" title={FILTERS.find((item) => item.id === active)?.empty ?? "Nada por aqui."} />}
          {data && data.rows.length > 0 && (
            <ul>{data.rows.map((activity) => <ActivityItem key={activity.id} activity={activity} canEdit={canEdit} showContext onComplete={complete} onEdit={edit} onOpenProposal={setPanel} />)}</ul>
          )}
        </div>

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS}
          onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(0); }} />
      </ListCard>
      {dialogs}
      <ProposalPanelSheet proposalId={panel} onClose={() => setPanel(null)} />
    </>
  );
}
