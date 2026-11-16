import React, { useMemo, useState } from 'react';
import Dialog from '@/components/general-components/Dialog';
import { Button } from '@/components/ui/button';
import VisualizadorCertificados from '@/components/general-components/visualizadorCertificados/VisualizadorCertificados';
import { sampleVariables } from '../utils/variablesCatalog';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Desenho atual do editor (frente/verso). */
  data: {
    fabricJsonFront: unknown;
    fabricJsonBack?: unknown;
    canvasWidth?: number;
    canvasHeight?: number;
  } | null;
  name?: string;
}

/**
 * Prévia do modelo com um aluno de exemplo: as variáveis viram valores, os
 * espaços de instrutor se redistribuem e os elementos com "mostrar só se"
 * somem quando o dado falta — igual ao certificado gerado.
 */
const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, onOpenChange, data, name }) => {
  const [instructors, setInstructors] = useState(2);
  const [withCompany, setWithCompany] = useState(true);
  const variables = useMemo(() => sampleVariables({ instructors, withCompany }), [instructors, withCompany]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      showBttn={false}
      title="Prévia com aluno de exemplo"
      description="Assim fica o certificado gerado. Troque os dados para ver os espaços de instrutor e os elementos condicionais."
      className="sm:max-w-6xl"
      classNameContent="h-auto max-h-[80vh]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Instrutores:</span>
          {[1, 2, 3, 4].map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={instructors === n ? 'default' : 'outline'}
              className="h-7 w-8 p-0 text-xs"
              onClick={() => setInstructors(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Empresa do aluno:</span>
          <Button type="button" size="sm" variant={withCompany ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setWithCompany(true)}>
            Com empresa
          </Button>
          <Button type="button" size="sm" variant={!withCompany ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setWithCompany(false)}>
            Sem empresa
          </Button>
        </div>
      </div>
      {open && data ? (
        // o visualizador se ajusta ao tamanho do espaço: precisa de altura definida
        <div className="h-[62vh] w-full">
        <VisualizadorCertificados
          key={`${instructors}-${withCompany}`}
          certificateData={{
            id: 0,
            name: name || 'Prévia',
            fabricJsonFront: data.fabricJsonFront,
            fabricJsonBack: data.fabricJsonBack ?? null,
            canvasWidth: data.canvasWidth,
            canvasHeight: data.canvasHeight,
          }}
          variableToReplace={variables}
          className="h-full w-full"
        />
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Nada para mostrar ainda.</p>
      )}
    </Dialog>
  );
};

export default PreviewDialog;
