// Exportações principais
export { default } from './VisualizadorCertificados';
export { default as VisualizadorCertificados } from './VisualizadorCertificados';

// Componentes
export { default as CertificateCanvas } from './components/CertificateCanvas';
export { default as DownloadToolbar } from './components/DownloadToolbar';

// Hook
export { useCertificateViewer } from './hooks/useCertificateViewer';

// Utilitários
export { VariableReplacer } from './utils/VariableReplacer';

// Tipos
export type {
  CertificateData,
  StudentData,
  VariableToReplace,
  CertificateViewerProps,
  ProcessedCanvasData,
  DownloadToolbarProps,
  CertificateCanvasProps
} from './types';