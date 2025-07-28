import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Upload, Trash2, Image as ImageIcon, Loader2, ChevronDown, ChevronUp, FileImage, Type, RectangleHorizontal, RectangleVertical, ZoomIn, ZoomOut, Frame, Square, Circle, Triangle, Minus, Shapes } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/general-components/ConfirmDialog';
import * as fabric from 'fabric';

interface Image {
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

interface ImageListResponse {
  total: number;
  rows: Image[];
}

interface ImageFormData {
  name: string;
  type: string;
  image: File | null;
}

const ImageManager: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const imageType = 'certificate'; // Tipo fixo como certificado
  const [currentPage, setCurrentPage] = useState(0);
  const selectedType = 'certificate'; // Filtro fixo para certificados
  const [isFormCollapsed, setIsFormCollapsed] = useState(true);
  const [canvasOrientation, setCanvasOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: fabric.Object | null }>({ x: 0, y: 0, target: null });
  const [showContextMenu, setShowContextMenu] = useState(false);
  
  // Shape control states
  const [shapeSettings, setShapeSettings] = useState({
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    opacity: 100,
    cornerRadius: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const queryClient = useQueryClient();

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

  // Mutation for uploading image
  const uploadMutation = useMutation({
    mutationFn: async (data: ImageFormData) => {
      return await post<ImageFormData>('images', '', data);
    },
    onSuccess: () => {
      toast.success('Imagem enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setSelectedFile(null);
      setImageName('');
    },
    onError: () => {
      toast.error('Erro ao enviar imagem');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Sempre sugere o nome do arquivo sem extensão
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setImageName(nameWithoutExtension);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !imageName) {
      toast.error('Por favor, selecione um arquivo e forneça um nome');
      return;
    }

    const formData: ImageFormData = {
      image: selectedFile,
      name: imageName,
      type: imageType
    };

    uploadMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Ref to keep track of current zoom level in event handlers
  const zoomLevelRef = useRef(zoomLevel);
  const orientationRef = useRef(canvasOrientation);
  
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);
  
  useEffect(() => {
    orientationRef.current = canvasOrientation;
  }, [canvasOrientation]);
  


  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if clicking on the context menu itself
      if (target.closest('.context-menu')) {
        return;
      }
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      // Add a small delay to prevent immediate closing
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

  const updateCanvasSize = useCallback((orientation: 'landscape' | 'portrait', customZoom?: number) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    
    // A4 size in pixels at 72 DPI
    const baseScale = 0.6; // Base scale to fit in view
    const zoomScale = customZoom ? customZoom / 100 : zoomLevelRef.current / 100;
    const finalScale = baseScale * zoomScale;
    
    const a4Width = 842;
    const a4Height = 595;

    if (orientation === 'landscape') {
      canvas.setDimensions({
        width: a4Width * finalScale,
        height: a4Height * finalScale
      });
    } else {
      canvas.setDimensions({
        width: a4Height * finalScale,
        height: a4Width * finalScale
      });
    }
    
    // Update background rectangle if it exists
    const bgRect = canvas.getObjects().find(obj => obj.name === 'backgroundRect');
    if (bgRect) {
      bgRect.set({
        width: canvas.width,
        height: canvas.height
      });
    }
    
    // Reset zoom to 1 since we're scaling the canvas itself
    canvas.setZoom(1);
    canvas.renderAll();
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#e5e7eb',
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = canvas;
      
      // Create background rectangle (A4 shape)
      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width || 842 * 0.6,
        height: canvas.height || 595 * 0.6,
        fill: 'white',
        selectable: false,
        evented: false,
        name: 'backgroundRect'
      });
      
      canvas.add(bgRect);
      
      // Set initial A4 landscape size (in pixels at 72 DPI)
      updateCanvasSize('landscape');
      
      // Add keyboard event listener for delete
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvasRef.current) {
          const activeObject = fabricCanvasRef.current.getActiveObject();
          if (activeObject && (activeObject as any).name !== 'backgroundRect') {
            fabricCanvasRef.current.remove(activeObject);
            fabricCanvasRef.current.renderAll();
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Handle right-click via native event on canvas element
      const handleContextMenu = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const mouseEvent = e as MouseEvent;
        console.log('Context menu event triggered');
        
        const pointer = canvas.getPointer(mouseEvent as any);
        const objects = canvas.getObjects();
        let target = null;
        
        // Find object at pointer position
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          if (obj.containsPoint(pointer) && (obj as any).name !== 'backgroundRect') {
            target = obj;
            break;
          }
        }
        
        console.log('Target found:', target);
        
        if (target) {
          setContextMenu({
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
            target: target
          });
          setShowContextMenu(true);
          canvas.setActiveObject(target);
          canvas.renderAll();
        } else {
          setShowContextMenu(false);
        }
        
        return false;
      };
      
      // Ensure event listeners are properly attached
      setTimeout(() => {
        // Add listeners to both canvas elements
        canvas.upperCanvasEl.addEventListener('contextmenu', handleContextMenu);
        canvas.lowerCanvasEl.addEventListener('contextmenu', handleContextMenu);
        
        // Also add to the wrapper element as a fallback
        const wrapperEl = canvas.wrapperEl;
        if (wrapperEl) {
          wrapperEl.addEventListener('contextmenu', handleContextMenu);
        }
      }, 100);
      
      // Add mouse wheel zoom to resize canvas
      const handleWheel = (opt: fabric.TEvent<WheelEvent>) => {
        const delta = opt.e.deltaY;
        let currentZoom = zoomLevelRef.current;
        
        // Adjust zoom based on scroll direction
        if (delta > 0) {
          currentZoom = Math.max(30, currentZoom - 5);
        } else {
          currentZoom = Math.min(300, currentZoom + 5);
        }
        
        setZoomLevel(currentZoom);
        updateCanvasSize(orientationRef.current, currentZoom);
        
        opt.e.preventDefault();
        opt.e.stopPropagation();
      };
      
      canvas.on('mouse:wheel', handleWheel);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Remove with timeout to match the addition
        setTimeout(() => {
          canvas.upperCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          canvas.lowerCanvasEl.removeEventListener('contextmenu', handleContextMenu);
          const wrapperEl = canvas.wrapperEl;
          if (wrapperEl) {
            wrapperEl.removeEventListener('contextmenu', handleContextMenu);
          }
        }, 100);
      };
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [updateCanvasSize]);

