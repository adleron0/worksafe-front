import { createFileRoute } from '@tanstack/react-router'
import UsersList from './-components/UsersList'

export const Route = createFileRoute('/_authenticated/usuarios/_usuarios/')({
  component: List,
})

function List() {
  return (
    <UsersList
      title="Usuários do Sistema"
      description="Administrar Usuários"
      showCreateButton={true}
    />
  );
}