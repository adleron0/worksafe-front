export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  category: 'curso' | 'evento' | 'reconhecimento' | 'capacitacao';
  thumbnail?: string;
  fabricJsonFront: string;
  fabricJsonBack?: string;
  canvasWidth: number;
  canvasHeight: number;
  orientation?: 'horizontal' | 'vertical';
  defaultVariables?: Record<string, any>;
  previewBackgroundColor?: string;
}

export interface TemplateCategory {
  id: string;
  label: string;
  icon?: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'curso', label: 'Conclusão de Curso' },
  { id: 'evento', label: 'Participação em Evento' },
  { id: 'reconhecimento', label: 'Honra e Mérito' },
  { id: 'capacitacao', label: 'Capacitação Profissional' }
];