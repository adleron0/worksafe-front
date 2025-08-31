import { useRef, useCallback, useState, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { post } from '@/services/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// Registrar o módulo de redimensionamento
Quill.register('modules/imageResize', ImageResize);

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number | string; // Altura do editor em px ou string CSS (ex: '50vh', '400px')
  onImageUpload?: (file: File) => Promise<string>;
}

interface ImageUploadResponse {
  imageUrl: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Comece a escrever seu conteúdo...',
  readOnly = false,
  height = 300, // Altura padrão de 300px
  onImageUpload
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const range = quill.getSelection(true);
      if (!range) return;

      setUploadStatus('uploading');

      try {
        let url: string;
        
        // Se tiver função customizada de upload, usa ela
        if (onImageUpload) {
          url = await onImageUpload(file);
        } else {
          // Faz upload direto sem usar hook para evitar re-render
          const response = await post<ImageUploadResponse, { image: File }>(
            'images',
            's3',
            { image: file }
          );
          
          if (!response?.imageUrl) {
            throw new Error('URL da imagem não retornada pelo servidor');
          }
          
          url = response.imageUrl;
        }
        
        // Insere a imagem na posição correta
        quill.insertEmbed(range.index, 'image', url);
        
        // Move o cursor para depois da imagem  
        setTimeout(() => {
          quill.setSelection(range.index + 1, 0);
          quill.focus();
        }, 100);
        
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 2000);
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        setUploadStatus('error');
        
        // Se falhar o upload para S3, converte para base64 como fallback
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          
          quill.insertEmbed(range.index, 'image', url);
          
