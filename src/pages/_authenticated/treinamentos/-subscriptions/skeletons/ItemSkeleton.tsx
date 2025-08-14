import { Skeleton } from "@/components/ui/skeleton";

const ItemSkeleton = () => {
  return (
    <div className="flex items-center justify-between p-4 w-full border-b bg-background/50">
      <div className="flex items-center space-x-4 w-full">
        {/* Avatar Skeleton */}
        <Skeleton className="h-10 w-10 rounded-full" />
        
        {/* Info Skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>

        {/* Action Skeleton */}
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
};

export default ItemSkeleton;