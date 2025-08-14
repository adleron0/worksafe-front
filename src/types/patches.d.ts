// Arquivo temporário para corrigir problemas de tipos
// TODO: Refatorar os componentes para usar tipos corretos

declare module '@/components/general-components/geradorCertificados/types' {
  export interface Image {
    id: number;
    url: string;
    imageUrl?: string;
    name: string;
    size?: number;
    fileSize?: number;
    type?: string;
    createdAt?: string;
  }

  export interface ImageFormData {
    file: File | null;
    name: string;
    image?: File | null;
    type?: string;
  }

  export interface ShapeSettings {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    cornerRadius?: number;
  }

  export interface CertificateVariable {
    key: string;
    label: string;
    name?: string;
    type: 'text' | 'date' | 'number' | 'image';
    defaultValue?: string;
    format?: string;
    required?: boolean;
    description?: string;
    source?: string;
  }

  export interface AvailableVariables {
    [category: string]: any;
  }

  export interface ContextMenuData {
    x: number;
    y: number;
    target: any;
  }

  export interface ImageListResponse {
    images: any[];
    rows?: any[];
    total: number;
  }
}