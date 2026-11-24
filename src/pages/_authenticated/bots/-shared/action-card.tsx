import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { errorMessage } from "../../comercial/-shared/commercial";
import { ACTIONS_KEY, PendingAction, STATUS_KEY, aiApi, dateTimeBr } from "./bots";

/** Depois que uma ação confirmada grava, as telas abertas buscam de novo (as consultas dos bots ficam de fora). */
const refreshScreens = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ predicate: (query) => !String(query.queryKey[0] ?? "").startsWith("ai") });

const STATUS_STYLE: Record<PendingAction["status"], { label: string; className: string; icon: string }> = {
  pendente: { label: "Aguardando sua confirmação", className: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40", icon: "shield-alert" },
  confirmada: { label: "Confirmada", className: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40", icon: "circle-check" },
  cancelada: { label: "Cancelada", className: "border-muted bg-muted/40", icon: "circle-x" },
  expirada: { label: "Expirou", className: "border-muted bg-muted/40", icon: "clock-alert" },
  falhou: { label: "Não foi feita", className: "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40", icon: "triangle-alert" },
};

/**
 * Cartão de uma ação sensível preparada por um bot. Nada acontece até a
 * pessoa deslizar para confirmar: o modelo não tem como confirmar sozinho.
 */
export function ActionCard({ action, onDone }: { action: PendingAction; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [ACTIONS_KEY] });
    queryClient.invalidateQueries({ queryKey: [STATUS_KEY] });
    if (action.conversationId) queryClient.invalidateQueries({ queryKey: ["aiConversation", action.conversationId] });
    onDone?.();
  };
  const confirm = useMutation({
    mutationFn: () => aiApi.post<PendingAction & { message: string | null; link: string | null }>(`actions/${action.id}/confirm`),
    onSuccess: (data) => {
      refresh();
      if (data.status === "confirmada") refreshScreens(queryClient);
      if (data.status === "confirmada") toast({ title: "Feito", description: data.message ?? undefined, variant: "success" });
      else toast({ title: "A ação não foi feita", description: data.error ?? undefined, variant: "destructive" });
    },
    onError: (error) => { refresh(); toast({ title: "Não foi possível confirmar", description: errorMessage(error), variant: "destructive" }); },
  });
  const cancel = useMutation({
    mutationFn: () => aiApi.post<PendingAction>(`actions/${action.id}/cancel`),
    onSuccess: () => { refresh(); toast({ title: "Ação cancelada", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível cancelar", description: errorMessage(error), variant: "destructive" }),
  });
  const style = STATUS_STYLE[action.status];
  const pending = action.status === "pendente";

  return (
    <div className={`rounded-card border bg-card p-3 text-sm ${style.className}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon name={style.icon} className="h-4 w-4" />
        <span>{style.label}</span>
        <span className="ml-auto">{pending ? `vale até ${dateTimeBr(action.expiresAt)}` : dateTimeBr(action.createdAt)}</span>
      </div>
      <p className="mt-2 font-medium">{action.summary}</p>
      {action.details.length > 0 && (
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
          {action.details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="font-medium">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {action.status === "confirmada" && action.result?.message && (
        <p className="mt-2 text-xs">
          {action.result.message}{" "}
          {action.result.link && <Link to={action.result.link} className="font-medium text-primary underline underline-offset-2">Abrir</Link>}
        </p>
      )}
      {action.status === "falhou" && action.error && <p className="mt-2 text-xs text-destructive">{action.error}</p>}
      {pending && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SlideConfirm label="Deslize para confirmar" pending={confirm.isPending} disabled={cancel.isPending} onConfirm={() => confirm.mutate()} className="max-w-xs flex-1" />
          <Button type="button" variant="ghost" size="sm" disabled={confirm.isPending || cancel.isPending} onClick={() => cancel.mutate()}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}
