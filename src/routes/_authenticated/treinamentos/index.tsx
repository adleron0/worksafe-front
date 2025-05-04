import Building from '@/pages/Building'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/')({
  component: () => <Building />
})