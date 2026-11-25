import { useNavigate } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";

export type NfseOrigin =
  | { kind: "installments"; contractId: number; installmentIds: number[] }
  | { kind: "measurement"; contractId: number; measurementId: number }
  | { kind: "rental"; contractId: number; rentalId: number };

/** Parâmetros da tela de nota nova para uma origem (parcela, boletim de obra, OL). */
export const originSearch = (origin: NfseOrigin) => ({
  origem: origin.kind,
  contrato: String(origin.contractId),
  ...(origin.kind === "installments" ? { parcelas: origin.installmentIds.join(",") } : {}),
  ...(origin.kind === "measurement" ? { boletim: String(origin.measurementId) } : {}),
  ...(origin.kind === "rental" ? { ol: String(origin.rentalId) } : {}),
});

/**
 * No faturamento (parcela, boletim, medição de locação): o caminho sugerido é
 * emitir a NFS-e pelo sistema. A nota abre já preenchida e, quando é autorizada,
 * o faturamento acontece sozinho com o número dela. O formulário de baixo segue
 * valendo para nota emitida fora.
 */
export default function EmitNfseCallout({ origin, onLeave }: { origin: NfseOrigin; onLeave?: () => void }) {
  const { can } = useVerify();
  const navigate = useNavigate();
  if (!can("emitir_nfse")) return null;
  return (
    <div className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <div className="text-sm min-w-0">
        <p className="font-semibold flex items-center gap-1.5"><Icon name="file-badge" className="w-4 h-4" /> Emitir a NFS-e pelo sistema</p>
        <p className="text-xs text-muted-foreground">A nota abre preenchida com o cliente, o valor e as retenções. Autorizada, o faturamento é feito sozinho. Nota emitida fora? Registre abaixo.</p>
      </div>
      <Button type="button" size="sm" className="shrink-0" onClick={() => { onLeave?.(); navigate({ to: "/financeiro/notas/nova", search: originSearch(origin) as never }); }}>
        Emitir NFS-e
      </Button>
    </div>
  );
}
