import { useNavigate } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { useFiscalSettings } from "./fiscal";

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
  const { data: settings } = useFiscalSettings(can("emitir_nfse") && origin.kind === "rental");
  if (!can("emitir_nfse")) return null;
  // locação: até a data configurada, a nota é opcional
  const today = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const rentalFrom = settings?.rentalNfseFrom ? settings.rentalNfseFrom.slice(0, 10) : null;
  const rentalNote = origin.kind === "rental"
    ? rentalFrom && rentalFrom <= today ? "Locação com NFS-e obrigatória (código 99.04.01)." : `NFS-e de locação ainda opcional${rentalFrom ? ` (obrigatória a partir de ${rentalFrom.split("-").reverse().join("/")})` : ""}.`
    : null;
  return (
    <div className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <div className="text-sm min-w-0">
        <p className="font-semibold flex items-center gap-1.5"><Icon name="file-badge" className="w-4 h-4" /> Emitir a NFS-e pelo sistema</p>
        <p className="text-xs text-muted-foreground">A nota abre preenchida com o cliente, o valor e as retenções. Autorizada, o faturamento é feito sozinho. Nota emitida fora? Registre abaixo.</p>
        {rentalNote && <p className="text-xs font-medium mt-0.5">{rentalNote}</p>}
      </div>
      <Button type="button" size="sm" className="shrink-0" onClick={() => { onLeave?.(); navigate({ to: "/financeiro/notas/nova", search: originSearch(origin) as never }); }}>
        Emitir NFS-e
      </Button>
    </div>
  );
}
