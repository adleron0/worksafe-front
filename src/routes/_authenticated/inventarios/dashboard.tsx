import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '@/pages/Confinus/Dashboard'

export const Route = createFileRoute('/_authenticated/inventarios/dashboard')({
  component: () => <Dashboard />,
})

