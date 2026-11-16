import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "../comercial/-shared/commercial";
import { stockApi } from "../suprimentos/-shared/stock";

export const Route = createFileRoute("/_authenticated/e/$tag")({
  component: TagRedirect,
});

/** Destino do QR da etiqueta: acha a peça pela etiqueta e abre a ficha dela. */
function TagRedirect() {
  const { tag } = Route.useParams();
  const navigate = useNavigate();
  const { data, error } = useQuery({ queryKey: ["stockUnitByTag", tag], queryFn: () => stockApi.get<{ id: number }>(`units/by-tag/${encodeURIComponent(tag)}`), retry: false });
  useEffect(() => {
    if (data) navigate({ to: "/suprimentos/equipamentos/$unitId", params: { unitId: String(data.id) }, replace: true });
  }, [data, navigate]);
  if (error) {
    return (
      <div className="p-4 grid gap-2">
        <p className="text-destructive font-medium">Etiqueta {tag}: {errorMessage(error)}</p>
        <Link to="/suprimentos/equipamentos" className="underline text-sm">Ir para os equipamentos</Link>
      </div>
    );
  }
  return <div className="grid gap-3"><p className="text-sm text-muted-foreground">Abrindo a peça {tag}...</p><Skeleton className="h-40 w-full" /></div>;
}
