import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import { aiApi } from "../-shared/bots";
import { AGENDA_KEY, AgendaOptions } from "./-components/agenda";
import TaskForm from "./-components/TaskForm";

export const Route = createFileRoute("/_authenticated/bots/_bots/agenda_/nova")({
  component: NewTask,
});

/** Nova tarefa na agenda da equipe. */
function NewTask() {
  const { can } = useVerify();
  const back = useBackToList("/bots/agenda");
  const { data } = useQuery({ queryKey: [AGENDA_KEY], enabled: can("usar_bots"), queryFn: () => aiApi.get<AgendaOptions>("schedules") });
  if (!can("usar_bots") || !can("agendar_bots")) return null;
  return (
    <>
      <FormPageHeader backTo="/bots/agenda" backLabel="Agenda da equipe" title="Nova tarefa"
        description="O que um assistente faz sozinho: no horário marcado ou quando algo acontece no sistema." />
      {!data ? <FormPageSkeleton /> : <TaskForm options={data} schedule={null} close={back} />}
    </>
  );
}
