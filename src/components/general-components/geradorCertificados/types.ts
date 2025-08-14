export interface VariableToReplace {
  name: string;
  value: string;
  type?: 'text' | 'date' | 'number';
}

export interface Image {
  id: number;
  url: string;
  imageUrl?: string; // Adicionado para compatibilidade
  name: string;
  size?: number;
  fileSize?: number; // Adicionado para compatibilidade
  type?: string;
  createdAt?: string;
}

export interface ImageFormData {
  file?: File | null;
  name: string;
  image?: File | null; // Adicionado para compatibilidade
  type?: string; // Adicionado para suportar tipo de imagem
}

export interface ShapeSettings {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius?: number; // Adicionado para suportar cantos arredondados
}

export interface CertificateVariable {
  key: string;
  label: string;
  name?: string; // Adicionado para compatibilidade
  type: 'text' | 'date' | 'number' | 'image';
  defaultValue?: string;
  format?: string;
  required?: boolean; // Adicionado
  description?: string; // Adicionado
  source?: string; // Adicionado para suportar fonte de dados
  placeholder?: string; // Adicionado para suportar placeholder
}

export interface AvailableVariables {
  [category: string]: CertificateVariable | CertificateVariable[];
}

export interface ContextMenuData {
  x: number;
  y: number;
  target: any;
}

export interface ImageListResponse {
  images: Image[];
  rows?: Image[]; // Adicionado para compatibilidade
  total: number;
}

export interface CertificateData {
  name: string;
  courseId: number;
  companyId: number;
  active: boolean;
  canvasWidth: number;
  canvasHeight: number;
  fabricJsonFront?: string;
  fabricJsonBack?: string;
}

export interface FabricObject {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  text?: string;
  [key: string]: any;
}