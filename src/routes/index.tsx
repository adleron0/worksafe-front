import { createFileRoute } from '@tanstack/react-router'
import Home from '@/pages/Home/Home'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <>
      <Home />
    </>
  )
}
