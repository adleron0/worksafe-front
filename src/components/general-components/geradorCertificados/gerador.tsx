import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Image as ImageIcon, Loader2, Shapes, Frame, Trash2, Type, Layers, Copy, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as fabric from 'fabric';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Components
import ImageUploadForm from './components/ImageUploadForm';
import ImageGrid from './components/ImageGrid';
import ShapesPanel from './components/ShapesPanel';
import TextPanel from './components/TextPanel';
import CanvasEditor from './components/CanvasEditor';
import ContextMenu from './components/ContextMenu';
import LayersPanel from './components/LayersPanel';
import PageControls from './components/PageControls';
import PlaceholderPanel from './components/PlaceholderPanel';
import { CertificateToolbar } from './components/CertificateToolbar';
import { CertificateSaveModal } from './components/CertificateSaveModal';
// import TestProxyImage from './components/TestProxyImage'; // Componente de teste do proxy

// Hooks
import { useCanvas } from './hooks/useCanvas';
import { useCertificateApi } from './hooks/useCertificateApi';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { applyFontOverrides } from './utils/fontConfig';
import { loadAllFonts, ensureFontLoaded, clearFabricFontCache } from './utils/fontLoader';

// Types
import { ImageListResponse, ShapeSettings, ContextMenuData, isTextObject } from './types';

// Templates
import { certificateTemplates, TemplateGrid } from './templates';
import type { CertificateTemplate } from './templates';

interface GeradorCertificadosProps {
  editingData?: {
    id: number;
    name: string;
    courseId: number;
    companyId: number;
    fabricJsonFront: any;
    fabricJsonBack: any | null;
  };
  onClose?: () => void;
}

