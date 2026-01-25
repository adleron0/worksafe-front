import { Skeleton } from "@/components/ui/skeleton";
import HeaderRow from "@/components/general-components/HeaderRow";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-4/12">Categoria</div>
        <div className="w-4/12">Descrição</div>
        <div className="w-1/12">Posts</div>
        <div className="w-2/12">Status</div>
        <div className="w-1/12 text-right">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b space-y-4 lg:space-y-0`}>
        {/* Nome e Slug */}
        <div className="w-full lg:w-4/12 space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>

        {/* Descrição */}
        <div className="lg:w-4/12">
          <Skeleton className="h-4 w-[180px]" />
        </div>

        {/* Posts Count */}
        <div className="lg:w-1/12">
          <Skeleton className="h-6 w-[50px] rounded-full" />
        </div>

        {/* Status */}
        <div className="lg:w-2/12">
          <Skeleton className="h-6 w-[60px] rounded-full" />
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12 flex justify-end">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
}

export default ItemSkeleton;
