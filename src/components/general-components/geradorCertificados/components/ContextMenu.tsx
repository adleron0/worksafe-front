import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  action: () => void;
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
      className="context-menu fixed min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      style={{
        left: `${x - 10}px`,
        top: `${y - 10}px`,
        zIndex: 9999,
        display: 'block'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Menu Header */}
      <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground border-b bg-muted/30">
        {title}
      </div>
      
      {/* Menu Items */}
      <div className="p-0.5">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-1.5 py-0.5 text-[10px] outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                item.action();
                onClose();
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
};

export default ContextMenu;