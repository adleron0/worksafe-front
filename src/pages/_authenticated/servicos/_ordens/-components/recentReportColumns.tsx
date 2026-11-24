import Icon from "@/components/general-components/Icon";
import type { DataColumn } from "@/components/general-components/DataTable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dateBr } from "../../../comercial/-shared/commercial";
import { RecentReports, ReportStatusBadge, WEATHER_OPTIONS, hoursText } from "../../-shared/reports";

export type RecentReport = RecentReports["rows"][number];
const muted = "text-xs text-muted-foreground";
const WEATHER_ICON = Object.fromEntries(WEATHER_OPTIONS.map((option) => [option.id, option.icon]));
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Últimos RDOs na tela do encarregado: dia, obra, jornada, equipe e situação. */
export const recentReportColumns: DataColumn<RecentReport>[] = [
  {
    id: "date", header: "Dia", className: "w-36",
    cell: (row) => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Icon name={WEATHER_ICON[row.weather] ?? "sun"} className="w-4 h-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium tabular-nums">{dateBr(row.date)}</p>
          {row.shift !== "integral" && <p className={muted}>{row.shiftLabel}</p>}
        </div>
      </div>
    ),
  },
  {
    id: "order", header: "Obra", className: "min-w-[220px]",
    cell: (row) => (row.order
      ? (
        <div className="min-w-0 max-w-[20rem]">
          <p className="font-medium truncate">{row.order.customer}</p>
          <p className={`${muted} truncate`}><span className="tabular-nums">{row.order.number}</span> · {row.order.title}</p>
        </div>
      )
      : <span className="text-muted-foreground">—</span>),
  },
  {
    id: "crew", header: "Equipe e horas",
    cell: (row) => (
      <div className="whitespace-nowrap">
        <p className="tabular-nums">{plural(row.people, "pessoa", "pessoas")} · {hoursText(row.hours)}{row.overtime > 0 ? ` + ${hoursText(row.overtime)} extras` : ""}</p>
        {row.startTime && <p className={`${muted} tabular-nums`}>{row.startTime}{row.endTime ? ` às ${row.endTime}` : " (sem saída)"}</p>}
      </div>
    ),
  },
  {
    id: "notes", header: "Registros",
    cell: (row) => {
      const parts = [
        row.earlyLeaves > 0 ? `${row.earlyLeaves} saiu${row.earlyLeaves === 1 ? "" : "ram"} antes` : "",
        row.occurrences > 0 ? plural(row.occurrences, "ocorrência", "ocorrências") : "",
        row.photos > 0 ? plural(row.photos, "foto", "fotos") : "",
      ].filter(Boolean);
      const text = parts.length ? parts.join(" · ") : "—";
      return (
        <div className="min-w-0 max-w-[16rem]">
          {row.activities
            ? (
              <Tooltip>
                <TooltipTrigger asChild><p className="truncate text-muted-foreground">{text}</p></TooltipTrigger>
                <TooltipContent className="max-w-sm whitespace-pre-line">{row.activities}</TooltipContent>
              </Tooltip>
            )
            : <p className="truncate text-muted-foreground">{text}</p>}
          {row.createdBy && <p className={`${muted} truncate`}>{row.createdBy}</p>}
        </div>
      );
    },
  },
  {
    id: "status", header: "Situação",
    cell: (row) => (row.returned?.note
      ? (
        <Tooltip>
          <TooltipTrigger asChild><span><ReportStatusBadge status={row.status} returned={!!row.returned} /></span></TooltipTrigger>
          <TooltipContent className="max-w-sm">Corrigir: {row.returned.note}</TooltipContent>
        </Tooltip>
      )
      : <ReportStatusBadge status={row.status} returned={!!row.returned} />),
  },
];
