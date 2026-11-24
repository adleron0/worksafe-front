import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { ApiError } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import SettleDialog from "./SettleDialog";
import RetentionDialog from "../../-shared/RetentionDialog";
import { OPEN_STATUSES } from "./options";

/** Menu ⋯ de uma conta a receber: baixa, editar/nota fiscal, impostos retidos, estorno, inativar e reativar. */
export default function ReceivableRowActions({ item, entity, onEdit }: { item: IFinancialRecord; entity: IDefaultEntity; onEdit: (item: IFinancialRecord) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [openSettle, setOpenSettle] = useState(false);
  const [openRetentions, setOpenRetentions] = useState(false);
  const [confirm, setConfirm] = useState<null | "unsettle" | "inactive" | "active">(null);

  const isManual = item.gateway === "manual";
  const isOpen = OPEN_STATUSES.includes(item.status);
  const canUpdate = can(`update_${entity.ability}`);
  const canInactive = can(`inactive_${entity.ability}`);
  const canActivate = can(`activate_${entity.ability}`);

  const { mutate: run } = useMutation({
    mutationFn: ({ action }: { action: "unsettle" | "inactive" | "active"; done: string }) => patch(entity.model, `${action}/${item.id}`),
    onSuccess: (_data, { done }) => {
      toast({ title: done, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => toast({ title: "Não foi possível concluir", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" }),
  });

  const canSettle = canUpdate && isManual && isOpen && !item.inactiveAt;
  const canEdit = canUpdate && !item.inactiveAt;
  const canRetain = canUpdate && isManual && !item.inactiveAt && item.status !== "cancelled";
  const canUnsettle = canUpdate && isManual && item.status === "received";
  const canArchive = isManual && !item.inactiveAt && item.status !== "received" && canInactive;
  const canRestore = !!item.inactiveAt && canActivate;
  if (!canSettle && !canEdit && !canRetain && !canUnsettle && !canArchive && !canRestore) return null;

  const CONFIRMS = {
    unsettle: { title: "Estornar a baixa?", description: "A conta volta a ficar em aberto e a data e o valor do recebimento são apagados.", done: "Baixa estornada!" },
    inactive: { title: "Inativar esta conta a receber?", description: "Ela sai da listagem de ativas e dos totais. Pode ser reativada depois.", done: "Conta a receber inativada!" },
    active: { title: "Reativar esta conta a receber?", description: "Ela volta para a listagem de ativas e para os totais.", done: "Conta a receber reativada!" },
  } as const;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações da conta ${item.id}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canSettle && <DropdownMenuItem className="gap-2" onSelect={() => setOpenSettle(true)}><Icon name="circle-check" className="w-3.5 h-3.5" /> Dar baixa</DropdownMenuItem>}
          {canEdit && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> {isManual ? "Editar" : "Nota fiscal"}</DropdownMenuItem>}
          {canRetain && <DropdownMenuItem className="gap-2" onSelect={() => setOpenRetentions(true)}><Icon name="landmark" className="w-3.5 h-3.5" /> Impostos retidos</DropdownMenuItem>}
          {(canUnsettle || canArchive || canRestore) && (canSettle || canEdit || canRetain) && <DropdownMenuSeparator />}
          {canUnsettle && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("unsettle")}><Icon name="undo-2" className="w-3.5 h-3.5" /> Estornar baixa</DropdownMenuItem>}
          {canArchive && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("inactive")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>}
          {canRestore && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("active")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { run({ action: confirm, done: CONFIRMS[confirm].done }); setConfirm(null); }} />
      )}
      {openRetentions && <RetentionDialog recordId={item.id} label={item.invoiceNumber ? `NF ${item.invoiceNumber}` : item.description || `conta ${item.id}`} onClose={() => setOpenRetentions(false)} />}
      {openSettle && <SettleDialog item={item} entity={entity} open={openSettle} onOpenChange={setOpenSettle} />}
    </>
  );
}
