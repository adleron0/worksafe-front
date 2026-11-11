import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/general-components/Loader";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import TurmaPage from "./-components/TurmaPage";
import { IEntity } from "./-interfaces/entity.interface";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute(
  "/_authenticated/treinamentos/_turmas/turmas_/$turmaId",
)({
  component: EditarTurmaPage,
});

function EditarTurmaPage() {
  const { turmaId } = Route.useParams();
  const navigate = useNavigate();
  const { can } = useVerify();
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["classes", turmaId],
    queryFn: async () => {
      const response = await get<{ rows: IEntity[]; total: number }>(
        "classes",
        "",
        [{ key: "id", value: turmaId }],
      );
      return response?.rows?.[0];
    },
    enabled: !!turmaId,
  });

  // Acesso direto (recarregar/abrir link): as permissões chegam depois do
  // primeiro render. Sem esperar o usuário, a checagem falhava e a página
  // voltava para a lista. Redireciona de forma declarativa, não no render.
  if (!user) return <Loader title="Carregando..." />;
  if (!can("update_classes")) return <Navigate to="/treinamentos/turmas" />;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 flex justify-center items-center">
        <p className="text-destructive font-medium">
          Erro ao carregar a turma. Tente novamente.
        </p>
      </div>
    );
  }

  return (
    <TurmaPage
      formData={data}
      onSuccess={() => navigate({ to: "/treinamentos/turmas" })}
    />
  );
}
