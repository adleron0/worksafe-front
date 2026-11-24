import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import StatusBadge from "@/components/general-components/StatusBadge";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import UserForm from "./-components/UserForm";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/usuarios/_usuarios/$userId/editar")({
  component: EditUser,
});

/** Edição de um usuário do sistema, em tela cheia. */
function EditUser() {
  const { can } = useVerify();
  const { userId } = Route.useParams();
  const back = useBackToList("/usuarios");
  const { data, isLoading, isError } = useQuery<IEntity | undefined>({
    queryKey: ["user", userId],
    queryFn: () => get<IEntity>("user", userId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can("update_user")) return null;
  const badge = data && (data.active ? <StatusBadge tone="success">Ativo</StatusBadge> : <StatusBadge>Inativo</StatusBadge>);
  return (
    <>
      <FormPageHeader backTo="/usuarios" backLabel="Usuários" title={data ? `Editar ${data.name}` : "Editar usuário"}
        description="Atenção: as alterações mudam os dados do usuário." badge={badge} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Usuário não encontrado." />
          : <UserForm key={data.id} layout="page" formData={data} onlyPassword="" openSheet={back} />}
    </>
  );
}
