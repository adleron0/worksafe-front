import { Skeleton } from "@/components/ui/skeleton";
import HeaderRow from "@/components/general-components/HeaderRow";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-5/12">Tag</div>
        <div className="w-3/12">Slug</div>
        <div className="w-2/12">Status</div>
        <div className="w-2/12 text-right">Ações</div>
      </HeaderRow>

      <div className={`bg-card relative border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors gap-0 flex flex-row items-center justify-between px-4 py-3 w-full min-w-[880px] border-b space-y-0`}>
        {/* Nome */}
        <div className="w-5/12">
          <Skeleton className="h-4 w-[150px]" />
        </div>

        {/* Slug */}
        <div className="w-3/12">
          <Skeleton className="h-4 w-[120px]" />
        </div>

        {/* Status */}
        <div className="w-2/12">
          <Skeleton className="h-6 w-[60px] rounded-full" />
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
