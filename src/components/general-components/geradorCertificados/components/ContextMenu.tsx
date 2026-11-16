import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  action: () => void;
  /** Linha divisória antes deste item. */
  separator?: boolean;
  /** Atalho mostrado à direita (só texto). */
  hint?: string;
  danger?: boolean;
}

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  title: string;
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  show,
  x,
  y,
  title,
  items,
  onClose
}) => {
  if (!show) return null;

  return (
    <div
      className="context-menu fixed min-w-[13rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      style={{
        // não deixa o menu sair da tela
        left: `${Math.min(x - 10, window.innerWidth - 220)}px`,
        top: `${Math.min(y - 10, window.innerHeight - (items.length * 30 + 40))}px`,
        zIndex: 9999,
        display: 'block'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Menu Header */}
      <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground border-b bg-muted/30">
        {title}
      </div>
      
      {/* Menu Items */}
      <div className="p-0.5">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={index}>
              {item.separator && <div className="my-0.5 h-px bg-border" />}
              <Button
                variant="ghost"
                size="sm"
                className={`relative flex h-7 w-full cursor-pointer select-none items-center justify-start rounded-sm px-2 text-xs font-normal outline-none hover:bg-accent hover:text-accent-foreground ${
                  item.danger ? 'text-destructive hover:text-destructive' : ''
                }`}
                onClick={() => {
                  item.action();
                  onClose();
                }}
              >
                <Icon className="mr-2 h-3.5 w-3.5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.hint && <span className="ml-3 text-[10px] text-muted-foreground">{item.hint}</span>}
              </Button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ContextMenu;