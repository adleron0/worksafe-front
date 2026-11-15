import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Linha do tempo por linha (pessoa, equipamento, sala...): o tempo corre na
 * horizontal, um dia por coluna, e cada linha recebe barras (períodos), faixas
 * de fundo (indisponibilidade) e marcas de dia (algo que aconteceu naquele dia).
 *
 * Só exibe: quem usa decide o que cada barra significa e o que o clique faz.
 * Datas sempre em "AAAA-MM-DD".
 */
export interface TimelineBar {
  id: string | number; start: string; end: string; label: string;
  /** Cor de fundo da barra (hex ou rgb). */
  color?: string;
  /** Texto do balão ao passar o mouse. */
  hint?: string;
  onClick?: () => void;
}
export interface TimelineBand { id: string | number; start: string; end: string | null; label: string }
export interface TimelineMark { date: string; hint?: string }
export interface TimelineRow {
  id: string | number; title: string; subtitle?: string;
  bars: TimelineBar[]; bands?: TimelineBand[]; marks?: TimelineMark[];
  /** Realça a linha (por exemplo, quem atende ao filtro). */
  highlight?: boolean; onTitleClick?: () => void;
}
interface TimelineViewProps {
  from: string; to: string; today?: string; rows: TimelineRow[];
  /** Largura de cada dia, em pixels. */
  dayWidth?: number; titleWidth?: number; emptyMessage?: string;
  /** Período em destaque (por exemplo, as datas de uma busca por quem está livre). */
  focus?: { start: string; end: string } | null;
  className?: string;
}

const DAY = 86400000;
const time = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();
const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const BAR_HEIGHT = 22;
const BAR_GAP = 3;
const ROW_PADDING = 6;
const MARK_SPACE = 8;

/** Barras que se cruzam vão para faixas diferentes da mesma linha, para nenhuma esconder a outra. */
function lanesOf(bars: TimelineBar[]): Array<TimelineBar & { lane: number }> {
  const ends: string[] = [];
  return [...bars].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)).map((bar) => {
    let lane = ends.findIndex((end) => end < bar.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = bar.end;
    return { ...bar, lane };
  });
}

