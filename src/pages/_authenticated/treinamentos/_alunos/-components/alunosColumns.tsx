import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { formatCPF } from "@/utils/cpf-mask";
import { More, NameCell, formatDay, muted } from "../../-shared/lista";
import { IEntity } from "../-interfaces/entity.interface";

const getAge = (birthDate?: string | Date) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const alunosColumns: DataColumn<IEntity>[] = [
  {
    id: "name", header: "Aluno", className: "min-w-[240px]",
    cell: (item) => <NameCell name={item.name} image={item.imageUrl} sub={item.cpf ? formatCPF(item.cpf) : "CPF não informado"} />,
  },
  {
    id: "contacts", header: "Contatos", className: "min-w-[200px]",
    cell: (item) => {
      if (!item.phone && !item.email) return <span className="text-muted-foreground">Sem contatos</span>;
      return (
        <div className="min-w-0 max-w-[16rem]">
          <p className="truncate flex items-center gap-1.5">
            <Icon name={item.phone ? "phone" : "mail"} className="w-3 h-3 text-muted-foreground shrink-0" />
            {item.phone || item.email}
          </p>
          {item.phone && item.email && (
            <More lines={[item.email]}><p className={`${muted} truncate`}>{item.email}</p></More>
          )}
        </div>
      );
    },
  },
  {
    id: "customer", header: "Empresa",
    cell: (item) => <span className={item.customer?.name ? "" : "text-muted-foreground"}>{item.customer?.name || "Não informado"}</span>,
  },
  {
    id: "birthDate", header: "Nascimento", className: "whitespace-nowrap",
    cell: (item) => {
      const age = getAge(item.birthDate);
      return (
        <div>
          <p className="tabular-nums">{item.birthDate ? formatDay(item.birthDate) : "Não informado"}</p>
          {age ? <p className={muted}>{age} anos</p> : null}
        </div>
      );
    },
  },
  {
    id: "status", header: "Status",
    cell: (item) => <StatusBadge tone={item.inactiveAt ? "neutral" : "success"}>{item.inactiveAt ? "Inativo" : "Ativo"}</StatusBadge>,
  },
];
