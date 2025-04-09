import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/altus/autorizados')({
  component: () => <h1>Icarus - Autorizados</h1>,	
})

