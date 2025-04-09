import { createFileRoute } from '@tanstack/react-router';
import HubHome from '@/pages/HubHome';

export const Route = createFileRoute('/_authenticated/home')({
  component: () => <HubHome />,
})