export default function TimelineView({ from, to, today, rows, dayWidth = 30, titleWidth = 208, emptyMessage = "Nada para mostrar neste período.", focus, className }: TimelineViewProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const days = useMemo(() => {
    const count = Math.max(1, Math.round((time(to) - time(from)) / DAY) + 1);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(time(from) + index * DAY);
      return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: date.getUTCDay(), month: date.getUTCMonth(), year: date.getUTCFullYear() };
    });
  }, [from, to]);
  const months = useMemo(() => {
    const out: Array<{ key: string; label: string; span: number }> = [];
    for (const day of days) {
      const key = `${day.year}-${day.month}`;
      const last = out[out.length - 1];
      if (last?.key === key) last.span += 1;
      else out.push({ key, label: `${MONTH[day.month]} ${day.year}`, span: 1 });
    }
    return out;
  }, [days]);
  const width = days.length * dayWidth;
  /** Posição de um período dentro da janela: recorta o que fica para fora. */
  const place = (start: string, end: string | null) => {
    const first = Math.max(0, Math.round((time(start) - time(from)) / DAY));
    const last = Math.min(days.length - 1, end ? Math.round((time(end) - time(from)) / DAY) : days.length - 1);
    return last < first ? null : { left: first * dayWidth, width: (last - first + 1) * dayWidth, cutLeft: start < from, cutRight: !end || end > to };
  };
  const todayAt = today && today >= from && today <= to ? Math.round((time(today) - time(from)) / DAY) * dayWidth : null;
  const focusAt = focus ? place(focus.start, focus.end) : null;

  // abre com o dia de hoje à vista
  useEffect(() => {
    if (todayAt !== null && scroller.current) scroller.current.scrollLeft = Math.max(0, todayAt - dayWidth * 3);
  }, [todayAt, dayWidth, from]);

  return (
    <div ref={scroller} className={cn("overflow-x-auto rounded-lg border", className)} role="table" aria-label="Linha do tempo">
      <div style={{ width: titleWidth + width }} className="relative">
        {/* cabeçalho: meses e dias */}
        <div className="sticky top-0 z-20 flex border-b bg-muted/60 text-xs" role="row">
          <div className="sticky left-0 z-30 shrink-0 border-r bg-muted" style={{ width: titleWidth }} />
          <div style={{ width }}>
            <div className="flex border-b">
              {months.map((month) => <div key={month.key} className="shrink-0 truncate border-r px-2 py-1 font-semibold capitalize" style={{ width: month.span * dayWidth }}>{month.label}</div>)}
            </div>
            <div className="flex">
              {days.map((day) => (
                <div key={day.iso} className={cn("shrink-0 border-r py-1 text-center leading-tight", (day.weekday === 0 || day.weekday === 6) && "bg-muted text-muted-foreground", day.iso === today && "bg-primary text-primary-foreground font-semibold")} style={{ width: dayWidth }}>
                  <div className="text-[10px]">{WEEKDAY[day.weekday]}</div>
                  <div className="tabular-nums">{day.day}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!rows.length && <p className="p-6 text-sm text-muted-foreground">{emptyMessage}</p>}
        {rows.map((row) => {
          const bars = lanesOf(row.bars);
          const lanes = Math.max(1, ...bars.map((bar) => bar.lane + 1));
          const height = ROW_PADDING * 2 + lanes * BAR_HEIGHT + (lanes - 1) * BAR_GAP + MARK_SPACE;
          return (
            <div key={row.id} className={cn("flex border-b last:border-b-0", row.highlight && "bg-primary/5")} role="row" style={{ height }}>
              <div className={cn("sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r px-3", row.highlight ? "bg-[color-mix(in_oklab,var(--background)_92%,var(--primary))]" : "bg-background")} style={{ width: titleWidth }} role="rowheader">
                {row.onTitleClick
                  ? <button type="button" className="truncate text-left text-sm font-medium hover:underline" onClick={row.onTitleClick}>{row.title}</button>
                  : <p className="truncate text-sm font-medium">{row.title}</p>}
                {row.subtitle && <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>}
              </div>
              <div className="relative" style={{ width }} role="cell">
                {/* fins de semana, período em destaque e hoje */}
                {days.map((day, index) => (day.weekday === 0 || day.weekday === 6) && <div key={day.iso} className="absolute inset-y-0 bg-muted/50" style={{ left: index * dayWidth, width: dayWidth }} />)}
                {focusAt && <div className="absolute inset-y-0 border-x border-primary/50 bg-primary/10" style={{ left: focusAt.left, width: focusAt.width }} />}
                {todayAt !== null && <div className="absolute inset-y-0 z-[5] border-l-2 border-primary" style={{ left: todayAt }} />}
                {/* faixas de fundo: indisponibilidade */}
                {(row.bands ?? []).map((band) => {
                  const at = place(band.start, band.end);
                  return at && (
                    <div key={band.id} className="absolute inset-y-0 flex items-center overflow-hidden border-x border-dashed border-muted-foreground/40 px-1 text-[10px] font-medium text-muted-foreground"
                      style={{ left: at.left, width: at.width, backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, currentColor 14%, transparent) 0 6px, transparent 6px 12px)" }}>
                      <span className="truncate rounded bg-background/80 px-1">{band.label}</span>
                    </div>
                  );
                })}
                {/* barras: períodos */}
                {bars.map((bar) => {
                  const at = place(bar.start, bar.end);
                  if (!at) return null;
                  const style = { left: at.left + 1, width: at.width - 2, top: ROW_PADDING + bar.lane * (BAR_HEIGHT + BAR_GAP), height: BAR_HEIGHT, backgroundColor: bar.color ?? "#64748b" };
                  const classes = cn("absolute z-[6] flex items-center overflow-hidden px-1.5 text-[11px] font-medium text-white shadow-sm", at.cutLeft ? "rounded-l-none" : "rounded-l", at.cutRight ? "rounded-r-none" : "rounded-r");
                  return bar.onClick
                    ? <button key={bar.id} type="button" className={cn(classes, "hover:brightness-110 focus-visible:outline focus-visible:outline-2")} style={style} aria-label={bar.hint ?? bar.label} onClick={bar.onClick}><span className="truncate">{bar.label}</span></button>
                    : <div key={bar.id} className={classes} style={style}><span className="truncate">{bar.label}</span></div>;
                })}
                {/* marcas de dia */}
                {(row.marks ?? []).map((mark) => {
                  const at = place(mark.date, mark.date);
                  return at && <span key={mark.date} className="absolute z-[7] h-1.5 w-1.5 rounded-full bg-foreground" style={{ left: at.left + dayWidth / 2 - 3, bottom: 3 }} aria-label={mark.hint} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
