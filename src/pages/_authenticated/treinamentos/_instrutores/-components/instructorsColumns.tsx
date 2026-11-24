import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { formatPHONE } from "@/utils/phone-mask";
import { formatCPF } from "@/utils/cpf-mask";
import { More, NameCell, muted } from "../../-shared/lista";
import { IEntity } from "../-interfaces/entity.interface";

export const instructorsColumns: DataColumn<IEntity>[] = [
  {
    id: "name", header: "Instrutor", className: "min-w-[240px]",
    cell: (item) => (
      <More lines={[item.cpf && formatCPF(item.cpf), item.email, item.phone && formatPHONE(item.phone)]}>
        <NameCell name={item.name} image={item.imageUrl} square
          sub={item.highlight ? <span className="text-primary-soft-foreground">{item.highlight}</span> : item.email || formatCPF(item.cpf)} />
      </More>
    ),
  },
  {
    id: "curriculum", header: "Currículo", className: "min-w-[200px]",
    cell: (item) => {
      const items = item.curriculum?.split("#").filter(Boolean) ?? [];
      if (!items.length) return <span className="text-muted-foreground">—</span>;
      return (
        <More lines={items.length > 2 ? items : []}>
          <span className="flex items-center gap-1 max-w-[18rem] overflow-hidden">
            {items.slice(0, 2).map((curriculo, index) => <TagBadge key={`curriculo-${index}`} className="max-w-[9rem]">{curriculo}</TagBadge>)}
            {items.length > 2 && <span className={muted}>+{items.length - 2}</span>}
          </span>
        </More>
      );
    },
  },
  {
    id: "formation", header: "Formação", className: "min-w-[180px]",
    cell: (item) => (
      <div className="min-w-0 max-w-[16rem]">
        <More lines={item.formation && item.formation.length > 40 ? [item.formation] : []}><p className="truncate">{item.formation || "—"}</p></More>
        {item.formationCode && <p className={`${muted} truncate`}>{item.formationCode}</p>}
      </div>
    ),
  },
  {
    id: "status", header: "Status",
    cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
