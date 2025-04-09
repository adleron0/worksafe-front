import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/altus/access-control')({
  component: () => <div>Hello /_authenticated/icarus/access-control!</div>
})