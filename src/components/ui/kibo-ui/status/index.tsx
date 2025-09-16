import type { ComponentProps, HTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusProps = ComponentProps<typeof Badge> & {
  status: "online" | "offline" | "maintenance" | "degraded" | "processing" | "waiting" | "received" | "declined" | "chargeback" | "cancelled" | "overdue";
};

export const Status = ({ className, status, ...props }: StatusProps) => (
  <Badge
    className={cn("flex items-center gap-2", "group", status, className)}
    variant="secondary"
    {...props}
  />
);

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const StatusIndicator = ({
  className,
  ...props
}: StatusIndicatorProps) => (
  <span className="relative flex h-2 w-2" {...props}>
    <span
      className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.maintenance]:bg-blue-500",
        "group-[.degraded]:bg-amber-500",
        "group-[.processing]:bg-blue-500",
        "group-[.waiting]:bg-amber-500",
        "group-[.received]:bg-emerald-500",
        "group-[.declined]:bg-red-500",
        "group-[.chargeback]:bg-purple-500",
        "group-[.cancelled]:bg-gray-500",
        "group-[.overdue]:bg-orange-500"
      )}
    />
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.maintenance]:bg-blue-500",
        "group-[.degraded]:bg-amber-500",
        "group-[.processing]:bg-blue-500",
        "group-[.waiting]:bg-amber-500",
        "group-[.received]:bg-emerald-500",
        "group-[.declined]:bg-red-500",
        "group-[.chargeback]:bg-purple-500",
        "group-[.cancelled]:bg-gray-500",
        "group-[.overdue]:bg-orange-500"
      )}
    />
  </span>
);

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

export const StatusLabel = ({
  className,
  children,
  ...props
}: StatusLabelProps) => (
  <span className={cn("text-muted-foreground", className)} {...props}>
    {children ?? (
      <>
        <span className="hidden group-[.online]:block">Online</span>
        <span className="hidden group-[.offline]:block">Offline</span>
        <span className="hidden group-[.maintenance]:block">Maintenance</span>
        <span className="hidden group-[.degraded]:block">Degraded</span>
        <span className="hidden group-[.processing]:block">Processando</span>
        <span className="hidden group-[.waiting]:block">Aguardando</span>
        <span className="hidden group-[.received]:block">Recebido</span>
        <span className="hidden group-[.declined]:block">Recusado</span>
        <span className="hidden group-[.chargeback]:block">Estorno</span>
        <span className="hidden group-[.cancelled]:block">Cancelado</span>
        <span className="hidden group-[.overdue]:block">Vencido</span>
      </>
    )}
  </span>
);
