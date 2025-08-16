import { Skeleton } from "@/components/ui/skeleton";
import ListHeader from "@/components/general-components/ListHeader";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      <ListHeader show={index === 0}>
        <div className="w-3/12">Curso</div>
        <div className="w-2/12">Turma</div>
        <div className="w-2/12">Validade</div>
        <div className="w-2/12">Emissão</div>
        <div className="w-2/12">Status</div>
        <div className="w-1/12">Ações</div>
      </ListHeader>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        
        {/* Curso */}
        <div className="w-full lg:w-3/12 md:pr-2">
          <Skeleton className="h-5 w-40" />
        </div>

        {/* Turma */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Validade */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-24" />
        </div>

        {/* Emissão */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-24" />
        </div>

        {/* Status */}
        <div className="lg:w-2/12 md:pr-2">
          <Skeleton className="h-6 w-20 rounded-full" />
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