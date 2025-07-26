import Building from '@/components/general-components/Building'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/')({
  component: () => <Building />
})