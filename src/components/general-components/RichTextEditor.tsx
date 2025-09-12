import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import ImageResize from "quill-image-resize-module-react";
import { post } from "@/services/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

// Registrar o módulo de redimensionamento
Quill.register("modules/imageResize", ImageResize);

// Tipos para o Quill
type ImageValue = string | { src?: string; url?: string; style?: string; width?: string; height?: string; alt?: string };
type ImageFormats = { [key: string]: string };

// Estender o formato de imagem para preservar estilos
// Criar interface para a classe base do Quill
interface QuillImageBase {
  new (...args: unknown[]): {
    domNode: HTMLElement;
    format(name: string, value: string | null): void;
  };
  create(value: unknown): HTMLElement;
  formats(domNode: HTMLElement): Record<string, string>;
  value(domNode: HTMLElement): string;
}

const Image = Quill.import('formats/image') as QuillImageBase;
class StyledImage extends Image {
  declare domNode: HTMLElement;
  
  static create(value: ImageValue) {
    // Determinar o src correto
    let src = value;
    if (typeof value === 'object' && value !== null) {
      src = value.src || value.url || value;
    }
    
    // Criar o nó com o src
    const node = super.create(src);
    
    // Se value é objeto, aplicar atributos adicionais
    if (typeof value === 'object' && value !== null) {
      if (value.style) {
        node.setAttribute('style', value.style);
      }
      if (value.width) node.setAttribute('width', value.width);
      if (value.height) node.setAttribute('height', value.height);
      if (value.alt) node.setAttribute('alt', value.alt);
    }
    
    return node;
  }

  static formats(domNode: HTMLElement): ImageFormats {
    const formats = ['alt', 'height', 'width', 'style'].reduce((formats: ImageFormats, attribute) => {
      if (domNode.hasAttribute(attribute)) {
        formats[attribute] = domNode.getAttribute(attribute) || '';
      }
      return formats;
    }, {});
    return formats;
  }

  static value(domNode: HTMLElement): string {
    // Sempre retornar apenas o src como string para compatibilidade
    const src = domNode.getAttribute('src');
    return src || '';
  }

  format(name: string, value: string | null) {
    if (['alt', 'height', 'width', 'style'].includes(name)) {
      if (value) {
        this.domNode.setAttribute(name, value);
      } else {
        this.domNode.removeAttribute(name);
      }
    } else {
      super.format(name, value);
    }
  }
}

Quill.register('formats/image', StyledImage, true);

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number | string;
  onImageUpload?: (file: File) => Promise<string>;
}

interface ImageUploadResponse {
  imageUrl: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = "",
  onChange,
  placeholder = "Comece a escrever seu conteúdo...",
  readOnly = false,
  height = 300,
  onImageUpload,
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");

  // Função para processar o valor recebido
  const processValue = (val: string): string => {
    if (!val) return "";
    
    // Se o valor parece ser um JSON stringificado
    if (typeof val === 'string' && val.startsWith('{') && val.includes('"content"')) {
      try {
        const parsed = JSON.parse(val);
        if (parsed.content) {
          const processed = parsed.content
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'");
          return processed;
        }
      } catch (e) {
        console.warn('Failed to parse JSON content:', e);
      }
    }
    
    return val;
  };

  const processedValue = useMemo(() => processValue(value), [value]);

  const imageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const range = quill.getSelection(true);
      if (!range) return;

      setUploadStatus("uploading");

      try {
        let url: string;

        if (onImageUpload) {
          url = await onImageUpload(file);
        } else {
          const response = await post<ImageUploadResponse, { image: File }>(
            "images",
            "s3",
            { image: file },
          );

          if (!response?.imageUrl) {
            throw new Error("URL da imagem não retornada pelo servidor");
          }

          url = response.imageUrl;
        }

        quill.insertEmbed(range.index, "image", url);

        setTimeout(() => {
          quill.setSelection(range.index + 1, 0);
          quill.focus();
        }, 100);

        setUploadStatus("success");
        setTimeout(() => setUploadStatus("idle"), 2000);
      } catch (error) {
        console.error("Erro ao fazer upload da imagem:", error);
        setUploadStatus("error");

        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          quill.insertEmbed(range.index, "image", url);
          setTimeout(() => {
            quill.setSelection(range.index + 1, 0);
            quill.focus();
          }, 100);
        };
        reader.readAsDataURL(file);

