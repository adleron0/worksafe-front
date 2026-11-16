import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { PermissionMatrix, useAssigned } from "../-shared/permissions";

export const Route = createFileRoute("/_authenticated/usuarios/_perfis/perfis_/$profileId/permissoes")({
  component: ProfilePermissionsPage,
});

/** Permissões de um perfil: página própria, um card por recurso. */
function ProfilePermissionsPage() {
  const { profileId } = Route.useParams();
  const { can } = useVerify();
  const { data, isLoading } = useAssigned("profile", profileId);

  if (!can("list_profile")) return null;
  return (
    <PermissionMatrix
      mode="profile"
      targetId={Number(profileId)}
      title={data ? `Permissões · ${data.name}` : "Permissões do perfil"}
      backTo="/usuarios/perfis"
      backLabel="Perfis"
      granted={data?.granted}
      loading={isLoading}
      invalidate={["permissionsOf", "listPerfis"]}
    />
  );
}
