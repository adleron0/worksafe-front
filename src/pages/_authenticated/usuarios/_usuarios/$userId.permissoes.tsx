import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { PermissionMatrix, useAssigned } from "../-shared/permissions";

export const Route = createFileRoute("/_authenticated/usuarios/_usuarios/$userId/permissoes")({
  component: UserPermissionsPage,
});

/**
 * Permissões de um usuário: o que vem do perfil aparece marcado e travado;
 * aqui só se dão permissões a mais para esta pessoa.
 */
function UserPermissionsPage() {
  const { userId } = Route.useParams();
  const { can } = useVerify();
  const { data, isLoading } = useAssigned("user", userId);

  if (!can("list_profile")) return null;
  return (
    <PermissionMatrix
      mode="user"
      targetId={Number(userId)}
      title={data ? `Permissões · ${data.name}` : "Permissões do usuário"}
      subtitle={data?.profileName ? `Perfil ${data.profileName}. Aqui você dá permissões a mais só para esta pessoa; as mudanças só valem depois de salvar.` : undefined}
      backTo="/usuarios"
      backLabel="Usuários"
      granted={data?.granted}
      inherited={data?.inherited}
      loading={isLoading}
      invalidate={["permissionsOf", "listUsuários"]}
    />
  );
}
