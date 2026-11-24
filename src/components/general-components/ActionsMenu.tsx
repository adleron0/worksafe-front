import { useState } from "react";
import Icon from "@/components/general-components/Icon";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface ActionItem {
  id: string;
  label: string;
  /** ícone lucide em kebab-case */
  icon?: string;
  onSelect: () => void;
  /** número ao lado (ex.: quantos selecionados a ação vai atingir) */
  count?: number;
  /** some do menu (sem permissão, não se aplica) */
  hidden?: boolean;
  /** aparece apagado; o texto explica o motivo ao passar o mouse */
  disabledReason?: string;
  /** pede confirmação antes (ConfirmDialog) */
  confirm?: { title: string; description: string; slideLabel?: string };
}

export interface ActionGroup {
  label?: string;
  items: ActionItem[];
}

/**
 * Menu "⋮ Ações ▾" da listagem (padrão Unyo): ações raras e em lote num lugar só,
 * agrupadas com rótulo em caixa alta. Grupos sem item visível somem.
 */
export default function ActionsMenu({ groups, label = "Ações" }: { groups: ActionGroup[]; label?: string }) {
  const [pending, setPending] = useState<ActionItem | null>(null);
  const visible = groups.map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden) })).filter((g) => g.items.length);
  if (!visible.length) return null;
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label={label}>
            <Icon name="ellipsis-vertical" className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">{label}</span>
            <Icon name="chevron-down" className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60 p-1.5">
          {visible.map((group, index) => (
            <div key={group.label ?? index}>
              {index > 0 && <DropdownMenuSeparator />}
              {group.label && <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{group.label}</DropdownMenuLabel>}
              {group.items.map((item) => {
                const row = (
                  <DropdownMenuItem key={item.id} className="gap-2.5 py-2" disabled={!!item.disabledReason}
                    onSelect={() => (item.confirm ? setPending(item) : item.onSelect())}>
                    {item.icon && <Icon name={item.icon} className="w-4 h-4 text-muted-foreground" />}
                    <span className="flex-1">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="rounded-full bg-primary text-primary-foreground text-[10px] leading-4 px-1.5 tabular-nums">{item.count}</span>
                    )}
                  </DropdownMenuItem>
                );
                if (!item.disabledReason) return row;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild><div>{row}</div></TooltipTrigger>
                    <TooltipContent side="left">{item.disabledReason}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {pending?.confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setPending(null); }}
          title={pending.confirm.title} description={pending.confirm.description} slideLabel={pending.confirm.slideLabel}
          onConfirm={() => { pending.onSelect(); setPending(null); }} />
      )}
    </>
  );
}
