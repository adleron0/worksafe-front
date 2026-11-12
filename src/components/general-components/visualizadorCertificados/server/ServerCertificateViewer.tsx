import React, { useState } from 'react';
import { getLogicalCanvasSize } from '../utils/fabricSetup';
import { certificateImageUrl, certificateThumbUrl, hasBackSide } from './certificateRenderUrls';

interface ServerCertificateImageProps {
  src: string;
  alt: string;
  orientation: 'landscape' | 'portrait';
  className?: string;
  onError: () => void;
}

/** Imagem do certificado com placeholder na proporção A4 enquanto carrega. */
const ServerCertificateImage: React.FC<ServerCertificateImageProps> = ({
  src,
  alt,
  orientation,
  className = '',
  onError,
}) => {
  const [loaded, setLoaded] = useState(false);
  const aspect = orientation === 'landscape' ? 'aspect-[842/595]' : 'aspect-[595/842]';
  return (
    <div className={`relative ${aspect} ${className}`}>
      {!loaded && <div className="absolute inset-0 rounded bg-muted animate-pulse" />}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={onError}
        className={`h-full w-full object-contain select-none transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

interface ServerViewerProps {
  certificateKey: string;
  name: string;
  fabricJsonBack?: unknown;
  canvasWidth?: number;
  canvasHeight?: number;
  version?: string | number | Date | null;
  className?: string;
  onError: () => void;
}

/** Frente (e verso) renderizados na API — substitui o canvas do Fabric. */
export const ServerCertificateViewer: React.FC<ServerViewerProps> = ({
  certificateKey,
  name,
  fabricJsonBack,
  canvasWidth,
  canvasHeight,
  version,
  className = '',
  onError,
}) => {
  const { width, height } = getLogicalCanvasSize(canvasWidth, canvasHeight);
  const orientation = width > height ? 'landscape' : 'portrait';
  const sides: ('front' | 'back')[] = hasBackSide(fabricJsonBack) ? ['front', 'back'] : ['front'];
  const two = sides.length > 1;
  // Paisagem: limita pela largura; retrato: pela altura disponível
  const sizing =
    orientation === 'landscape'
      ? two
        ? 'w-full lg:w-[calc(50%-0.5rem)]'
        : 'w-full max-w-[1100px]'
      : 'h-full max-h-full max-w-full';

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex-1 min-h-0 overflow-y-auto bg-background p-4">
        <div
          className={`flex min-h-full items-center justify-center gap-4 ${
            two ? 'flex-col lg:flex-row' : ''
          }`}
        >
          {sides.map((side) => (
            <div key={side} className={`rounded-lg bg-muted p-2 shadow-lg ${sizing}`}>
              <ServerCertificateImage
                src={certificateImageUrl(certificateKey, side, version)}
                alt={`${name} — ${side === 'front' ? 'frente' : 'verso'}`}
                orientation={orientation}
                className="w-full"
                onError={onError}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ServerThumbProps {
  certificateKey: string;
  name: string;
  canvasWidth?: number;
  canvasHeight?: number;
  version?: string | number | Date | null;
  className?: string;
  onClick?: () => void;
  onError: () => void;
}

/** Miniatura (JPEG leve) renderizada na API — substitui o canvas nas listagens. */
export const ServerCertificateThumbnail: React.FC<ServerThumbProps> = ({
  certificateKey,
  name,
  canvasWidth,
  canvasHeight,
  version,
  className = '',
  onClick,
  onError,
}) => {
  const { width, height } = getLogicalCanvasSize(canvasWidth, canvasHeight);
  const orientation = width > height ? 'landscape' : 'portrait';
  return (
    <div
      className={`relative h-full ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-background p-2">
        <ServerCertificateImage
          src={certificateThumbUrl(certificateKey, version)}
          alt={name}
          orientation={orientation}
          className={orientation === 'landscape' ? 'max-h-full w-full' : 'h-full max-w-full'}
          onError={onError}
        />
      </div>
      {onClick && (
        <div className="absolute inset-0 rounded-lg bg-muted bg-opacity-0 transition-opacity duration-200 hover:bg-opacity-10" />
      )}
    </div>
  );
};
