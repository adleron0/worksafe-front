import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  index: number;
}

const ItemSkeleton = ({ index }: Props) => {
  return (
    <>
      {index === 0 && (
        <div className="flex items-center justify-between py-2.5 border-b px-4 w-full font-semibold text-[12.5px] text-muted-foreground">
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
      } relative border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors gap-0 flex flex-row items-center justify-between px-4 py-3 w-full min-w-[880px] border-b animate-pulse`}>
        {/* Mobile/Tablet: Labels e valores empilhados */}
        <div className="flex-col gap-2 hidden w-full">
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
        <div className="flex items-center justify-between w-full">
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
        <div className="absolute top-2 right-2 hidden">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;