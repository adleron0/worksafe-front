import Icon from "@/components/general-components/Icon";
import OptionSelector from "@/components/general-components/OptionSelector";
import type { DataColumn } from "@/components/general-components/DataTable";
import { More, NameCell, muted } from "../../-shared/lista";
import { IEntity } from "../-interfaces/entity.interface";

const STATUS = [
  { label: "Confirmado", value: "confirmed", color: "#22c55e" },
  { label: "Recusado", value: "declined", color: "#ef4444" },
  { label: "Pendente", value: "pending", color: "#fbc02d" },
];

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Data não disponível";

/** Colunas da lista de inscrições; a situação muda na própria linha (quem pode editar). */
export function subscriptionColumns({ canUpdate, onStatusChange }: {
  canUpdate: boolean;
  onStatusChange: (newStatus: string | number, itemId: string | number, item: IEntity) => void;
}): DataColumn<IEntity>[] {
  return [
    {
      id: "name", header: "Nome", className: "min-w-[240px]",
      cell: (item) => (
        <More lines={[item.occupation ? `Cargo: ${item.occupation}` : "Cargo não informado"]}>
          <NameCell name={item.name ?? ""} sub={item.cpf || "CPF não informado"} className="max-w-[20rem]" />
        </More>
      ),
    },
    {
      id: "contact", header: "Contato", className: "min-w-[200px]",
      cell: (item) => (
        <div className="min-w-0 max-w-[16rem]">
          <p className="truncate flex items-center gap-1.5">
            <Icon name="phone" className="w-3 h-3 text-muted-foreground shrink-0" />
            {item.phone || <span className="text-muted-foreground">Telefone não informado</span>}
          </p>
          <More lines={item.email ? [item.email] : []}>
            <p className={`${muted} truncate`}>{item.email || "E-mail não informado"}</p>
          </More>
        </div>
      ),
    },
    {
      id: "createdAt", header: "Data de inscrição", className: "whitespace-nowrap",
      cell: (item) => <span className="tabular-nums">{formatDateTime(item.createdAt)}</span>,
    },
    {
      id: "status", header: "Status",
      cell: (item) => (
        <OptionSelector
          currentValue={item.subscribeStatus || "pending"}
          onChange={(newStatus) => { if (item.id) onStatusChange(newStatus, item.id, item); }}
          options={STATUS}
          disabled={!canUpdate}
          className="w-auto"
        />
      ),
    },
  ];
}
