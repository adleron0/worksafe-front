import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ListHeaderProps {
  children: React.ReactNode;
  className?: string;
  show?: boolean; // Para controlar se deve ser exibido ou não
  skeleton?: boolean; // Para ativar o modo skeleton
}

/**
 * ListHeader Component
 * 
 * Componente genérico para headers de listagens em formato de tabela.
 * Centraliza a estilização padrão para headers de listas.
 * 
 * @example
 * ```tsx
 * <ListHeader>
 *   <div className="w-3/12">Curso</div>
 *   <div className="w-2/12">Turma</div>
 *   <div className="w-2/12">Data</div>
 *   <div className="w-2/12">Status</div>
 *   <div className="w-1/12">Ações</div>
 * </ListHeader>
 * ```
 * 
 * @example Com propriedades customizadas
 * ```tsx
 * <ListHeader className="bg-secondary" show={index === 0}>
 *   <div className="w-4/12">Nome</div>
 *   <div className="w-4/12">Email</div>
 *   <div className="w-4/12">Ações</div>
 * </ListHeader>
 * ```
 *
 * @example Com modo skeleton
 * ```tsx
 * <ListHeader skeleton>
 *   <div className="w-3/12" />
 *   <div className="w-3/12" />
 *   <div className="w-3/12" />
 *   <div className="w-3/12" />
 * </ListHeader>
 * ```
 */
const ListHeader: React.FC<ListHeaderProps> = ({
  children,
  className,
  show = true,
  skeleton = false
}) => {
  if (!show) return null;

  if (skeleton) {
    return (
      <div
        className={cn(
          "hidden lg:flex items-center justify-between py-2 px-4 w-full bg-inverse-foreground/50 rounded-t-lg border gap-3",
          className
        )}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const childClassName = child.props.className || '';
            const widthClass = childClassName.match(/w-\d+\/12/)?.[0] || 'w-full';

            // Variar larguras dos skeletons para parecer mais natural
            const skeletonWidths = ['w-3/4', 'w-2/3', 'w-5/6', 'w-full', 'w-1/2', 'w-4/5'];
            const selectedWidth = skeletonWidths[index % skeletonWidths.length];

            // Para a coluna de ações (última), fazer menor
            const childrenArray = React.Children.toArray(children);
            const isLastColumn = index === childrenArray.length - 1;
            const isCenter = childClassName.includes('text-center');

            return (
              <div key={index} className={cn(widthClass, "flex", isCenter && "justify-center")}>
                <Skeleton className={cn(
                  "h-4",
                  isLastColumn ? "w-12" : selectedWidth
                )} />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden lg:flex items-center justify-between py-2 px-4 w-full bg-inverse-foreground/50 rounded-t-lg font-semibold text-sm text-foreground/70 border",
        className
      )}
    >
      {children}
    </div>
  );
};

export default ListHeader;