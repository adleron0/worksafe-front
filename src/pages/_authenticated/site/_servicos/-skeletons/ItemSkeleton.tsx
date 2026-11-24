import { Skeleton } from "@/components/ui/skeleton";
import HeaderRow from "@/components/general-components/HeaderRow";

const ItemSkeleton = ({ index }: { index: number }) => {
  return (
    <>
      {/* Header para o primeiro item */}
      <HeaderRow show={index === 0} skeleton>
        <div className="w-3/12">Usuário</div>
        <div className="w-2/12">Função</div>
        <div className="w-2/12">Contatos</div>
        <div className="w-2/12">Criado em</div>
        <div className="w-2/12">Status</div>
        <div className="w-1/12">Ações</div>
      </HeaderRow>

      {/* Estrutura do Skeleton */}
      <div className="relative border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors gap-0 flex flex-row items-center justify-between px-4 py-3 w-full min-w-[880px] border-b space-y-0">
        {/* Avatar e Nome */}
        <div className="w-3/12 flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>

        {/* Cargo */}
        <div className="w-2/12">
          <Skeleton className="h-6 w-[80px]" />
        </div>

        {/* Contatos */}
        <div className="w-2/12 space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[120px]" />
        </div>

        {/* Data de Criação */}
        <div className="w-2/12">
          <Skeleton className="h-4 w-[100px]" />
        </div>

        {/* Status */}
        <div className="w-2/12">
          <Skeleton className="h-6 w-[60px] rounded-full" />
        </div>

        {/* Ações */}
        <div className="top-2 right-2 static w-1/12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </>
  );
}

export default ItemSkeleton;
