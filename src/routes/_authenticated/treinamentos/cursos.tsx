import { createFileRoute } from '@tanstack/react-router'
import Courses from '@/pages/Treinamentos-Courses/CoursesList'

export const Route = createFileRoute('/_authenticated/treinamentos/cursos')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Courses />
}
