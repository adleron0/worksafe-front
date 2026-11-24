import { Skeleton } from "@/components/ui/skeleton";
import HeaderRow from "@/components/general-components/HeaderRow";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      <HeaderRow show={index === 0}>
        <div className="w-2/12">Curso</div>
        <div className="w-2/12">Turma</div>
        <div className="w-2/12">Data</div>
        <div className="w-2/12">Nota</div>
        <div className="w-2/12">Acertos</div>
        <div className="w-1/12">Resultado</div>
        <div className="w-1/12">Ações</div>
      </HeaderRow>

      <div className={`bg-card relative border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors gap-0 flex flex-row items-center justify-between px-4 py-3 w-full min-w-[880px] border-b`}>
        
        {/* Curso */}
        <div className="w-2/12 md:pr-2">
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Turma */}
        <div className="w-2/12 md:pr-2">
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Data */}
        <div className="w-2/12 md:pr-2">
          <Skeleton className="h-5 w-36" />
        </div>

        {/* Nota */}
        <div className="w-2/12 md:pr-2">
          <Skeleton className="h-6 w-12" />
        </div>

        {/* Acertos */}
        <div className="w-2/12 md:pr-2">
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Resultado */}
        <div className="w-1/12 md:pr-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Ações */}
        <div className="top-2 right-2 static w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
};

export default ItemSkeleton;