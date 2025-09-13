export interface CertificateData {
  id: number;
  name: string;
  fabricJsonFront: any;
  fabricJsonBack?: any | null;
  canvasWidth?: number;
  canvasHeight?: number;
  certificateId?: string; // ID do certificado para usar no QR Code
  pdfUrl?: string; // URL da imagem thumbnail do certificado
}

// Interface para substituição de variáveis
export interface VariableToReplace {
  [key: string]: {
    type: 'string' | 'url';
    value: string;
  };
}

// Mantém compatibilidade com a interface antiga (deprecated)
export interface StudentData {
  nome_do_aluno: string;
  nome_do_curso?: string;
  data_conclusao?: string;
  instrutor_assinatura_url?: string;
  carga_horaria?: string;
  nome_empresa?: string;
  instrutor_nome?: string;
  data_emissao?: string;
  // Permite outras propriedades dinâmicas
  [key: string]: string | undefined;
}

export interface CertificateViewerProps {
  certificateData: CertificateData;
  variableToReplace: VariableToReplace;
  onDownloadPDF?: () => void;
  className?: string;
  zoom?: number;
  // Mantém compatibilidade (deprecated - use variableToReplace)
  studentData?: StudentData;
}

export interface ProcessedCanvasData {
  fabricJsonFront: any;
  fabricJsonBack?: any | null;
  canvasWidth: number;
  canvasHeight: number;
  certificateId?: string; // ID do certificado para usar no QR Code
}

export interface DownloadToolbarProps {
  onDownloadPDF: () => void;
  certificateName: string;
  studentName?: string;
  isLoading?: boolean;
}

export interface CertificateCanvasProps {
  canvasData: ProcessedCanvasData | null;
  isLoading: boolean;
  zoom?: number;
  onCanvasReady?: (canvas: any) => void;
}

// Interface para o componente CertificateThumbnail
export interface CertificateThumbnailProps {
  certificateData: CertificateData;
  variableToReplace: VariableToReplace;
  className?: string;
  zoom?: number;
  onClick?: () => void;
  showLoader?: boolean;
  // Mantém compatibilidade (deprecated - use variableToReplace)
  studentData?: StudentData;
}

// Exportação removida para evitar conflito de tipos