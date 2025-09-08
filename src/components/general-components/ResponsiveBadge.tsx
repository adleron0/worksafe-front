import { Badge } from "@/components/ui/badge";
import Icon from "@/components/general-components/Icon";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ResponsiveBadgeProps {
  icon: string;
  text: string;
  shortText?: string; // Texto curto para mobile (ex: número)
  variant?: "outline" | "default" | "secondary" | "destructive";
  className?: string;
  iconClassName?: string;
  colorClass?: string; // Classes personalizadas de cor (ex: "text-green-800 bg-green-100")
}

const ResponsiveBadge = ({
  icon,
  text,
  shortText,
  variant = "outline",
  className,
  iconClassName = "w-3 h-3",
  colorClass,
}: ResponsiveBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calcula a posição do tooltip
  useEffect(() => {
    if (showTooltip && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8, // 8px acima do badge
        left: rect.left + rect.width / 2,
      });
    }
  }, [showTooltip]);

  // Fecha o tooltip quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        badgeRef.current &&
        !badgeRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showTooltip]);

  const baseClasses = "text-2xs h-4 rounded-sm font-medium flex-shrink-0";
  const finalClassName = cn(baseClasses, colorClass, className);

  return (
    <>
      {/* Desktop: Badge normal com texto completo */}
      <Badge
        variant={variant}
        className={cn("hidden sm:inline-flex", finalClassName)}
      >
        <Icon name={icon} className={cn(iconClassName, "mr-1")} />
        {text}
      </Badge>

      {/* Mobile: Badge com tooltip via Portal */}
      <div className="inline-flex sm:hidden" ref={badgeRef}>
        <Badge
          variant={variant}
          className={cn("cursor-pointer", finalClassName)}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <Icon name={icon} className={iconClassName} />
          {shortText && <span className="ml-1">{shortText}</span>}
        </Badge>
        
        {/* Tooltip renderizado via Portal no body */}
        {showTooltip && typeof document !== 'undefined' && createPortal(
          <div
            ref={tooltipRef}
            className="fixed px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-md shadow-lg z-[9999] whitespace-nowrap animate-in fade-in-0 zoom-in-95"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {text}
            {/* Seta do tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
};

export default ResponsiveBadge;