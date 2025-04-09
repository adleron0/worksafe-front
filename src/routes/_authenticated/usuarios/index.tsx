import { createFileRoute  } from '@tanstack/react-router'
import Users from '@/pages/Users/UsersList'

export const Route = createFileRoute('/_authenticated/usuarios/')({
  component: () => <Users />,
})