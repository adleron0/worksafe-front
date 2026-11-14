import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Registrar o aceite ou a recusa que o cliente deu por fora do sistema. Usado na proposta, na lista e no kanban. */
export default function DecisionDialog({ decision, number, pending, onClose, onConfirm }: { decision: "aceita" | "recusada"; number: string; pending: boolean; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  const accepted = decision === "aceita";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{accepted ? `Registrar o aceite de ${number}` : `Registrar a recusa de ${number}`}</DialogTitle>
          <DialogDescription>
            {accepted ? "Use quando o cliente aceitou por fora do sistema (e-mail, pedido de compra). Anote como foi." : "Anote o motivo, se souber. Dá para criar uma revisão depois."}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="decisionNote">Observação</Label>
          <Textarea id="decisionNote" className="mt-1" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
            placeholder={accepted ? "Ex.: aceite por e-mail em 14/11, pedido de compra 4500123" : "Ex.: preço acima do orçamento do cliente"} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" disabled={pending} onClick={() => onConfirm(note)}>{accepted ? "Registrar aceite" : "Registrar recusa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
