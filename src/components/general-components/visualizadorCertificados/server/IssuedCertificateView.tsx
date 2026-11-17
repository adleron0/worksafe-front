import React from 'react';
import CertificateStage from './CertificateStage';
import CertificateDownloadMenu from './CertificateDownloadMenu';
import { certificateFileName, downloadIssuedCertificate, hasBackSide } from './certificateRenderUrls';
import { renderVersion, resolveHighlight } from '../highlight';

/** Campos do certificado emitido que o visualizador usa. */
export interface IssuedCertificateSource {
  key: string;
  fabricJsonBack?: unknown;
  canvasWidth?: number;
  canvasHeight?: number;
  updatedAt?: string | Date | null;
  highlightStudent?: boolean | null;
  highlightTheme?: string | null;
  highlightLabel?: string | null;
  highlightPattern?: string | null;
  highlightBorder?: string | null;
  class?: {
    highlightTheme?: string | null;
    highlightLabel?: string | null;
    highlightPattern?: string | null;
  highlightBorder?: string | null;
  } | null;
  /** Curso: a cor pinta a luz em volta do cartão. */
  course?: { name?: string; color?: string | null } | null;
}

/**
 * Visualizador de certificado emitido — o mesmo na página pública e no admin:
 * palco com zoom/giro, brilho de destaque e o menu "Baixar" (arquivos da API,
 * com o efeito estático).
 */
export const IssuedCertificateView: React.FC<{
  certificate: IssuedCertificateSource;
  /** Título acessível (nome do curso). */
  name: string;
  /** Partes do nome do arquivo baixado (aluno, curso). */
  fileNameParts: (string | null | undefined)[];
  /** Repassado ao palco (dentro de diálogo, reserve mais altura). */
  reservedHeight?: number;
  onError: () => void;
}> = ({ certificate, name, fileNameParts, reservedHeight, onError }) => {
  const highlight = resolveHighlight(certificate);
  const version = renderVersion(certificate);
  const hasBack = hasBackSide(certificate.fabricJsonBack);

  return (
    <CertificateStage
      certificateKey={certificate.key}
      name={name}
      fabricJsonBack={certificate.fabricJsonBack}
      canvasWidth={certificate.canvasWidth}
      canvasHeight={certificate.canvasHeight}
      version={version}
      highlightTheme={highlight?.theme ?? null}
      highlightPattern={highlight?.pattern ?? null}
      highlightBorder={highlight?.border ?? null}
      glowColor={certificate.course?.color ?? null}
      reservedHeight={reservedHeight}
      onError={onError}
      actions={
        <CertificateDownloadMenu
          size="sm"
          variant="subtle"
          hasBack={hasBack}
          onDownload={(format) =>
            downloadIssuedCertificate(certificate.key, format, {
              version,
              fileName: certificateFileName(...fileNameParts),
            })
          }
        />
      }
    />
  );
};

export default IssuedCertificateView;
