import { createFileRoute, Link } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import { EQUIP_ABILITY } from "../-shared/equipment";
import { DuesPanel } from "../-shared/equipment-dues";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/vencimentos")({
  component: DuesPage,
  validateSearch: (search: Record<string, unknown>): { tipo?: string } => (typeof search.tipo === "string" && search.tipo ? { tipo: search.tipo } : {}),
});

/** Rota mantida para links antigos: o mesmo conteúdo da aba "Vencimentos" de Inspeções e calibrações. */
function DuesPage() {
  const { can } = useVerify();
  const { tipo } = Route.useSearch();
  if (!can(`view_${EQUIP_ABILITY}`)) return null;
  return (
    <>
      <Link to="/suprimentos/equipamentos/inspecoes" search={{ view: "vencimentos" }} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Inspeções e calibrações</Link>
      <h1 className="text-xl font-bold mt-1">Vencimentos</h1>
      <p className="text-sm text-muted-foreground">Inspeções, calibrações, vida útil das peças, validade dos lotes com saldo e CA dos EPIs.</p>
      <DuesPanel initialType={tipo ?? ""} />
    </>
  );
}
