import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import ResponsiveBadge from "@/components/general-components/ResponsiveBadge";
import { ApiError } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { IFinancialRecord } from "../-interfaces/entity.interface";
import SettleDialog from "./SettleDialog";
import { OPEN_STATUSES, formatCurrency, formatDate, paymentMethodLabel, todayInput } from "./options";

interface ItemsProps {
  item: IFinancialRecord;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IFinancialRecord) => void;
  setOpenForm: (open: boolean) => void;
}

type StatusName = "processing" | "waiting" | "received" | "declined" | "chargeback" | "cancelled" | "overdue";
const KNOWN_STATUS: StatusName[] = ["processing", "waiting", "received", "declined", "chargeback", "cancelled", "overdue"];

const Item = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [openSettle, setOpenSettle] = useState(false);

  const isManual = item.gateway === "manual";
  const isOpen = OPEN_STATUSES.includes(item.status);
  const canUpdate = can(`update_${entity.ability}`);
  // Manual não tem provedor para marcar atraso: mostramos pelo vencimento.
  const late = isManual && item.status === "waiting" && !!item.dueDate && item.dueDate.slice(0, 10) < todayInput();
  const status: StatusName = late ? "overdue" : KNOWN_STATUS.includes(item.status as StatusName) ? (item.status as StatusName) : "processing";

  const { mutate: run } = useMutation({
    mutationFn: ({ action }: { action: "unsettle" | "inactive" | "active"; done: string }) =>
      patch(entity.model, `${action}/${item.id}`),
    onSuccess: (_data, { done }) => {
      toast({ title: done, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      toast({
        title: "Não foi possível concluir",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const name = item.customer?.name || item.trainee?.name || item.subscription?.name || "-";
  const contact = item.trainee?.email || item.subscription?.email || item.customer?.email;
  const showMenu = canUpdate || can(`inactive_${entity.ability}`) || can(`activate_${entity.ability}`);

  return (
    <>
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="lg:w-3/12">Cliente/Aluno</div>
          <div className="lg:w-2/12">Valor</div>
          <div className="lg:w-2/12">Datas</div>
          <div className="lg:w-2/12">Nota fiscal</div>
          <div className="lg:w-2/12">Status</div>
          <div className="lg:w-1/12">Ações</div>
        </div>
      )}

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} ${item.inactiveAt ? "opacity-60" : ""} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        <div className="absolute -top-1 left-4 right-14 lg:right-auto lg:left-4">
          <div className="flex items-center gap-2">
            <ResponsiveBadge
              icon={isManual ? "hand-coins" : "credit-card"}
              text={item.gateway.toUpperCase()}
              colorClass="text-inverse-foreground bg-primary"
              iconClassName="w-3 h-3"
            />
            {item.installmentNumber && item.installmentTotal && (
              <ResponsiveBadge
                icon="layers"
                text={`Parcela ${item.installmentNumber}/${item.installmentTotal}`}
                colorClass="text-foreground bg-muted"
                iconClassName="w-3 h-3"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col lg:w-3/12 pr-2">
          <p className="text-xs text-muted-foreground lg:hidden">Cliente/Aluno</p>
          <p className="font-medium">{name}</p>
          {contact && <p className="text-xs text-muted-foreground break-all">{contact}</p>}
          {item.description && <p className="text-xs text-muted-foreground break-words">{item.description}</p>}
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Valor</p>
          <p className="font-medium">{formatCurrency(item.value)}</p>
          {item.netValue && Number(item.netValue) !== Number(item.value) && (
            <p className="text-xs text-muted-foreground">Líquido: {formatCurrency(item.netValue)}</p>
          )}
          {item.receivedValue && Number(item.receivedValue) !== Number(item.netValue ?? item.value) && (
            <p className="text-xs text-muted-foreground">Recebido: {formatCurrency(item.receivedValue)}</p>
          )}
          {item.originalValue && Number(item.originalValue) !== Number(item.value) && (
            <p className="text-xs text-muted-foreground">Original: {formatCurrency(item.originalValue)}</p>
          )}
          {item.discount && Number(item.discount) > 0 && (
            <p className="text-xs text-muted-foreground">Desconto: -{formatCurrency(item.discount)}</p>
          )}
          {item.commissionValue && Number(item.commissionValue) > 0 && (
            <p className="text-xs text-muted-foreground">
              Comissão: {formatCurrency(item.commissionValue)} ({item.commissionPercentage}%)
            </p>
          )}
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Datas</p>
          <p className="font-medium text-sm">
            <span className="text-xs text-muted-foreground">Venc:</span> {formatDate(item.dueDate)}
          </p>
          {item.paidAt && (
            <p className="font-medium text-sm text-green-600">
              <span className="text-xs text-muted-foreground">Pago:</span> {formatDate(item.paidAt)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{paymentMethodLabel(item.paymentMethod)}</p>
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Nota fiscal</p>
          {item.invoiceNumber ? (
            <>
              <p className="font-medium text-sm break-all">{item.invoiceNumber}</p>
              {item.invoiceIssuedAt && (
                <p className="text-xs text-muted-foreground">Emitida em {formatDate(item.invoiceIssuedAt)}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem NF</p>
          )}
          {item.invoiceUrl && (
            <a href={item.invoiceUrl} target="_blank" rel="noreferrer" className="text-xs underline text-primary w-fit">
              Abrir arquivo
            </a>
          )}
        </div>

        <div className="flex flex-col lg:w-2/12 gap-1">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status status={status} className="w-fit">
            <StatusIndicator />
            <StatusLabel />
          </Status>
          {item.inactiveAt && <p className="text-xs text-muted-foreground">Inativa</p>}
        </div>

        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          {showMenu && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer" variant="outline" size="sm" aria-label="Ações">
                  <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUpdate && isManual && isOpen && !item.inactiveAt && (
                  <DropdownMenuItem className="gap-2" onSelect={() => setOpenSettle(true)}>
                    <Icon name="circle-check" className="w-3 h-3" />
                    Dar baixa
                  </DropdownMenuItem>
                )}
                {canUpdate && !item.inactiveAt && (
                  <DropdownMenuItem className="gap-2" onSelect={() => { setFormData(item); setOpenForm(true); }}>
                    <Icon name="pencil" className="w-3 h-3" />
                    {isManual ? "Editar" : "Nota fiscal"}
                  </DropdownMenuItem>
                )}
                {canUpdate && isManual && item.status === "received" && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title="Estornar a baixa?"
                      description="A conta volta a ficar em aberto e a data e o valor do recebimento são apagados."
                      onConfirm={() => run({ action: "unsettle", done: "Baixa estornada!" })}
                      titleBttn="Estornar baixa"
                      iconBttn="undo-2"
                    />
                  </DropdownMenuItem>
                )}
                {isManual && !item.inactiveAt && item.status !== "received" && can(`inactive_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title="Inativar esta conta a receber?"
                      description="Ela sai da listagem de ativas e dos totais. Pode ser reativada depois."
                      onConfirm={() => run({ action: "inactive", done: "Conta a receber inativada!" })}
                      titleBttn="Inativar"
                      iconBttn="power-off"
                    />
                  </DropdownMenuItem>
                )}
                {item.inactiveAt && can(`activate_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title="Reativar esta conta a receber?"
                      description="Ela volta para a listagem de ativas e para os totais."
                      onConfirm={() => run({ action: "active", done: "Conta a receber reativada!" })}
                      titleBttn="Reativar"
                      iconBttn="power"
                    />
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {openSettle && <SettleDialog item={item} entity={entity} open={openSettle} onOpenChange={setOpenSettle} />}
    </>
  );
};

export default Item;
