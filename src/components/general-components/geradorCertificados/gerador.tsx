import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Loader2, Shapes, Frame, Trash2, Type, Layers } from 'lucide-react';
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

// Hooks
import { useCanvas } from './hooks/useCanvas';

// Types
import { ImageListResponse, ShapeSettings, ContextMenuData } from './types';

const GeradorCertificados: React.FC = () => {
  const imageType = 'certificate';
  const selectedType = 'certificate';
  const [currentPage, setCurrentPage] = useState(0);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData>({ x: 0, y: 0, target: null });
  const [showContextMenu, setShowContextMenu] = useState(false);
  
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
    addTextToCanvas
  } = useCanvas();

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
    console.log('selectedShape changed to:', selectedShape);
    selectedShapeRef.current = selectedShape;
  }, [selectedShape]);

  // Function to apply settings to shape immediately
  const updateShapeSettings = (newSettings: Partial<ShapeSettings>) => {
    console.log('updateShapeSettings called with:', newSettings);
    console.log('Current selectedShapeRef:', selectedShapeRef.current);
    
    // Update state
    setShapeSettings(prev => ({ ...prev, ...newSettings }));
    
    // Apply to shape using ref
    const shape = selectedShapeRef.current;
    const canvasRef = getCurrentCanvasRef();
    const canvas = canvasRef?.getCanvas();
    
    if (shape && canvas) {
      const mergedSettings = { ...shapeSettings, ...newSettings };
      const shapeWithName = shape as fabric.Object & { name?: string };
      
      console.log('Applying settings to shape:', mergedSettings);
      
      if (shapeWithName.name === 'line' || shape.type === 'line') {
        shape.set({
          stroke: mergedSettings.stroke,
          strokeWidth: mergedSettings.strokeWidth,
          opacity: mergedSettings.opacity / 100
        });
      } else {
        shape.set({
          fill: mergedSettings.fill,
          stroke: mergedSettings.stroke,
          strokeWidth: mergedSettings.strokeWidth,
          opacity: mergedSettings.opacity / 100
        });
        
        if (shapeWithName.name === 'rectangle' && shape.type === 'rect') {
          (shape as fabric.Rect).set({
            rx: mergedSettings.cornerRadius,
            ry: mergedSettings.cornerRadius
          });
        }
      }
      
      shape.setCoords();
      canvas.renderAll();
      console.log('Shape updated successfully');
    } else {
      console.log('No shape selected or canvas not ready');
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
    console.log('Object selected:', obj);
    console.log('Object type:', obj.type);
    console.log('Object ID:', (obj as any).__uniqueID);
    console.log('Object name:', (obj as any).name);
    
    // Check if it's a text object
    if (obj.type === 'i-text' || obj.type === 'textbox') {
      console.log('Atualizando selectedText para:', (obj as any).__uniqueID);
      setSelectedText(obj as fabric.Textbox);
      setSelectedShape(null);
      selectedShapeRef.current = null;
    } else {
      setSelectedShape(obj);
      selectedShapeRef.current = obj;
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
    console.log('Selection cleared');
    setSelectedShape(null);
    selectedShapeRef.current = null;
    setSelectedText(null);
  };

  const handleContextMenu = (e: MouseEvent, target: fabric.Object | null) => {
    console.log('Context menu event:', e, target);
    
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
    const canvasRef = getCurrentCanvasRef();
    const canvas = canvasRef?.getCanvas();
    if (canvas) {
      // Pegar o objeto atualmente selecionado no canvas
      const activeObject = canvas.getActiveObject();
      console.log('Objeto ativo no canvas:', activeObject);
      
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
        const textObj = activeObject as any;
        console.log('Atualizando texto:', textObj.__uniqueID);
        console.log('Settings:', settings);
        
        // Check if it's a ListTextbox
        if (textObj.updateListProperties) {
          // Update list-specific properties
          const listProps: any = {};
          if ('listType' in settings) listProps.listType = settings.listType;
          if ('listIndent' in settings) listProps.listIndent = settings.listIndent;
          if ('listItemSpacing' in settings) listProps.listItemSpacing = settings.listItemSpacing;
          
          if (Object.keys(listProps).length > 0) {
            textObj.updateListProperties(listProps);
          }
        }
        
        // Update text properties
        Object.entries(settings).forEach(([key, value]) => {
          if (key === 'letterSpacing') {
            textObj.set('charSpacing', value);
          } else if (key === 'text') {
            textObj.set('text', value);
          } else if (!['listType', 'listIndent', 'listItemSpacing'].includes(key)) {
            textObj.set(key as keyof fabric.Textbox, value);
          }
        });
        
        textObj.setCoords();
        canvas.renderAll();
      } else {
        console.log('Nenhum texto ativo no canvas');
      }
    } else {
      console.log('Canvas não encontrado');
    }
  };

  const menuData = getContextMenuItems();

  return (
    <div className="flex gap-6 h-full pt-1 pb-4 overflow-hidden">
      {/* Left column - Tabs and content */}
      <div className="flex flex-col h-full w-64 border-r pr-2 flex-shrink-0">
        <Tabs defaultValue="layers" className="w-full flex flex-col h-full">
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
    </div>
  );
};

export default GeradorCertificados;