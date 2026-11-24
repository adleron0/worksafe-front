import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import UserForm from "./-components/UserForm";

export const Route = createFileRoute("/_authenticated/usuarios/_usuarios/novo")({
  component: NewUser,
});

/** Novo usuário do sistema, em tela cheia. */
function NewUser() {
  const { can } = useVerify();
  const back = useBackToList("/usuarios");
  if (!can("create_user")) return null;
  return (
    <>
      <FormPageHeader backTo="/usuarios" backLabel="Usuários" title="Novo usuário"
        description="Preencha com atenção todas as informações necessárias para cadastrar o usuário." />
      <UserForm layout="page" onlyPassword="both" openSheet={back} />
    </>
  );
}
