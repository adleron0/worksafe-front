import { Skeleton } from "@/components/ui/skeleton";

interface ItemSkeletonProps {
  index: number;
}

const ItemSkeleton = ({ index }: ItemSkeletonProps) => {
  return (
    <>
      {/* Header skeleton apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg">
          <Skeleton className="h-4 w-1/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-3/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-2/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-1/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-2/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-2/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-1/12 bg-primary-foreground/10" />
          <Skeleton className="h-4 w-1/12 bg-primary-foreground/10" />
        </div>
      )}

      {/* Conteúdo do skeleton */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* ID */}
        <div className="flex flex-col lg:w-1/12">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-4 w-8" />
        </div>

        {/* Título e Descrição */}
        <div className="flex flex-col lg:w-3/12 space-y-1">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-4 w-full max-w-[200px]" />
          <Skeleton className="h-3 w-full max-w-[150px]" />
        </div>

        {/* Curso */}
        <div className="flex flex-col lg:w-2/12">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Versão */}
        <div className="flex flex-col lg:w-1/12">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Configuração de Progresso */}
        <div className="flex flex-col lg:w-2/12">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Data de Criação */}
        <div className="flex flex-col lg:w-2/12">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-1/12">
          <Skeleton className="h-3 w-12 mb-1 lg:hidden" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* Botão de ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;