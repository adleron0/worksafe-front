import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../../comercial/-shared/commercial";
import { aiApi, dateTimeBr } from "../-shared/bots";

interface ReportRow { id: number; title: string; scheduleId: number | null; createdAt: string; deliveries: Array<{ channel: string; userId: number; status: string }> }

export const Route = createFileRoute("/_authenticated/bots/_relatorios/relatorios")({
  component: ReportsPage,
});

/** Relatórios gerados pelos agendamentos, para quem recebe. */
function ReportsPage() {
  const { can } = useVerify();
  const { data, isLoading, error } = useQuery({ queryKey: ["aiReports"], enabled: can("usar_bots"), queryFn: () => aiApi.get<ReportRow[]>("reports") });
  if (!can("usar_bots")) return null;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Os relatórios agendados que você recebe. O aviso por e-mail ou WhatsApp traz o link para cá.</p>
        </div>
        <Link to="/bots/agenda" className="text-sm font-medium text-primary underline underline-offset-2">Abrir a agenda</Link>
      </div>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-32 w-full" />}
      {data && !data.length && <p className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhum relatório ainda.</p>}
      {data && data.length > 0 && (
        <div className="rounded-lg border">
          {data.map((row) => (
            <Link key={row.id} to="/bots/relatorios/$reportId" params={{ reportId: String(row.id) }} className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted">
              <Icon name="file-chart-column" className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{row.title}</span>
              <span className="text-xs text-muted-foreground">{dateTimeBr(row.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
