import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const StatusCardsSkeleton = () => {
  // Create 8 skeleton cards (1 total + 7 status)
  const skeletonCards = Array(8).fill(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {skeletonCards.map((_, index) => (
        <Card
          key={index}
          className={`relative overflow-hidden ${
            index === 0 ? "border bg-transparent" : "bg-muted/5 border"
          }`}
        >
          <div className="p-4">
            {/* Icon and percentage skeleton */}
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-4 rounded" />
              {index !== 0 && <Skeleton className="h-3 w-8" />}
            </div>

            {/* Label skeleton */}
            <Skeleton className="h-3 w-20 mb-2" />

            {/* Value skeleton */}
            <Skeleton className="h-6 w-28 mb-1" />

            {/* Count skeleton */}
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Progress bar skeleton */}
          {index !== 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
              <Skeleton className="h-full w-1/3" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default StatusCardsSkeleton;