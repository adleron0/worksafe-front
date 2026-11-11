import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/general-components/Loader";
import useVerify from "@/hooks/use-verify";
import TurmaPage from "./-components/TurmaPage";

export const Route = createFileRoute(
  "/_authenticated/treinamentos/_turmas/turmas_/nova",
)({
  component: NovaTurmaPage,
});

function NovaTurmaPage() {
  const navigate = useNavigate();
  const { can } = useVerify();
  const { user } = useAuth();

  // Acesso direto (recarregar/abrir link): as permissões chegam depois do
  // primeiro render. Sem esperar o usuário, a checagem falhava e a página
  // voltava para a lista. Redireciona de forma declarativa, não no render.
  if (!user) return <Loader title="Carregando..." />;
  if (!can("create_classes")) return <Navigate to="/treinamentos/turmas" />;

  return (
    <TurmaPage
      onSuccess={() => navigate({ to: "/treinamentos/turmas" })}
    />
  );
}
