import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/altus/areas-protegidas')({
  component: () => <h1>Icarus - Areas Protegidas</h1>,	
})