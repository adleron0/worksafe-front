import { Skeleton } from "@/components/ui/skeleton";

interface ItemSkeletonProps {
  index: number;
}

const ItemSkeleton = ({ index }: ItemSkeletonProps) => {
  return (
    <>
      {/* Header skeleton apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary/10 rounded-t-lg">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      )}

      {/* Item skeleton */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Gateway */}
        <div className="lg:w-4/12">
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Status */}
        <div className="lg:w-3/12">
          <Skeleton className="h-6 w-16" />
        </div>

        {/* Data */}
        <div className="lg:w-4/12">
          <Skeleton className="h-4 w-36" />
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