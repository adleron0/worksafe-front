// Exportações principais
export { default } from './VisualizadorCertificados';
export { default as VisualizadorCertificados } from './VisualizadorCertificados';
export { default as CertificateThumbnail } from './CertificateThumbnail';

// Componentes
export { default as CertificateCanvas } from './components/CertificateCanvas';
export { default as DownloadToolbar } from './components/DownloadToolbar';

// Hooks
export { useCertificateViewer } from './hooks/useCertificateViewer';
export { useCertificateThumbnail } from './hooks/useCertificateThumbnail';

// Utilitários
export { VariableReplacer } from './utils/VariableReplacer';

// Tipos
export type {
  CertificateData,
  StudentData,
  VariableToReplace,
  CertificateViewerProps,
  CertificateThumbnailProps,
  ProcessedCanvasData,
  DownloadToolbarProps,
  CertificateCanvasProps
} from './types';