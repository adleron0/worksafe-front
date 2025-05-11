import { createFileRoute } from '@tanstack/react-router'
import Turmas from '@/pages/Treinamentos-Turmas/TurmasList'

export const Route = createFileRoute('/_authenticated/treinamentos/turmas')({
  component: () => <Turmas />
})