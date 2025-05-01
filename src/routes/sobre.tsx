import { createFileRoute } from '@tanstack/react-router';
import Sobre from '@/pages/Home/Sobre';

export const Route = createFileRoute('/sobre')({
  component: () => <Sobre />,
})

