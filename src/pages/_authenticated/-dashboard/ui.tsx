import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import type { AppLink } from "./types";

/** Link com "?a=b": a rota vai em `to` e os parâmetros em `search`. */
export const linkTo = (link: AppLink) => {
  const [to, query] = link.split("?");
  return { to, search: query ? Object.fromEntries(new URLSearchParams(query)) : undefined } as { to: never; search: never };
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
/** R$ 86,4 mil · R$ 1,2 mi · R$ 950 — curto o bastante para caber num cartão. */
export const moneyShort = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl.format(value);
};
export const pct = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined ? "—" : `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
export const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Cartão base: título pequeno, ícone e, opcionalmente, um "ver mais" no rodapé. */
export function Panel({
  title,
  icon,
  aside,
  link,
  linkLabel,
  className,
  children,
}: {
  title: string;
  icon: string;
  aside?: ReactNode;
  link?: AppLink;
  linkLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-card border bg-card p-4 flex flex-col min-w-0", className)}>
      <header className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <Icon name={icon} className="w-4 h-4 shrink-0" />
        <h3 className="font-medium text-foreground/80 truncate">{title}</h3>
        {aside && <span className="ml-auto text-xs tabular-nums shrink-0">{aside}</span>}
      </header>
      <div className="flex-1 min-w-0">{children}</div>
      {link && (
        <Link {...linkTo(link)} className="mt-3 text-xs text-primary hover:underline w-fit">
          {linkLabel ?? "Ver mais"} →
        </Link>
      )}
    </section>
  );
}

/** Linha clicável de lista: texto à esquerda, detalhe e valor à direita. */
export function RowLink({ link, children, detail, value, tone }: {
  link: AppLink;
  children: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  tone?: "danger" | "warning" | "success" | "muted";
}) {
  return (
    <li>
      <Link {...linkTo(link)} className="flex items-center gap-2 py-2 text-sm hover:bg-muted/50 -mx-2 px-2 rounded-md">
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {detail && <span className="text-xs text-muted-foreground shrink-0">{detail}</span>}
        {value !== undefined && <span className={cn("tabular-nums shrink-0", toneText(tone))}>{value}</span>}
      </Link>
    </li>
  );
}

export const toneText = (tone?: "danger" | "warning" | "success" | "muted") =>
  tone === "danger"
    ? "text-red-600 dark:text-red-400"
    : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";

/** Linha de tendência mínima, sem eixos. Verde subindo, vermelha caindo (ou `color` fixa). */
export function Sparkline({ points, color, className }: { points: number[]; color?: string; className?: string }) {
  if (points.length < 2) return null;
  const up = points[points.length - 1] >= points[0];
  const stroke = color ?? (up ? "#16a34a" : "#dc2626");
  const data = points.map((value, i) => ({ i, value }));
  const id = `spark-${stroke.replace("#", "")}`;
  return (
    <div className={cn("h-9 w-24", className)} aria-hidden>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Indicador do topo: número grande, uma linha de contexto e a tendência. */
export function Kpi({ label, value, hint, hintTone, trend, trendColor, link }: {
  label: string;
  value: string;
  hint: ReactNode;
  hintTone?: "danger" | "warning" | "success" | "muted";
  trend?: number[];
  trendColor?: string;
  link: AppLink;
}) {
  return (
    <Link {...linkTo(link)} className="rounded-card border bg-card p-4 hover:border-foreground/20 transition-colors min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xl 2xl:text-2xl font-semibold tabular-nums leading-tight whitespace-nowrap">{value}</p>
          <p className={cn("text-xs mt-0.5 truncate", toneText(hintTone ?? "muted"))}>{hint}</p>
        </div>
        {trend && <Sparkline points={trend} color={trendColor} className="shrink min-w-0 w-20 2xl:w-24" />}
      </div>
    </Link>
  );
}

/** Barra fina de progresso (0–1). */
export function Meter({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div className={cn("h-1.5 rounded-full bg-muted overflow-hidden", className)}>
      <div className={cn("h-full rounded-full bg-primary", barClassName)} style={{ width }} />
    </div>
  );
}

/** Texto do estado vazio de um cartão. */
export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground py-4 text-center">{children}</p>
);
