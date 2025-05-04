import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/turmas')({
  component: () => <div>Hello /_authenticated/quiron/turmas!</div>
})