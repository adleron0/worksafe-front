import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/provas')({
  component: () => <div>Hello /_authenticated/quiron/provas!</div>
})