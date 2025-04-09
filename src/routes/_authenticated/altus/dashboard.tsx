import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/altus/dashboard')({
  component: () => <h1>Icarus - Dashboard</h1>,	
})

