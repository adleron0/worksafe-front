import { createFileRoute } from '@tanstack/react-router'
import Instructors from '@/pages/Treinamentos-Instrutores/InstructorsList'

export const Route = createFileRoute('/_authenticated/treinamentos/instrutores')({
  component: () => <Instructors />
})