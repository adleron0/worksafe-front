import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2, Image as ImageIcon, Type, Shapes, GripVertical } from 'lucide-react';
import * as fabric from 'fabric';

interface LayersPanelProps {
  canvas: fabric.Canvas | null;
  onDeleteObject: (obj: fabric.Object) => void;
  onSelectObject: (obj: fabric.Object) => void;
}

interface LayerItem {
  id: string;
  object: fabric.Object;
  name: string;
  type: string;
  visible: boolean;
  zIndex: number;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  canvas,
  onDeleteObject,
  onSelectObject
}) => {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<LayerItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // Função para obter o ícone baseado no tipo do objeto
  const getLayerIcon = (obj: fabric.Object) => {
    const objWithName = obj as fabric.Object & { name?: string };
    
    if (obj.type === 'image' || obj.constructor.name === 'FabricImage') {
      return ImageIcon;
    } else if (obj.type === 'i-text' || obj.type === 'textbox') {
      return Type;
    } else if (['rectangle', 'circle', 'triangle', 'line', 'rect'].includes(objWithName.name || obj.type || '')) {
      return Shapes;
    }
    return Shapes;
  };

  // Função para obter o nome do layer
  const getLayerName = (obj: fabric.Object, index: number) => {
    const objWithName = obj as fabric.Object & { name?: string };
    
    if (obj.type === 'image' || obj.constructor.name === 'FabricImage') {
      return objWithName.name || `Imagem ${index}`;
    } else if (obj.type === 'i-text' || obj.type === 'textbox') {
      const textObj = obj as fabric.Textbox;
      const text = textObj.text || '';
      const truncatedText = text.length > 20 ? text.substring(0, 20) + '...' : text;
      return truncatedText || `Texto ${index}`;
    } else if (objWithName.name === 'rectangle' || obj.type === 'rect') {
      return `Retângulo ${index}`;
    } else if (objWithName.name === 'circle') {
      return `Círculo ${index}`;
    } else if (objWithName.name === 'triangle') {
      return `Triângulo ${index}`;
    } else if (objWithName.name === 'line') {
      return `Linha ${index}`;
    }
    return `Elemento ${index}`;
  };

  // Atualizar layers quando o canvas mudar
  const updateLayers = () => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const newLayers: LayerItem[] = [];
    let elementCounts: Record<string, number> = {};

    objects.forEach((obj, index) => {
      const objWithName = obj as fabric.Object & { name?: string };
      // Ignorar o retângulo de fundo branco e a imagem de background
      if (objWithName.name === 'backgroundRect' || objWithName.name === 'backgroundImage') return;

      // Determinar o tipo para contagem
      let elementType = '';
      if (obj.type === 'image' || obj.constructor.name === 'FabricImage') {
        elementType = 'image';
      } else if (obj.type === 'i-text' || obj.type === 'textbox') {
        elementType = 'text';
      } else if (objWithName.name === 'rectangle' || obj.type === 'rect') {
        elementType = 'rectangle';
      } else if (objWithName.name === 'circle') {
        elementType = 'circle';
      } else if (objWithName.name === 'triangle') {
        elementType = 'triangle';
      } else if (objWithName.name === 'line') {
        elementType = 'line';
      }

      // Incrementar contagem para este tipo
      elementCounts[elementType] = (elementCounts[elementType] || 0) + 1;

      const layerId = (obj as any).__uniqueID || `layer_${index}_${Date.now()}`;
      if (!(obj as any).__uniqueID) {
        (obj as any).__uniqueID = layerId;
      }

      newLayers.push({
        id: layerId,
        object: obj,
        name: getLayerName(obj, elementCounts[elementType]),
        type: obj.type || 'object',
        visible: obj.visible !== false,
        zIndex: index
      });
    });

    // Inverter a ordem para mostrar o último item no topo
    setLayers(newLayers.reverse());
  };

  // Escutar eventos do canvas
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasChange = () => {
      updateLayers();
    };

    canvas.on('object:added', handleCanvasChange);
    canvas.on('object:removed', handleCanvasChange);
    canvas.on('object:modified', handleCanvasChange);
    canvas.on('selection:updated', handleCanvasChange);
    canvas.on('selection:created', handleCanvasChange);

    // Atualizar layers inicialmente
    updateLayers();

    return () => {
      canvas.off('object:added', handleCanvasChange);
      canvas.off('object:removed', handleCanvasChange);
      canvas.off('object:modified', handleCanvasChange);
      canvas.off('selection:updated', handleCanvasChange);
      canvas.off('selection:created', handleCanvasChange);
    };
  }, [canvas]);

  // Toggle visibilidade
  const toggleVisibility = (layer: LayerItem) => {
    layer.object.visible = !layer.object.visible;
    canvas?.renderAll();
    updateLayers();
  };

  // Selecionar objeto
  const selectLayer = (layer: LayerItem) => {
    if (!canvas) return;
    
    canvas.setActiveObject(layer.object);
    canvas.renderAll();
    onSelectObject(layer.object);
  };

  // Deletar objeto
  const deleteLayer = (layer: LayerItem) => {
    if (!canvas) return;
    
    canvas.remove(layer.object);
    canvas.renderAll();
    onDeleteObject(layer.object);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, layer: LayerItem) => {
    setDraggedItem(layer);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Firefox requires this
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    dragCounter.current = 0;

    if (!draggedItem || !canvas) return;

    const draggedIndex = layers.findIndex(l => l.id === draggedItem.id);
    if (draggedIndex === dropIndex) return;

    // Reordenar layers
    const newLayers = [...layers];
    const [removed] = newLayers.splice(draggedIndex, 1);
    newLayers.splice(dropIndex, 0, removed);

    // Atualizar z-index no canvas
    const objects = canvas.getObjects().filter(obj => {
      const objWithName = obj as fabric.Object & { name?: string };
      return objWithName.name !== 'backgroundRect';
    });

    // Limpar o canvas (exceto backgroundRect)
    objects.forEach(obj => canvas.remove(obj));

    // Re-adicionar objetos na nova ordem (invertida porque layers está invertido)
    newLayers.reverse().forEach(layer => {
      canvas.add(layer.object);
    });

    canvas.renderAll();
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Camadas</h3>
          <div className="space-y-1">
            {layers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum elemento adicionado
              </p>
            ) : (
              layers.map((layer, index) => {
                const Icon = getLayerIcon(layer.object);
                const isSelected = canvas?.getActiveObject() === layer.object;
                
                return (
                  <div
                    key={layer.id}
                    className={`
                      flex items-center gap-2 p-2 rounded-md cursor-pointer
                      transition-all duration-200
                      ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                      ${dragOverIndex === index ? 'border-t-2 border-primary' : ''}
                    `}
                    draggable
                    onDragStart={(e) => handleDragStart(e, layer)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectLayer(layer)}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="flex-1 text-xs truncate">{layer.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(layer);
                        }}
                      >
                        {layer.visible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {layers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Arraste para reordenar as camadas
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LayersPanel;