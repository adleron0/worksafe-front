import { createFileRoute } from '@tanstack/react-router'
import Profile from '@/pages/Profiles/ProfileList'

export const Route = createFileRoute('/_authenticated/usuarios/perfis')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Profile />
}
