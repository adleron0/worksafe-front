import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Loader2, Shapes, Frame, Trash2, Type, Layers, Copy, FileText, Braces, Sparkles, PanelLeftClose, PanelRightOpen, MousePointerClick, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, AlignCenterHorizontal, AlignCenterVertical, Lock } from 'lucide-react';
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
import SelectionPanel, { EMPTY_SELECTION } from './components/SelectionPanel';
import type { AlignMode } from './components/SelectionPanel';
import { selectBelow } from './hooks/useClickThrough';
import type { SelectionInfo, SelectionKind } from './components/SelectionPanel';
import { CertificateToolbar } from './components/CertificateToolbar';
import { CertificateSaveModal } from './components/CertificateSaveModal';
import VariablesPanel from './components/VariablesPanel';
import PreviewDialog from './components/PreviewDialog';
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


/** Abas da esquerda: cada uma adiciona um tipo de coisa ao certificado. */
const EDITOR_TABS = [
  { value: 'templates', label: 'Modelos', icon: FileText, title: 'Modelos prontos', hint: 'Comece de um modelo — substitui o conteúdo atual.' },
  { value: 'text', label: 'Texto', icon: Type, title: 'Texto', hint: 'Adicione um texto e edite no painel da direita.' },
  { value: 'variables', label: 'Variáveis', icon: Braces, title: 'Variáveis', hint: 'Dados do aluno, turma e instrutor preenchidos na geração. Com um texto selecionado, a variável entra nele.' },
  { value: 'dynamic', label: 'Dinâmicos', icon: Sparkles, title: 'Imagens dinâmicas', hint: 'Foto do aluno, assinaturas, QR Code e selo.' },
  { value: 'images', label: 'Imagens', icon: ImageIcon, title: 'Imagens', hint: 'Envie ou escolha imagens fixas (logos, fundos, ícones).' },
  { value: 'shapes', label: 'Formas', icon: Shapes, title: 'Formas', hint: 'Retângulos, círculos, triângulos e linhas.' },
  { value: 'layers', label: 'Camadas', icon: Layers, title: 'Camadas', hint: 'Ordem, visibilidade e trava de cada elemento.' },
] as const;

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
  /** Avisa quem abriu o editor se há alterações não gravadas (para confirmar ao fechar). */
  onDirtyChange?: (dirty: boolean) => void;
}

