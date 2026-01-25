import { Skeleton } from "@/components/ui/skeleton";
import HeaderRow from "@/components/general-components/HeaderRow";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-3/12">Comentário</div>
        <div className="w-2/12">Visitante</div>
        <div className="w-2/12">Post</div>
        <div className="w-1/12">Rating</div>
        <div className="w-2/12">Status</div>
        <div className="w-2/12 text-right">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b space-y-4 lg:space-y-0`}>
        {/* Conteúdo */}
        <div className="w-full lg:w-3/12 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>

        {/* Visitante */}
        <div className="lg:w-2/12 flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-[80px]" />
        </div>

        {/* Post */}
        <div className="lg:w-2/12">
          <Skeleton className="h-4 w-[120px]" />
        </div>

        {/* Rating */}
        <div className="lg:w-1/12">
          <Skeleton className="h-4 w-[60px]" />
        </div>

        {/* Status */}
        <div className="lg:w-2/12">
          <Skeleton className="h-6 w-[80px] rounded-full" />
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-2/12 flex justify-end">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
}

export default ItemSkeleton;