const GeradorCertificados: React.FC<GeradorCertificadosProps> = ({ editingData, onClose }) => {
  const imageType = 'certificate';
  const selectedType = 'certificate';
  const [currentPage, setCurrentPage] = useState(0);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData>({ x: 0, y: 0, target: null });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Certificate management states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [certificateInfo, setCertificateInfo] = useState<{
    id?: number;
    name?: string;
    courseId?: number;
    companyId?: number;
    isModified?: boolean;
  }>(editingData ? {
    id: editingData.id,
    name: editingData.name,
    courseId: editingData.courseId,
    companyId: editingData.companyId,
    isModified: false
  } : {});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false); // Loading state for template
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(!!editingData); // Skeleton display state
  
  // Shape control states
  const [shapeSettings, setShapeSettings] = useState<ShapeSettings>({
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 0,
    opacity: 100,
    cornerRadius: 0
  });
  const [selectedShape, setSelectedShape] = useState<fabric.Object | null>(null);
  const selectedShapeRef = useRef<fabric.Object | null>(null);
  const [selectedText, setSelectedText] = useState<fabric.Textbox | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(editingData ? 'layers' : 'templates');
  const [isPlaceholderOpen, setIsPlaceholderOpen] = useState(false);
  const [showTemplateConfirmDialog, setShowTemplateConfirmDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  const queryClient = useQueryClient();

  // Carregar fontes do Google no início
  useEffect(() => {
    loadAllFonts()
      .then(() => setFontsLoaded(true))
      .catch(() => setFontsLoaded(true)); // Continuar mesmo com erro
  }, []);
  
  // Canvas hook
  const {
    pages,
    currentPageIndex,
    setCurrentPageIndex,
    addPage,
    removePage,
    registerCanvasRef,
    getCurrentCanvasRef,
    setCanvasOrientation,
    setZoomLevel,
    isLoadingCanvas,
    isDragging,
    setIsDragging,
    handleApplyAsBackground,
    handleDeleteFromCanvas,
    handleDuplicateObject,
    addImageToCanvas,
    addShapeToCanvas,
    addTextToCanvas,
    addPlaceholderToCanvas,
    exportToPDF,
    getCanvasData,
    loadCanvasData
  } = useCanvas();
  
  // Certificate API hook
  const {
    createCertificate,
    updateCertificate,
    prepareDataForSave
  } = useCertificateApi();

  // Undo/Redo — rastrear canvas ativo e conectar ao hook de histórico
  const [activeCanvas, setActiveCanvas] = useState<fabric.Canvas | null>(null);

  useEffect(() => {
    const canvasRef = getCurrentCanvasRef();
    if (canvasRef) {
      const canvas = canvasRef.getCanvas();
      setActiveCanvas(canvas ?? null);
    } else {
      setActiveCanvas(null);
    }
  }, [getCurrentCanvasRef, currentPageIndex]);

  const { undo, redo, canUndo, canRedo } = useCanvasHistory(activeCanvas);

  // Atalhos de teclado para Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;

      // Se um texto está em modo edição, deixar o Fabric.js tratar internamente
      if (activeCanvas) {
        const activeObj = activeCanvas.getActiveObject();
        if (isTextObject(activeObj)) {
          if (activeObj.isEditing) return;
        }
      }

      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [activeCanvas, undo, redo]);

  // Sincronizar selectedText com o objeto real no canvas usando o ID
  useEffect(() => {
    if (selectedTextId) {
      const canvasRef = getCurrentCanvasRef();
      if (canvasRef) {
        const canvas = canvasRef.getCanvas();
        const objects = canvas.getObjects();
        const textObj = objects.find((obj: fabric.Object) =>
          isTextObject(obj) &&
          (obj as any).__uniqueID === selectedTextId
        ) as fabric.Textbox | undefined;
        
        if (textObj) {
          setSelectedText(textObj);
        } else {
          setSelectedText(null);
        }
      }
    } else {
      setSelectedText(null);
    }
  }, [selectedTextId, getCurrentCanvasRef, currentPageIndex]);

  // Adicionar listener direto ao canvas para garantir detecção de seleção
  useEffect(() => {
    const canvasRef = getCurrentCanvasRef();
    if (canvasRef) {
      const canvas = canvasRef.getCanvas();
      if (!canvas) return;

      const handleDirectSelection = () => {
        const activeObj = canvas.getActiveObject();
        if (isTextObject(activeObj)) {
          const textId = (activeObj as any).__uniqueID || `text_${Date.now()}`;

          if (!(activeObj as any).__uniqueID) {
            (activeObj as any).__uniqueID = textId;
          }

          setSelectedTextId(textId);
          setSelectedText(activeObj);
        }
      };

      // Adicionar múltiplos listeners para garantir detecção
      canvas.on('selection:created', handleDirectSelection);
      canvas.on('selection:updated', handleDirectSelection);
      canvas.on('mouse:up', () => {
        setTimeout(handleDirectSelection, 50);
      });
      
      return () => {
        canvas.off('selection:created', handleDirectSelection);
        canvas.off('selection:updated', handleDirectSelection);
        canvas.off('mouse:up');
      };
    }
  }, [getCurrentCanvasRef, currentPageIndex]);

  // Quando a aba de texto ficar ativa, sincronizar seleção imediatamente
  useEffect(() => {
    if (activeTab === 'text') {
      const canvasRef = getCurrentCanvasRef();
      if (canvasRef) {
        const canvas = canvasRef.getCanvas();
        const activeObj = canvas.getActiveObject();

        if (isTextObject(activeObj)) {
          const textId = (activeObj as any).__uniqueID || `text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          if (!(activeObj as any).__uniqueID) {
            (activeObj as any).__uniqueID = textId;
          }
          setSelectedTextId(textId);
          setSelectedText(activeObj);
        }
      }
    }
  }, [activeTab, getCurrentCanvasRef]);


  // Query for fetching images
  const { data: imagesData, isLoading } = useQuery({
    queryKey: ['images', currentPage, selectedType],
    queryFn: async () => {
      const params = [
        { key: 'page', value: currentPage.toString() },
        { key: 'limit', value: '6' }
      ];

      const response = await get<ImageListResponse>('images', '', params);

      // Verificar se a resposta é um array direto (sem wrapper)
      let processedResponse: ImageListResponse;

      if (Array.isArray(response)) {
        // Se for um array direto, criar a estrutura esperada
        processedResponse = {
          images: response as any,
          total: (response as any).length,
          rows: response as any
        };
      } else if (response && 'rows' in response) {
        // Se já tem a estrutura esperada, mas garantir que images exista
        processedResponse = {
          images: (response as any).images || (response as any).rows || [],
          total: (response as any).total || 0,
          rows: (response as any).rows || []
        };
      } else if (response && typeof response === 'object') {
        // Tentar encontrar os dados em outras propriedades
        const possibleDataKeys = ['data', 'items', 'results', 'images'];
        let foundData = null;

        for (const key of possibleDataKeys) {
          if (key in response && Array.isArray((response as any)[key])) {
            foundData = (response as any)[key];
            break;
          }
        }

        if (foundData) {
          processedResponse = {
            images: foundData,
            total: foundData.length,
            rows: foundData
          };
        } else {
          // Se não encontrar, assumir estrutura vazia
          processedResponse = { images: [], total: 0, rows: [] };
        }
      } else {
        // Fallback para estrutura vazia
        processedResponse = { images: [], total: 0, rows: [] };
      }

      // NÃO processar URLs aqui para manter as imagens aparecendo na galeria
      // O proxy será aplicado apenas quando adicionar ao canvas
      return processedResponse;
    }
  });

  // Mutation for deleting image
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingImageId(id);
      return await del('images', `${id}`);
    },
    onSuccess: () => {
      toast.success('Imagem removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setDeletingImageId(null);
    },
    onError: () => {
      toast.error('Erro ao remover imagem');
      setDeletingImageId(null);
    }
  });

  // Update shape ref when selection changes
  useEffect(() => {
    selectedShapeRef.current = selectedShape;
  }, [selectedShape]);

  // Function to apply settings to shape immediately
  const updateShapeSettings = (newSettings: Partial<ShapeSettings>) => {
    // Update state
    setShapeSettings(prev => ({ ...prev, ...newSettings }));
    
    // Get canvas and active object directly
    const canvasRef = getCurrentCanvasRef();
    const canvas = canvasRef?.getCanvas();
    
    if (!canvas) {
      return;
    }
    
    // Get the currently selected object from canvas
    const activeObject = canvas.getActiveObject();
    
    if (activeObject && activeObject.type !== 'i-text' && activeObject.type !== 'textbox') {
      const mergedSettings = { ...shapeSettings, ...newSettings };
      const shapeWithName = activeObject as fabric.Object & { name?: string };
      
      // Don't update background objects
      if (shapeWithName.name === 'backgroundRect' || shapeWithName.name === 'backgroundImage') {
        return;
      }
      
      if (shapeWithName.name === 'line' || activeObject.type === 'line') {
        activeObject.set({
          stroke: mergedSettings.stroke,
          strokeWidth: mergedSettings.strokeWidth,
          opacity: mergedSettings.opacity / 100
        });
      } else {
        activeObject.set({
          fill: mergedSettings.fill,
          stroke: mergedSettings.stroke,
          strokeWidth: mergedSettings.strokeWidth,
          opacity: mergedSettings.opacity / 100
        });
        
        if ((shapeWithName.name === 'rectangle' || activeObject.type === 'rect') && 'rx' in activeObject) {
          const rect = activeObject as fabric.Rect;

          const cornerRadius = mergedSettings.cornerRadius || 0;

          // Armazenar o novo raio base
          (rect as any)._baseRadius = cornerRadius;

          // Obter dimensões atuais com escala
          const width = rect.width! * rect.scaleX!;
          const height = rect.height! * rect.scaleY!;

          // Calcular proporções para manter cantos circulares
          const widthRatio = width / Math.max(width, height);
          const heightRatio = height / Math.max(width, height);

          // Aplicar compensação proporcional
          rect.set({
            rx: cornerRadius * heightRatio,
            ry: cornerRadius * widthRatio
          });
        } else if (shapeWithName.name === 'triangle' || activeObject.type === 'triangle') {
          // Triângulos - apenas atualizar propriedades básicas
          // Fabric.js não suporta arredondamento em triângulos
        }
      }

      activeObject.setCoords();
      canvas.renderAll();
      
      // Update the ref to keep it in sync
      selectedShapeRef.current = activeObject;
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) {
        return;
      }
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('contextmenu', handleClickOutside);
      }, 50);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('contextmenu', handleClickOutside);
      };
    }
  }, [showContextMenu]);

  const handleObjectSelected = useCallback((obj: fabric.Object) => {
    // Check if it's a text object
    if (isTextObject(obj)) {
      // Usar ID para garantir referência correta
      const textId = (obj as any).__uniqueID || `text_${Date.now()}`;
      if (!(obj as any).__uniqueID) {
        (obj as any).__uniqueID = textId;
      }

      setSelectedTextId(textId);
      setSelectedShape(null);
      selectedShapeRef.current = null;
    } else {
      setSelectedShape(obj);
      selectedShapeRef.current = obj;
      setSelectedTextId(null);
      setSelectedText(null);

      // Get current shape settings
      const fill = obj.fill as string || '#000000';
      const stroke = obj.stroke as string || '#000000';
      const strokeWidth = obj.strokeWidth || 0;
      const opacity = (obj.opacity || 1) * 100;

      // Get corner radius for rectangles
      let cornerRadius = 0;
      if (obj.type === 'rect') {
        const rect = obj as fabric.Rect;
        // Tentar obter o raio base armazenado ou usar o rx atual
        cornerRadius = (rect as any)._baseRadius || rect.rx || rect.ry || 0;
      }

      // Update settings to match selected shape
      const newSettings = {
        fill: fill === 'transparent' ? 'transparent' : fill,
        stroke,
        strokeWidth,
        opacity,
        cornerRadius
      };
      setShapeSettings(newSettings);
    }
  }, []);

  const handleSelectionCleared = useCallback(() => {
    setSelectedShape(null);
    selectedShapeRef.current = null;
    setSelectedTextId(null);
    setSelectedText(null);
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent, target: fabric.Object | null) => {
    if (target) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        target: target
      });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
    }
  }, []);

  const getContextMenuItems = () => {
    if (!contextMenu.target) return { title: '', items: [] };
    
    const target = contextMenu.target as fabric.Object & { name?: string; constructor: { name: string } };
    const isImage = target.constructor.name === 'FabricImage' || target.type === 'image';
    
    if (isImage) {
      return {
        title: 'Ações Rápidas - Imagem',
        items: [
          {
            icon: Copy,
            label: 'Duplicar',
            action: () => handleDuplicateObject(contextMenu.target!),
          },
          {
            icon: Frame,
            label: 'Aplicar como fundo',
            action: () => handleApplyAsBackground(contextMenu.target!),
          },
          {
            icon: Trash2,
            label: 'Excluir do canvas',
            action: () => handleDeleteFromCanvas(contextMenu.target!),
          },
        ]
      };
    }
    
    const targetName = target.name || target.type || '';
    const isShape = ['rectangle', 'circle', 'triangle', 'line', 'rect'].includes(targetName);
    if (isShape) {
      return {
        title: 'Ações Rápidas - Forma',
        items: [
          {
            icon: Copy,
            label: 'Duplicar',
            action: () => handleDuplicateObject(contextMenu.target!),
          },
          {
            icon: Trash2,
            label: 'Excluir do canvas',
            action: () => handleDeleteFromCanvas(contextMenu.target!),
          }
        ]
      };
    }
    
    return {
      title: 'Ações Rápidas',
      items: [
        {
          icon: Copy,
          label: 'Duplicar',
          action: () => handleDuplicateObject(contextMenu.target!),
        },
        {
          icon: Trash2,
          label: 'Excluir',
          action: () => handleDeleteFromCanvas(contextMenu.target!),
        }
      ]
    };
  };

  const handleDragStart = (e: React.DragEvent, imageUrl: string, imageName: string) => {
    e.dataTransfer.setData('imageUrl', imageUrl);
    e.dataTransfer.setData('imageName', imageName);
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleShapeDragStart = (e: React.DragEvent, shapeType: string) => {
    e.dataTransfer.setData('shapeType', shapeType);
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleAddText = (text: string, settings: any) => {
    addTextToCanvas(text, settings);
  };

  const handleUpdateText = (settings: Partial<any>) => {
    const canvasRef = getCurrentCanvasRef();
    const canvas = canvasRef?.getCanvas();

    if (!canvas) {
      return;
    }

    // Pegar o objeto atualmente selecionado no canvas
    const activeObject = canvas.getActiveObject();

    if (isTextObject(activeObject)) {
      const textObj = activeObject as fabric.Textbox & {
        updateListProperties?: (props: Record<string, unknown>) => void;
        charSpacing?: number;
      };

      // Check if it's a ListTextbox
      if (textObj.updateListProperties) {
        // Update list-specific properties
        const listProps: Record<string, unknown> = {};
        if ('listType' in settings) listProps.listType = settings.listType;
        if ('listIndent' in settings) listProps.listIndent = settings.listIndent;
        if ('listItemSpacing' in settings) listProps.listItemSpacing = settings.listItemSpacing;

        if (Object.keys(listProps).length > 0) {
          textObj.updateListProperties(listProps);
        }
      }

      // Update text properties one by one
      if ('letterSpacing' in settings) {
        textObj.set('charSpacing', settings.letterSpacing);
      }
      if ('text' in settings) {
        textObj.set('text', settings.text);
      }
      if ('fontWeight' in settings) {
        // Limpar cache GLOBAL de larguras do Fabric.js para esta fonte
        // (evita reuso de medições feitas com peso diferente ou faux bold)
        clearFabricFontCache(textObj.fontFamily);
        textObj.set('fontWeight', settings.fontWeight);
        textObj.dirty = true;
        textObj._clearCache();
        textObj.initDimensions();
      }
      if ('fontStyle' in settings) {
        textObj.set('fontStyle', settings.fontStyle);
      }
      if ('textAlign' in settings) {
        textObj.set('textAlign', settings.textAlign);
      }
      if ('fill' in settings) {
        textObj.set('fill', settings.fill);
      }
      if ('fontSize' in settings) {
        textObj.set('fontSize', settings.fontSize);
      }
      if ('fontFamily' in settings) {
        const newFont = settings.fontFamily;

        // Aplicar estratégia robusta sempre
        const applyFontChange = async () => {
          // Verificar se a fonte está disponível
          const isFontAvailable = document.fonts.check(`12px "${newFont}"`);

          if (!isFontAvailable) {
            // Aguardar um pouco para a fonte carregar
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // 1. Aplicar fallback temporário
          textObj.set('fontFamily', 'Arial');
          textObj.dirty = true;
          canvas.renderAll();

          // 2. Aguardar frame
          await new Promise(resolve => requestAnimationFrame(resolve));

          // 3. Aplicar nova fonte
          textObj.set('fontFamily', newFont);
          textObj.dirty = true;

          // 4. Forçar limpeza de cache se disponível
          if ('_clearCache' in textObj && typeof textObj['_clearCache' as keyof typeof textObj] === 'function') {
            const clearCacheMethod = textObj['_clearCache' as keyof typeof textObj] as () => void;
            clearCacheMethod.call(textObj);
          }
          textObj.setCoords();

          // 5. Renderizar
          canvas.renderAll();
          canvas.requestRenderAll();
        };

        applyFontChange();
      }
      if ('underline' in settings) {
        textObj.set('underline', settings.underline);
      }
      if ('lineHeight' in settings) {
        textObj.set('lineHeight', settings.lineHeight);
      }
      if ('originY' in settings) {
        textObj.set('originY', settings.originY);
      }
      if ('stroke' in settings) {
        textObj.set('stroke', settings.stroke || '');
      }
      if ('strokeWidth' in settings) {
        textObj.set('strokeWidth', settings.strokeWidth || 0);
      }

      // Force update
      textObj.setCoords();
      canvas.renderAll();
      canvas.requestRenderAll();

      // Update the selected text reference
      setSelectedText(textObj);
    }
  };

  // Carregar dados de edição quando o componente montar e as fontes estiverem carregadas
  useEffect(() => {
    if (editingData && isInitialLoad && fontsLoaded) {
      const loadEditingData = async () => {
        try {
          setIsLoadingTemplate(true); // Start loading
          setShouldShowSkeleton(false); // Hide skeleton to allow canvas to render

          // Garantir que todas as fontes estão carregadas (já deve ter sido feito pelo useEffect inicial)
          await ensureFontLoaded('Bebas Neue');

          // Aguardar o canvas estar pronto
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Parse do JSON se for string
          const fabricJsonFront = typeof editingData.fabricJsonFront === 'string' 
            ? JSON.parse(editingData.fabricJsonFront) 
            : editingData.fabricJsonFront;
          
          const fabricJsonBack = editingData.fabricJsonBack 
            ? (typeof editingData.fabricJsonBack === 'string' 
              ? JSON.parse(editingData.fabricJsonBack) 
              : editingData.fabricJsonBack)
            : null;

          // Usar as dimensões reais do certificado que está sendo editado
          const canvasData = {
            fabricJsonFront,
            fabricJsonBack,
            canvasWidth: (editingData as any).canvasWidth || 842, // Usar dimensão real ou A4 landscape como padrão
            canvasHeight: (editingData as any).canvasHeight || 595
          };

          await loadCanvasData(canvasData);
          
          // Aguardar um pouco para garantir que o canvas foi carregado
          setTimeout(() => {
            const canvasRef = getCurrentCanvasRef();
            if (canvasRef) {
              const canvas = canvasRef.getCanvas();
              const objects = canvas.getObjects();
              
              // Primeiro, configurar propriedades básicas
              objects.forEach((obj: fabric.Object) => {
                if (isTextObject(obj)) {
                  // Salvar o texto original e limpar espaços extras
                  const originalText = obj.text || '';
                  const cleanText = originalText.trim();

                  // Se o texto tem espaços extras, limpar
                  if (originalText !== cleanText) {
                    obj.set('text', cleanText);
                  }

                  // Verificar charSpacing - o problema dos espaços entre letras
                  const currentCharSpacing = (obj as any).charSpacing || 0;

                  // Se charSpacing estiver muito alto, resetar para 0
                  if (currentCharSpacing !== 0) {
                    (obj as any).charSpacing = 0;
                    obj.set('charSpacing' as keyof fabric.Textbox, 0 as any);
                  }

                  // Aplicar overrides de fonte (ex: Bebas Neue)
                  applyFontOverrides(obj);

                  // Configurar propriedades (preservar selectable e evented se já existirem)
                  const currentSelectable = obj.selectable;
                  const currentEvented = obj.evented;
                  obj.set({
                    editable: currentSelectable !== false, // Se estiver bloqueado, não editar
                    selectable: currentSelectable !== false ? true : false, // Preservar estado de bloqueio
                    evented: currentEvented !== false ? true : false, // Preservar estado de eventos
                    hasControls: currentSelectable !== false,
                    hasBorders: currentSelectable !== false
                  });

                  // Recalcular o width baseado no texto real
                  // Isso corrige o problema de espaços em branco extras
                  obj.initDimensions();
                  obj.setCoords();
                }
              });
              
              // Forçar atualização do canvas
              canvas.renderAll();
              canvas.requestRenderAll();
              
              // Depois de um delay, verificar e corrigir fontes se necessário
              setTimeout(() => {
                objects.forEach((obj: fabric.Object) => {
                  if (isTextObject(obj)) {
                    // Marcar como dirty para garantir renderização
                    obj.dirty = true;
                  }
                });

                canvas.renderAll();
              }, 800);
            }
            
            setIsInitialLoad(false);
          }, 500);
        } catch (error) {
          console.error('Erro ao carregar dados do certificado:', error);
          toast.error('Erro ao carregar modelo de certificado');
          setIsInitialLoad(false);
        } finally {
          // Aguardar um pouco para a renderização final antes de remover o loading
          setTimeout(() => {
            setIsLoadingTemplate(false);
          }, 1500);
        }
      };
      
      loadEditingData();
    }
  }, [editingData, loadCanvasData, isInitialLoad, getCurrentCanvasRef, fontsLoaded]);

  // Marcar como modificado quando houver mudanças no canvas
  useEffect(() => {
    const handleCanvasModified = () => {
      if (certificateInfo.id && !isInitialLoad) {
        setCertificateInfo(prev => ({ ...prev, isModified: true }));
      }
    };

    // Adicionar listener para mudanças no canvas
    const canvasRef = getCurrentCanvasRef();
    if (canvasRef) {
      const canvas = canvasRef.getCanvas();
      if (canvas) {
        canvas.on('object:modified', handleCanvasModified);
        canvas.on('object:added', handleCanvasModified);
        canvas.on('object:removed', handleCanvasModified);
        
        return () => {
          canvas.off('object:modified', handleCanvasModified);
          canvas.off('object:added', handleCanvasModified);
          canvas.off('object:removed', handleCanvasModified);
        };
      }
    }
  }, [getCurrentCanvasRef, certificateInfo.id, isInitialLoad]);

  // Função para aplicar template
  const handleApplyTemplate = async (template: CertificateTemplate) => {
    // Se estiver editando um certificado existente, mostrar confirmação
    if (certificateInfo.id) {
      setSelectedTemplate(template);
      setShowTemplateConfirmDialog(true);
    } else {
      // Se for novo certificado, aplicar direto
      await applyTemplate(template);
    }
  };

  // Função auxiliar para aplicar o template
  const applyTemplate = async (template: CertificateTemplate) => {
    try {
      setIsLoadingTemplate(true);
      setShouldShowSkeleton(false);

      // Carregar dados do template no canvas
      await loadCanvasData({
        fabricJsonFront: template.fabricJsonFront,
        fabricJsonBack: template.fabricJsonBack || null,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight
      });

      // Atualizar informações do certificado
      setCertificateInfo(prev => ({
        ...prev,
        // Preservar ID se existir (modo edição)
        id: prev.id,
        // Se não tiver ID (novo), usar nome do template
        name: prev.id ? prev.name : template.name,
        isModified: true
      }));

      // Mudar para aba de layers após aplicar
      setActiveTab('layers');

      toast.success('Modelo aplicado com sucesso!');
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      toast.error('Erro ao aplicar modelo');
    } finally {
      setIsLoadingTemplate(false);
      setShowTemplateConfirmDialog(false);
      setSelectedTemplate(null);
    }
  };

  // Função para confirmar aplicação de template
  const handleConfirmApplyTemplate = async () => {
    if (selectedTemplate) {
      await applyTemplate(selectedTemplate);
    }
  };

  // Função para salvar certificado
  const handleSaveCertificate = async (data: {
    name: string;
    courseId: number;
  }) => {
    const canvasData = getCanvasData();
    if (!canvasData) {
      toast.error('Erro ao obter dados do canvas');
      return;
    }

    const certificateData = prepareDataForSave(
      data.name,
      data.courseId,
      canvasData.fabricJsonFront,
      canvasData.fabricJsonBack,
      canvasData.canvasWidth,
      canvasData.canvasHeight
    );

    try {
      if (certificateInfo.id) {
        // Atualizar certificado existente
        const result = await updateCertificate.mutateAsync({
          id: certificateInfo.id,
          data: certificateData
        });
        
        if (result) {
          setCertificateInfo({
            id: result.id,
            name: result.name,
            courseId: result.courseId,
            companyId: result.companyId,
            isModified: false
          });
          setLastSavedTime(new Date());
        }
      } else {
        // Criar novo certificado
        const result = await createCertificate.mutateAsync(certificateData);
        
        if (result) {
          setCertificateInfo({
            id: result.id,
            name: result.name,
            courseId: result.courseId,
            companyId: result.companyId,
            isModified: false
          });
          setLastSavedTime(new Date());
        }
      }
      
      // Só fechar o modal automaticamente se for criação de novo certificado
      // Em modo de edição, manter aberto para permitir múltiplas edições
      if (!certificateInfo.id) {
        setShowSaveModal(false);
        
        // Se houver callback onClose, chamar após salvar com sucesso
        if (onClose) {
          setTimeout(onClose, 500); // Pequeno delay para permitir que o toast apareça
        }
      }
      // Se for edição, manter o modal aberto mas mostrar feedback
      else {
        toast.success('Certificado atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar certificado:', error);
    }
  };



  const menuData = getContextMenuItems();

  // Loading skeleton component - only show before canvas is ready
  if (shouldShowSkeleton) {
    return (
      <div className="flex flex-col h-full">
        {/* Toolbar Skeleton */}
        <div className="h-14 border-b bg-background flex items-center px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        
        <div className="flex gap-6 flex-1 pt-1 pb-4 overflow-hidden">
          {/* Left Panel Skeleton */}
          <div className="flex flex-col h-full w-64 border-r pr-2 flex-shrink-0">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-10 h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
            <div className="space-y-3 flex-1">
              <div className="h-20 bg-muted animate-pulse rounded" />
              <div className="h-20 bg-muted animate-pulse rounded" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
          
          {/* Canvas Area Skeleton */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 relative overflow-hidden bg-background">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Carregando template...</p>
                  <p className="text-xs text-muted-foreground mt-1">Preparando fontes e elementos</p>
                </div>
              </div>
            </div>
            {/* Page Controls Skeleton */}
            <div className="mt-4 h-12 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Componente de teste do proxy - DESCOMENTAR PARA TESTAR */}
      {/* <div className="bg-yellow-50 border-b border-yellow-200 p-2">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium text-yellow-800">🧪 Teste do Proxy de Imagens (clique para expandir)</summary>
          <div className="mt-2">
            <TestProxyImage />
          </div>
        </details>
      </div> */}
      
      {/* Toolbar */}
      <CertificateToolbar
        onSaveClick={() => setShowSaveModal(true)}
        certificateInfo={certificateInfo}
        isLoading={createCertificate.isPending || updateCertificate.isPending}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <div className="flex gap-6 flex-1 pt-1 pb-4 overflow-hidden">
      {/* Left column - Tabs and content */}
      <div className="flex flex-col h-full w-64 border-r pr-2 flex-shrink-0">
        <Tabs defaultValue={editingData ? "layers" : "templates"} value={activeTab} className="w-full flex flex-col h-full" onValueChange={setActiveTab}>
          <TabsList className="flex gap-2 w-fit bg-transparent p-0 flex-shrink-0">
            <TabsTrigger value="templates" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="shapes" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <Shapes className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <Type className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="layers" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4 flex-1 overflow-y-auto pr-2">
            <TemplateGrid
              templates={certificateTemplates}
              onSelectTemplate={handleApplyTemplate}
              isEditing={!!certificateInfo.id}
            />
          </TabsContent>

          <TabsContent value="layers" className="mt-4 flex-1 overflow-y-auto pr-2">
            <LayersPanel
              canvas={getCurrentCanvasRef()?.getCanvas() || null}
              onDeleteObject={handleDeleteFromCanvas}
              onSelectObject={handleObjectSelected}
            />
          </TabsContent>
          
          <TabsContent value="images" className="mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
              {/* Placeholders Section - Collapsible */}
              <Collapsible
                open={isPlaceholderOpen}
                onOpenChange={setIsPlaceholderOpen}
                className="border rounded-lg"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      isPlaceholderOpen ? 'rounded-b-none' : ''
                    }`}
                  >
                    <span className="font-semibold">Imagens Dinâmicas</span>
                    {isPlaceholderOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 pt-0">
                  <PlaceholderPanel
                    onAddPlaceholder={addPlaceholderToCanvas}
                  />
                </CollapsibleContent>
              </Collapsible>

              <ImageUploadForm imageType={imageType} />

              {/* Images section */}
              <div>
                <h3 className="text-base font-semibold mb-4">Imagens Cadastradas</h3>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : imagesData?.rows && imagesData.rows.length > 0 ? (
                  <>
                    <ImageGrid
                      images={imagesData.rows}
                      deletingImageId={deletingImageId}
                      onImageClick={addImageToCanvas}
                      onImageDelete={(id) => deleteMutation.mutate(id)}
                      onDragStart={handleDragStart}
                      onDragEnd={() => setIsDragging(false)}
                    />

                    {/* Pagination */}
                    {imagesData.total > 6 && (
                      <div className="flex justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                          disabled={currentPage === 0}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-4 text-xs">
                          Página {currentPage + 1} de {Math.ceil(imagesData.total / 6)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={currentPage >= Math.ceil(imagesData.total / 6) - 1}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Nenhuma imagem cadastrada
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="shapes" className="mt-4 flex-1 overflow-y-auto pr-2">
            <ShapesPanel
              shapeSettings={shapeSettings}
              selectedShape={selectedShape}
              onAddShape={(shapeType) => addShapeToCanvas(shapeType, shapeSettings)}
              onUpdateSettings={updateShapeSettings}
              onDragStart={handleShapeDragStart}
              onDragEnd={() => setIsDragging(false)}
            />
          </TabsContent>
          
          <TabsContent value="text" className="mt-4 flex-1 overflow-y-auto pr-2">
            <TextPanel
              selectedText={selectedText}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              canvas={getCurrentCanvasRef()?.getCanvas()}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right column - Canvas and Page Controls */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Canvas for each page */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading overlay - shows on top of canvas while loading */}
          {isLoadingTemplate && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm font-medium">Carregando template...</p>
                <p className="text-xs text-muted-foreground mt-1">Por favor, aguarde</p>
              </div>
            </div>
          )}
          
          {pages.map((page, index) => (
            <div
              key={page.id}
              className={`${index === currentPageIndex ? 'block' : 'hidden'} h-full w-full`}
            >
              <CanvasEditor
                ref={(ref) => {
                  if (ref) {
                    registerCanvasRef(page.id, ref);
                  }
                }}
                pageId={page.id}
                pageIndex={index}
                orientation={page.orientation}
                zoomLevel={page.zoomLevel}
                isDragging={isDragging}
                isLoadingCanvas={isLoadingCanvas && index === currentPageIndex}
                onOrientationChange={setCanvasOrientation}
                onZoomChange={setZoomLevel}
                onObjectSelected={handleObjectSelected}
                onSelectionCleared={handleSelectionCleared}
                onContextMenu={handleContextMenu}
                selectedShapeRef={selectedShapeRef}
                isActive={index === currentPageIndex}
              />
            </div>
          ))}
        </div>
        
        {/* Page Controls - Now at the bottom */}
        <div className="mt-4">
          <PageControls
            pages={pages.map(p => ({ id: p.id, name: `Página ${pages.indexOf(p) + 1}` }))}
            currentPageIndex={currentPageIndex}
            onPageSelect={setCurrentPageIndex}
            onPageAdd={addPage}
            onPageRemove={removePage}
            onExportPDF={exportToPDF}
            maxPages={2}
          />
        </div>
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        show={showContextMenu}
        x={contextMenu.x}
        y={contextMenu.y}
        title={menuData.title}
        items={menuData.items}
        onClose={() => setShowContextMenu(false)}
      />
      
      {/* Save Modal */}
      <CertificateSaveModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveCertificate}
        isLoading={createCertificate.isPending || updateCertificate.isPending}
        defaultValues={{
          name: certificateInfo.name,
          courseId: certificateInfo.courseId
        }}
        mode={certificateInfo.id ? 'update' : 'create'}
        lastSaved={lastSavedTime}
      />

      {/* Template Confirmation Dialog */}
      <AlertDialog open={showTemplateConfirmDialog} onOpenChange={setShowTemplateConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Modelo de Certificado</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação substituirá todo o conteúdo atual do certificado com o modelo selecionado.
              As suas alterações atuais serão perdidas. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApplyTemplate}>
              Aplicar Modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    </div>
  );
};

export default GeradorCertificados;