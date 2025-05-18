import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/certus/alunos')({
  component: () => <div>Hello /_authenticated/quiron/alunos!</div>
})