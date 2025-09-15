import { Skeleton } from "@/components/ui/skeleton";

interface ItemSkeletonProps {
  index: number;
}

const ItemSkeleton = ({ index }: ItemSkeletonProps) => {
  return (
    <>
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <p className="lg:w-3/12">Cupom</p>
          <p className="lg:w-2/12">Desconto</p>
          <p className="lg:w-3/12">Vendedor</p>
          <p className="lg:w-1/12">Uso</p>
          <p className="lg:w-2/12">Validade</p>
          <p className="lg:w-1/12">Status</p>
          <p className="lg:w-1/12 text-center">Ações</p>
        </div>
      )}

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b animate-pulse`}>
        <div className="flex flex-col lg:w-3/12">
          <p className="text-xs text-muted-foreground lg:hidden mb-1">Cupom</p>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-36 mt-1" />
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden mb-1">Desconto</p>
          <Skeleton className="h-5 w-16" />
        </div>

        <div className="flex flex-col lg:w-3/12">
          <p className="text-xs text-muted-foreground lg:hidden mb-1">Vendedor</p>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20 mt-1" />
        </div>

        <div className="flex flex-col lg:w-1/12">
          <p className="text-xs text-muted-foreground lg:hidden mb-1">Uso</p>
          <Skeleton className="h-4 w-12" />
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden mb-1">Validade</p>
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="flex flex-col lg:w-1/12">
          <p className="text-xs text-muted-foreground lg:hidden mb-1">Status</p>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;