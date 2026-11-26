import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "../../../comercial/-shared/commercial";
import { openFile } from "../-shared/fiscal";
import { EntitySelect, useEntities } from "@/components/general-components/EntitySelect";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Últimos 12 meses, o anterior primeiro (é o que normalmente vai para o contador). */
function monthOptions() {
  const now = new Date(Date.now() - 3 * 3600 * 1000);
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const id = d.toISOString().slice(0, 7);
    return { id, name: `${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}${i === 0 ? " (em andamento)" : ""}` };
  });
}

/** Pacote do mês para o contador: XML/PDF das emitidas, XML das recebidas e a planilha resumo. */
export default function AccountantExport({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const options = monthOptions();
  const [month, setMonth] = useState(options[1].id);
  const [busy, setBusy] = useState(false);
  // cada CNPJ tem a própria escrituração: um pacote por CNPJ (ou todos, uma pasta por CNPJ)
  const [entityId, setEntityId] = useState<number | null>(null);
  const { byId } = useEntities();
  const suffix = entityId ? `-${(byId.get(entityId)?.tradeName ?? "").toLowerCase().replace(/\s+/g, "-")}` : "";
  const download = async () => {
    setBusy(true);
    try {
      await openFile("fiscal/export", `notas-fiscais-${month}${suffix}.zip`, true, { month, ...(entityId ? { entityId: String(entityId) } : {}) });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Não consegui montar o pacote", description: errorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pacote do contador</DialogTitle>
          <DialogDescription>Um arquivo .zip com o XML e o PDF das notas emitidas no mês, o XML das notas recebidas de fornecedores e uma planilha com o resumo de valores e retenções.</DialogDescription>
        </DialogHeader>
        <div><Label>Competência</Label><Select name="month" options={options as never[]} state={month} onChange={(_, v) => setMonth(String(Array.isArray(v) ? v[0] ?? month : v))} modal /></div>
        <EntitySelect label="CNPJ" value={entityId} clearable emptyLabel="Todos (uma pasta por CNPJ)" onChange={setEntityId} />
        <p className="text-xs text-muted-foreground">Notas de teste (produção restrita) ficam de fora.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={download} disabled={busy}><Icon name={busy ? "loader-circle" : "download"} className={busy ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> Baixar .zip</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
