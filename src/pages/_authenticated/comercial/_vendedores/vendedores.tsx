import { createFileRoute } from '@tanstack/react-router'
import UsersList from '../../usuarios/_usuarios/-components/UsersList'

export const Route = createFileRoute('/_authenticated/comercial/_vendedores/vendedores')({
  component: Vendedores,
})

function Vendedores() {
  return (
    <UsersList
      title="Vendedores"
      description="Gerenciar Vendedores"
      defaultFilters={{ isSeller: true }}
      showCreateButton={true} // Precisa ser true para permitir edição
      entityName="Vendedor"
      queryKey="listVendedores"
      defaultIsSeller={true}
    />
  );
}