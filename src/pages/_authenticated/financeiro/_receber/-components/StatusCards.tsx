import { Card } from "@/components/ui/card";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

interface StatusCardsProps {
  aggregations?: {
    [key: string]: {
      _count: number;
      _sum: {
        value: string;
      };
    };
  };
}

const StatusCards = ({ aggregations }: StatusCardsProps) => {
  // Calculate totals
  const totalCount = aggregations
    ? Object.values(aggregations).reduce((sum, agg) => sum + agg._count, 0)
    : 0;

  const totalValue = aggregations
    ? Object.values(aggregations).reduce((sum, agg) => sum + parseFloat(agg._sum.value || "0"), 0)
    : 0;

  const statuses = [
    {
      key: "processing",
      label: "Processando",
      icon: "clock",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-700 dark:text-blue-400",
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      key: "waiting",
      label: "Aguardando",
      icon: "hourglass",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      textColor: "text-yellow-700 dark:text-yellow-400",
      iconColor: "text-yellow-500 dark:text-yellow-400",
    },
    {
      key: "received",
      label: "Recebido",
      icon: "check-circle",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-700 dark:text-green-400",
      iconColor: "text-green-500 dark:text-green-400",
    },
    {
      key: "declined",
      label: "Recusado",
      icon: "x-circle",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-700 dark:text-red-400",
      iconColor: "text-red-500 dark:text-red-400",
    },
    {
      key: "chargeback",
      label: "Estorno",
      icon: "rotate-ccw",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      textColor: "text-purple-700 dark:text-purple-400",
      iconColor: "text-purple-500 dark:text-purple-400",
    },
    {
      key: "cancelled",
      label: "Cancelado",
      icon: "ban",
      bgColor: "bg-gray-50 dark:bg-gray-950/30",
      borderColor: "border-gray-200 dark:border-gray-800",
      textColor: "text-gray-700 dark:text-gray-400",
      iconColor: "text-gray-500 dark:text-gray-400",
    },
    {
      key: "overdue",
      label: "Vencido",
      icon: "alert-triangle",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      textColor: "text-orange-700 dark:text-orange-400",
      iconColor: "text-orange-500 dark:text-orange-400",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {/* Total Card */}
      <Card className="relative overflow-hidden transition-all hover:shadow-lg border bg-transparent">
        <div className="p-4">
          <div className="mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Geral</p>
          </div>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
          </p>
        </div>
      </Card>

      {/* Status Cards */}
      {statuses.map((status) => {
        const data = aggregations?.[status.key];
        const count = data?._count || 0;
        const value = parseFloat(data?._sum?.value || "0");
        const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0";

        return (
          <Card
            key={status.key}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-lg",
              status.bgColor,
              status.borderColor,
              "border"
            )}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon
                  name={status.icon}
                  className={cn("w-4 h-4", status.iconColor)}
                />
                <span className="text-xs text-muted-foreground">{percentage}%</span>
              </div>
              <p className={cn("text-xs font-medium", status.textColor)}>
                {status.label}
              </p>
              <p className={cn("text-lg font-bold", status.textColor)}>
                {formatCurrency(value)}
              </p>
              <p className={cn("text-xs", status.textColor, "opacity-70")}>
                {count} {count === 1 ? 'registro' : 'registros'}
              </p>
            </div>
            {/* Progress bar indicator */}
            {count > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
                <div
                  className={cn(
                    "h-full transition-all",
                    status.key === "processing" && "bg-blue-500",
                    status.key === "waiting" && "bg-yellow-500",
                    status.key === "received" && "bg-green-500",
                    status.key === "declined" && "bg-red-500",
                    status.key === "chargeback" && "bg-purple-500",
                    status.key === "cancelled" && "bg-gray-500",
                    status.key === "overdue" && "bg-orange-500"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default StatusCards;