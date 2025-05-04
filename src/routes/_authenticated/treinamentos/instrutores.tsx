import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/instrutores')({
  component: () => <div>Hello /_authenticated/quiron/instrutores!</div>
})