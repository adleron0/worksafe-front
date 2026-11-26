import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import Icon from "@/components/general-components/Icon";
import SubscriptionForm from "./-components/SubscriptionForm";
import { SUBSCRIPTION_ENTITY } from "./-entity";

export const Route = createFileRoute("/_authenticated/treinamentos/_inscricoes/inscricoes_/nova")({
  component: NewSubscription,
  validateSearch: (search: Record<string, unknown>): { turma?: string; nome?: string; telefone?: string; conversa?: number } => ({
    ...(search.turma ? { turma: String(search.turma) } : {}),
    // vindo de uma conversa: já com nome e telefone e, ao salvar, volta para ela
    ...(search.nome ? { nome: String(search.nome) } : {}),
    ...(search.telefone ? { telefone: String(search.telefone) } : {}),
    ...(Number(search.conversa) > 0 ? { conversa: Number(search.conversa) } : {}),
  }),
});

/** Nova inscrição numa turma (?turma=ID), em tela cheia. */
function NewSubscription() {
  const { can } = useVerify();
  const { turma, nome, telefone, conversa } = Route.useSearch();
  const navigate = useNavigate();
  const backToList = useBackToList("/treinamentos/inscricoes");
  const back = conversa ? () => navigate({ to: "/conversas/caixa", search: { conversa } }) : backToList;
  const { data: turmaData } = useQuery<{ id: number; name: string } | undefined>({
    queryKey: ["subscriptionClass", turma],
    queryFn: () => get<{ id: number; name: string }>("classes", String(turma)),
    enabled: Boolean(turma),
  });
  if (!can(`create_${SUBSCRIPTION_ENTITY.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/treinamentos/inscricoes" backLabel="Inscrições" title="Nova inscrição"
        description={turmaData?.name ? `Turma ${turmaData.name}.` : "Por favor, preencha com atenção todas as informações necessárias para cadastrar a inscrição."} />
      {turma
        ? (
          <>
            {conversa && (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-2 text-xs text-foreground">
                <Icon name="message-circle" className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="flex-1">Nome e telefone vieram da conversa. Ao salvar, você volta para ela.</span>
                <Link to="/conversas/caixa" search={{ conversa }} className="shrink-0 font-medium text-primary hover:underline">Voltar sem inscrever</Link>
              </p>
            )}
            <SubscriptionForm layout="page" openSheet={back} entity={SUBSCRIPTION_ENTITY} classId={Number(turma)} initial={{ ...(nome ? { name: nome } : {}), ...(telefone ? { phone: telefone } : {}) }} />
          </>
        )
        : <EmptyState icon="list-filter" title="Escolha o curso e a turma na lista de inscrições antes de cadastrar." />}
    </>
  );
}
