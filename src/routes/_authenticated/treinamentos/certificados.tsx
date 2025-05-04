import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/certificados')({
  component: () => <div>Hello /_authenticated/quiron/certificados!</div>
})