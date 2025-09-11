import React from 'react';
import { cn } from '@/lib/utils';

interface RichTextViewerProps {
  content: string | { content?: string; html?: string } | any;
  className?: string;
  style?: React.CSSProperties;
  onContentRendered?: () => void;
}

/**
 * Componente para renderizar conteúdo HTML criado com o RichTextEditor
 * Preserva todas as formatações aplicadas pelo editor Quill
 */
const RichTextViewer: React.FC<RichTextViewerProps> = ({
  content,
  className,
  style,
  onContentRendered,
}) => {
  // Parse do conteúdo para extrair HTML
  const getHtmlContent = (): string => {
    if (!content) return '';
    
    try {
      // Se for string, tenta fazer parse JSON
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          return parsed.content || parsed.html || '';
        } catch {
          // Se falhar o parse, assume que já é HTML
          return content;
        }
      }
      
      // Se for objeto, busca propriedades content ou html
      if (typeof content === 'object') {
        if (content.content) return content.content;
        if (content.html) return content.html;
      }
      
      return '';
    } catch (error) {
      console.error('Erro ao processar conteúdo:', error);
      return '';
    }
  };

  React.useEffect(() => {
    if (onContentRendered) {
      onContentRendered();
    }
  }, [content, onContentRendered]);

  const htmlContent = getHtmlContent();

  if (!htmlContent) {
    return (
      <div className={cn("text-muted-foreground text-center py-8", className)}>
        <p>Nenhum conteúdo disponível</p>
      </div>
    );
  }

  return (
    <>
      <div 
        className={cn("ql-editor rich-text-viewer", className)}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          fontSize: '1rem',
          lineHeight: '1.6',
          color: 'hsl(var(--foreground))',
          ...style,
        }}
      />
      
      {/* Estilos do Quill Editor para renderização */}
      <style>{`
        .rich-text-viewer {
          font-family: inherit;
          padding: 0;
          min-height: auto;
        }
        
        .rich-text-viewer h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          margin-top: 1rem;
          line-height: 1.2;
        }
        
        .rich-text-viewer h2 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1rem;
          line-height: 1.3;
        }
        
        .rich-text-viewer h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 0.75rem;
          line-height: 1.3;
        }
        
        .rich-text-viewer h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 0.75rem;
          line-height: 1.4;
        }
        
        .rich-text-viewer h5 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 0.75rem;
          line-height: 1.4;
        }
        
        .rich-text-viewer h6 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 0.75rem;
          line-height: 1.4;
        }
        
        .rich-text-viewer p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        
        .rich-text-viewer p:last-child {
          margin-bottom: 0;
        }
        
        .rich-text-viewer ul,
        .rich-text-viewer ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .rich-text-viewer li {
          margin-bottom: 0.25rem;
          line-height: 1.6;
        }
        
        .rich-text-viewer li:last-child {
          margin-bottom: 0;
        }
        
        .rich-text-viewer blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        
        .rich-text-viewer pre {
          background: hsl(var(--muted) / 0.5);
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9rem;
        }
        
        .rich-text-viewer pre.ql-syntax {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          border: none;
        }
        
        .rich-text-viewer code {
          background: hsl(var(--muted) / 0.5);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9em;
        }
        
        .rich-text-viewer pre code {
          background: transparent;
          padding: 0;
        }
        
        .rich-text-viewer img {
          border-radius: 0.5rem;
          margin: 1rem auto;
          display: block;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        /* Imagens sem estilo inline - usar tamanho máximo */
        .rich-text-viewer img:not([style]) {
          max-width: 100%;
          height: auto;
        }
        
        /* Respeitar dimensões definidas pelo editor */
        .rich-text-viewer img[style*="width"] {
          max-width: 100%;
          height: auto;
        }
        
        .rich-text-viewer a {
          color: hsl(var(--primary));
          text-decoration: underline;
          transition: opacity 0.2s;
        }
        
        .rich-text-viewer a:hover {
          opacity: 0.8;
        }
        
        .rich-text-viewer strong,
        .rich-text-viewer b {
          font-weight: 700;
        }
        
        .rich-text-viewer em,
        .rich-text-viewer i {
          font-style: italic;
        }
        
        .rich-text-viewer u {
          text-decoration: underline;
        }
        
        .rich-text-viewer s,
        .rich-text-viewer strike {
          text-decoration: line-through;
        }
        
        .rich-text-viewer .ql-size-small {
          font-size: 0.75rem;
        }
        
        .rich-text-viewer .ql-size-large {
          font-size: 1.5rem;
        }
        
        .rich-text-viewer .ql-size-huge {
          font-size: 2.5rem;
        }
        
        .rich-text-viewer .ql-font-monospace {
          font-family: 'Courier New', Courier, monospace;
        }
        
        .rich-text-viewer .ql-align-center {
          text-align: center;
        }
        
        .rich-text-viewer .ql-align-right {
          text-align: right;
        }
        
        .rich-text-viewer .ql-align-justify {
          text-align: justify;
        }
        
        .rich-text-viewer .ql-indent-1 {
          padding-left: 3rem;
        }
        
        .rich-text-viewer .ql-indent-2 {
          padding-left: 6rem;
        }
        
        .rich-text-viewer .ql-indent-3 {
          padding-left: 9rem;
        }
        
        .rich-text-viewer .ql-indent-4 {
          padding-left: 12rem;
        }
        
        .rich-text-viewer .ql-indent-5 {
          padding-left: 15rem;
        }
        
        .rich-text-viewer .ql-indent-6 {
          padding-left: 18rem;
        }
        
        .rich-text-viewer .ql-indent-7 {
          padding-left: 21rem;
        }
        
        .rich-text-viewer .ql-indent-8 {
          padding-left: 24rem;
        }
        
        .rich-text-viewer .ql-video {
          display: block;
          max-width: 100%;
          margin: 1rem auto;
          aspect-ratio: 16 / 9;
        }
        
        .rich-text-viewer iframe {
          max-width: 100%;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .rich-text-viewer table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        
        .rich-text-viewer table td,
        .rich-text-viewer table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
        }
        
        .rich-text-viewer table th {
          background: hsl(var(--muted) / 0.5);
          font-weight: 600;
        }
        
        .rich-text-viewer hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5rem 0;
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
          .rich-text-viewer h1 {
            font-size: 1.75rem;
          }
          
          .rich-text-viewer h2 {
            font-size: 1.5rem;
          }
          
          .rich-text-viewer h3 {
            font-size: 1.25rem;
          }
          
          .rich-text-viewer h4 {
            font-size: 1.125rem;
          }
          
          .rich-text-viewer .ql-indent-1 { padding-left: 1.5rem; }
          .rich-text-viewer .ql-indent-2 { padding-left: 3rem; }
          .rich-text-viewer .ql-indent-3 { padding-left: 4.5rem; }
          .rich-text-viewer .ql-indent-4 { padding-left: 6rem; }
          .rich-text-viewer .ql-indent-5 { padding-left: 7.5rem; }
          .rich-text-viewer .ql-indent-6 { padding-left: 9rem; }
          .rich-text-viewer .ql-indent-7 { padding-left: 10.5rem; }
          .rich-text-viewer .ql-indent-8 { padding-left: 12rem; }
        }
        
        /* Modo escuro - ajustes adicionais */
        .dark .rich-text-viewer pre {
          background: hsl(var(--muted));
        }
        
        .dark .rich-text-viewer code {
          background: hsl(var(--muted));
        }
        
        .dark .rich-text-viewer img {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        }
        
        .dark .rich-text-viewer table th {
          background: hsl(var(--muted));
        }
        
        /* Impressão */
        @media print {
          .rich-text-viewer {
            color: #000;
          }
          
          .rich-text-viewer a {
            color: #0000ff;
          }
          
          .rich-text-viewer pre,
          .rich-text-viewer code {
            background: #f5f5f5;
            border: 1px solid #ddd;
          }
        }
      `}</style>
    </>
  );
};

export default RichTextViewer;