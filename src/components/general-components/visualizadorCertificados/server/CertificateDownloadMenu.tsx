import React, { useState } from 'react';
import { toast } from 'sonner';
import Icon from '@/components/general-components/Icon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type DownloadFormat = 'pdf' | 'png-front' | 'png-back';

interface CertificateDownloadMenuProps {
  /** Executa o download; pode ser assíncrono (o item mostra carregando). */
  onDownload: (format: DownloadFormat) => Promise<void> | void;
  hasBack?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'default';
  /** solid = botão principal; subtle = discreto (sobre o certificado). */
  variant?: 'solid' | 'subtle';
  /** Alinhamento do menu em relação ao botão. */
  align?: 'start' | 'end';
  className?: string;
}

/** Botão "Baixar certificado" que abre as opções PDF / PNG. */
export const CertificateDownloadMenu: React.FC<CertificateDownloadMenuProps> = ({
  onDownload,
  hasBack = false,
  disabled = false,
  size = 'default',
  variant = 'solid',
  align = 'end',
  className = '',
}) => {
  const [busy, setBusy] = useState<DownloadFormat | null>(null);

  const run = async (format: DownloadFormat) => {
    if (busy) return;
    setBusy(format);
    try {
      await onDownload(format);
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toast.error('Não foi possível baixar o certificado. Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          size={size}
          variant={variant === 'subtle' ? 'ghost' : 'default'}
          disabled={disabled}
          className={`gap-2 ${
            variant === 'subtle'
              ? 'h-8 rounded-full border border-border/70 bg-card/80 px-3 text-xs font-medium text-muted-foreground backdrop-blur hover:bg-card hover:text-foreground'
              : 'shadow-sm'
          } ${className}`}
        >
          <Icon
            name={busy ? 'loader-2' : 'download'}
            className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`}
          />
          {busy ? 'Preparando…' : variant === 'subtle' ? 'Baixar' : 'Baixar certificado'}
          <Icon name="chevron-down" className={`opacity-60 ${variant === 'subtle' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Escolha o formato
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run('pdf')} className="cursor-pointer gap-3 py-2">
          <Icon name="file-text" className="h-5 w-5 text-red-600" />
          <div className="flex flex-col">
            <span className="font-medium">PDF</span>
            <span className="text-xs text-muted-foreground">
              {hasBack ? 'Frente e verso, pronto para imprimir' : 'Pronto para imprimir'}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run('png-front')} className="cursor-pointer gap-3 py-2">
          <Icon name="image" className="h-5 w-5 text-sky-600" />
          <div className="flex flex-col">
            <span className="font-medium">Imagem PNG{hasBack ? ' — frente' : ''}</span>
            <span className="text-xs text-muted-foreground">Alta resolução, para redes sociais</span>
          </div>
        </DropdownMenuItem>
        {hasBack && (
          <DropdownMenuItem onSelect={() => run('png-back')} className="cursor-pointer gap-3 py-2">
            <Icon name="image" className="h-5 w-5 text-sky-600" />
            <div className="flex flex-col">
              <span className="font-medium">Imagem PNG — verso</span>
              <span className="text-xs text-muted-foreground">Alta resolução</span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CertificateDownloadMenu;
