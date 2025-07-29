import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Dialog from '@/components/general-components/Dialog'
import ImageManager from '@/components/general-components/geradorCertificados/gerador'

function CertificadosPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Certificados</h1>
      
      <Button onClick={() => setDialogOpen(true)}>
        Gerador de Certificados
      </Button>

      <Dialog
        showBttn={false}
        showHeader={false}
        title="Gerenciador de Imagens"
        description="Faça upload e gerencie imagens do sistema"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <ImageManager />
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/treinamentos/certificados')({
  component: CertificadosPage
})