import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/inventarios/access-control')({
  component: () => <div>Hello /_authenticated/cerberus/access-control!</div>
})