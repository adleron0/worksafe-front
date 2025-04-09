import { createFileRoute } from '@tanstack/react-router'
import CerberusHome from '@/pages/Confinus/CerberusHome'

export const Route = createFileRoute('/_authenticated/inventarios/')({
  component: () => <CerberusHome />,
})