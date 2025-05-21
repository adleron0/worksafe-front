import { createFileRoute } from '@tanstack/react-router'
import Building from '@/pages/Building'
import CertificateEditorPage from '@/pages/CertificateEditorPage'

export const Route = createFileRoute('/_authenticated/treinamentos/')({
  component: () => <CertificateEditorPage />
})