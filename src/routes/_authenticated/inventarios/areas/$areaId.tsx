import { createFileRoute } from '@tanstack/react-router';
import AreaDetails from '@/pages/Inventarios/Areas/AreaDetails';

export const Route = createFileRoute('/_authenticated/inventarios/areas/$areaId')({
  component: () => <AreaDetails />,
})