import { Skeleton } from "@/components/ui/skeleton";

interface ItemSkeletonProps {
  index: number;
}

const ItemSkeleton = ({ index }: ItemSkeletonProps) => {
  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg">
          <Skeleton className="h-4 w-4/12 bg-primary-foreground/20" />
          <Skeleton className="h-4 w-3/12 bg-primary-foreground/20" />
          <Skeleton className="h-4 w-2/12 bg-primary-foreground/20" />
          <Skeleton className="h-4 w-2/12 bg-primary-foreground/20" />
          <Skeleton className="h-4 w-1/12 bg-primary-foreground/20" />
        </div>
      )}

      {/* Conteúdo do item */}
      <div 
        className={`
          ${index % 2 === 0 ? "bg-background" : "bg-background/50"} 
          flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full 
          border-b border-border/40 gap-2 lg:gap-0
        `}
      >
        {/* Nome */}
        <div className="flex flex-col lg:w-4/12 gap-1">
          <Skeleton className="h-3 w-20 lg:hidden" />
          <Skeleton className="h-5 w-full max-w-[200px]" />
          <Skeleton className="h-3 w-full max-w-[150px]" />
        </div>

        {/* Curso */}
        <div className="flex flex-col lg:w-3/12 gap-1">
          <Skeleton className="h-3 w-16 lg:hidden" />
          <Skeleton className="h-4 w-full max-w-[120px]" />
          <Skeleton className="h-3 w-10" />
        </div>

        {/* Lições */}
        <div className="flex flex-col lg:w-2/12 gap-1">
          <Skeleton className="h-3 w-16 lg:hidden" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Status */}
        <div className="flex flex-col lg:w-2/12 gap-1">
          <Skeleton className="h-3 w-16 lg:hidden" />
          <Skeleton className="h-6 w-20" />
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;