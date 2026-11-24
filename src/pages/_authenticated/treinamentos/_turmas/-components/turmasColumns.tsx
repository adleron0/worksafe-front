import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { ONLINE_COURSES_ENABLED } from "@/lib/features";
import { More, NameCell, formatDay, muted } from "../../-shared/lista";
import { IEntity } from "../-interfaces/entity.interface";

// campos que a API manda e a interface não declara
type Row = IEntity & {
  allowSubscriptions?: boolean;
  unlimitedSubscriptions?: boolean;
  periodSubscriptionsType?: string;
  periodSubscriptionsInitialDate?: string | null;
  periodSubscriptionsFinalDate?: string | null;
};
const r = (item: IEntity) => item as Row;
const tag = "inline-flex items-center gap-1 rounded-chip border bg-muted/50 px-1.5 py-px text-[11px] font-medium text-muted-foreground whitespace-nowrap";

export const turmasColumns: DataColumn<IEntity>[] = [
  {
    id: "name", header: "Turma", className: "min-w-[260px]",
    cell: (item) => (
      <More lines={[
        item.periodClass === "LIMITED" && item.landingPagesDates,
        ONLINE_COURSES_ENABLED && item.hasOnlineCourse && "Curso online",
      ]}>
        <NameCell name={item.name} image={item.imageUrl} square className="max-w-[22rem]"
          sub={<>#{item.id} · {item.hoursDuration} horas · <span className="text-primary-soft-foreground">{item.openClass ? "Turma aberta" : "InCompany"}</span></>} />
      </More>
    ),
  },
  {
    id: "price", header: "Valor", className: "whitespace-nowrap",
    cell: (item) => (
      <div>
        <p className={item.price ? "tabular-nums" : "text-muted-foreground"}>{item.price ? `R$ ${item.price}` : "Não informado"}</p>
        {item.discountPrice && <p className={`${muted} tabular-nums`}>Promo: R$ {item.discountPrice}</p>}
      </div>
    ),
  },
  {
    id: "period", header: "Período", className: "whitespace-nowrap",
    cell: (item) => item.periodClass === "UNLIMITED"
      ? <span className={tag}><Icon name="infinity" className="w-3 h-3" />Ilimitado</span>
      : (
        <div className="tabular-nums">
          <p>{formatDay(item.initialDate || "2024-01-01", true)}</p>
          <p className={muted}>até {formatDay(item.finalDate || "2024-01-01", true)}</p>
        </div>
      ),
  },
  {
    id: "subscriptions", header: "Inscrições", className: "whitespace-nowrap",
    cell: (item) => {
      const row = r(item);
      if (!row.allowSubscriptions) return <span className={tag}><Icon name="x-circle" className="w-3 h-3" />Desabilitadas</span>;
      if (row.periodSubscriptionsType === "UNLIMITED") return <span className={`${tag} text-green-700 dark:text-green-400`}><Icon name="infinity" className="w-3 h-3" />Sempre aberta</span>;
      return (
        <div className="tabular-nums">
          <p>{row.periodSubscriptionsInitialDate ? formatDay(row.periodSubscriptionsInitialDate, true) : "-"}</p>
          <p className={muted}>até {row.periodSubscriptionsFinalDate ? formatDay(row.periodSubscriptionsFinalDate, true) : "-"}</p>
        </div>
      );
    },
  },
  {
    id: "seats", header: "Vagas", className: "whitespace-nowrap",
    cell: (item) => {
      const min = item.minimumQuorum && Number(item.minimumQuorum) > 0 ? item.minimumQuorum : null;
      const max = !r(item).unlimitedSubscriptions && item.maxSubscriptions && Number(item.maxSubscriptions) > 0 ? item.maxSubscriptions : null;
      return (
        <More lines={[min && `Mínimo: ${min} alunos`, r(item).unlimitedSubscriptions ? "Inscritos ilimitados" : max && `Máximo: ${max} alunos`]}>
          <span className="inline-flex items-center gap-1">
            {r(item).unlimitedSubscriptions
              ? <span className={tag}><Icon name="infinity" className="w-3 h-3" />Ilimitados</span>
              : max ? <span className={tag}><Icon name="arrow-big-up-dash" className="w-3 h-3" />{max}</span> : null}
            {min && <span className={tag}><Icon name="arrow-big-down-dash" className="w-3 h-3" />{min}</span>}
            {!min && !max && !r(item).unlimitedSubscriptions && <span className="text-muted-foreground">—</span>}
          </span>
        </More>
      );
    },
  },
  {
    id: "status", header: "Status",
    cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
