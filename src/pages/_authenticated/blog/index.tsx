import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/blog/')({
  component: BlogIndex,
})

function BlogIndex() {
  // Redireciona para a página de Posts por padrão
  return <Navigate to="/blog/posts" />
}
