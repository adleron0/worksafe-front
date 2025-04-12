import { createFileRoute } from '@tanstack/react-router'
import Home from '@/pages/Inventarios/Home'

export const Route = createFileRoute('/_authenticated/inventarios/')({
  component: () => <Home />,
})