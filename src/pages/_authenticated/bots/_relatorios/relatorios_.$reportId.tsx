import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../../comercial/-shared/commercial";
import { Markdown, aiApi, dateTimeBr } from "../-shared/bots";

interface ReportView { id: number; title: string; body: string; createdAt: string; deliveries: Array<{ channel: string; userId: number; status: string; error?: string }> }

export const Route = createFileRoute("/_authenticated/bots/_relatorios/relatorios_/$reportId")({
  component: ReportPage,
});

const CHANNEL: Record<string, string> = { system: "Sistema", email: "E-mail", whatsapp: "WhatsApp" };

function ReportPage() {
  const { can } = useVerify();
  const { reportId } = Route.useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ["aiReport", reportId], enabled: can("usar_bots"), queryFn: () => aiApi.get<ReportView>(`reports/${reportId}`) });
  if (!can("usar_bots")) return null;
  return (
    <div className="grid max-w-3xl gap-4">
      <Link to="/bots/relatorios" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Icon name="arrow-left" className="h-4 w-4" /> Relatórios</Link>
      {error && <p className="text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {data && (
        <article className="rounded-lg border bg-background p-5">
          <h1 className="text-xl font-bold">{data.title}</h1>
          <p className="mb-4 text-xs text-muted-foreground">Gerado em {dateTimeBr(data.createdAt)}</p>
          <Markdown text={data.body} />
          {can("update_bots") && data.deliveries.length > 0 && (
            <div className="mt-6 border-t pt-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold">Entregas</p>
              {data.deliveries.map((delivery, index) => (
                <p key={index}>{CHANNEL[delivery.channel] ?? delivery.channel} · usuário {delivery.userId} · {delivery.status}{delivery.error ? ` (${delivery.error})` : ""}</p>
              ))}
            </div>
          )}
        </article>
      )}
    </div>
  );
}
