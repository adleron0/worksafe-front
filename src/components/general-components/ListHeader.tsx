import React from "react";
import { cn } from "@/lib/utils";

interface ListHeaderProps {
  children: React.ReactNode;
  className?: string;
  show?: boolean; // Para controlar se deve ser exibido ou não
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
 */
const ListHeader: React.FC<ListHeaderProps> = ({ 
  children, 
  className,
  show = true 
}) => {
  if (!show) return null;

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