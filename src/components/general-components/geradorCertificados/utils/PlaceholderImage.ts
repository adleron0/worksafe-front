import * as fabric from 'fabric';

export interface PlaceholderOptions {
  name: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export function createImagePlaceholder(options: PlaceholderOptions): fabric.Group {
  const {
    name,
    width = 200,
    height = 100,
    left = 100,
    top = 100
  } = options;

  // Criar retângulo de fundo
  const background = new fabric.Rect({
    width,
    height,
    fill: '#f0f0f0',
    stroke: '#cccccc',
    strokeWidth: 2,
    strokeDashArray: [5, 5],
    rx: 4,
    ry: 4,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  });

  // Criar ícone de imagem
  const iconSize = Math.min(width, height) * 0.3;
  const icon = new fabric.Path(
    'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    {
      fill: '#999999',
      scaleX: iconSize / 24,
      scaleY: iconSize / 24,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: -height * 0.15
    }
  );

  // Criar texto com o nome
  const text = new fabric.Text(name, {
    fontSize: 12,
    fill: '#666666',
    fontFamily: 'Arial',
    originX: 'center',
    originY: 'center',
    textAlign: 'center',
    left: 0,
    top: height * 0.2
  });

  // Ajustar texto se for muito largo
  if (text.width! > width - 20) {
    text.set({
      fontSize: 10,
      scaleX: (width - 20) / text.width!
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
    isPlaceholder: true
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

// Função para obter o nome do placeholder
export function getPlaceholderName(obj: fabric.Object): string | null {
  if (isImagePlaceholder(obj)) {
    return (obj as any).placeholderName || null;
  }
  return null;
}