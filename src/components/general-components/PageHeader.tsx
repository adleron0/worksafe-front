import { cn } from "@/lib/utils";

/**
 * Título da página no padrão das listagens: título 20px, descrição curta em cinza.
 * As ações da lista ficam na barra de ferramentas (ListToolbar), não aqui;
 * `actions` existe só para telas que não têm barra.
 */
export default function PageHeader({ title, description, actions, className }: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight">{title}</h1>
        {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
