import { Skeleton } from "@/components/ui/skeleton";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      {/* Header para o primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-4/12">Certificado</div>
          <div className="w-3/12">Curso</div>
          <div className="w-2/12">Empresa</div>
          <div className="w-2/12">Status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Estrutura do Skeleton */}
      <div className="shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b space-y-4 lg:space-y-0">
        {/* Avatar e Nome */}
        <div className="w-full lg:w-4/12 flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
        </div>

        {/* Curso */}
        <div className="lg:w-3/12">
          <Skeleton className="h-4 w-[120px]" />
        </div>

        {/* Empresa */}
        <div className="lg:w-2/12">
          <Skeleton className="h-4 w-[100px]" />
        </div>

        {/* Status */}
        <div className="lg:w-2/12">
          <Skeleton className="h-6 w-[60px] rounded-full" />
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
}

export default ItemSkeleton;