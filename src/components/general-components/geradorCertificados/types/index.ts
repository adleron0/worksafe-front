export interface Image {
  id: number;
  companyId?: number;
  name: string;
  imageUrl: string;
  type: 'certificate' | 'course' | 'profile' | 'general';
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageListResponse {
  total: number;
  rows: Image[];
}

export interface ImageFormData {
  name: string;
  type: string;
  image: File | null;
}

export interface ShapeSettings {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
}

import * as fabric from 'fabric';

export interface ContextMenuData {
  x: number;
  y: number;
  target: fabric.Object | null;
}

export interface CertificateVariable {
  name: string;
  description: string;
  type: 'text' | 'image';
  source: string;
  required: boolean;
  placeholder: string;
}

export interface AvailableVariables {
  [key: string]: CertificateVariable;
}