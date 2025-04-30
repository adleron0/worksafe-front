import { createFileRoute } from '@tanstack/react-router'
import SiteProductsList from '@/pages/Site-Products/SiteProductsList'

export const Route = createFileRoute('/_authenticated/site/produtos')({
  component: () => <SiteProductsList />,
})

