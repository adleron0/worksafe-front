import * as fabric from 'fabric';

export interface PlaceholderOptions {
  name: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  type?: 'image' | 'qrcode';
}

export function createImagePlaceholder(options: PlaceholderOptions): fabric.Group {
  const {
    name,
    width = 200,
    height = 100,
    left = 100,
    top = 100,
    type = 'image'
  } = options;

  // Para QR Code, forçar dimensões quadradas
  const isQRCode = type === 'qrcode' || name.includes('qrcode');
  const finalWidth = isQRCode ? Math.min(width, height) : width;
  const finalHeight = isQRCode ? Math.min(width, height) : height;

  // Criar retângulo de fundo
  const background = new fabric.Rect({
    width: finalWidth,
    height: finalHeight,
    fill: isQRCode ? '#f8f8f8' : '#f0f0f0',
    stroke: isQRCode ? '#333333' : '#cccccc',
    strokeWidth: 2,
    strokeDashArray: isQRCode ? [3, 3] : [5, 5],
    rx: isQRCode ? 8 : 4,
    ry: isQRCode ? 8 : 4,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  });

  // Criar ícone apropriado
  const iconSize = Math.min(finalWidth, finalHeight) * 0.3;
  let icon;
  
  if (isQRCode) {
    // Ícone de QR Code - padrão simplificado de QR
    const qrPattern = `
      M0,0 L10,0 L10,10 L0,10 Z
      M14,0 L24,0 L24,10 L14,10 Z
      M0,14 L10,14 L10,24 L0,24 Z
      M3,3 L7,3 L7,7 L3,7 Z
      M17,3 L21,3 L21,7 L17,7 Z
      M3,17 L7,17 L7,21 L3,21 Z
      M14,14 L18,14 L18,18 L14,18 Z
      M20,14 L24,14 L24,18 L20,18 Z
      M14,20 L18,20 L18,24 L14,24 Z
      M20,20 L24,20 L24,24 L20,24 Z
    `;
    icon = new fabric.Path(qrPattern, {
      fill: '#333333',
      scaleX: iconSize / 24,
      scaleY: iconSize / 24,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: isQRCode ? -finalHeight * 0.1 : -finalHeight * 0.15
    });
  } else {
    // Ícone de imagem padrão
    icon = new fabric.Path(
      'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
      {
        fill: '#999999',
        scaleX: iconSize / 24,
        scaleY: iconSize / 24,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: -finalHeight * 0.15
      }
    );
  }

  // Criar texto com o nome
  const displayText = isQRCode ? 'QR Code' : name;
  const text = new fabric.Text(displayText, {
    fontSize: isQRCode ? 11 : 12,
    fill: isQRCode ? '#333333' : '#666666',
    fontFamily: 'Arial',
    fontWeight: isQRCode ? 'bold' : 'normal',
    originX: 'center',
    originY: 'center',
    textAlign: 'center',
    left: 0,
    top: isQRCode ? finalHeight * 0.25 : finalHeight * 0.2
  });

  // Ajustar texto se for muito largo
  if (text.width! > finalWidth - 20) {
    text.set({
      fontSize: 10,
      scaleX: (finalWidth - 20) / text.width!
    });
  }

  // Criar grupo
  const group = new fabric.Group([background, icon, text], {
    left,
    top,
    originX: 'left',
    originY: 'top',
    lockScalingFlip: true,
    name: 'placeholder',
    // Propriedades customizadas
    placeholderName: name,
    isPlaceholder: true,
    placeholderType: isQRCode ? 'qrcode' : 'image'
  } as any);

  // Adicionar ID único
  const uniqueId = `placeholder_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  (group as any).__uniqueID = uniqueId;
  (group as any).id = uniqueId;

  return group;
}

// Função para verificar se um objeto é um placeholder
export function isImagePlaceholder(obj: fabric.Object): boolean {
  return (obj as any).isPlaceholder === true;
}

// Função para verificar se um objeto é um placeholder de QR Code
export function isQRCodePlaceholder(obj: fabric.Object): boolean {
  return isImagePlaceholder(obj) && (obj as any).placeholderType === 'qrcode';
}

// Função para obter o nome do placeholder
export function getPlaceholderName(obj: fabric.Object): string | null {
  if (isImagePlaceholder(obj)) {
    return (obj as any).placeholderName || null;
  }
  return null;
}

// Função para obter o tipo do placeholder
export function getPlaceholderType(obj: fabric.Object): 'image' | 'qrcode' | null {
  if (isImagePlaceholder(obj)) {
    return (obj as any).placeholderType || 'image';
  }
  return null;
}