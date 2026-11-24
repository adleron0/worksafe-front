import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { aiApi } from "../-shared/bots";
import { AGENDA_KEY, AgendaOptions } from "./-components/agenda";
import TaskForm from "./-components/TaskForm";

export const Route = createFileRoute("/_authenticated/bots/_bots/agenda_/$scheduleId")({
  component: EditTask,
});

/** Edição de uma tarefa da agenda, em tela cheia (a tarefa vem da mesma lista da agenda). */
function EditTask() {
  const { can } = useVerify();
  const { scheduleId } = Route.useParams();
  const back = useBackToList("/bots/agenda");
  const { data, isLoading, isError } = useQuery({
    queryKey: [AGENDA_KEY, "edit", scheduleId],
    enabled: can("usar_bots"),
    queryFn: () => aiApi.get<AgendaOptions>("schedules"),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  const schedule = data?.schedules.find((row) => String(row.id) === scheduleId);
  if (!can("usar_bots") || !can("agendar_bots")) return null;
  return (
    <>
      <FormPageHeader backTo="/bots/agenda" backLabel="Agenda da equipe" title={schedule ? schedule.name || "Tarefa" : "Tarefa"}
        description="Ao salvar, você passa a ser o dono: a tarefa roda com as suas permissões."
        badge={schedule && !schedule.active ? <StatusBadge tone="neutral">Pausada</StatusBadge> : undefined} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data || !schedule ? <EmptyState icon="search-x" title="Tarefa não encontrada." />
          : <TaskForm key={schedule.id} options={data} schedule={schedule} close={back} />}
    </>
  );
}
