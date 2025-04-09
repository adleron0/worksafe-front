import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/certus/turmas')({
  component: () => <div>Hello /_authenticated/quiron/turmas!</div>
})