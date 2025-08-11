import { Skeleton } from "@/components/ui/skeleton";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-2/12">Curso</div>
          <div className="w-2/12">Turma</div>
          <div className="w-2/12">Data</div>
          <div className="w-2/12">Nota</div>
          <div className="w-2/12">Acertos</div>
          <div className="w-1/12">Resultado</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        
        {/* Curso */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Turma */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Data */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-36" />
        </div>

        {/* Nota */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-6 w-12" />
        </div>

        {/* Acertos */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Resultado */}
        <div className="lg:w-1/12 md:pr-2">
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