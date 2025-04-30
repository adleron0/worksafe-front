import { createFileRoute } from '@tanstack/react-router';
import SiteServicesList from '@/pages/Site-Services/SiteServicesList';

export const Route = createFileRoute('/_authenticated/site/servicos')({
  component: () => <SiteServicesList />,
})
