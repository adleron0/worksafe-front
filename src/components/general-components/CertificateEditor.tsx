import React, { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import Select from '@/components/general-components/Select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import jsPDF from 'jspdf'
import {
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  Pen,
  Plus,
  Trash2,
  Download,
  Save,
  FileText,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react'

// A4 dimensions in pixels at 72 DPI
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// Certificate format types
type CertificateFormat = 'portrait' | 'landscape';

// Certificate page interface
interface CertificatePage {
  id: string;
  canvas: fabric.Canvas | null;
  background: string | null;
  objects?: fabric.Object[] | object; // Adicionando propriedade para armazenar objetos do canvas
}

// Certificate data for saving
interface CertificateData {
  format: CertificateFormat;
  backgroundColor: string;
  pages: {
    id: string;
    background: string | null;
    objects: unknown;
  }[];
}

// Custom type for fabric objects with data property
interface FabricObjectWithData extends fabric.Object {
  data?: {
    type: string;
  };
}

// Google Font interface
interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
}

// Certificate editor props
interface CertificateEditorProps {
  onSave?: (certificateData: CertificateData) => void;
}

const CertificateEditor: React.FC<CertificateEditorProps> = ({ onSave }) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [format, setFormat] = useState<CertificateFormat>('landscape');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [pages, setPages] = useState<CertificatePage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [textOptions, setTextOptions] = useState({
    fontFamily: 'Arial',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    color: '#000000'
  });
  const [zoom, setZoom] = useState(100);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [googleFonts, setGoogleFonts] = useState<GoogleFont[]>([]);
  const [loadedFonts, setLoadedFonts] = useState<string[]>(['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);

  // Delete selected object
  const deleteSelectedObject = () => {
    if (canvas && selectedObject) {
      canvas.remove(selectedObject);
      canvas.renderAll();
      setSelectedObject(null);
    }
  };

  // Handle delete key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedObject && selectedObject.type === 'i-text' && (selectedObject as fabric.IText).isEditing) {
          return;
        }
        deleteSelectedObject();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedObject]);

  // Fetch Google Fonts
  const fetchGoogleFonts = async () => {
    try {
      setIsLoadingFonts(true);
      // Google Fonts API key - in a real app, this should be stored securely
      const apiKey = 'AIzaSyAOES8EmKhuJEnsn9kS1XKBpxxp-TgN8Jc';
      const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`);
      const data = await response.json();

      if (data.items && Array.isArray(data.items)) {
        // Get the top 10 popular fonts
        const popularFonts = data.items.slice(0, 10);
        
        // Pré-carregue as fontes mais populares para melhorar a experiência do usuário
        const preloadFonts = popularFonts.slice(0, 5);
        preloadFonts.forEach((font: GoogleFont) => {
          // Adicione um link para pré-carregar a fonte
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, '+')}&display=swap`;
          link.as = 'style';
          document.head.appendChild(link);
          
          // Adicione um link para carregar a fonte
          const styleLink = document.createElement('link');
          styleLink.rel = 'stylesheet';
          styleLink.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, '+')}&display=swap`;
          document.head.appendChild(styleLink);
          
          // Adicione à lista de fontes carregadas
          setLoadedFonts(prev => [...prev, font.family]);
        });
        
        setGoogleFonts(popularFonts);
      }
    } catch (error) {
      console.error('Error fetching Google Fonts:', error);
    } finally {
      setIsLoadingFonts(false);
    }
  };

  // Load a Google Font
  const loadGoogleFont = (fontFamily: string) => {
    if (loadedFonts.includes(fontFamily)) {
      return; // Font already loaded
    }

    try {
      // Find the font in our googleFonts array to get its available variants
      const googleFont = googleFonts.find(font => font.family === fontFamily);
      
      if (googleFont) {
        console.log(`Loading font ${fontFamily} with variants:`, googleFont.variants);
        
        // Mapeamento de variantes para pesos e estilos
        const weightMap: Record<string, string> = {
          '100': 'wght@100',
          '200': 'wght@200',
          '300': 'wght@300',
          'light': 'wght@300',
          '400': 'wght@400',
          'regular': 'wght@400',
          '500': 'wght@500',
          '600': 'wght@600',
          '700': 'wght@700',
          'bold': 'wght@700',
          '800': 'wght@800',
          'extrabold': 'wght@800',
          '900': 'wght@900',
        };
        
        // Processar variantes disponíveis
        let axisValues: string[] = [];
        
        // Adicionar pesos
        googleFont.variants.forEach(variant => {
          // Tratar variantes de peso
          if (weightMap[variant]) {
            axisValues.push(weightMap[variant]);
          }
          
          // Tratar variantes de estilo (itálico)
          if (variant.includes('italic')) {
            // Se já tiver um peso, adicione o itálico
            if (variant !== 'italic') {
              const weight = variant.replace('italic', '');
              const weightValue = weight || '400';
              axisValues.push(`wght@${weightValue};ital,1`);
            } else {
              // Apenas itálico
              axisValues.push('ital,1');
            }
          }
        });
        
        // Se não encontrou nenhuma variante específica, use o padrão
        if (axisValues.length === 0) {
          axisValues.push('wght@400');
        }
        
        // Remover duplicatas
        axisValues = [...new Set(axisValues)];
        
        // Criar a URL da fonte usando o formato mais recente da API Google Fonts com variantes específicas
        let fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}`;
        
        // Adicionar as variantes à URL
        if (axisValues.length > 0) {
          fontUrl += `:${axisValues.join(';')}`;
        }
        
        fontUrl += '&display=swap';
        
        // Create a link element for the Google Font
        const link = document.createElement('link');
        link.href = fontUrl;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        console.log(`Font URL: ${link.href}`);
      } else {
        // If not a Google Font, just add a basic link
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      // Add to loaded fonts
      setLoadedFonts(prev => [...prev, fontFamily]);
    } catch (error) {
      console.error(`Error loading font ${fontFamily}:`, error);
    }
  };

  // Fetch Google Fonts on component mount
  useEffect(() => {
    fetchGoogleFonts();
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !canvas) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: backgroundColor,
        preserveObjectStacking: true,
        selection: true,
        width: format === 'portrait' ? A4_WIDTH : A4_HEIGHT,
        height: format === 'portrait' ? A4_HEIGHT : A4_WIDTH,
      });

      // Set up event listeners
      fabricCanvas.on('selection:created', handleSelectionChange);
      fabricCanvas.on('selection:updated', handleSelectionChange);
      fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

      setCanvas(fabricCanvas);

      // Create initial page
      const initialPage: CertificatePage = {
        id: generateId(),
        canvas: fabricCanvas,
        background: null
      };

      setPages([initialPage]);

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, []);

  // Handle format change
  useEffect(() => {
    if (canvas) {
      const width = format === 'portrait' ? A4_WIDTH : A4_HEIGHT;
      const height = format === 'portrait' ? A4_HEIGHT : A4_WIDTH;

      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.setDimensions({ width, height });

      // Update canvas center
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.renderAll();
    }
  }, [format, canvas]);

  // Handle zoom change
  useEffect(() => {
    if (canvas) {
      const zoomFactor = zoom / 100;
      canvas.setZoom(zoomFactor);
      canvas.renderAll();
    }
  }, [zoom, canvas]);

  // Efeito para carregar a página quando o currentPageIndex muda
  // Isso garante que após excluir uma página, a nova página atual seja carregada corretamente
  useEffect(() => {
    if (canvas && pages.length > 0 && currentPageIndex >= 0 && currentPageIndex < pages.length) {
      // Clear canvas
      canvas.clear();

      // Load page data
      const page = pages[currentPageIndex];

      // Definir a cor de fundo do canvas
      canvas.backgroundColor = backgroundColor;

      // Carregar os objetos da página, se existirem
      if (page.objects) {
        try {
          const objects = typeof page.objects === 'string' ? page.objects : JSON.stringify(page.objects);
          canvas.loadFromJSON(objects, () => {
            canvas.renderAll();
          });
        } catch (error) {
          console.error("Error loading page objects:", error);
        }
      }

      // Carregar o background após os objetos para garantir que ele fique atrás
      // Passando false como segundo argumento para evitar atualização do estado e loop infinito
      if (page.background) {
        setBackgroundImage(page.background, false);
      }
    }
  }, [currentPageIndex, pages, canvas, backgroundColor]);

  // Handle selection change
  const handleSelectionChange = (e: { selected: FabricObjectWithData[] }) => {
    const selectedObject = e.selected[0];
    setSelectedObject(selectedObject);

    // Update text options if text is selected
    if (selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'i-text')) {
      const textObj = selectedObject as fabric.IText;
      setTextOptions({
        fontFamily: textObj.fontFamily || 'Arial',
        fontSize: textObj.fontSize || 20,
        fontWeight: String(textObj.fontWeight || 'normal'),
        fontStyle: textObj.fontStyle as 'normal' | 'italic',
        textAlign: textObj.textAlign as 'left' | 'center' | 'right',
        color: textObj.fill?.toString() || '#000000'
      });
    }
  };

  // Generate unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Add new page
  const addPage = () => {
    if (canvas) {
      // Save current canvas state
      saveCurrentPage();

      // Create new page
      const newPage: CertificatePage = {
        id: generateId(),
        canvas: null,
        background: null,
        objects: { objects: [] } // Inicializar com um objeto vazio para evitar problemas
      };

      // Adicionar a nova página ao array de páginas
      const updatedPages = [...pages, newPage];
      setPages(updatedPages);

      // Definir o índice da nova página
      const newPageIndex = updatedPages.length - 1;

      // Limpar o canvas para a nova página
      canvas.clear();
      canvas.backgroundColor = backgroundColor;
      canvas.renderAll();

      // Atualizar o índice da página atual
      setCurrentPageIndex(newPageIndex);
    }
  };

  // Save current page state
  const saveCurrentPage = () => {
    if (canvas && pages[currentPageIndex]) {
      const updatedPages = [...pages];
      
      // Salvar a representação JSON do canvas em vez do objeto canvas
      const canvasJSON = canvas.toJSON();
      
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        canvas: null,
        background: pages[currentPageIndex].background,
        objects: canvasJSON
      };

      setPages(updatedPages);
    }
  };

  // Navigate to page
  const navigateToPage = (index: number) => {
    if (index >= 0 && index < pages.length && canvas) {
      // Save current page
      saveCurrentPage();

      // Atualizar o índice da página atual
      setCurrentPageIndex(index);
      
      // O useEffect que monitora currentPageIndex irá carregar a página
    }
  };

  // Delete current page
  const deletePage = () => {
    if (pages.length > 1) {
      // Salvar a página atual antes de excluir
      saveCurrentPage();
      
      // Criar uma cópia das páginas
      const updatedPages = [...pages];
      
      // Remover a página atual
      updatedPages.splice(currentPageIndex, 1);
      
      // Determinar o novo índice (página anterior ou primeira página)
      let newIndex = currentPageIndex > 0 ? currentPageIndex - 1 : 0;

      // Se a página atual for a última, e for deletada, o novo índice deve ser o da página anterior
      if (currentPageIndex >= updatedPages.length) {
        newIndex = updatedPages.length - 1;
      }
      
      // Limpar o canvas antes de atualizar o estado
      if (canvas) {
        canvas.clear();
        canvas.backgroundColor = backgroundColor;
        canvas.renderAll();
      }

      // Atualizar o estado com as páginas atualizadas e o novo índice
      setPages(updatedPages);
      setCurrentPageIndex(newIndex);
    }
  };

  // Add text
  const addText = () => {
    if (canvas) {
      const text = new fabric.IText('Edit this text', {
        left: 100,
        top: 100,
        fontFamily: textOptions.fontFamily,
        fontSize: textOptions.fontSize,
        fontWeight: textOptions.fontWeight,
        fontStyle: textOptions.fontStyle,
        textAlign: textOptions.textAlign,
        fill: textOptions.color
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
      setSelectedObject(text);
    }
  };

  // Update text properties
  const updateTextProperties = (property: string, value: unknown) => {
    if (canvas && selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'i-text')) {
      const textObj = selectedObject as fabric.IText;

      switch (property) {
        case 'fontFamily':
          if (typeof value === 'string') {
            // Load the font if it's a Google Font
            const googleFont = googleFonts.find(font => font.family === value);
            if (googleFont) {
              loadGoogleFont(value);
            }

            textObj.set({ fontFamily: value });
            setTextOptions({ ...textOptions, fontFamily: value });
          }
          break;
        case 'fontSize':
          if (typeof value === 'number') {
            textObj.set({ fontSize: value });
            setTextOptions({ ...textOptions, fontSize: value });
          }
          break;
        case 'fontWeight':
          if (typeof value === 'string') {
            // Quando o peso da fonte é alterado, recarregue a fonte para garantir que a variante esteja disponível
            const googleFont = googleFonts.find(font => font.family === textObj.fontFamily);
            if (googleFont) {
              // Remova a fonte da lista de fontes carregadas para forçar o recarregamento
              setLoadedFonts(prev => prev.filter(font => font !== textObj.fontFamily));
              // Recarregue a fonte
              loadGoogleFont(textObj.fontFamily as string);
            }
            
            textObj.set({ fontWeight: value });
            setTextOptions({ ...textOptions, fontWeight: value });
          }
          break;
        case 'fontStyle':
          if (typeof value === 'string') {
            textObj.set({ fontStyle: value as 'normal' | 'italic' });
            setTextOptions({ ...textOptions, fontStyle: value as 'normal' | 'italic' });
          }
          break;
        case 'textAlign':
          if (typeof value === 'string') {
            textObj.set({ textAlign: value as 'left' | 'center' | 'right' });
            setTextOptions({ ...textOptions, textAlign: value as 'left' | 'center' | 'right' });
          }
          break;
        case 'color':
          if (typeof value === 'string') {
            textObj.set({ fill: value });
            setTextOptions({ ...textOptions, color: value });
          }
          break;
      }

      canvas.renderAll();
    }
  };

  // Update background color
  const updateBackgroundColor = (color: string) => {
    if (canvas) {
      canvas.backgroundColor = color;
      canvas.renderAll();
      setBackgroundColor(color);
    }
  };

  // Set background image
  const setBackgroundImage = (url: string, updateState = true) => {
    if (canvas) {
      try {
        // Create a new image element
        const imgElement = new Image();
        imgElement.crossOrigin = 'anonymous';

        imgElement.onload = () => {
          // Create a fabric image from the loaded image
          const img = new fabric.Image(imgElement);

          // Scale image to fit canvas while maintaining aspect ratio
          const canvasWidth = canvas.width || A4_WIDTH;
          const canvasHeight = canvas.height || A4_HEIGHT;

          const scaleX = canvasWidth / (img.width || 1);
          const scaleY = canvasHeight / (img.height || 1);
          const scale = Math.min(scaleX, scaleY);

          img.scale(scale);

          // Center the image
          img.set({
            left: (canvasWidth - (img.width || 0) * scale) / 2,
            top: (canvasHeight - (img.height || 0) * scale) / 2,
            selectable: false,
            evented: false
          });

          // Clear existing background objects
          const objects = canvas.getObjects().filter((obj) => {
            const objWithData = obj as FabricObjectWithData;
            return !objWithData.data || objWithData.data.type !== 'background';
          });

          canvas.clear();
          objects.forEach(obj => canvas.add(obj));

          // Add image as background
          (img as FabricObjectWithData).data = { type: 'background' };
          canvas.add(img);
          canvas.backgroundColor = backgroundColor;

          // Send to back
          // Add all objects except the background image to the canvas again
          // This effectively brings them to the front
          canvas.discardActiveObject();
          canvas.renderAll();

          // Apenas atualiza o estado se updateState for true
          // Isso evita o loop infinito quando chamado do useEffect
          if (updateState) {
            const updatedPages = [...pages];
            updatedPages[currentPageIndex] = {
              ...updatedPages[currentPageIndex],
              background: url
            };
            setPages(updatedPages);
          }
        };

        // Set the source to load the image
        imgElement.src = url;
      } catch (error) {
        console.error("Error setting background image:", error);
      }
    }
  };

  // Handle image upload
  const handleImageUpload = (files: File[]) => {
    if (files.length > 0 && canvas) {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        try {
          // Create a new image element
          const imgElement = new Image();
          imgElement.crossOrigin = 'anonymous';

          imgElement.onload = () => {
            // Create a fabric image from the loaded image
            const img = new fabric.Image(imgElement);

            // Scale image to reasonable size
            const maxDimension = 200;
            if (img.width && img.height) {
              if (img.width > img.height && img.width > maxDimension) {
                img.scaleToWidth(maxDimension);
              } else if (img.height > maxDimension) {
                img.scaleToHeight(maxDimension);
              }
            }

            // Center the image
            img.set({
              left: 100,
              top: 100
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            setSelectedObject(img as FabricObjectWithData);
          };

          // Set the source to load the image
          imgElement.src = dataUrl;
        } catch (error) {
          console.error("Error loading image:", error);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  // Handle background upload
  const handleBackgroundUpload = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setBackgroundImage(dataUrl);
      };

      reader.readAsDataURL(file);
    }
  };

  // Add signature field
  const addSignature = () => {
    if (canvas) {
      // Create a signature placeholder
      const rect = new fabric.Rect({
        left: 100,
        top: 400,
        width: 200,
        height: 80,
        fill: 'transparent',
        stroke: '#999',
        strokeDashArray: [5, 5],
        rx: 5,
        ry: 5
      });

      const text = new fabric.Text('Signature', {
        left: 160,
        top: 430,
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#999'
      });

      // Create group
      const group = new fabric.Group([rect, text], {
        left: 100,
        top: 400
      });

      // Add data property
      (group as FabricObjectWithData).data = { type: 'signature' };

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
      setSelectedObject(group as FabricObjectWithData);
    }
  };

  // Save certificate
  const saveCertificate = () => {
    // Save current page first
    saveCurrentPage();

    // Prepare data for saving
    const certificateData: CertificateData = {
      format,
      backgroundColor,
      pages: pages.map(page => ({
        id: page.id,
        background: page.background,
        // Usar os objetos armazenados em vez do canvas
        objects: page.objects || (page.canvas ? page.canvas.toJSON() : { objects: [] })
      }))
    };

    if (onSave) {
      onSave(certificateData);
    }

    // Para desenvolvimento, registre os dados
    console.log('Certificate data:', certificateData);
  };

  // Export current page as PDF
  const exportAsPDF = () => {
    if (canvas) {
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: format,
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      // Get the canvas data as a base64 image
      const dataUrl = canvas.toDataURL({
        format: 'png',
        multiplier: 2
      });

      // Add the image to the PDF
      pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);

      // Save the PDF
      pdf.save(`certificate-page-${currentPageIndex + 1}.pdf`);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar - Tools */}
      <div className="w-64 bg-background border-r p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Certificate Editor</h2>

        <Tabs defaultValue="format">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="format"><LayoutTemplate className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="text"><Type className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="signature"><Pen className="h-4 w-4" /></TabsTrigger>
          </TabsList>

          {/* Format tab */}
          <TabsContent value="format" className="space-y-4">
            <div className="space-y-2">
              <Label>Certificate Format</Label>
              <Select
                name="format"
                state={format}
                onChange={(_, value) => setFormat(value as CertificateFormat)}
                options={[
                  { id: 'portrait', name: 'A4 Retrato' },
                  { id: 'landscape', name: 'A4 Paisagem' }
                ]}
                placeholder="Select format"
              />
            </div>

            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => updateBackgroundColor(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label>Background Image</Label>
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted/50"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-primary');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary');
                      const files = Array.from(e.dataTransfer.files);
                      handleBackgroundUpload(files);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG or JPEG</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleBackgroundUpload([e.target.files[0]]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label>Zoom ({zoom}%)</Label>
              <Slider
                value={[zoom]}
                min={50}
                max={200}
                step={10}
                onValueChange={(value) => setZoom(value[0])}
              />
            </div>
          </TabsContent>

          {/* Text tab */}
          <TabsContent value="text" className="space-y-4">
            <Button onClick={addText} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Text
            </Button>

            {selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'i-text') && (
              <div className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  {isLoadingFonts ? (
                    <div className="text-sm text-muted-foreground">Loading fonts...</div>
                  ) : (
                    <Select
                      name="fontFamily"
                      state={textOptions.fontFamily}
                      onChange={(_, value) => updateTextProperties('fontFamily', value)}
                      options={[
                        // Standard fonts
                        { id: 'Arial', name: 'Arial' },
                        { id: 'Times New Roman', name: 'Times New Roman' },
                        { id: 'Courier New', name: 'Courier New' },
                        { id: 'Georgia', name: 'Georgia' },
                        { id: 'Verdana', name: 'Verdana' },
                        // Google Fonts
                        ...googleFonts.map(font => ({
                          id: font.family,
                          name: font.family
                        }))
                      ]}
                      placeholder="Select font"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Font Weight</Label>
                  <Select
                    name="fontWeight"
                    state={textOptions.fontWeight}
                    onChange={(_, value) => updateTextProperties('fontWeight', value)}
                    options={[
                      { id: 'normal', name: 'Normal' },
                      { id: 'bold', name: 'Bold' }
                    ]}
                    placeholder="Select weight"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={textOptions.fontSize}
                      onChange={(e) => updateTextProperties('fontSize', parseInt(e.target.value))}
                      min={8}
                      max={72}
                    />
                    <Slider
                      value={[textOptions.fontSize as number]}
                      min={8}
                      max={72}
                      step={1}
                      className="flex-1"
                      onValueChange={(value) => updateTextProperties('fontSize', value[0])}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Style</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={textOptions.fontWeight === 'bold' ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        // Alternar entre normal e bold
                        const newWeight = textOptions.fontWeight === 'normal' ? 'bold' : 'normal';
                        updateTextProperties('fontWeight', newWeight);
                      }}
                    >
                      B
                    </Button>
                    <Button
                      variant={textOptions.fontStyle === 'italic' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTextProperties('fontStyle', textOptions.fontStyle === 'italic' ? 'normal' : 'italic')}
                    >
                      I
                    </Button>
                    <Button
                      variant={textOptions.textAlign === 'left' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTextProperties('textAlign', 'left')}
                    >
                      ←
                    </Button>
                    <Button
                      variant={textOptions.textAlign === 'center' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTextProperties('textAlign', 'center')}
                    >
                      ↔
                    </Button>
                    <Button
                      variant={textOptions.textAlign === 'right' ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTextProperties('textAlign', 'right')}
                    >
                      →
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <Input
                    type="color"
                    value={textOptions.color}
                    onChange={(e) => updateTextProperties('color', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Image tab */}
          <TabsContent value="image" className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted/50"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-primary');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary');
                  const files = Array.from(e.dataTransfer.files);
                  handleImageUpload(files);
                }}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG or JPEG</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageUpload([e.target.files[0]]);
                    }
                  }}
                />
              </label>
            </div>

            {selectedObject && selectedObject.type === 'image' && (
              <div className="space-y-3 mt-4">
                <Button
                  variant="destructive"
                  onClick={deleteSelectedObject}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Image
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Signature tab */}
          <TabsContent value="signature" className="space-y-4">
            <Button onClick={addSignature} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Signature Field
            </Button>

            {selectedObject && (selectedObject as FabricObjectWithData).data?.type === 'signature' && (
              <div className="space-y-3 mt-4">
                <Button
                  variant="destructive"
                  onClick={deleteSelectedObject}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Signature
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-auto space-y-2">
          <Button
            variant="outline"
            onClick={deleteSelectedObject}
            disabled={!selectedObject}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
          </Button>

          <Button onClick={saveCertificate} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Save Certificate
          </Button>

          <Button variant="outline" onClick={exportAsPDF} className="w-full">
            <Download className="h-4 w-4 mr-2" /> Export Current Page
          </Button>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 bg-muted p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span>
              Page {currentPageIndex + 1} of {pages.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addPage}
            >
              <FileText className="h-4 w-4 mr-1" /> Add Page
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={deletePage}
              disabled={pages.length <= 1}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete Page
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 bg-background rounded-lg flex items-center justify-center overflow-auto"
        >
          <div className="relative shadow-lg">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateEditor;