          setTimeout(() => {
            quill.setSelection(range.index + 1, 0);
            quill.focus();
          }, 100);
        };
        reader.readAsDataURL(file);
        
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    };
  }, [onImageUpload]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    imageResize: {
      parchment: Quill.import('parchment'),
      modules: ['Resize', 'DisplaySize', 'Toolbar']
    },
    clipboard: {
      matchVisual: false
    }
  }), [imageHandler]);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  const getUploadStatusContent = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Enviando imagem...</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Imagem enviada com sucesso!</span>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">Erro no envio. Imagem salva localmente.</span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rich-text-editor relative">
      {uploadStatus !== 'idle' && (
        <div className="absolute top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
          {getUploadStatusContent()}
        </div>
      )}
      
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules}
        formats={formats}
        preserveWhitespace={true}
        style={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          maxHeight: '100vh' // Limite máximo de altura
        }}
        className="bg-white dark:bg-gray-900"
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
        
        /* Toolbar - Modo Claro e Escuro */
        .rich-text-editor .ql-toolbar {
          border: 1px solid rgb(226 232 240);
          border-bottom: none;
          border-radius: 0.5rem 0.5rem 0 0;
          background: rgb(248 250 252);
          padding: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        
        .dark .rich-text-editor .ql-toolbar {
          border-color: rgb(55 65 81);
          background: rgb(31 41 55);
        }
        
        /* Botões da Toolbar */
        .rich-text-editor .ql-toolbar button {
          width: 28px;
          height: 28px;
          padding: 3px;
          margin: 0;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          background: rgb(226 232 240);
          border-radius: 0.25rem;
        }
        
        .dark .rich-text-editor .ql-toolbar button:hover {
          background: rgb(75 85 99);
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          background: rgb(59 130 246);
          color: white;
          border-radius: 0.25rem;
        }
        
        .dark .rich-text-editor .ql-toolbar button.ql-active {
          background: rgb(96 165 250);
        }
        
        /* Ícones da Toolbar */
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: rgb(100 116 139);
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: rgb(209 213 219);
        }
        
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: rgb(100 116 139);
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-fill {
          fill: rgb(209 213 219);
        }
        
        .rich-text-editor .ql-toolbar .ql-active .ql-stroke {
          stroke: white;
        }
        
        .rich-text-editor .ql-toolbar .ql-active .ql-fill {
          fill: white;
        }
        
        /* Pickers (dropdowns) */
        .rich-text-editor .ql-toolbar .ql-picker {
          color: rgb(100 116 139);
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker {
          color: rgb(209 213 219);
        }
        
        .rich-text-editor .ql-toolbar .ql-picker-options {
          background: white;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-options {
          background: rgb(31 41 55);
          border-color: rgb(55 65 81);
        }
        
        /* Container do Editor */
        .rich-text-editor .ql-container {
          border: 1px solid rgb(226 232 240);
          border-radius: 0 0 0.5rem 0.5rem;
          font-family: inherit;
          font-size: 1rem;
          background: white;
          min-height: 200px;
          position: relative;
          overflow-y: auto;
        }
        
        .dark .rich-text-editor .ql-container {
          border-color: rgb(55 65 81);
          background: rgb(17 24 39);
        }
        
        /* Área de Texto */
        .rich-text-editor .ql-editor {
          min-height: 200px;
          padding: 1rem;
          font-size: 1rem;
          line-height: 1.6;
          color: rgb(15 23 42);
        }
        
        .dark .rich-text-editor .ql-editor {
          color: rgb(226 232 240);
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: rgb(148 163 184);
          font-style: normal;
          left: 1rem;
        }
        
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: rgb(100 116 139);
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
          border-left: 4px solid rgb(59 130 246);
          padding-left: 1rem;
          margin: 1rem 0;
          color: rgb(100 116 139);
          font-style: italic;
        }
        
        .dark .rich-text-editor .ql-editor blockquote {
          border-left-color: rgb(96 165 250);
          color: rgb(148 163 184);
        }
        
        .rich-text-editor .ql-editor pre {
          background: rgb(248 250 252);
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        
        .dark .rich-text-editor .ql-editor pre {
          background: rgb(30 41 59);
          border-color: rgb(71 85 105);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax {
          background: rgb(30 41 59);
          color: rgb(241 245 249);
          border: none;
        }
        
        .dark .rich-text-editor .ql-editor pre.ql-syntax {
          background: rgb(15 23 42);
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* Estilos para o módulo de redimensionamento */
        .rich-text-editor .ql-editor .ql-image-resize-module {
          position: relative;
        }
        
        .rich-text-editor .ql-editor img[style*="cursor: nwse-resize"] {
          border: 2px dashed #3b82f6;
        }
        
        /* Handles de redimensionamento */
        .ql-image-resize-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background: rgb(59 130 246);
          border: 2px solid white;
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .dark .ql-image-resize-handle {
          background: rgb(96 165 250);
          border-color: rgb(31 41 55);
        }
        
        .ql-image-resize-handle:hover {
          background: rgb(37 99 235);
        }
        
        .dark .ql-image-resize-handle:hover {
          background: rgb(147 197 253);
        }
        
        /* Display do tamanho */
        .ql-image-resize-display {
          position: absolute;
          font-size: 12px;
          color: white;
          background: rgba(0,0,0,0.8);
          padding: 4px 8px;
          border-radius: 4px;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
        }
        
        .dark .ql-image-resize-display {
          background: rgba(255,255,255,0.9);
          color: rgb(15 23 42);
        }
        
        .rich-text-editor .ql-editor a {
          color: rgb(59 130 246);
          text-decoration: underline;
        }
        
        .dark .rich-text-editor .ql-editor a {
          color: rgb(96 165 250);
        }
        
        .rich-text-editor .ql-editor a:hover {
          color: rgb(37 99 235);
        }
        
        .dark .rich-text-editor .ql-editor a:hover {
          color: rgb(147 197 253);
        }
        
        /* Tooltips */
        .rich-text-editor .ql-snow .ql-tooltip {
          background: white;
          border: 1px solid rgb(226 232 240);
          box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
          border-radius: 0.375rem;
          padding: 0.75rem;
          z-index: 999999 !important;
          max-width: 300px;
        }
        
        .dark .rich-text-editor .ql-snow .ql-tooltip {
          background: rgb(31 41 55);
          border-color: rgb(55 65 81);
          color: rgb(226 232 240);
        }
        
        .rich-text-editor .ql-snow .ql-tooltip.ql-editing {
          z-index: 999999 !important;
        }
        
        .rich-text-editor .ql-snow .ql-tooltip input[type="text"] {
          border: 1px solid rgb(226 232 240);
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: white;
          color: rgb(15 23 42);
        }
        
        .dark .rich-text-editor .ql-snow .ql-tooltip input[type="text"] {
          border-color: rgb(75 85 99);
          background: rgb(17 24 39);
          color: rgb(226 232 240);
        }
        
        .rich-text-editor .ql-snow .ql-tooltip a.ql-action {
          color: rgb(59 130 246);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }
        
        .dark .rich-text-editor .ql-snow .ql-tooltip a.ql-action {
          color: rgb(96 165 250);
        }
        
        .rich-text-editor .ql-snow .ql-tooltip a.ql-action:hover {
          background: rgb(241 245 249);
        }
        
        .dark .rich-text-editor .ql-snow .ql-tooltip a.ql-action:hover {
          background: rgb(55 65 81);
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;