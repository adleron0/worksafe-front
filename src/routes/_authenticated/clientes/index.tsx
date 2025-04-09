import { createFileRoute  } from '@tanstack/react-router'
import Customer from '@/pages/Customers/CustomerList'

export const Route = createFileRoute('/_authenticated/clientes/')({
  component: () => <Customer />,
})