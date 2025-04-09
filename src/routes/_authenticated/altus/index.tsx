import { createFileRoute } from '@tanstack/react-router';
import Building from '@/pages/Building';

export const Route = createFileRoute('/_authenticated/altus/')({
  component: () => <Building />
})