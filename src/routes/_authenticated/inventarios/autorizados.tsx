import { createFileRoute } from '@tanstack/react-router'
import Customers from '@/pages/Confinus/Customers'

export const Route = createFileRoute('/_authenticated/inventarios/autorizados')({
  component: () => <Customers />,
})

