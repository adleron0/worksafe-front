import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/alunos')({
  component: () => <div>Hello /_authenticated/quiron/alunos!</div>
})