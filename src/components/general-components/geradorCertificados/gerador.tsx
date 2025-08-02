import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Loader2, Shapes, Frame, Trash2, Type, Layers, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import * as fabric from 'fabric';

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

// Hooks
import { useCanvas } from './hooks/useCanvas';
import { useCertificateApi } from './hooks/useCertificateApi';

// Types
import { ImageListResponse, ShapeSettings, ContextMenuData } from './types';

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
  
  // Certificate management states
  const [showSaveModal, setShowSaveModal] = useState(false);
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
  const [activeTab, setActiveTab] = useState<string>('layers');
  
  const queryClient = useQueryClient();
  
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

  // Sincronizar selectedText com o objeto real no canvas usando o ID
  useEffect(() => {
    if (selectedTextId) {
      const canvasRef = getCurrentCanvasRef();
      if (canvasRef) {
        const canvas = canvasRef.getCanvas();
        const objects = canvas.getObjects();
        const textObj = objects.find((obj: fabric.Object) => 
          (obj.type === 'textbox' || obj.type === 'i-text') && 
          (obj as any).__uniqueID === selectedTextId
        ) as fabric.Textbox | undefined;
        
        if (textObj) {
          console.log('🟪 Objeto de texto encontrado pelo ID:', selectedTextId);
          setSelectedText(textObj);
        } else {
          console.log('🟪 AVISO: Objeto de texto não encontrado para ID:', selectedTextId);
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
      
      const handleDirectSelection = () => {
        const activeObj = canvas.getActiveObject();
        
        if (activeObj && (activeObj.type === 'textbox' || activeObj.type === 'i-text')) {
          const textObj = activeObj as fabric.Textbox;
          const textId = (textObj as any).__uniqueID || `text_${Date.now()}`;
          
          if (!(textObj as any).__uniqueID) {
            (textObj as any).__uniqueID = textId;
          }
          
          setSelectedTextId(textId);
          setSelectedText(textObj);
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

  // Verificar periodicamente quando a aba de texto está ativa
  useEffect(() => {
    if (activeTab === 'text') {
      const checkTextSelection = () => {
        const canvasRef = getCurrentCanvasRef();
        if (canvasRef) {
          const canvas = canvasRef.getCanvas();
          const activeObj = canvas.getActiveObject();
          
          if (activeObj && (activeObj.type === 'textbox' || activeObj.type === 'i-text')) {
            const textObj = activeObj as fabric.Textbox;
            const textId = (textObj as any).__uniqueID;
            
            // Só atualizar se for um texto diferente ou se não há texto selecionado
            if (textId && textId !== selectedTextId) {
              setSelectedTextId(textId);
              setSelectedText(textObj);
            } else if (!textId) {
              // Atribuir ID se não tiver
              const newId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
              (textObj as any).__uniqueID = newId;
              setSelectedTextId(newId);
              setSelectedText(textObj);
            }
          } else if (selectedText && !activeObj) {
            // Se não há objeto ativo mas temos um texto selecionado, limpar
            setSelectedTextId(null);
            setSelectedText(null);
          }
        }
      };
      
      // Verificar imediatamente
      checkTextSelection();
      
      // Verificar a cada 500ms
      const interval = setInterval(checkTextSelection, 500);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [activeTab, getCurrentCanvasRef, selectedTextId, selectedText]);

  // Query for fetching images
  const { data: imagesData, isLoading } = useQuery({
    queryKey: ['images', currentPage, selectedType],
    queryFn: async () => {
      const params = [
        { key: 'page', value: currentPage.toString() },
        { key: 'limit', value: '6' }
      ];
      
      const response = await get<ImageListResponse>('images', '', params);
      console.log('Images API response:', response);
      return response;
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
          (activeObject as fabric.Rect).set({
            rx: mergedSettings.cornerRadius,
            ry: mergedSettings.cornerRadius
          });
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

  const handleObjectSelected = (obj: fabric.Object) => {
    // Check if it's a text object
    if (obj.type === 'i-text' || obj.type === 'textbox') {
      const textObj = obj as fabric.Textbox;
      
      // Usar ID para garantir referência correta
      const textId = (textObj as any).__uniqueID || `text_${Date.now()}`;
      if (!(textObj as any).__uniqueID) {
        (textObj as any).__uniqueID = textId;
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
        cornerRadius = rect.rx || 0;
      }
      
      // Update settings to match selected shape
      setShapeSettings({
        fill,
        stroke,
        strokeWidth,
        opacity,
        cornerRadius
      });
    }
  };

  const handleSelectionCleared = () => {
    setSelectedShape(null);
    selectedShapeRef.current = null;
    setSelectedTextId(null);
    setSelectedText(null);
  };

  const handleContextMenu = (e: MouseEvent, target: fabric.Object | null) => {
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
  };

  const getContextMenuItems = () => {
    if (!contextMenu.target) return { title: '', items: [] };
    
    const target = contextMenu.target as fabric.Object & { name?: string; constructor: { name: string } };
    const isImage = target.constructor.name === 'FabricImage' || target.type === 'image';
    
    if (isImage) {
      return {
        title: 'Ações Rápidas - Imagem',
        items: [
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
    console.log('🔵 handleUpdateText - INÍCIO');
    console.log('🔵 Settings recebidos:', JSON.stringify(settings, null, 2));
    
    const canvasRef = getCurrentCanvasRef();
    console.log('🔵 CanvasRef obtido:', !!canvasRef);
    
    const canvas = canvasRef?.getCanvas();
    console.log('🔵 Canvas obtido:', !!canvas);
    
    if (!canvas) {
      console.log('❌ Canvas não encontrado - abortando');
      return;
    }
    
    // Pegar o objeto atualmente selecionado no canvas
    const activeObject = canvas.getActiveObject();
    console.log('🔵 Objeto ativo:', activeObject);
    console.log('🔵 Tipo do objeto ativo:', activeObject?.type);
    console.log('🔵 Objeto é texto?', activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox'));
    
    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
      const textObj = activeObject as fabric.Textbox & {
        updateListProperties?: (props: Record<string, unknown>) => void;
        charSpacing?: number;
      };
      console.log('✅ Texto encontrado para atualização');
      console.log('🔵 Propriedades ANTES da atualização:', {
        fontFamily: textObj.fontFamily,
        fontSize: textObj.fontSize,
        fontWeight: textObj.fontWeight,
        fontStyle: textObj.fontStyle,
        fill: textObj.fill,
        underline: textObj.underline,
        textAlign: textObj.textAlign,
        lineHeight: textObj.lineHeight,
        charSpacing: textObj.charSpacing
      });
      
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
        textObj.set('fontWeight', settings.fontWeight);
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
        textObj.set('fontFamily', settings.fontFamily);
      }
      if ('underline' in settings) {
        textObj.set('underline', settings.underline);
      }
      if ('lineHeight' in settings) {
        textObj.set('lineHeight', settings.lineHeight);
      }
      
      // Force update
      console.log('🔵 Forçando atualização do canvas...');
      textObj.setCoords();
      canvas.renderAll();
      canvas.requestRenderAll();
      
      console.log('✅ Texto atualizado com sucesso');
      console.log('🔵 Propriedades DEPOIS da atualização:', {
        fontFamily: textObj.fontFamily,
        fontSize: textObj.fontSize,
        fontWeight: textObj.fontWeight,
        fontStyle: textObj.fontStyle,
        fill: textObj.fill,
        underline: textObj.underline,
        textAlign: textObj.textAlign,
        lineHeight: textObj.lineHeight,
        charSpacing: textObj.charSpacing
      });
      console.log('🔵 handleUpdateText - FIM');
      
      // Update the selected text reference
      setSelectedText(textObj);
    } else {
      console.log('❌ Nenhum texto ativo no canvas ou objeto não é texto');
      console.log('🔵 handleUpdateText - FIM (sem texto)');
    }
  };

  // Carregar dados de edição quando o componente montar
  useEffect(() => {
    if (editingData && isInitialLoad) {
      const loadEditingData = async () => {
        try {
          // Parse do JSON se for string
          const fabricJsonFront = typeof editingData.fabricJsonFront === 'string' 
            ? JSON.parse(editingData.fabricJsonFront) 
            : editingData.fabricJsonFront;
          
          const fabricJsonBack = editingData.fabricJsonBack 
            ? (typeof editingData.fabricJsonBack === 'string' 
              ? JSON.parse(editingData.fabricJsonBack) 
              : editingData.fabricJsonBack)
            : null;

          const canvasData = {
            fabricJsonFront,
            fabricJsonBack,
            canvasWidth: 800, // Valores padrão, podem vir do JSON
            canvasHeight: 600
          };
          
          await loadCanvasData(canvasData);
          
          // Aguardar um pouco para garantir que o canvas foi carregado
          setTimeout(() => {
            const canvasRef = getCurrentCanvasRef();
            if (canvasRef) {
              const canvas = canvasRef.getCanvas();
              const objects = canvas.getObjects();
              
              objects.forEach((obj: fabric.Object) => {
                // Garantir que objetos de texto tenham propriedades corretas
                if (obj.type === 'textbox' || obj.type === 'i-text') {
                  const textObj = obj as fabric.Textbox;
                  textObj.set({
                    editable: true,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true
                  });
                }
              });
              
              // Forçar atualização do canvas
              canvas.renderAll();
              canvas.requestRenderAll();
            }
            
            setIsInitialLoad(false);
          }, 500);
        } catch (error) {
          console.error('Erro ao carregar dados do certificado:', error);
          toast.error('Erro ao carregar modelo de certificado');
          setIsInitialLoad(false);
        }
      };
      
      loadEditingData();
    }
  }, [editingData, loadCanvasData, isInitialLoad, getCurrentCanvasRef]);

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
        }
      }
      
      setShowSaveModal(false);
      
      // Se houver callback onClose, chamar após salvar com sucesso
      if (onClose) {
        setTimeout(onClose, 500); // Pequeno delay para permitir que o toast apareça
      }
    } catch (error) {
      console.error('Erro ao salvar certificado:', error);
    }
  };



  const menuData = getContextMenuItems();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <CertificateToolbar
        onSaveClick={() => setShowSaveModal(true)}
        certificateInfo={certificateInfo}
        isLoading={createCertificate.isPending || updateCertificate.isPending}
      />
      
      <div className="flex gap-6 flex-1 pt-1 pb-4 overflow-hidden">
      {/* Left column - Tabs and content */}
      <div className="flex flex-col h-full w-64 border-r pr-2 flex-shrink-0">
        <Tabs defaultValue="layers" value={activeTab} className="w-full flex flex-col h-full" onValueChange={setActiveTab}>
          <TabsList className="flex gap-2 w-fit bg-transparent p-0 flex-shrink-0">
            <TabsTrigger value="layers" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <Layers className="w-4 h-4" />
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
            <TabsTrigger value="placeholder" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <ImagePlus className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="layers" className="mt-4 flex-1 overflow-y-auto pr-2">
            <LayersPanel
              canvas={getCurrentCanvasRef()?.getCanvas() || null}
              onDeleteObject={handleDeleteFromCanvas}
              onSelectObject={handleObjectSelected}
            />
          </TabsContent>
          
          <TabsContent value="images" className="mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
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
            />
          </TabsContent>
          
          <TabsContent value="placeholder" className="mt-4 flex-1 overflow-y-auto pr-2">
            <PlaceholderPanel
              onAddPlaceholder={addPlaceholderToCanvas}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right column - Canvas and Page Controls */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Canvas for each page */}
        <div className="flex-1 relative overflow-hidden">
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
      />
      
    </div>
    </div>
  );
};

export default GeradorCertificados;