        setTimeout(() => setUploadStatus("idle"), 3000);
      }
    };
  }, [onImageUpload]);

  const modules = useMemo(
    () => {
      const baseModules: Record<string, unknown> = {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            [{ font: [] }],
            [{ size: ["small", false, "large", "huge"] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ script: "sub" }, { script: "super" }],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ indent: "-1" }, { indent: "+1" }],
            [{ align: [] }],
            ["blockquote", "code-block"],
            ["link", "image", "video"],
            ["clean"],
          ],
          handlers: {
            image: imageHandler,
          },
        },
        clipboard: {
          matchVisual: false, // Voltar para false para evitar conflitos
        },
      };

      // Adicionar módulo de redimensionamento apenas no modo de edição
      if (!readOnly) {
        baseModules.imageResize = {
          parchment: Quill.import("parchment"),
          modules: ["Resize", "DisplaySize", "Toolbar"],
          handleStyles: {
            backgroundColor: 'black',
            border: 'none',
            color: 'white',
            opacity: '0.80'
          },
          toolbarStyles: {
            backgroundColor: 'black',
            border: 'none',
            color: 'white'
          },
          toolbarButtonStyles: {},
          contentStyles: {
            border: '2px solid #3b82f6',
            'border-radius': '2px'
          },
          overlayStyles: {
            border: '2px dashed #3b82f6'
          }
        };
      }

      return baseModules;
    },
    [imageHandler, readOnly],
  );

  const formats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "script",
    "list",
    "bullet",
    "indent",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
    "video",
    "alt",
    "height",
    "width",
    "style",
    "float",
    "display",
    "margin",
  ];

  // Aplicar estilos após o conteúdo ser carregado
  useEffect(() => {
    if (!quillRef.current || !processedValue) return;

    const editor = quillRef.current.getEditor();
    if (!editor) return;

    // Capturar estilos originais antes do imageResize modificar
    const captureOriginalStyles = () => {
      const images = editor.root.querySelectorAll('img');
      const originalStyles = new Map();
      
      images.forEach((img: HTMLImageElement) => {
        const style = img.getAttribute('style');
        if (style) {
          originalStyles.set(img.src, style);
        }
      });
      
      return originalStyles;
    };

    // Restaurar estilos após modificações
    const restoreStyles = (originalStyles: Map<string, string>) => {
      const images = editor.root.querySelectorAll('img');
      
      images.forEach((img: HTMLImageElement) => {
        const originalStyle = originalStyles.get(img.src);
        if (originalStyle) {
          // Preservar width/height atuais mas restaurar float e margin
          const currentWidth = img.style.width || img.getAttribute('width');
          const currentHeight = img.style.height || img.getAttribute('height');
          
          // Parse do estilo original para extrair float e margin
          const styleObj: Record<string, string> = {};
          originalStyle.split(';').forEach(style => {
            const [key, value] = style.split(':').map(s => s.trim());
            if (key && value) {
              styleObj[key] = value;
            }
          });
          
          // Aplicar estilos preservando dimensões atuais
          const newStyle = Object.entries({
            ...styleObj,
            width: currentWidth ? (currentWidth + (typeof currentWidth === 'number' ? 'px' : '')) : styleObj.width,
            height: currentHeight ? (currentHeight + (typeof currentHeight === 'number' ? 'px' : '')) : styleObj.height
          }).map(([key, value]) => `${key}: ${value}`).join('; ');
          
          img.setAttribute('style', newStyle);
        }
      });
    };

    // Capturar estilos originais
    const originalStyles = captureOriginalStyles();

    // Após um pequeno delay, restaurar estilos se necessário
    const timer = setTimeout(() => {
      restoreStyles(originalStyles);
    }, 500);

    return () => clearTimeout(timer);
  }, [processedValue]);

  const getUploadStatusContent = () => {
    switch (uploadStatus) {
      case "uploading":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Enviando imagem...</span>
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Imagem enviada com sucesso!
            </span>
          </>
        );
      case "error":
        return (
          <>
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Erro no envio. Imagem salva localmente.
            </span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rich-text-editor relative">
      {uploadStatus !== "idle" && (
        <div className="absolute top-4 right-4 z-50 bg-popover rounded-lg shadow-lg border border-border px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
          {getUploadStatusContent()}
        </div>
      )}

      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={processedValue}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules}
        formats={formats}
        preserveWhitespace={true}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          maxHeight: "100vh",
        }}
        className=""
      />

      <style>{`
        @keyframes slide-in-from-top-2 {
          from {
            transform: translateY(-0.5rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-in {
          animation: slide-in-from-top-2 0.2s ease-out;
        }

        /* Seleção de texto */
        .rich-text-editor .ql-editor ::selection {
          background: hsl(var(--primary) / 0.3);
          color: hsl(var(--foreground));
        }

        /* Toolbar - Modo Claro e Escuro */
        .rich-text-editor .ql-toolbar {
          border: 1px solid hsl(var(--border));
          border-bottom: none;
          border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0;
          background: hsl(var(--muted) / 0.3);
          padding: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        /* Botões da Toolbar */
        .rich-text-editor .ql-toolbar button {
          width: 28px;
          height: 28px;
          padding: 3px;
          margin: 0;
          transition: all 0.2s;
        }

        .rich-text-editor .ql-toolbar button:hover {
          background: hsl(var(--accent));
          border-radius: calc(var(--radius) - 4px);
        }

        .rich-text-editor .ql-toolbar button.ql-active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-radius: calc(var(--radius) - 4px);
        }

        .rich-text-editor .ql-toolbar button:hover .ql-stroke {
          stroke: hsl(var(--accent-foreground));
        }

        .rich-text-editor .ql-toolbar button:hover .ql-fill {
          fill: hsl(var(--accent-foreground));
        }

        /* Ícones da Toolbar */
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: hsl(var(--muted-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--muted-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-active .ql-stroke {
          stroke: hsl(var(--primary-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-active .ql-fill {
          fill: hsl(var(--primary-foreground));
        }

        /* Pickers (dropdowns) */
        .rich-text-editor .ql-toolbar .ql-picker {
          color: hsl(var(--muted-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-picker-label:hover {
          color: hsl(var(--foreground));
        }

        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-stroke {
          stroke: hsl(var(--accent-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-fill {
          fill: hsl(var(--accent-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-picker.ql-expanded .ql-picker-label {
          color: hsl(var(--primary));
        }

        .rich-text-editor .ql-toolbar .ql-picker.ql-expanded .ql-picker-label .ql-stroke {
          stroke: hsl(var(--primary));
        }

        .rich-text-editor .ql-toolbar .ql-picker.ql-expanded .ql-picker-label .ql-fill {
          fill: hsl(var(--primary));
        }

        .rich-text-editor .ql-toolbar .ql-picker-options {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .rich-text-editor .ql-toolbar .ql-picker-item {
          color: hsl(var(--popover-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        /* Color picker específico */
        .rich-text-editor .ql-toolbar .ql-color-picker .ql-picker-item:hover,
        .rich-text-editor .ql-toolbar .ql-background .ql-picker-item:hover {
          border-color: hsl(var(--primary)) !important;
          opacity: 0.8;
        }

        .rich-text-editor .ql-toolbar .ql-color-picker .ql-picker-item.ql-selected,
        .rich-text-editor .ql-toolbar .ql-background .ql-picker-item.ql-selected {
          border: 2px solid hsl(var(--primary)) !important;
        }

        .rich-text-editor .ql-toolbar .ql-color .ql-picker-label:hover,
        .rich-text-editor .ql-toolbar .ql-background .ql-picker-label:hover {
          background: hsl(var(--accent));
          border-radius: calc(var(--radius) - 4px);
        }

        .rich-text-editor .ql-toolbar .ql-color.ql-expanded .ql-picker-label,
        .rich-text-editor .ql-toolbar .ql-background.ql-expanded .ql-picker-label {
          background: hsl(var(--primary));
          border-radius: calc(var(--radius) - 4px);
        }

        .rich-text-editor .ql-toolbar .ql-color.ql-expanded .ql-picker-label .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-background.ql-expanded .ql-picker-label .ql-stroke {
          stroke: hsl(var(--primary-foreground));
        }

        .rich-text-editor .ql-toolbar .ql-color.ql-expanded .ql-picker-label .ql-fill,
        .rich-text-editor .ql-toolbar .ql-background.ql-expanded .ql-picker-label .ql-fill {
          fill: hsl(var(--primary-foreground));
        }

        /* Container do Editor */
        .rich-text-editor .ql-container {
          border: 1px solid hsl(var(--border));
          border-radius: 0 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px);
          font-family: inherit;
          font-size: 1rem;
          background: hsl(var(--background));
          min-height: 200px;
          position: relative;
          overflow-y: auto;
        }

        /* Área de Texto */
        .rich-text-editor .ql-editor {
          min-height: 200px;
          padding: 1rem;
          font-size: 1rem;
          line-height: 1.6;
          color: hsl(var(--foreground));
        }

        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          left: 1rem;
        }

        .rich-text-editor .ql-editor h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor .ql-editor h2 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor .ql-editor h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor .ql-editor h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor .ql-editor h5 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor .ql-editor h6 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor .ql-editor p {
          margin-bottom: 0.75rem;
        }

        .rich-text-editor .ql-editor ul,
        .rich-text-editor .ql-editor ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .rich-text-editor .ql-editor li {
          margin-bottom: 0.25rem;
        }

        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }

        .rich-text-editor .ql-editor pre {
          background: hsl(var(--muted) / 0.5);
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .rich-text-editor .ql-editor pre.ql-syntax {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          border: none;
        }

        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rich-text-editor .ql-editor img:hover {
          box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
          outline: 2px solid hsl(var(--primary) / 0.5);
          outline-offset: 2px;
        }

        .rich-text-editor .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }

        .rich-text-editor .ql-editor a:hover {
          opacity: 0.8;
        }

        /* Tooltips */
        .rich-text-editor .ql-snow .ql-tooltip {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
          border-radius: calc(var(--radius) - 2px);
          padding: 0.75rem;
          z-index: 999999 !important;
          max-width: 300px;
          color: hsl(var(--popover-foreground));
        }

        .rich-text-editor .ql-snow .ql-tooltip.ql-editing {
          z-index: 999999 !important;
        }

        .rich-text-editor .ql-snow .ql-tooltip input[type="text"] {
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 4px);
          padding: 0.25rem 0.5rem;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }

        .rich-text-editor .ql-snow .ql-tooltip a.ql-action {
          color: hsl(var(--primary));
          padding: 0.25rem 0.5rem;
          border-radius: calc(var(--radius) - 4px);
        }

        .rich-text-editor .ql-snow .ql-tooltip a.ql-action:hover {
          background: hsl(var(--accent));
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;