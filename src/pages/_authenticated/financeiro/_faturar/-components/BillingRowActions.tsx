import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { BillingRow } from "../../../comercial/-shared/contracts";
import { isMeasurement, isWork } from "./billingColumns";

/**
 * Ações de uma parcela na lista: "Registrar NF" fica à mostra quando já pode faturar;
 * "Faturar mesmo assim" e "Desfazer" (com confirmação) moram no menu ⋯.
 */
export default function BillingRowActions({ row, canBill, canUnbill, onBill, onUnbill }: {
  row: BillingRow; canBill: boolean; canUnbill: boolean; onBill: () => void; onUnbill: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const canRegister = row.stage === "liberada" && canBill;
  const canForce = row.stage === "aguardando" && canBill && !isMeasurement(row);
  const canUndo = row.stage === "faturada" && canUnbill;
  if (!canRegister && !canForce && !canUndo) return null;
  return (
    <div className="inline-flex items-center gap-1">
      {canRegister && <Button type="button" size="sm" className="h-7 gap-1 px-2" onClick={onBill}><Icon name="receipt" className="w-3.5 h-3.5" /> Registrar NF</Button>}
      {(canForce || canUndo) && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${row.customer.name}`} /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canForce && <DropdownMenuItem className="gap-2" onSelect={onBill}><Icon name="receipt" className="w-3.5 h-3.5" /> Faturar mesmo assim</DropdownMenuItem>}
            {canUndo && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm(true)}><Icon name="undo-2" className="w-3.5 h-3.5" /> Desfazer</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(false); }}
          title={isMeasurement(row) ? "Desfazer esta medição?" : "Desfazer o faturamento desta parcela?"}
          description={isWork(row) ? "A conta a receber do boletim é cancelada, a caução dele volta e o boletim fica aprovado. Só o boletim mais novo do contrato pode ser desfeito." : isMeasurement(row) ? "A conta a receber da medição é cancelada e os períodos e cobranças dela voltam a ficar pendentes. Use quando a nota foi lançada errada." : "A conta a receber desta parcela é cancelada e a parcela volta a ficar sem nota. Use quando a nota foi lançada errada."}
          onConfirm={() => { onUnbill(); setConfirm(false); }} />
      )}
    </div>
  );
}
