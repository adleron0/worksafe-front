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
export { useAutoGenerateThumbnail } from './hooks/useAutoGenerateThumbnail';

// Utilitários
export { VariableReplacer } from './utils/VariableReplacer';

// Serviços
export { default as CertificatePDFService } from './services/CertificatePDFService';
export { default as CertificateImageService } from './services/CertificateImageService';
export { default as CertificateThumbnailService } from './services/CertificateThumbnailService';

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