import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";

/** O que vai junto com o aceite: o pedido de compra do cliente, quando já chegou. */
export interface DecisionExtra { customerOrderNumber?: string; customerOrderDate?: string }

/** Registrar o aceite ou a recusa que o cliente deu por fora do sistema. Usado na proposta, na lista e no kanban. */
export default function DecisionDialog({ decision, number, pending, onClose, onConfirm }: { decision: "aceita" | "recusada"; number: string; pending: boolean; onClose: () => void; onConfirm: (note: string, extra?: DecisionExtra) => void }) {
  const [note, setNote] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
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
            placeholder={accepted ? "Ex.: aceite por e-mail em 14/11" : "Ex.: preço acima do orçamento do cliente"} />
        </div>
        {accepted && (
          <div className="rounded-md border p-3 grid gap-3">
            <div>
              <p className="text-sm font-medium">Pedido do cliente</p>
              <p className="text-xs text-muted-foreground">Se o cliente já mandou o pedido de compra, informe aqui. Dá para informar depois e anexar o arquivo na proposta aceita.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label htmlFor="decisionOrderNumber">Número do pedido</Label>
                <ShadInput id="decisionOrderNumber" className="mt-1" maxLength={60} value={orderNumber} placeholder="Ex.: 4500123456" onChange={(event) => setOrderNumber(event.target.value)} /></div>
              <div><Label>Data do pedido</Label>
                <CalendarPicker mode="single" name="decisionOrderDate" className="mt-1 w-full" value={orderDate} placeholder="Opcional" fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => setOrderDate(String(value ?? ""))} /></div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" disabled={pending} onClick={() => onConfirm(note, accepted ? { ...(orderNumber.trim() ? { customerOrderNumber: orderNumber.trim() } : {}), ...(orderDate ? { customerOrderDate: orderDate } : {}) } : undefined)}>{accepted ? "Registrar aceite" : "Registrar recusa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
