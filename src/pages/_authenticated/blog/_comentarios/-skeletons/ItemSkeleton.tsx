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

      <div className={`bg-card relative border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors gap-0 flex flex-row items-center justify-between px-4 py-3 w-full min-w-[880px] border-b space-y-0`}>
        {/* Conteúdo */}
        <div className="w-3/12 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>

        {/* Visitante */}
        <div className="w-2/12 flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-[80px]" />
        </div>

        {/* Post */}
        <div className="w-2/12">
          <Skeleton className="h-4 w-[120px]" />
        </div>

        {/* Rating */}
        <div className="w-1/12">
          <Skeleton className="h-4 w-[60px]" />
        </div>

        {/* Status */}
        <div className="w-2/12">
          <Skeleton className="h-6 w-[80px] rounded-full" />
        </div>

        {/* Ações */}
        <div className="top-2 right-2 static w-2/12 flex justify-end">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
}

export default ItemSkeleton;