const GeradorCertificados: React.FC<GeradorCertificadosProps> = ({ editingData, onClose, onDirtyChange }) => {
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
  // Painéis laterais recolhíveis (lembra a escolha neste navegador)
  const readPanel = (key: string) => {
    try { return localStorage.getItem(key) !== '0'; } catch { return true; }
  };
  const [leftOpen, setLeftOpenState] = useState(() => readPanel('certEditor.left'));
  const [rightOpen, setRightOpenState] = useState(() => readPanel('certEditor.right'));
  const setLeftOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setLeftOpenState((o) => {
      const n = typeof v === 'function' ? v(o) : v;
      try { localStorage.setItem('certEditor.left', n ? '1' : '0'); } catch { /* sem storage */ }
      return n;
    });
  const setRightOpen = (n: boolean) => {
    setRightOpenState(n);
    try { localStorage.setItem('certEditor.right', n ? '1' : '0'); } catch { /* sem storage */ }
  };
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

  // Selo do certificado (marcador "selo_destaque") e sua imagem padrão
  const findSeal = useCallback(
    (canvas: fabric.Canvas | null) =>
      canvas?.getObjects().find((o) => {
        const any = o as unknown as { placeholderType?: string; placeholderName?: string };
        return any.placeholderType === 'selo_destaque' || String(any.placeholderName || '').includes('selo_destaque');
      }) ?? null,
    [],
  );
  const [sealState, setSealState] = useState<{ has: boolean; src: string | null }>({ has: false, src: null });
  useEffect(() => {
    if (!activeCanvas) return;
    const sync = () => {
      const seal = findSeal(activeCanvas) as unknown as { sealDefaultSrc?: string } | null;
      setSealState({ has: !!seal, src: seal?.sealDefaultSrc ?? null });
    };
    sync();
    activeCanvas.on('object:added', sync);
    activeCanvas.on('object:removed', sync);
    return () => {
      activeCanvas.off('object:added', sync);
      activeCanvas.off('object:removed', sync);
    };
  }, [activeCanvas, findSeal]);
  const setSealDefault = (url: string | null) => {
    const seal = findSeal(activeCanvas);
    if (!seal || !activeCanvas) return;
    seal.set({ sealDefaultSrc: url ?? undefined } as never);
    activeCanvas.fire('object:modified', { target: seal } as never);
    setSealState({ has: true, src: url });
  };


  // Espaço de instrutor da seleção (instructorSlot 1–4; a API redistribui os preenchidos).
  // Canvas lido a cada render (como no LayersPanel): o da página pode ser recriado.
  const liveCanvas: fabric.Canvas | null = getCurrentCanvasRef()?.getCanvas() || null;
  const [selection, setSelection] = useState<SelectionInfo>(EMPTY_SELECTION);
  const syncSelection = useCallback(() => {
    const objs = liveCanvas?.getActiveObjects() ?? [];
    // variáveis usadas nos textos da página, para escolher a condição "mostrar só se"
    const vars = new Set<string>();
    liveCanvas?.getObjects().forEach((o) => {
      const text = (o as unknown as { text?: string }).text;
      if (typeof text === 'string') for (const m of text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) vars.add(m[1]);
    });
    if (!objs.length) {
      setSelection({ ...EMPTY_SELECTION, variables: [...vars].sort() });
      return;
    }
    const meta = objs as unknown as Array<{ instructorSlot?: number; showIf?: string }>;
    const slots = new Set(meta.map((o) => o.instructorSlot ?? null));
    const conds = new Set(meta.map((o) => o.showIf || null));
    conds.forEach((c) => c && c.split(',').forEach((k) => vars.add(k.trim())));
    const describe = (o: fabric.Object): { kind: SelectionKind; label: string } => {
      const any = o as unknown as { isPlaceholder?: boolean; placeholderName?: string; placeholderType?: string; name?: string };
      if (any.isPlaceholder || any.placeholderName || any.placeholderType) {
        const n = String(any.placeholderType || any.placeholderName || '');
        const label = n.includes('selo') ? 'Selo' : n.includes('qrcode') ? 'QR Code de validação'
          : n.includes('assinatura') ? `Assinatura ${n.match(/\d+/)?.[0] ?? ''}`.trim() : n.includes('foto') ? 'Foto do aluno' : n || 'Imagem dinâmica';
        return { kind: 'dinamico', label };
      }
      if (isTextObject(o)) {
        const t = String((o as fabric.Textbox).text || '').replace(/\s+/g, ' ').trim();
        return { kind: 'texto', label: t ? (t.length > 40 ? `${t.slice(0, 40)}…` : t) : 'Texto' };
      }
      if (o.type === 'image' || o.constructor.name === 'FabricImage') return { kind: 'imagem', label: any.name && any.name !== 'image' ? any.name : 'Imagem' };
      const shape: Record<string, string> = { rectangle: 'Retângulo', rect: 'Retângulo', circle: 'Círculo', triangle: 'Triângulo', line: 'Linha' };
      return { kind: 'forma', label: shape[any.name || ''] || shape[o.type || ''] || 'Forma' };
    };
    const first = objs.length === 1 ? describe(objs[0]) : { kind: 'varios' as const, label: `${objs.length} elementos` };
    setSelection({
      count: objs.length,
      kind: first.kind,
      label: first.label,
      slot: slots.size > 1 ? 'misto' : [...slots][0],
      showIf: conds.size > 1 ? 'misto' : [...conds][0],
      variables: [...vars].sort(),
      ...(objs.length === 1 && first.label === 'QR Code de validação'
        ? { qrStyle: ((objs[0] as unknown as { qrStyle?: 'selo' | 'suave' }).qrStyle ?? null) }
        : {}),
    });
  }, [liveCanvas]);
  useEffect(() => {
    if (!liveCanvas) return;
    syncSelection();
    const events = ['selection:created', 'selection:updated', 'selection:cleared', 'object:modified', 'text:changed'] as const;
    events.forEach((e) => liveCanvas.on(e, syncSelection));
    return () => events.forEach((e) => liveCanvas.off(e, syncSelection));
  }, [liveCanvas, syncSelection]);

  /** Aplica uma mudança a cada objeto selecionado e registra no histórico. */
  const changeSelected = (fn: (o: fabric.Object) => void) => {
    if (!liveCanvas) return;
    liveCanvas.getActiveObjects().forEach((o) => {
      fn(o);
      liveCanvas.fire('object:modified', { target: o } as never);
    });
    liveCanvas.requestRenderAll();
    syncSelection();
  };
  const setInstructorSlot = (slot: number | null) => changeSelected((o) => o.set({ instructorSlot: slot ?? undefined } as never));
  const setShowIf = (variable: string | null) => changeSelected((o) => o.set({ showIf: variable || undefined } as never));
  const setQrStyle = (style: 'selo' | 'suave') => changeSelected((o) => o.set({ qrStyle: style } as never));
  const isBackground = (o: fabric.Object) => ['backgroundRect', 'backgroundImage'].includes((o as unknown as { name?: string }).name || '');
  const bringSelectedForward = () => changeSelected((o) => liveCanvas?.bringObjectForward(o));
  const sendSelectedBackward = () =>
    changeSelected((o) => {
      if (!liveCanvas) return;
      const objs = liveCanvas.getObjects();
      const idx = objs.indexOf(o);
      // não passa para baixo do fundo do certificado
      if (idx > 0 && !isBackground(objs[idx - 1])) liveCanvas.sendObjectBackwards(o);
    });
  const lockSelected = () => {
    if (!liveCanvas) return;
    const objs = liveCanvas.getActiveObjects();
    liveCanvas.discardActiveObject();
    objs.forEach((o) => {
      o.set({
        selectable: false, evented: false, hasControls: false, hasBorders: false,
        lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true,
      });
      if (isTextObject(o)) (o as fabric.Textbox).editable = false;
      o.setCoords();
      liveCanvas.fire('object:modified', { target: o } as never);
    });
    liveCanvas.requestRenderAll();
    toast.success(objs.length > 1 ? 'Elementos travados. Destrave na aba Camadas.' : 'Elemento travado. Destrave na aba Camadas.');
  };
  const deleteSelected = () => {
    if (!liveCanvas) return;
    const objs = liveCanvas.getActiveObjects();
    liveCanvas.discardActiveObject();
    objs.forEach((o) => liveCanvas.remove(o));
    liveCanvas.requestRenderAll();
  };
  const duplicateSelected = () => {
    const o = liveCanvas?.getActiveObject();
    if (o) handleDuplicateObject(o);
  };
  const bringSelectedToFront = () => changeSelected((o) => liveCanvas?.bringObjectToFront(o));
  const sendSelectedToBack = () =>
    changeSelected((o) => {
      if (!liveCanvas) return;
      // fica logo acima do fundo do certificado, nunca por baixo dele
      const objs = liveCanvas.getObjects();
      const floor = objs.filter(isBackground).reduce((max, b) => Math.max(max, objs.indexOf(b)), -1);
      liveCanvas.moveObjectTo(o, floor + 1);
    });
  const selectBelowSelected = () => {
    if (liveCanvas && !selectBelow(liveCanvas)) toast.info('Não há outro elemento embaixo deste.');
  };
  /**
   * Alinha: um elemento → em relação à página; vários → entre si (pela caixa
   * que envolve a seleção).
   */
  const alignSelected = (mode: AlignMode) => {
    if (!liveCanvas) return;
    const objs = liveCanvas.getActiveObjects();
    if (!objs.length) return;
    const z = liveCanvas.getZoom() || 1;
    liveCanvas.discardActiveObject();
    const boxes = objs.map((o) => {
      o.setCoords();
      return o.getBoundingRect();
    });
    const ref =
      objs.length === 1
        ? { left: 0, top: 0, right: liveCanvas.getWidth() / z, bottom: liveCanvas.getHeight() / z }
        : {
            left: Math.min(...boxes.map((b) => b.left)),
            top: Math.min(...boxes.map((b) => b.top)),
            right: Math.max(...boxes.map((b) => b.left + b.width)),
            bottom: Math.max(...boxes.map((b) => b.top + b.height)),
          };
    objs.forEach((o, i) => {
      const b = boxes[i];
      let dx = 0;
      let dy = 0;
      if (mode === 'left') dx = ref.left - b.left;
      if (mode === 'hcenter') dx = (ref.left + ref.right) / 2 - (b.left + b.width / 2);
      if (mode === 'right') dx = ref.right - (b.left + b.width);
      if (mode === 'top') dy = ref.top - b.top;
      if (mode === 'vcenter') dy = (ref.top + ref.bottom) / 2 - (b.top + b.height / 2);
      if (mode === 'bottom') dy = ref.bottom - (b.top + b.height);
      o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy });
      o.setCoords();
      liveCanvas.fire('object:modified', { target: o } as never);
    });
    if (objs.length > 1) liveCanvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas: liveCanvas }));
    else liveCanvas.setActiveObject(objs[0]);
    liveCanvas.requestRenderAll();
    syncSelection();
  };

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
      // as ações do menu valem para a seleção: o alvo passa a ser o selecionado
      // (a não ser que já faça parte de uma seleção de vários)
      const c = target.canvas as fabric.Canvas | undefined;
      if (c && !c.getActiveObjects().includes(target)) {
        c.setActiveObject(target);
        c.requestRenderAll();
      }
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
    const many = (liveCanvas?.getActiveObjects().length ?? 0) > 1;
    const items = [
      ...(many ? [] : [{ icon: Copy, label: 'Duplicar', hint: 'Ctrl+D', action: duplicateSelected }]),
      { icon: ArrowUp, label: 'Trazer para frente', action: bringSelectedForward, separator: !many },
      { icon: ArrowDown, label: 'Enviar para trás', action: sendSelectedBackward },
      { icon: ArrowUpToLine, label: 'Trazer para o topo', action: bringSelectedToFront },
      { icon: ArrowDownToLine, label: 'Enviar para o fundo', action: sendSelectedToBack },
      ...(many ? [] : [{ icon: MousePointerClick, label: 'Selecionar o de baixo', hint: 'Alt+clique', action: selectBelowSelected }]),
      { icon: AlignCenterHorizontal, label: many ? 'Centralizar entre si' : 'Centralizar na página', action: () => alignSelected('hcenter'), separator: true },
      { icon: AlignCenterVertical, label: many ? 'Alinhar no meio entre si' : 'Centralizar na altura', action: () => alignSelected('vcenter') },
      ...(isImage && !many ? [{ icon: Frame, label: 'Aplicar como fundo', action: () => handleApplyAsBackground(target), separator: true }] : []),
      { icon: Lock, label: 'Travar', action: lockSelected, separator: !(isImage && !many) },
      { icon: Trash2, label: 'Excluir', hint: 'Del', action: deleteSelected, danger: true },
    ];
    return { title: many ? `${liveCanvas?.getActiveObjects().length} elementos` : selection.label || 'Elemento', items };
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

                  // Só zera valores absurdos (modelos antigos); espaçamento de
                  // design (ex.: "AUTENTICIDADE" com 180) é mantido
                  if (Math.abs(currentCharSpacing) > 600) {
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

  // "Alterações não salvas" = o desenho atual é diferente do que está gravado.
  // Compara com uma foto tirada ao terminar de carregar (e a cada salvamento),
  // então eventos do carregamento não contam e desfazer até o original volta a "salvo".
  const baselineRef = useRef<string | null>(null);
  const snapshotDesign = useCallback(() => {
    try {
      const d = getCanvasData();
      return d ? JSON.stringify([d.fabricJsonFront, d.fabricJsonBack]) : null;
    } catch {
      return null;
    }
  }, [getCanvasData]);
  useEffect(() => {
    if (!certificateInfo.id || isInitialLoad || isLoadingTemplate || baselineRef.current !== null) return;
    const t = setTimeout(() => {
      baselineRef.current = snapshotDesign();
      setCertificateInfo((prev) => ({ ...prev, isModified: false }));
    }, 800);
    return () => clearTimeout(t);
  }, [certificateInfo.id, isInitialLoad, isLoadingTemplate, snapshotDesign]);
  useEffect(() => {
    if (!liveCanvas) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      if (baselineRef.current === null) return;
      clearTimeout(t);
      t = setTimeout(() => {
        const changed = snapshotDesign() !== baselineRef.current;
        setCertificateInfo((prev) => (prev.isModified === changed ? prev : { ...prev, isModified: changed }));
      }, 300);
    };
    const events = ['object:modified', 'object:added', 'object:removed', 'text:changed'] as const;
    events.forEach((e) => liveCanvas.on(e, check));
    return () => {
      clearTimeout(t);
      events.forEach((e) => liveCanvas.off(e, check));
    };
  }, [liveCanvas, snapshotDesign]);

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
          baselineRef.current = snapshotDesign();
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
          baselineRef.current = snapshotDesign();
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



  // Salvar: modelo existente grava direto; novo abre o formulário (nome e curso)
  const quickSave = () => {
    if (certificateInfo.id && certificateInfo.name && certificateInfo.courseId) {
      handleSaveCertificate({ name: certificateInfo.name, courseId: certificateInfo.courseId });
    } else {
      setShowSaveModal(true);
    }
  };
  const quickSaveRef = useRef(quickSave);
  quickSaveRef.current = quickSave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        quickSaveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dirty = !certificateInfo.id ? false : !!certificateInfo.isModified;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Prévia com aluno de exemplo
  const [previewData, setPreviewData] = useState<ReturnType<typeof getCanvasData> | null>(null);
  const openPreview = () => {
    const d = getCanvasData();
    if (!d) return;
    setPreviewData(d);
  };

  // Variável: entra no fim do texto selecionado ou vira um texto novo
  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const active = liveCanvas?.getActiveObject();
    if (liveCanvas && isTextObject(active)) {
      const t = active.text || '';
      active.set('text', t + (t ? ' ' : '') + token);
      liveCanvas.fire('object:modified', { target: active } as never);
      liveCanvas.requestRenderAll();
      syncSelection();
      toast.success(`${token} adicionada ao texto`);
    } else {
      handleAddText(token, {
        fontFamily: 'Open Sans', fontSize: 18, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        fill: '#000000', textAlign: 'left', originY: 'center', lineHeight: 1.16, letterSpacing: 0,
        listType: 'none', listIndent: 0, listItemSpacing: 8, stroke: '', strokeWidth: 0,
      });
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
        onSaveClick={quickSave}
        onDetailsClick={() => setShowSaveModal(true)}
        onPreviewClick={openPreview}
        savedAt={lastSavedTime}
        certificateInfo={certificateInfo}
        isLoading={createCertificate.isPending || updateCertificate.isPending}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <div className="flex flex-1 overflow-hidden">
      {/* Esquerda: abas com nome — só para ADICIONAR coisas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex h-full flex-shrink-0 border-r">
        <TabsList className="flex h-full w-[60px] flex-col justify-start gap-0.5 rounded-none border-r bg-muted/40 p-1">
          {EDITOR_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              // clicar na aba já aberta recolhe o painel; outra aba abre
              onMouseDown={() => setLeftOpen((open) => (value === activeTab ? !open : true))}
              className={`flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-md px-0 text-[10px] font-medium text-muted-foreground data-[state=active]:text-primary ${
                leftOpen ? 'data-[state=active]:bg-background data-[state=active]:shadow-sm' : 'data-[state=active]:bg-transparent data-[state=active]:shadow-none'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className={`${leftOpen ? 'flex' : 'hidden'} w-64 flex-col overflow-hidden`}>
          <div className="flex items-start gap-1 border-b py-2.5 pl-3 pr-1.5">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{EDITOR_TABS.find((t) => t.value === activeTab)?.title}</h3>
              <p className="text-[11px] leading-snug text-muted-foreground">{EDITOR_TABS.find((t) => t.value === activeTab)?.hint}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={() => setLeftOpen(false)} aria-label="Recolher painel">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <TabsContent value="templates" className="mt-0 flex-1 overflow-y-auto p-2.5">
            <TemplateGrid
              templates={certificateTemplates}
              onSelectTemplate={handleApplyTemplate}
              isEditing={!!certificateInfo.id}
            />
          </TabsContent>

          <TabsContent value="text" className="mt-0 flex-1 overflow-y-auto p-2.5">
            <TextPanel
              sections={['add']}
              selectedText={selectedText}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              canvas={liveCanvas}
            />
          </TabsContent>

          <TabsContent value="variables" className="mt-0 flex-1 overflow-y-auto p-2.5">
            <VariablesPanel hasTextSelected={selection.kind === 'texto' && selection.count === 1} onInsert={insertVariable} />
          </TabsContent>

          <TabsContent value="dynamic" className="mt-0 flex-1 overflow-y-auto p-2.5">
            <PlaceholderPanel
              onAddPlaceholder={addPlaceholderToCanvas}
              images={imagesData?.rows ?? []}
              hasSeal={sealState.has}
              sealDefault={sealState.src}
              onSetSealDefault={setSealDefault}
            />
          </TabsContent>

          <TabsContent value="images" className="mt-0 flex-1 overflow-y-auto p-2.5">
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

          <TabsContent value="shapes" className="mt-0 flex-1 overflow-y-auto p-2.5">
            <ShapesPanel
              sections={['add']}
              shapeSettings={shapeSettings}
              selectedShape={selectedShape}
              onAddShape={(shapeType) => addShapeToCanvas(shapeType, shapeSettings)}
              onUpdateSettings={updateShapeSettings}
              onDragStart={handleShapeDragStart}
              onDragEnd={() => setIsDragging(false)}
            />
          </TabsContent>

          <TabsContent value="layers" className="mt-0 flex-1 overflow-y-auto p-2.5">
            {/* key: o canvas da página pode ser recriado (modelo aplicado, troca de página) */}
            <LayersPanel
              key={`${pages[currentPageIndex]?.id}-${activeTab}`}
              canvas={liveCanvas}
              onDeleteObject={handleDeleteFromCanvas}
              onSelectObject={handleObjectSelected}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Centro: certificado */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30 p-2">
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
                fitKey={`${leftOpen}-${rightOpen}`}
              />
            </div>
          ))}
        </div>
        
        <div className="mt-3">
          <PageControls
            pages={pages.map((p, i) => ({ id: p.id, name: i === 0 ? 'Frente' : 'Verso' }))}
            currentPageIndex={currentPageIndex}
            onPageSelect={setCurrentPageIndex}
            onPageAdd={addPage}
            onPageRemove={removePage}
            onExportPDF={exportToPDF}
            maxPages={2}
          />
        </div>
      </div>

      {/* Direita: o que está selecionado */}
      {!rightOpen ? (
        <aside className="flex w-11 flex-shrink-0 flex-col items-center gap-2 border-l bg-background py-2">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setRightOpen(true)} aria-label="Abrir painel do selecionado">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
          {selection.count > 0 && (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"
              aria-label={`Editar ${selection.label}`}
            >
              <MousePointerClick className="h-4 w-4" />
            </button>
          )}
        </aside>
      ) : (
      <aside className="w-72 flex-shrink-0 overflow-hidden border-l bg-background">
        <SelectionPanel
          onCollapse={() => setRightOpen(false)}
          selection={selection}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onBringForward={bringSelectedForward}
          onSendBackward={sendSelectedBackward}
          onAlign={alignSelected}
          onSelectBelow={selectBelowSelected}
          onLock={lockSelected}
          onSetInstructorSlot={setInstructorSlot}
          onSetShowIf={setShowIf}
          onSetQrStyle={setQrStyle}
        >
          {selection.count === 1 && selection.kind === 'texto' && selectedText && (
            <TextPanel
              sections={['settings']}
              selectedText={selectedText}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              canvas={liveCanvas}
            />
          )}
          {selection.count === 1 && selection.kind === 'forma' && (
            <ShapesPanel
              sections={['settings']}
              shapeSettings={shapeSettings}
              selectedShape={selectedShape}
              onAddShape={(shapeType) => addShapeToCanvas(shapeType, shapeSettings)}
              onUpdateSettings={updateShapeSettings}
              onDragStart={handleShapeDragStart}
              onDragEnd={() => setIsDragging(false)}
            />
          )}
        </SelectionPanel>
      </aside>
      )}

      {/* Context Menu */}
      <ContextMenu
        show={showContextMenu}
        x={contextMenu.x}
        y={contextMenu.y}
        title={menuData.title}
        items={menuData.items}
        onClose={() => setShowContextMenu(false)}
      />
      
      <PreviewDialog
        open={!!previewData}
        onOpenChange={(o) => !o && setPreviewData(null)}
        data={previewData}
        name={certificateInfo.name}
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