  const handleOrientationChange = (orientation: 'landscape' | 'portrait') => {
    setCanvasOrientation(orientation);
    updateCanvasSize(orientation, zoomLevel);
  };

  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0]);
    updateCanvasSize(canvasOrientation, value[0]);
  };

  const handleDeleteFromCanvas = () => {
    if (contextMenu.target && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(contextMenu.target);
      fabricCanvasRef.current.renderAll();
      setShowContextMenu(false);
    }
  };

  const handleApplyAsBackground = async () => {
    if (contextMenu.target && fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const image = contextMenu.target as fabric.FabricImage;
      
      // Find the background rectangle
      const bgRect = canvas.getObjects().find(obj => (obj as any).name === 'backgroundRect') as fabric.Rect;
      
      if (bgRect && image) {
        try {
          // Get the image element
          const imgElement = image.getElement();
          
          // Create pattern from image
          const pattern = new fabric.Pattern({
            source: imgElement,
            repeat: 'no-repeat'
          });
          
          // Calculate scale to fit the rectangle
          const scaleX = bgRect.width! / image.width!;
          const scaleY = bgRect.height! / image.height!;
          const scale = Math.min(scaleX, scaleY);
          
          // Center the pattern
          const offsetX = (bgRect.width! - (image.width! * scale)) / 2;
          const offsetY = (bgRect.height! - (image.height! * scale)) / 2;
          
          pattern.patternTransform = [scale, 0, 0, scale, offsetX, offsetY];
          
          // Apply pattern as fill
          bgRect.set('fill', pattern);
          
          // Remove the original image from canvas
          canvas.remove(image);
          
          canvas.renderAll();
          setShowContextMenu(false);
          
          toast.success('Imagem aplicada ao fundo!');
        } catch (error) {
          console.error('Error applying background:', error);
          toast.error('Erro ao aplicar imagem como fundo');
        }
      }
    }
  };

  // Get context menu items based on object type
  const getContextMenuItems = () => {
    if (!contextMenu.target) return { title: '', items: [] };
    
    const target = contextMenu.target as any;
    // In Fabric.js v6, check the class type
    const isImage = target.constructor.name === 'FabricImage' || target.type === 'image';
    
    if (isImage) {
      return {
        title: 'Ações Rápidas - Imagem',
        items: [
          {
            icon: Frame,
            label: 'Aplicar como fundo',
            action: handleApplyAsBackground,
          },
          {
            icon: Trash2,
            label: 'Excluir do canvas',
            action: handleDeleteFromCanvas,
          },
          // Future items can be added here
          // { icon: Copy, label: 'Duplicar', action: handleDuplicate },
          // { icon: Layers, label: 'Trazer para frente', action: handleBringToFront },
        ]
      };
    }
    
    // Check if it's a shape
    const isShape = ['rectangle', 'circle', 'triangle', 'line', 'rect'].includes(target.name || target.type || '');
    if (isShape) {
      return {
        title: 'Ações Rápidas - Forma',
        items: [
          {
            icon: Trash2,
            label: 'Excluir do canvas',
            action: handleDeleteFromCanvas,
          }
        ]
      };
    }
    
    // Default for any other object type
    return {
      title: 'Ações Rápidas',
      items: [
        {
          icon: Trash2,
          label: 'Excluir',
          action: handleDeleteFromCanvas,
        }
      ]
    };
  };

  const addShapeToCanvas = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line') => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    const size = 100;
    
    let shape: fabric.Object;
    
    const baseProps = {
      left: centerX,
      top: centerY,
      originX: 'center' as const,
      originY: 'center' as const,
      fill: shapeSettings.fill,
      stroke: shapeSettings.stroke,
      strokeWidth: shapeSettings.strokeWidth,
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
          fill: undefined
        });
        break;
        
      default:
        return;
    }
    
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  const addImageToCanvas = (imageUrl: string, imageName: string) => {
    if (!fabricCanvasRef.current) return;

    setIsLoadingCanvas(true);

    // Use fabric's built-in method with CORS enabled
    fabric.FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((fabricImage) => {
      if (!fabricCanvasRef.current) return;
      
      fabricImage.set({
        left: fabricCanvasRef.current.width! / 2,
        top: fabricCanvasRef.current.height! / 2,
        originX: 'center',
        originY: 'center',
        name: imageName
      });
      
      // Scale image to fit within reasonable bounds
      const maxSize = 200;
      if (fabricImage.width! > fabricImage.height!) {
        fabricImage.scaleToWidth(maxSize);
      } else {
        fabricImage.scaleToHeight(maxSize);
      }
      
      fabricCanvasRef.current.add(fabricImage);
      fabricCanvasRef.current.setActiveObject(fabricImage);
      fabricCanvasRef.current.renderAll();
      setIsLoadingCanvas(false);
    }).catch((error) => {
      console.error('Error loading image:', error);
      toast.error('Erro ao carregar imagem no canvas');
      setIsLoadingCanvas(false);
    });
  };

  return (
    <div className="flex gap-6 h-full pt-1 pb-4">
      {/* Left column - Tabs and content */}
      <div className="flex flex-col h-full w-64 border-r pr-2 flex-shrink-0">
        <Tabs defaultValue="images" className="w-full flex flex-col h-full">
          <TabsList className="flex gap-2 w-fit bg-transparent p-0 flex-shrink-0">
            <TabsTrigger value="images" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="shapes" className="data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 data-[state=active]:border-gray-400 w-10 h-10 p-0 rounded-lg border flex items-center justify-center">
              <Shapes className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="images" className="mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
            {/* Upload section */}
            <Card className="overflow-hidden">
              <div 
                className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              >
                <h3 className="text-sm font-semibold">Adicionar Nova Imagem</h3>
                {isFormCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
              {!isFormCollapsed && (
                <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="flex text-xs font-medium mb-1 items-center gap-1">
                  <FileImage className="w-3 h-3" />
                  Arquivo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FileImage className="w-4 h-4 flex-shrink-0" />
                    {selectedFile ? (
                      <span className="truncate">{selectedFile.name}</span>
                    ) : (
                      <span className="text-gray-500 whitespace-nowrap">Escolher imagem</span>
                    )}
                  </label>
                </div>
                {selectedFile && (
                  <p className="text-xs text-gray-400 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </div>
              
              <div>
                <label className="flex text-xs font-medium mb-1 items-center gap-1">
                  <Type className="w-3 h-3" />
                  Nome
                </label>
                <Input
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  placeholder="Nome da imagem"
                  className="text-xs h-8"
                />
              </div>


                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || !imageName || uploadMutation.isPending}
                  className="w-full h-8 text-xs"
                  size="sm"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1.5" />
                  )}
                  Enviar
                </Button>
                </div>
              )}
            </Card>

            {/* Images grid */}
            <div>
              <h3 className="text-base font-semibold mb-4">Imagens Cadastradas</h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : imagesData?.rows && imagesData.rows.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {imagesData.rows.map((image) => (
                <div key={image.id} className="group">
                  <div 
                    className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden border cursor-pointer"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('imageUrl', image.imageUrl);
                      e.dataTransfer.setData('imageName', image.name);
                      e.dataTransfer.effectAllowed = 'copy';
                      setIsDragging(true);
                    }}
                    onDragEnd={() => setIsDragging(false)}
                    onClick={() => addImageToCanvas(image.imageUrl, image.name)}
                  >
                    <img 
                      src={image.imageUrl} 
                      alt={image.name}
                      className={`w-full h-full object-contain transition-opacity duration-200 ${
                        deletingImageId === image.id ? 'opacity-50' : ''
                      }`}
                      loading="lazy"
                    />
                    {deletingImageId === image.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                    <ConfirmDialog
                      title="Excluir Imagem"
                      description={`Tem certeza que deseja excluir a imagem "${image.name}"? Esta ação não pode ser desfeita.`}
                      onConfirm={() => handleDelete(image.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 w-6 h-6 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        onClick={(e) => e.stopPropagation()}
                        disabled={deletingImageId === image.id}
                      >
                        <Trash2 className="w-3 h-3 text-gray-600" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium truncate">{image.name}</p>
                    <p className="text-xs text-gray-500">{image.type}</p>
                    {image.fileSize && (
                      <p className="text-xs text-gray-400">
                        {(image.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhuma imagem cadastrada
                </div>
              )}

              {/* Pagination */}
              {imagesData && imagesData.total > 6 && (
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
            </div>
            </div>
          </TabsContent>
          
          <TabsContent value="shapes" className="mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
              {/* Shape buttons */}
              <Card>
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Formas Geométricas</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => addShapeToCanvas('rectangle')}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('shapeType', 'rectangle');
                        e.dataTransfer.effectAllowed = 'copy';
                        setIsDragging(true);
                      }}
                      onDragEnd={() => setIsDragging(false)}
                    >
                      <Square className="w-6 h-6" />
                      <span className="text-xs">Quadrado</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => addShapeToCanvas('circle')}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('shapeType', 'circle');
                        e.dataTransfer.effectAllowed = 'copy';
                        setIsDragging(true);
                      }}
                      onDragEnd={() => setIsDragging(false)}
                    >
                      <Circle className="w-6 h-6" />
                      <span className="text-xs">Círculo</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => addShapeToCanvas('triangle')}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('shapeType', 'triangle');
                        e.dataTransfer.effectAllowed = 'copy';
                        setIsDragging(true);
                      }}
                      onDragEnd={() => setIsDragging(false)}
                    >
                      <Triangle className="w-6 h-6" />
                      <span className="text-xs">Triângulo</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => addShapeToCanvas('line')}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('shapeType', 'line');
                        e.dataTransfer.effectAllowed = 'copy';
                        setIsDragging(true);
                      }}
                      onDragEnd={() => setIsDragging(false)}
                    >
                      <Minus className="w-6 h-6" />
                      <span className="text-xs">Linha</span>
                    </Button>
                  </div>
                </div>
              </Card>
              
              {/* Shape settings */}
              <Card>
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-semibold">Configurações</h3>
                  
                  {/* Fill color */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Cor de Preenchimento</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={shapeSettings.fill}
                        onChange={(e) => setShapeSettings({ ...shapeSettings, fill: e.target.value })}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Stroke color */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Cor da Borda</label>
                    <input
                      type="color"
                      value={shapeSettings.stroke}
                      onChange={(e) => setShapeSettings({ ...shapeSettings, stroke: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  
                  {/* Stroke width */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Espessura da Borda: {shapeSettings.strokeWidth}px
                    </label>
                    <Slider
                      value={[shapeSettings.strokeWidth]}
                      onValueChange={(value) => setShapeSettings({ ...shapeSettings, strokeWidth: value[0] })}
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Opacity */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Opacidade: {shapeSettings.opacity}%
                    </label>
                    <Slider
                      value={[shapeSettings.opacity]}
                      onValueChange={(value) => setShapeSettings({ ...shapeSettings, opacity: value[0] })}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Border radius */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Arredondamento: {shapeSettings.cornerRadius}px
                    </label>
                    <Slider
                      value={[shapeSettings.cornerRadius]}
                      onValueChange={(value) => setShapeSettings({ ...shapeSettings, cornerRadius: value[0] })}
                      min={0}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right column - Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Controls */}
        <div className="mb-4 flex items-center justify-between gap-4 flex-shrink-0">
          {/* Orientation toggle */}
          <div className="inline-flex rounded-lg border bg-gray-100 dark:bg-gray-800 p-1">
            <Button
              size="sm"
              variant={canvasOrientation === 'landscape' ? 'default' : 'ghost'}
              onClick={() => handleOrientationChange('landscape')}
              className="h-8 px-3"
              aria-label="A4 Horizontal"
            >
              <RectangleHorizontal className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={canvasOrientation === 'portrait' ? 'default' : 'ghost'}
              onClick={() => handleOrientationChange('portrait')}
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
              onClick={() => {
                const newZoom = Math.max(30, zoomLevel - 1);
                setZoomLevel(newZoom);
                updateCanvasSize(canvasOrientation, newZoom);
              }}
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
              onClick={() => {
                const newZoom = Math.min(300, zoomLevel + 1);
                setZoomLevel(newZoom);
                updateCanvasSize(canvasOrientation, newZoom);
              }}
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
          className={`flex-1 border rounded-lg bg-gray-100 dark:bg-gray-800 p-4 overflow-hidden relative transition-colors ${
            isDragging ? 'border-primary border-2' : ''
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            return false;
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            
            // Check if it's an image
            const imageUrl = e.dataTransfer.getData('imageUrl');
            const imageName = e.dataTransfer.getData('imageName');
            if (imageUrl) {
              addImageToCanvas(imageUrl, imageName);
              setIsDragging(false);
              return;
            }
            
            // Check if it's a shape
            const shapeType = e.dataTransfer.getData('shapeType');
            if (shapeType) {
              addShapeToCanvas(shapeType as 'rectangle' | 'circle' | 'triangle' | 'line');
              setIsDragging(false);
              return;
            }
            
            setIsDragging(false);
          }}
        >
          <div className="absolute inset-4 flex items-center justify-center overflow-hidden">
            <div className="relative">
              <canvas 
                ref={canvasRef}
                style={{ maxWidth: 'none', maxHeight: 'none' }}
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
      
      {/* Context Menu */}
      {showContextMenu && (() => {
        const menuData = getContextMenuItems();
        return (
          <div
            className="context-menu fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              left: `${contextMenu.x - 10}px`,
              top: `${contextMenu.y - 10}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground border-b bg-muted/30">
              {menuData.title}
            </div>
            
            {/* Menu Items */}
            <div className="p-0.5">
              {menuData.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-1.5 py-0.5 text-[10px] outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      item.action();
                      setShowContextMenu(false);
                    }}
                  >
                    <Icon className="mr-1 h-2.5 w-2.5" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ImageManager;