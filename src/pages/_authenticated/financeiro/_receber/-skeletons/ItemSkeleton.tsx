import { Skeleton } from "@/components/ui/skeleton";

interface ItemSkeletonProps {
  index: number;
}

const ItemSkeleton = ({ index }: ItemSkeletonProps) => {
  return (
    <>
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="lg:w-3/12">Cliente/Aluno</div>
          <div className="lg:w-2/12">Valor</div>
          <div className="lg:w-2/12">Datas</div>
          <div className="lg:w-1/12">Status</div>
          <div className="lg:w-2/12">Descrição</div>
          <div className="lg:w-1/12">Ações</div>
        </div>
      )}

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        <div className="flex flex-col lg:w-3/12 space-y-1">
          <p className="text-xs text-muted-foreground lg:hidden">Cliente/Aluno</p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        <div className="flex flex-col lg:w-2/12 space-y-1">
          <p className="text-xs text-muted-foreground lg:hidden">Valor</p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>

        <div className="flex flex-col lg:w-2/12 space-y-1">
          <p className="text-xs text-muted-foreground lg:hidden">Datas</p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <div className="flex flex-col lg:w-1/12 space-y-1">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Skeleton className="h-6 w-20" />
        </div>

        <div className="flex flex-col lg:w-2/12 space-y-1">
          <p className="text-xs text-muted-foreground lg:hidden">Descrição</p>
          <Skeleton className="h-4 w-full" />
        </div>

        {/* Badge Gateway flutuante skeleton */}
        <div className="absolute -top-1 left-4 right-14 lg:right-auto lg:left-4">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;