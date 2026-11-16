import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Select from '@/components/general-components/Select';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Image as ImageIcon,
  Lock,
  MousePointerClick,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Group,
  PanelRightClose,
} from 'lucide-react';

export type SelectionKind = 'texto' | 'imagem' | 'forma' | 'dinamico' | 'varios';

export interface SelectionInfo {
  count: number;
  kind: SelectionKind | null;
  label: string;
  /** Espaço de instrutor da seleção (null = nenhum, 'misto' = diferentes). */
  slot: number | null | 'misto';
  /** Condição "mostrar só se" da seleção. */
  showIf: string | null | 'misto';
  /** Variáveis usadas nos textos da página, para escolher a condição. */
  variables: string[];
}

export const EMPTY_SELECTION: SelectionInfo = {
  count: 0,
  kind: null,
  label: '',
  slot: null,
  showIf: null,
  variables: [],
};

const KIND_ICON: Record<SelectionKind, React.ElementType> = {
  texto: Type,
  imagem: ImageIcon,
  forma: Shapes,
  dinamico: Sparkles,
  varios: Group,
};

interface SelectionPanelProps {
  selection: SelectionInfo;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onLock: () => void;
  onSetInstructorSlot: (slot: number | null) => void;
  onSetShowIf: (variable: string | null) => void;
  /** Recolhe o painel para ganhar espaço. */
  onCollapse?: () => void;
  /** Propriedades do tipo selecionado (texto, forma…). */
  children?: React.ReactNode;
}

function Action({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${danger ? 'text-destructive hover:text-destructive' : ''}`}
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t px-4 py-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </section>
  );
}

/**
 * Painel da direita: tudo o que dá para fazer com o que está selecionado.
 * As abas da esquerda só adicionam coisas; aqui se edita.
 */
const SelectionPanel: React.FC<SelectionPanelProps> = ({
  selection,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onLock,
  onSetInstructorSlot,
  onSetShowIf,
  onCollapse,
  children,
}) => {
  const collapse = onCollapse && (
    <TooltipProvider delayDuration={300}>
      <Action label="Recolher painel" icon={PanelRightClose} onClick={onCollapse} />
    </TooltipProvider>
  );
  if (selection.count === 0 || !selection.kind) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        {collapse && <div className="absolute right-2 top-2">{collapse}</div>}
        <MousePointerClick className="h-8 w-8 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-medium">Nada selecionado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clique em um elemento do certificado para editar. Use as abas da esquerda para adicionar
            textos, variáveis, imagens e formas.
          </p>
        </div>
        <ul className="mt-2 space-y-1 text-left text-xs text-muted-foreground">
          <li><kbd className="rounded border px-1">Shift</kbd> + clique seleciona vários</li>
          <li><kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">Z</kbd> desfaz</li>
          <li><kbd className="rounded border px-1">Del</kbd> exclui o selecionado</li>
          <li>Elementos travados ficam na aba Camadas</li>
        </ul>
      </div>
    );
  }

  const Icon = KIND_ICON[selection.kind];
  const single = selection.count === 1;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Selecionado</p>
            <p className="truncate text-sm font-medium">{selection.label}</p>
          </div>
          {collapse}
        </header>

        <div className="flex items-center justify-between border-b px-2 py-1">
          <div className="flex">
            {single && <Action label="Duplicar" icon={Copy} onClick={onDuplicate} />}
            <Action label="Trazer para frente" icon={ArrowUp} onClick={onBringForward} />
            <Action label="Enviar para trás" icon={ArrowDown} onClick={onSendBackward} />
            <Action label="Travar (destrava na aba Camadas)" icon={Lock} onClick={onLock} />
          </div>
          <Action label="Excluir" icon={Trash2} onClick={onDelete} danger />
        </div>

        <div className="flex-1 overflow-y-auto">
          {children && <div className="p-3">{children}</div>}

          <Section
            title="Mostrar só se preenchida"
            hint='Ao gerar, o elemento some quando a variável escolhida está vazia — por exemplo, o rótulo "EMPRESA:" ligado a {{inscricao_empresa}}.'
          >
            <Select
              name="showIf"
              options={[
                { id: '', name: 'Sempre mostrar' },
                ...selection.variables.map((v) => ({ id: v, name: `{{${v}}}` })),
              ]}
              state={selection.showIf !== 'misto' ? selection.showIf ?? '' : ''}
              placeholder={selection.showIf === 'misto' ? 'Condições diferentes' : 'Sempre mostrar'}
              searchable
              onChange={(_, value) => onSetShowIf((value as string) || null)}
            />
          </Section>

          <Section
            title="Espaço de instrutor"
            hint="Marque nome, registro, currículo, assinatura e linha de cada instrutor com o mesmo número. Ao gerar, os espaços sem instrutor somem e os demais se redistribuem na mesma largura."
          >
            <div className="flex gap-1.5">
              {([null, 1, 2, 3, 4] as const).map((n) => (
                <Button
                  key={String(n)}
                  type="button"
                  size="sm"
                  variant={selection.slot === n ? 'default' : 'outline'}
                  className={n === null ? 'h-7 shrink-0 px-3 text-xs' : 'h-7 min-w-0 flex-1 px-0 text-xs'}
                  onClick={() => onSetInstructorSlot(n)}
                >
                  {n ?? 'Nenhum'}
                </Button>
              ))}
            </div>
            {selection.slot === 'misto' && (
              <p className="text-xs text-amber-600">Os elementos selecionados estão em espaços diferentes.</p>
            )}
          </Section>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SelectionPanel;
