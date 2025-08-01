import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RectangleHorizontal, RectangleVertical, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import * as fabric from 'fabric';
import { createListTextbox, cleanListMarkers } from '../utils/ListTextbox';

export interface CanvasEditorRef {
  addImageToCanvas: (imageUrl: string, imageName: string) => void;
  addShapeToCanvas: (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => void;
  addTextToCanvas: (text: string, textSettings: any) => void;
  getCanvas: () => fabric.Canvas | null;
}

interface CanvasEditorProps {
  pageId: string;
  pageIndex: number;
  orientation: 'landscape' | 'portrait';
  zoomLevel: number;
  isDragging: boolean;
  isLoadingCanvas: boolean;
  onOrientationChange: (orientation: 'landscape' | 'portrait') => void;
  onZoomChange: (zoom: number) => void;
  onObjectSelected: (obj: fabric.Object) => void;
  onSelectionCleared: () => void;
  onContextMenu: (e: MouseEvent, target: fabric.Object | null) => void;
  selectedShapeRef: React.MutableRefObject<fabric.Object | null>;
  isActive: boolean;
}

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(({
  pageId,
  pageIndex,
  orientation,
  zoomLevel,
  isDragging,
  isLoadingCanvas,
  onOrientationChange,
  onZoomChange,
  onObjectSelected,
  onSelectionCleared,
  onContextMenu,
  selectedShapeRef,
  isActive
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const zoomLevelRef = useRef(zoomLevel);
  const orientationRef = useRef(orientation);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const updateCanvasSize = (orient: 'landscape' | 'portrait', customZoom?: number) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const baseScale = 0.6;
    const zoomScale = customZoom ? customZoom / 100 : zoomLevelRef.current / 100;
    const finalScale = baseScale * zoomScale;
    
    const a4Width = 842;
    const a4Height = 595;

    // Calcular as dimensões base do canvas (sem zoom)
    let baseWidth: number;
    let baseHeight: number;
    
    if (orient === 'landscape') {
      baseWidth = a4Width;
      baseHeight = a4Height;
    } else {
      baseWidth = a4Height;
      baseHeight = a4Width;
    }
    
    // Aplicar o zoom ao canvas
    canvas.setZoom(finalScale);
    
    // Definir as dimensões do canvas considerando o zoom
    canvas.setDimensions({
      width: baseWidth * finalScale,
      height: baseHeight * finalScale
    });
    
    // Atualizar o background para corresponder às dimensões base (sem zoom)
    const bgRect = canvas.getObjects().find(obj => (obj as fabric.Object & { name?: string }).name === 'backgroundRect');
    if (bgRect) {
      bgRect.set({
        width: baseWidth,
        height: baseHeight,
        scaleX: 1,
        scaleY: 1
      });
      bgRect.setCoords();
    }
    
    canvas.renderAll();
  };

  const addImageToCanvas = (imageUrl: string, imageName: string) => {
    if (!fabricCanvasRef.current) return;

    // Tentar primeiro sem CORS para evitar problemas com S3
    fabric.FabricImage.fromURL(imageUrl, {
      crossOrigin: null
    }).then((fabricImage) => {
      if (!fabricCanvasRef.current) return;
      
      fabricImage.set({
        left: fabricCanvasRef.current.width! / 2,
        top: fabricCanvasRef.current.height! / 2,
        originX: 'center',
        originY: 'center',
        name: imageName
      });
      
      const maxSize = 200;
      if (fabricImage.width! > fabricImage.height!) {
        fabricImage.scaleToWidth(maxSize);
      } else {
        fabricImage.scaleToHeight(maxSize);
      }
      
      fabricCanvasRef.current.add(fabricImage);
      fabricCanvasRef.current.setActiveObject(fabricImage);
      fabricCanvasRef.current.renderAll();
    }).catch((error) => {
      console.error('Erro ao carregar imagem:', error);
      
      // Fallback: tentar com CORS anonymous
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const fabricImage = new fabric.FabricImage(img, {
          left: fabricCanvasRef.current!.width! / 2,
          top: fabricCanvasRef.current!.height! / 2,
          originX: 'center',
          originY: 'center',
          name: imageName
        });
        
        const maxSize = 200;
        if (fabricImage.width! > fabricImage.height!) {
          fabricImage.scaleToWidth(maxSize);
        } else {
          fabricImage.scaleToHeight(maxSize);
        }
        
        fabricCanvasRef.current!.add(fabricImage);
        fabricCanvasRef.current!.setActiveObject(fabricImage);
        fabricCanvasRef.current!.renderAll();
      };
      
      img.onerror = () => {
        console.error('Não foi possível carregar a imagem:', imageUrl);
        alert('Erro ao carregar imagem. Verifique se a imagem está acessível.');
      };
      
      img.src = imageUrl;
    });
  };

  const addShapeToCanvas = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line', shapeSettings: any) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    const size = 100;
    
    // Criar ID único para a forma
    const uniqueId = `${shapeType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let shape: fabric.Object;
    
    const strokeWidth = shapeType === 'line' ? Math.max(2, shapeSettings.strokeWidth) : shapeSettings.strokeWidth;
    
    const baseProps = {
      left: centerX,
      top: centerY,
      originX: 'center' as const,
      originY: 'center' as const,
      fill: shapeSettings.fill,
      stroke: shapeSettings.stroke,
      strokeWidth: strokeWidth,
      opacity: shapeSettings.opacity / 100,
      name: shapeType
    };
    
    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          ...baseProps,
          width: size,
          height: size,
          rx: shapeSettings.cornerRadius,
          ry: shapeSettings.cornerRadius
        });
        break;
        
      case 'circle':
        shape = new fabric.Circle({
          ...baseProps,
          radius: size / 2
        });
        break;
        
      case 'triangle':
        shape = new fabric.Triangle({
          ...baseProps,
          width: size,
          height: size
        });
        break;
        
      case 'line':
        shape = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
          ...baseProps,
          fill: undefined,
          lockScalingY: true,
          lockSkewingY: true
        });
        shape.setControlsVisibility({
          mt: false,
          mb: false,
          tl: false,
          tr: false,
          bl: false,
          br: false,
        });
        break;
        
      default:
        return;
    }
    
    // Adicionar ID único ao objeto
    (shape as any).__uniqueID = uniqueId;
    (shape as any).id = uniqueId;
    
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    
    onObjectSelected(shape);
    selectedShapeRef.current = shape;
  };

  const addTextToCanvas = (text: string, textSettings: any) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    
    // Criar ID único para o texto
    const uniqueId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fabricText = createListTextbox(text, {
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: 'center',
      fontFamily: textSettings.fontFamily,
      fontSize: textSettings.fontSize,
      fontWeight: textSettings.fontWeight,
      fontStyle: textSettings.fontStyle,
      underline: textSettings.underline,
      fill: textSettings.fill,
      textAlign: textSettings.textAlign,
      lineHeight: textSettings.lineHeight,
      charSpacing: textSettings.letterSpacing,
      listType: textSettings.listType || 'none',
      listIndent: textSettings.listIndent || 0,
      listItemSpacing: textSettings.listItemSpacing || 8,
      name: 'text',
      editable: true,
      cursorWidth: 2,
      cursorColor: '#333',
      cursorDelay: 500,
      cursorDuration: 500,
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      editingBorderColor: '#333',
      hasControls: true,
      lockScalingFlip: true,
    });
    
    // Adicionar ID único ao objeto
    (fabricText as any).__uniqueID = uniqueId;
    (fabricText as any).id = uniqueId;
    
    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);
    canvas.renderAll();
    
    onObjectSelected(fabricText);
    selectedShapeRef.current = fabricText;
    
    // Sair do modo de edição de qualquer outro texto primeiro
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if ((obj.type === 'i-text' || obj.type === 'textbox') && obj !== fabricText) {
        const textObj = obj as fabric.Textbox;
        if (textObj.isEditing) {
          textObj.exitEditing();
        }
      }
    });
    
    // Entrar em modo de edição imediatamente
    setTimeout(() => {
      console.log('Tentando entrar em modo de edição');
      console.log('fabricText:', fabricText);
      
      // Garantir que o objeto está selecionado
      canvas.setActiveObject(fabricText);
      
      // Entrar em modo de edição
      fabricText.enterEditing();
      fabricText.selectAll();
      
      // Focar no canvas wrapper
      if (canvas.wrapperEl) {
        canvas.wrapperEl.focus();
      }
      
      canvas.renderAll();
      
      console.log('isEditing depois:', fabricText.isEditing);
      console.log('Texto em edição:', fabricText.text);
    }, 200);
  };

  useImperativeHandle(ref, () => ({
    addImageToCanvas,
    addShapeToCanvas,
    addTextToCanvas,
    getCanvas: () => fabricCanvasRef.current
  }));

  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      // Verificar se já não existe um canvas no elemento
      const existingCanvas = canvasRef.current.querySelector('canvas');
      if (existingCanvas && existingCanvas.classList.contains('lower-canvas')) {
        console.log('Canvas já existe, pulando inicialização');
        return;
      }
      
      const canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#e5e7eb',
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        stopContextMenu: true,
        fireRightClick: true,
      });
      
      fabricCanvasRef.current = canvas;
      
      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: 842, // Tamanho base A4 landscape
        height: 595,
        fill: 'white',
        selectable: false,
        evented: false,
        name: 'backgroundRect'
      });
      
      canvas.add(bgRect);
      updateCanvasSize(orientation);
      
      const handleKeyDown = (e: KeyboardEvent) => {
        // Só processar eventos de teclado se esta página estiver ativa
        if (!isActiveRef.current) return;
        
        console.log(`Key pressed on page ${pageIndex + 1}:`, e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
        
        // Prevenir comportamento padrão para atalhos com Ctrl/Cmd
        if (e.ctrlKey || e.metaKey) {
          switch(e.key.toLowerCase()) {
            case 'd':
            case 'b':
            case 'i':
            case 'u':
              e.preventDefault();
              e.stopPropagation();
              break;
          }
        }
        
        if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvasRef.current) {
          const activeObject = fabricCanvasRef.current.getActiveObject();
          
          // Se for um texto em modo de edição, não fazer nada
          if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
            const itext = activeObject as fabric.IText;
            if (itext.isEditing) {
              console.log('Texto em edição, permitindo tecla:', e.key);
              return; // Deixar o texto processar o evento normalmente
            }
          }
          
          e.preventDefault();
          
          if (activeObject) {
            const objWithName = activeObject as fabric.Object & { name?: string };
            if (objWithName.name !== 'backgroundRect') {
              fabricCanvasRef.current.remove(activeObject);
              fabricCanvasRef.current.discardActiveObject();
              fabricCanvasRef.current.requestRenderAll();
              onSelectionCleared();
              selectedShapeRef.current = null;
            }
          }
        } else if ((e.ctrlKey || e.metaKey) && fabricCanvasRef.current) {
          const activeObject = fabricCanvasRef.current.getActiveObject();
          
          if (activeObject) {
            switch(e.key.toLowerCase()) {
              case 'd': // Duplicar
                e.preventDefault();
                e.stopPropagation();
                activeObject.clone().then((cloned: fabric.Object) => {
                  fabricCanvasRef.current!.discardActiveObject();
                  cloned.set({
                    left: (cloned.left || 0) + 10,
                    top: (cloned.top || 0) + 10,
                    evented: true,
                  });
                  if (cloned.type === 'activeSelection') {
                    (cloned as fabric.ActiveSelection).canvas = fabricCanvasRef.current!;
                    (cloned as fabric.ActiveSelection).forEachObject((obj: fabric.Object) => {
                      fabricCanvasRef.current!.add(obj);
                    });
                    cloned.setCoords();
                  } else {
                    fabricCanvasRef.current!.add(cloned);
                  }
                  fabricCanvasRef.current!.setActiveObject(cloned);
                  fabricCanvasRef.current!.requestRenderAll();
                });
                break;
                
              case 'b': // Bold
                e.preventDefault();
                e.stopPropagation();
                if (activeObject.type === 'i-text' || activeObject.type === 'textbox') {
                  const textObj = activeObject as fabric.Textbox;
                  const currentWeight = textObj.get('fontWeight') as string || 'normal';
                  textObj.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
                  fabricCanvasRef.current!.renderAll();
                }
                break;
                
              case 'i': // Italic
                e.preventDefault();
                e.stopPropagation();
                if (activeObject.type === 'i-text' || activeObject.type === 'textbox') {
                  const textObj = activeObject as fabric.Textbox;
                  const currentStyle = textObj.get('fontStyle') as string || 'normal';
                  textObj.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
                  fabricCanvasRef.current!.renderAll();
                }
                break;
                
              case 'u': // Underline
                e.preventDefault();
                e.stopPropagation();
                if (activeObject.type === 'i-text' || activeObject.type === 'textbox') {
                  const textObj = activeObject as fabric.Textbox;
                  const currentUnderline = textObj.get('underline') as boolean || false;
                  textObj.set('underline', !currentUnderline);
                  fabricCanvasRef.current!.renderAll();
                }
                break;
            }
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      const handleContextMenu = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const mouseEvent = e as MouseEvent;
        const currentCanvas = fabricCanvasRef.current;
        if (!currentCanvas) return false;
        
        // Usar getPointer com o evento original para considerar o zoom
        const pointer = currentCanvas.getPointer(mouseEvent);
        const objects = currentCanvas.getObjects();
        let target = null;
        
        // Verificar se algum objeto está sob o ponteiro
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          if (obj.containsPoint(pointer) && (obj as fabric.Object & { name?: string }).name !== 'backgroundRect') {
            target = obj;
            break;
          }
        }
        
        if (target) {
          currentCanvas.setActiveObject(target);
          currentCanvas.renderAll();
        }
        
        onContextMenu(mouseEvent, target);
        return false;
      };
      
      const attachContextMenuListeners = () => {
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          canvas.upperCanvasEl.addEventListener('contextmenu', handleContextMenu);
        }
        if (canvas.lowerCanvasEl) {
          canvas.lowerCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          canvas.lowerCanvasEl.addEventListener('contextmenu', handleContextMenu);
        }
        
        const wrapperEl = canvas.wrapperEl;
        if (wrapperEl) {
          wrapperEl.removeEventListener('contextmenu', handleContextMenu);
          wrapperEl.addEventListener('contextmenu', handleContextMenu);
        }
      };
      
      setTimeout(() => {
        attachContextMenuListeners();
      }, 200);
      
      const handleWheel = (opt: fabric.TEvent<WheelEvent>) => {
        const delta = opt.e.deltaY;
        let currentZoom = zoomLevelRef.current;
        
        if (delta > 0) {
          currentZoom = Math.max(30, currentZoom - 5);
        } else {
          currentZoom = Math.min(300, currentZoom + 5);
        }
        
        onZoomChange(currentZoom);
        updateCanvasSize(orientationRef.current, currentZoom);
        
        opt.e.preventDefault();
        opt.e.stopPropagation();
      };
      
      canvas.on('mouse:wheel', handleWheel);
      
      const handleShapeSelection = (obj: fabric.Object) => {
        const objWithName = obj as fabric.Object & { name?: string };
        const objName = objWithName.name;
        
        // Se for texto, sair do modo de edição primeiro
        if (obj.type === 'textbox' || obj.type === 'i-text') {
          const textObj = obj as fabric.Textbox;
          if (textObj.isEditing) {
            textObj.exitEditing();
          }
        }
        
        if (['rectangle', 'circle', 'triangle', 'line', 'rect'].includes(objName || obj.type || '')) {
          onObjectSelected(obj);
          selectedShapeRef.current = obj;
        } else if (obj.type === 'textbox' || obj.type === 'i-text') {
          onObjectSelected(obj);
          selectedShapeRef.current = obj;
        } else {
          onSelectionCleared();
          selectedShapeRef.current = null;
        }
      };
      
      canvas.on('selection:created', (e) => {
        if (e.selected && e.selected[0]) {
          // Sair do modo de edição de qualquer texto ativo
          const objects = canvas.getObjects();
          objects.forEach(obj => {
            if ((obj.type === 'i-text' || obj.type === 'textbox') && obj !== e.selected[0]) {
              const textObj = obj as fabric.Textbox;
              if (textObj.isEditing) {
                textObj.exitEditing();
              }
            }
          });
          
          handleShapeSelection(e.selected[0]);
        }
      });
      
      canvas.on('selection:updated', (e) => {
        if (e.selected && e.selected[0]) {
          // Sair do modo de edição de qualquer texto ativo
          const objects = canvas.getObjects();
          objects.forEach(obj => {
            if ((obj.type === 'i-text' || obj.type === 'textbox') && obj !== e.selected[0]) {
              const textObj = obj as fabric.Textbox;
              if (textObj.isEditing) {
                textObj.exitEditing();
              }
            }
          });
          
          handleShapeSelection(e.selected[0]);
        }
      });
      
      canvas.on('selection:cleared', () => {
        onSelectionCleared();
        selectedShapeRef.current = null;
      });
      
      // Variável para rastrear cliques
      let clickCount = 0;
      let clickTimer: NodeJS.Timeout | null = null;
      // @ts-ignore - Used in event handlers
      let currentEditingText: fabric.Textbox | null = null;
      
      // Adicionar evento de clique direito
      canvas.on('mouse:down', (opt) => {
        const target = opt.target;
        console.log('Mouse down em:', target);
        
        // Verificar se é clique direito
        if ('button' in opt.e && (opt.e as MouseEvent).button === 2) {
          opt.e.preventDefault();
          opt.e.stopPropagation();
          
          // Selecionar o objeto se houver um sob o cursor
          if (target && (target as fabric.Object & { name?: string }).name !== 'backgroundRect') {
            canvas.setActiveObject(target);
            canvas.renderAll();
          }
          
          // Chamar o menu de contexto
          onContextMenu(opt.e as MouseEvent, target || null);
          return;
        }
        
        if (target && (target.type === 'i-text' || target.type === 'textbox')) {
          clickCount++;
          console.log('Click count:', clickCount);
          
          if (clickCount === 1) {
            clickTimer = setTimeout(() => {
              clickCount = 0;
            }, 350);
          } else if (clickCount === 2) {
            if (clickTimer) {
              clearTimeout(clickTimer);
            }
            clickCount = 0;
            
            console.log('Duplo clique detectado em IText');
            const itext = target as fabric.Textbox;
            
            // IMPORTANTE: Sair de edição de TODOS os textos primeiro
            const objects = canvas.getObjects();
            objects.forEach(obj => {
              if ((obj.type === 'i-text' || obj.type === 'textbox')) {
                const textObj = obj as fabric.Textbox;
                if (textObj.isEditing) {
                  console.log('Saindo de edição do texto:', textObj.text);
                  textObj.exitEditing();
                }
              }
            });
            
            // Limpar referência anterior
            currentEditingText = null;
            
            // Forçar entrada em modo de edição do texto correto
            setTimeout(() => {
              console.log('Duplo clique - entrando em modo de edição');
              console.log('Texto selecionado:', itext.text);
              console.log('ID do texto selecionado:', (itext as any).__uniqueID);
              
              // Descartar qualquer seleção anterior
              canvas.discardActiveObject();
              canvas.renderAll();
              
              // Garantir seleção do texto correto
              canvas.setActiveObject(itext);
              canvas.renderAll();
              
              // Verificar se realmente é o objeto ativo
              const activeNow = canvas.getActiveObject();
              console.log('Objeto ativo após seleção:', activeNow);
              console.log('É o mesmo objeto?', activeNow === itext);
              
              // Entrar em modo de edição
              itext.enterEditing();
              itext.selectAll();
              
              // Guardar referência do texto em edição
              currentEditingText = itext;
              
              // Focar no canvas wrapper para capturar teclas
              if (canvas.wrapperEl) {
                canvas.wrapperEl.focus();
                console.log('Canvas wrapper focado para edição');
              }
              
              // Notificar seleção
              onObjectSelected(itext);
            }, 200);
          }
        } else {
          clickCount = 0;
        }
      });
      
      // Atualizar quando o texto for modificado
      let textChangeTimer: NodeJS.Timeout | null = null;
      canvas.on('text:changed', (e) => {
        console.log('Texto modificado:', e);
        const target = e.target;
        if (target && (target.type === 'i-text' || target.type === 'textbox')) {
          onObjectSelected(target);
          
          // Para listas, atualizar marcadores após mudanças
          const listTextbox = target as any;
          if (listTextbox.listType && listTextbox.listType !== 'none' && listTextbox.isEditing) {
            // Cancelar timer anterior se existir
            if (textChangeTimer) {
              clearTimeout(textChangeTimer);
            }
            
            // Aguardar um pouco antes de reprocessar para evitar muitas atualizações
            textChangeTimer = setTimeout(() => {
              // Salvar posição atual do cursor
              const currentPos = listTextbox.selectionStart || 0;
              const currentText = listTextbox.text || '';
              
              // Encontrar posição relativa na linha atual
              const textBeforeCursor = currentText.substring(0, currentPos);
              const linesBeforeCursor = textBeforeCursor.split('\n');
              const currentLineIndex = linesBeforeCursor.length - 1;
              const lastLine = linesBeforeCursor[linesBeforeCursor.length - 1];
              const cleanLastLine = lastLine.replace(/^[\s]*[•▸\d]+\.?\s*/, '');
              const posInCleanLine = cleanLastLine.length;
              
              // Salvar posição para restaurar após reprocessamento
              listTextbox._pendingCursorLine = currentLineIndex;
              listTextbox._pendingCursorPos = posInCleanLine;
              
              // Reprocessar lista
              if (listTextbox.updateListProperties) {
                listTextbox.updateListProperties({});
              }
            }, 300);
          }
        }
      });
      
      // Evento para quando entrar/sair do modo de edição
      canvas.on('text:editing:entered', (e) => {
        console.log('Entrou em modo de edição:', e);
        const target = e.target as fabric.Textbox;
        if (target) {
          // Atualizar referência do texto em edição
          currentEditingText = target;
          console.log('Texto em edição atualizado:', (target as any).__uniqueID);
          
          if (target.hiddenTextarea) {
            console.log('Forçando foco no textarea durante editing:entered');
            target.hiddenTextarea.focus();
          }
        }
      });
      
      canvas.on('text:editing:exited', (e) => {
        console.log('Saiu do modo de edição:', e);
        // Limpar referência quando sair de edição
        currentEditingText = null;
      });
      
      // Sair do modo de edição ao clicar em outro lugar
      canvas.on('mouse:down', (opt) => {
        if (!opt.target) {
          // Clicou no canvas vazio - sair de edição
          const objects = canvas.getObjects();
          objects.forEach(obj => {
            if ((obj.type === 'i-text' || obj.type === 'textbox')) {
              const textObj = obj as fabric.Textbox;
              if (textObj.isEditing) {
                textObj.exitEditing();
              }
            }
          });
        } else if (opt.target && (opt.target.type === 'i-text' || opt.target.type === 'textbox')) {
          // Clicou em um texto - garantir que outros textos saiam de edição
          const clickedText = opt.target as fabric.Textbox;
          const objects = canvas.getObjects();
          
          objects.forEach(obj => {
            if ((obj.type === 'i-text' || obj.type === 'textbox') && obj !== clickedText) {
              const textObj = obj as fabric.Textbox;
              if (textObj.isEditing) {
                console.log('Saindo de edição ao clicar em outro texto:', textObj.text);
                textObj.exitEditing();
              }
            }
          });
        }
      });
      
      // Debug - verificar se algo está bloqueando a edição
      canvas.on('mouse:up', (e) => {
        if (e.target && e.target.type === 'i-text') {
          console.log('Mouse up em IText, editable:', (e.target as fabric.IText).editable);
          console.log('isEditing:', (e.target as fabric.IText).isEditing);
        }
      });
      
      // Adicionar listener de teclado direto no canvas wrapper
      const canvasWrapper = canvas.wrapperEl;
      if (canvasWrapper) {
        // Adicionar identificação única para cada canvas
        canvasWrapper.setAttribute('data-page-id', pageId);
        canvasWrapper.tabIndex = 1; // Tornar focável
        
        // Criar um input oculto para capturar caracteres compostos
        const hiddenInput = document.createElement('input');
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.left = '-9999px';
        hiddenInput.style.opacity = '0';
        hiddenInput.setAttribute('type', 'text');
        canvasWrapper.appendChild(hiddenInput);
        
        // Variável para rastrear se estamos em composição
        let isComposing = false;
        let compositionText = '';
        
        // Eventos de composição para acentos
        hiddenInput.addEventListener('compositionstart', () => {
          isComposing = true;
          compositionText = '';
          console.log('Iniciando composição');
        });
        
        hiddenInput.addEventListener('compositionupdate', (e) => {
          compositionText = (e as CompositionEvent).data || '';
          console.log('Atualizando composição:', compositionText);
        });
        
        hiddenInput.addEventListener('compositionend', (e) => {
          isComposing = false;
          const finalText = (e as CompositionEvent).data || '';
          console.log('Finalizando composição:', finalText);
          
          // Sempre pegar o objeto ativo atual
          const activeObject = canvas.getActiveObject();
          if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
            const textObj = activeObject as fabric.Textbox;
            if (textObj.isEditing && finalText) {
              const currentText = textObj.text || '';
              const selectionStart = textObj.selectionStart || 0;
              const selectionEnd = textObj.selectionEnd || 0;
              
              const newText = currentText.slice(0, selectionStart) + finalText + currentText.slice(selectionEnd);
              textObj.set('text', newText);
              textObj.setSelectionStart(selectionStart + finalText.length);
              textObj.setSelectionEnd(selectionStart + finalText.length);
              
              canvas.renderAll();
              hiddenInput.value = '';
            }
          }
        });
        
        canvasWrapper.addEventListener('keydown', (e) => {
          // Sempre pegar o objeto ativo atual
          const activeObject = canvas.getActiveObject();
          console.log('Objeto ativo no keydown:', activeObject);
          
          if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
            const textObj = activeObject as fabric.Textbox;
            console.log('isEditing:', textObj.isEditing, 'ID do objeto:', (textObj as any).__uniqueID);
            console.log('Tecla pressionada no canvas wrapper:', e.key);
            console.log('Texto ativo:', textObj.text);
            
            // Focar no input oculto para capturar acentos
            if (!isComposing) {
              hiddenInput.focus();
              hiddenInput.value = '';
            }
            
            // Não processar teclas durante composição
            if (isComposing) {
              return;
            }
            
            // Manipular atalhos de teclado
            if (e.ctrlKey || e.metaKey) {
              if (e.key === 'a' || e.key === 'A') {
                // Selecionar tudo
                e.preventDefault();
                textObj.selectAll();
                canvas.renderAll();
                return;
              } else if (e.key === 'c' || e.key === 'C') {
                // Copiar
                e.preventDefault();
                if (textObj.selectionStart !== textObj.selectionEnd) {
                  const selectedText = textObj.text.substring(textObj.selectionStart || 0, textObj.selectionEnd || 0);
                  navigator.clipboard.writeText(selectedText);
                }
                return;
              } else if (e.key === 'x' || e.key === 'X') {
                // Recortar
                e.preventDefault();
                if (textObj.selectionStart !== textObj.selectionEnd) {
                  const selectedText = textObj.text.substring(textObj.selectionStart || 0, textObj.selectionEnd || 0);
                  navigator.clipboard.writeText(selectedText);
                  
                  // Remover texto selecionado
                  const currentText = textObj.text || '';
                  const selectionStart = textObj.selectionStart || 0;
                  const selectionEnd = textObj.selectionEnd || 0;
                  const newText = currentText.slice(0, selectionStart) + currentText.slice(selectionEnd);
                  textObj.set('text', newText);
                  textObj.setSelectionStart(selectionStart);
                  textObj.setSelectionEnd(selectionStart);
                  
                  // Atualizar lista se necessário
                  const listTextbox = textObj as any;
                  if (listTextbox.listType && listTextbox.listType !== 'none' && listTextbox.updateListProperties) {
                    setTimeout(() => {
                      listTextbox._pendingCursorLine = Math.max(0, newText.substring(0, selectionStart).split('\n').length - 1);
                      listTextbox._pendingCursorPos = selectionStart - newText.lastIndexOf('\n', selectionStart - 1) - 1;
                      listTextbox.updateListProperties({});
                    }, 10);
                  }
                  
                  canvas.renderAll();
                }
                return;
              } else if (e.key === 'v' || e.key === 'V') {
                // Colar
                e.preventDefault();
                navigator.clipboard.readText().then(pastedText => {
                  if (!pastedText) return;
                  
                  const currentText = textObj.text || '';
                  const selectionStart = textObj.selectionStart || 0;
                  const selectionEnd = textObj.selectionEnd || 0;
                  
                  // Para listas, processar o texto colado
                  const listTextbox = textObj as any;
                  if (listTextbox.listType && listTextbox.listType !== 'none') {
                    // Limpar o texto colado de marcadores e ponto-e-vírgulas
                    const cleanPastedText = cleanListMarkers(pastedText);
                    
                    // Limpar o texto atual também
                    const cleanCurrentText = currentText.replace(/^[\s]*[•▸\d]+\.?\s*/gm, '');
                    
                    // Calcular posição no texto limpo
                    const textBeforeSelection = currentText.substring(0, selectionStart);
                    const linesBeforeSelection = textBeforeSelection.split('\n');
                    let cleanSelectionStart = 0;
                    
                    // Mapear posição para o texto limpo
                    for (let i = 0; i < linesBeforeSelection.length - 1; i++) {
                      const cleanLine = linesBeforeSelection[i].replace(/^[\s]*[•▸\d]+\.?\s*/, '');
                      cleanSelectionStart += cleanLine.length + 1;
                    }
                    const lastLine = linesBeforeSelection[linesBeforeSelection.length - 1];
                    const cleanLastLine = lastLine.replace(/^[\s]*[•▸\d]+\.?\s*/, '');
                    cleanSelectionStart += cleanLastLine.length;
                    
                    // Inserir texto limpo na posição correta
                    const newCleanText = cleanCurrentText.slice(0, cleanSelectionStart) + cleanPastedText + cleanCurrentText.slice(cleanSelectionStart);
                    textObj.set('text', newCleanText);
                    
                    // Calcular nova posição do cursor
                    const newCursorPos = cleanSelectionStart + cleanPastedText.length;
                    
                    // Reprocessar lista
                    if (listTextbox.updateListProperties) {
                      setTimeout(() => {
                        const lines = newCleanText.substring(0, newCursorPos).split('\n');
                        listTextbox._pendingCursorLine = lines.length - 1;
                        const lastLine = lines[lines.length - 1];
                        listTextbox._pendingCursorPos = lastLine.length;
                        listTextbox.updateListProperties({});
                      }, 10);
                    }
                  } else {
                    // Texto normal
                    const newText = currentText.slice(0, selectionStart) + pastedText + currentText.slice(selectionEnd);
                    textObj.set('text', newText);
                    textObj.setSelectionStart(selectionStart + pastedText.length);
                    textObj.setSelectionEnd(selectionStart + pastedText.length);
                  }
                  
                  canvas.renderAll();
                }).catch(err => {
                  console.error('Erro ao colar:', err);
                });
                return;
              }
            }
            
            // Manipular teclas especiais
            if (e.key === 'Backspace') {
              // Apagar caractere
              const currentText = textObj.text || '';
              const selectionStart = textObj.selectionStart || 0;
              const selectionEnd = textObj.selectionEnd || 0;
              
              if (selectionStart !== selectionEnd) {
                // Apagar seleção
                const newText = currentText.slice(0, selectionStart) + currentText.slice(selectionEnd);
                textObj.set('text', newText);
                textObj.setSelectionStart(selectionStart);
                textObj.setSelectionEnd(selectionStart);
              } else if (selectionStart > 0) {
                // Apagar caractere anterior
                const newText = currentText.slice(0, selectionStart - 1) + currentText.slice(selectionStart);
                textObj.set('text', newText);
                textObj.setSelectionStart(selectionStart - 1);
                textObj.setSelectionEnd(selectionStart - 1);
              }
              
              canvas.renderAll();
              e.preventDefault();
            } else if (e.key === 'Enter') {
              // Adicionar nova linha
              const currentText = textObj.text || '';
              const selectionStart = textObj.selectionStart || 0;
              const selectionEnd = textObj.selectionEnd || 0;
              
              // Verificar se o textbox tem propriedades de lista
              const listTextbox = textObj as any;
              if (listTextbox.listType && listTextbox.listType !== 'none') {
                // Primeiro, limpar o texto de marcadores existentes
                const cleanText = currentText.replace(/^[\s]*[•▸\d]+\.?\s*/gm, '');
                const cleanLines = cleanText.split('\n');
                
                // Encontrar em qual linha limpa estamos
                let cleanLineIndex = 0;
                let posInCleanLine = 0;
                
                // Mapear posição do cursor no texto com marcadores para o texto limpo
                const textBeforeCursor = currentText.substring(0, selectionStart);
                const linesBeforeCursor = textBeforeCursor.split('\n');
                
                for (let i = 0; i < linesBeforeCursor.length - 1; i++) {
                  cleanLineIndex++;
                }
                
                // Posição na última linha (linha atual)
                const lastLine = linesBeforeCursor[linesBeforeCursor.length - 1];
                const cleanLastLine = lastLine.replace(/^[\s]*[•▸\d]+\.?\s*/, '');
                posInCleanLine = cleanLastLine.length;
                
                const currentCleanLine = cleanLines[cleanLineIndex] || '';
                
                if (currentCleanLine.trim() === '' && cleanLineIndex > 0) {
                  // Se a linha atual está vazia, remover ela e sair do modo lista
                  cleanLines.splice(cleanLineIndex, 1);
                  const newCleanText = cleanLines.join('\n');
                  textObj.set('text', newCleanText);
                  
                  // Calcular nova posição do cursor
                  let newCursorPos = 0;
                  for (let i = 0; i < cleanLineIndex; i++) {
                    newCursorPos += cleanLines[i].length + 1;
                  }
                  
                  textObj.setSelectionStart(newCursorPos - 1);
                  textObj.setSelectionEnd(newCursorPos - 1);
                } else {
                  // Inserir nova linha no texto limpo
                  const beforeLine = currentCleanLine.substring(0, posInCleanLine);
                  const afterLine = currentCleanLine.substring(posInCleanLine);
                  
                  cleanLines[cleanLineIndex] = beforeLine;
                  cleanLines.splice(cleanLineIndex + 1, 0, afterLine);
                  
                  const newCleanText = cleanLines.join('\n');
                  
                  // Atualizar o texto limpo primeiro
                  textObj.set('text', newCleanText);
                  
                  // Calcular onde o cursor deve estar no texto limpo
                  let newCursorPos = 0;
                  for (let i = 0; i <= cleanLineIndex; i++) {
                    newCursorPos += cleanLines[i].length + 1;
                  }
                  
                  // Aplicar marcadores e calcular nova posição
                  if (listTextbox.updateListProperties) {
                    // Salvar que queremos posicionar o cursor no início da próxima linha
                    listTextbox._pendingCursorLine = cleanLineIndex + 1;
                    listTextbox._pendingCursorPos = 0;
                    listTextbox.updateListProperties({});
                  }
                }
              } else {
                // Texto normal sem lista
                const newText = currentText.slice(0, selectionStart) + '\n' + currentText.slice(selectionEnd);
                textObj.set('text', newText);
                textObj.setSelectionStart(selectionStart + 1);
                textObj.setSelectionEnd(selectionStart + 1);
              }
              
              canvas.renderAll();
              e.preventDefault();
            }
          }
        });
        
        // Capturar input real (incluindo acentos)
        hiddenInput.addEventListener('input', (e) => {
          // Não processar durante composição
          if (isComposing) {
            return;
          }
          
          // Sempre pegar o objeto ativo atual
          const activeObject = canvas.getActiveObject();
          if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
            const textObj = activeObject as fabric.Textbox;
            if (textObj.isEditing) {
              const inputValue = (e.target as HTMLInputElement).value;
              
              // Verificar se é um caractere normal (não acento)
              if (inputValue && inputValue.length === 1 && !['´', '`', '^', '~', '¨'].includes(inputValue)) {
                const currentText = textObj.text || '';
                const selectionStart = textObj.selectionStart || 0;
                const selectionEnd = textObj.selectionEnd || 0;
                
                const newText = currentText.slice(0, selectionStart) + inputValue + currentText.slice(selectionEnd);
                textObj.set('text', newText);
                textObj.setSelectionStart(selectionStart + inputValue.length);
                textObj.setSelectionEnd(selectionStart + inputValue.length);
                
                canvas.renderAll();
                
                // Limpar o input
                (e.target as HTMLInputElement).value = '';
              }
            }
          }
        });
      }
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.off('mouse:wheel');
          fabricCanvasRef.current.off('selection:created');
          fabricCanvasRef.current.off('selection:updated');
          fabricCanvasRef.current.off('selection:cleared');
          fabricCanvasRef.current.off('mouse:down');
          fabricCanvasRef.current.off('text:changed');
          fabricCanvasRef.current.off('text:editing:entered');
          fabricCanvasRef.current.off('text:editing:exited');
          fabricCanvasRef.current.off('mouse:up');
          
          if (fabricCanvasRef.current.upperCanvasEl) {
            fabricCanvasRef.current.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          }
          if (fabricCanvasRef.current.lowerCanvasEl) {
            fabricCanvasRef.current.lowerCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          }
          const wrapperEl = fabricCanvasRef.current.wrapperEl;
          if (wrapperEl) {
            wrapperEl.removeEventListener('contextmenu', handleContextMenu);
          }
        }
      };
    }

    return () => {
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.error('Error disposing canvas:', error);
        }
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateCanvasSize(orientation, zoomLevel);
  }, [orientation, zoomLevel]);

  const handleZoomChange = (value: number[]) => {
    onZoomChange(value[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const imageUrl = e.dataTransfer.getData('imageUrl');
    const imageName = e.dataTransfer.getData('imageName');
    if (imageUrl) {
      addImageToCanvas(imageUrl, imageName);
      return;
    }
    
    const shapeType = e.dataTransfer.getData('shapeType');
    if (shapeType && fabricCanvasRef.current) {
      // Get shape settings from parent
      const shapeSettings = {
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0,
        opacity: 100,
        cornerRadius: 0
      };
      addShapeToCanvas(shapeType as any, shapeSettings);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Orientation toggle */}
        <div className="inline-flex rounded-lg border bg-gray-100 dark:bg-gray-800 p-1">
          <Button
            size="sm"
            variant={orientation === 'landscape' ? 'default' : 'ghost'}
            onClick={() => onOrientationChange('landscape')}
            className="h-8 px-3"
            aria-label="A4 Horizontal"
          >
            <RectangleHorizontal className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={orientation === 'portrait' ? 'default' : 'ghost'}
            onClick={() => onOrientationChange('portrait')}
            className="h-8 px-3"
            aria-label="A4 Vertical"
          >
            <RectangleVertical className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onZoomChange(Math.max(30, zoomLevel - 1))}
            className="h-6 w-6 p-0"
            disabled={zoomLevel <= 30}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Slider
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
            min={30}
            max={300}
            step={1}
            className="w-32"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onZoomChange(Math.min(300, zoomLevel + 1))}
            className="h-6 w-6 p-0"
            disabled={zoomLevel >= 300}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 min-w-[3rem] text-right">{zoomLevel}%</span>
        </div>
      </div>
      
      {/* Canvas container */}
      <div 
        className={`flex-1 min-h-0 border rounded-lg bg-gray-100 dark:bg-gray-800 p-4 overflow-auto relative transition-colors ${
          isDragging ? 'border-primary border-2' : ''
        } ${!isActive ? 'opacity-0 pointer-events-none' : ''}`}
        data-page-active={isActive}
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          // Prevenir que o modal capture eventos de teclado quando estiver editando texto
          e.stopPropagation();
        }}
        onKeyUp={(e) => {
          e.stopPropagation();
        }}
        onKeyPress={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative">
            <canvas 
              ref={canvasRef}
              style={{ 
                maxWidth: 'none', 
                maxHeight: 'none',
                position: 'relative',
                zIndex: 10
              }}
            />
            {isLoadingCanvas && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                <div className="bg-white p-3 rounded-lg shadow-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';

export default CanvasEditor;