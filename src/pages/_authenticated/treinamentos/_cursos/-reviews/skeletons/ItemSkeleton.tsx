import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  index: number;
}

const ItemSkeleton = ({ index }: Props) => {
  return (
    <>
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-3/12">
            <Skeleton className="h-4 w-20 bg-primary-foreground/20" />
          </div>
          <div className="w-2/12">
            <Skeleton className="h-4 w-16 bg-primary-foreground/20" />
          </div>
          <div className="w-2/12">
            <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
          </div>
          <div className="w-1/12">
            <Skeleton className="h-4 w-16 bg-primary-foreground/20" />
          </div>
          <div className="w-3/12">
            <Skeleton className="h-4 w-32 bg-primary-foreground/20" />
          </div>
          <div className="w-1/12">
            <Skeleton className="h-4 w-12 bg-primary-foreground/20" />
          </div>
        </div>
      )}

      <div className={`${
        index % 2 === 0 ? "bg-background" : "bg-background/50"
      } shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b animate-pulse`}>
        {/* Mobile/Tablet: Labels e valores empilhados */}
        <div className="flex flex-col gap-2 lg:hidden w-full">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Desktop: Colunas lado a lado */}
        <div className="hidden lg:flex lg:items-center lg:justify-between lg:w-full">
          <div className="w-3/12">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="w-2/12">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="w-2/12">
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="w-1/12">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-3/12">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="w-1/12">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Botão de ações - Mobile */}
        <div className="absolute top-2 right-2 lg:hidden">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;