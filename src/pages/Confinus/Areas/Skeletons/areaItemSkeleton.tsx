import { Skeleton } from "@/components/ui/skeleton";

const AreaItemSkeleton = () => {
  return (
    <>
      {/* Estrutura do Skeleton */}
      <div className="shadow-sm rounded relative flex flex-col w-full border-b">
        {/* imagem da área */}
        <div className="w-full flex items-center space-x-4">
          <Skeleton className="h-40 w-full" />
        </div>

        <div className="p-2 h-38 flex flex-col gap-2 justify-between">
          {/* Status */}
          <div className="flex justify-between">
            <Skeleton className="h-4 w-[70px] rounded-full" />
            <Skeleton className="h-4 w-[80px]" />
          </div>

          {/* Nome e descrição */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-full" />
          </div>

          {/* Ir pra área */}
          <div className="">
            <Skeleton className="h-4 w-fulll" />
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        </div>
      </div>
    </>
  );
}

export default AreaItemSkeleton;
