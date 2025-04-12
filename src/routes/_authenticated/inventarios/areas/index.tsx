import { createFileRoute } from '@tanstack/react-router'
import Areas from '@/pages/Inventarios/Areas/Areas'

export const Route = createFileRoute('/_authenticated/inventarios/areas/')({
  component: () => <Areas />,
})