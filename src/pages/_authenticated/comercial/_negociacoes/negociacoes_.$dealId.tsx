import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, NumField, Tip, commercialApi, dateBr, errorMessage, money } from "../-shared/commercial";
import {
  DEALS_KEY, DEAL_KEY, DISCOUNT_BREAKS, DISCOUNT_CONDITIONS, DISCOUNT_SPLITS, DISCOUNT_TYPES, Deal, DealDiscount, DealPlan, DealStatusBadge,
} from "../-shared/deals";
import { KindBadge, PROPOSAL_KEY, PROPOSALS_KEY, ProposalKind, ProposalStatus, StatusBadge } from "../-shared/proposals";
import { ProposalPanelSheet } from "../-shared/proposal-panel";

export const Route = createFileRoute("/_authenticated/comercial/_negociacoes/negociacoes_/$dealId")({
  component: DealPage,
});

type Candidate = { id: number; number: string; title: string; kind: ProposalKind; status: ProposalStatus; total: number };
const LOST: ProposalStatus[] = ["recusada", "expirada", "cancelada"];
const sameDiscount = (a: DealDiscount, b: DealDiscount) => JSON.stringify({ ...a, appliedAt: null }) === JSON.stringify({ ...b, appliedAt: null });

/** Ficha da negociação: as propostas, o total e o desconto de fechamento conjunto. */
function DealPage() {
  const { dealId } = Route.useParams();
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const [adding, setAdding] = useState("");
  // painel da proposta (ficha rápida) sem sair da negociação
  const [panel, setPanel] = useState<number | null>(null);
  const [discount, setDiscount] = useState<DealDiscount | null>(null);
  const [askRevise, setAskRevise] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const { data: deal, isLoading, error } = useQuery({
    queryKey: [DEAL_KEY, dealId],
    queryFn: () => commercialApi.get<Deal>(`deals/${dealId}`),
    retry: false,
  });
  useEffect(() => {
    if (!deal) return;
    setDiscount(deal.discount); setTitle(deal.title); setNotes(deal.notes ?? "");
  }, [deal]);
  const { data: candidates } = useQuery({
    queryKey: [DEAL_KEY, dealId, "candidates"],
    queryFn: () => commercialApi.get<Candidate[]>(`deals/${dealId}/candidates`),
    enabled: !!deal && canUpdate,
  });
  const dirtyDiscount = !!deal && !!discount && !sameDiscount(deal.discount, discount);
  // a simulação acompanha o que está na tela, antes de gravar
  const previewBody = useMemo(() => (discount ? { discount } : null), [discount]);
  const { data: preview } = useQuery({
    queryKey: [DEAL_KEY, dealId, "preview", previewBody],
    queryFn: () => commercialApi.post<DealPlan>(`deals/${dealId}/discount/preview`, previewBody),
    enabled: !!deal && !!previewBody && dirtyDiscount,
    placeholderData: (previous) => previous,
  });

  const apply = (result: Deal) => {
    queryClient.setQueryData([DEAL_KEY, dealId], result);
    queryClient.invalidateQueries({ queryKey: [DEAL_KEY, dealId, "candidates"] });
    queryClient.invalidateQueries({ queryKey: [DEALS_KEY] });
    queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
    queryClient.invalidateQueries({ queryKey: [PROPOSAL_KEY] });
  };
  const fail = (err: unknown) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" });
  const save = useMutation({ mutationFn: (body: Record<string, unknown>) => commercialApi.put<Deal>(`deals/${dealId}`, body), onSuccess: (result) => { apply(result); toast({ title: "Negociação salva", variant: "success" }); }, onError: fail });
  const add = useMutation({ mutationFn: (id: number) => commercialApi.post<Deal>(`deals/${dealId}/proposals`, { proposalIds: [id] }), onSuccess: (result) => { apply(result); setAdding(""); }, onError: fail });
  const remove = useMutation({ mutationFn: (id: number) => commercialApi.delete<Deal>(`deals/${dealId}/proposals/${id}`), onSuccess: apply, onError: fail });
  const link = useMutation({
    mutationFn: () => commercialApi.post<Deal>(`deals/${dealId}/link`),
    onSuccess: (result) => { apply(result); if (result.publicUrl) copy(result.publicUrl); },
    onError: fail,
  });
  const dismiss = useMutation({ mutationFn: () => commercialApi.post<Deal>(`deals/${dealId}/breach/dismiss`), onSuccess: apply, onError: fail });
  const inactivate = useMutation({
    mutationFn: () => commercialApi.patch(`deals/${dealId}/inactive`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [DEALS_KEY] }); toast({ title: "Negociação desfeita", variant: "success" }); navigate({ to: "/comercial/negociacoes" }); },
    onError: fail,
  });
  /** Grava a configuração (se mudou) e aplica nas propostas. */
  const applyDiscount = useMutation({
    mutationFn: async (reviseSent: boolean) => {
      if (dirtyDiscount && discount) await commercialApi.put<Deal>(`deals/${dealId}`, { discount });
      return commercialApi.post<Deal>(`deals/${dealId}/discount/apply`, { reviseSent });
    },
    onSuccess: (result) => {
      apply(result);
      toast({ title: result.discount.enabled ? "Desconto aplicado nas propostas" : "Desconto retirado", description: result.revised?.length ? `Revisões criadas: ${result.revised.join(", ")}. Envie de novo ao cliente.` : undefined, variant: "success" });
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) { queryClient.invalidateQueries({ queryKey: [DEAL_KEY, dealId] }); setAskRevise(true); } else fail(err);
    },
  });
  const copy = (url: string) => {
    navigator.clipboard?.writeText(url).then(() => toast({ title: "Link copiado", description: url, variant: "success" }), () => toast({ title: "Link do cliente", description: url }));
  };

  if (isLoading || (deal && !discount)) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !deal || !discount) {
    return (
      <div className="max-w-xl rounded-lg border p-6 grid gap-3">
        <p className="font-semibold">Negociação não encontrada</p>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button asChild variant="outline" className="w-fit"><Link to="/comercial/negociacoes">Voltar às negociações</Link></Button>
      </div>
    );
  }

  const set = <K extends keyof DealDiscount>(key: K, value: DealDiscount[K]) => setDiscount((current) => (current ? { ...current, [key]: value } : current));
  const plan = dirtyDiscount && preview ? preview.plan : deal.proposals.map((p) => ({ id: p.id, planned: p.planned, current: p.dealDiscount, action: p.action }));
  const planOf = (id: number) => plan.find((row) => row.id === id);
  const plannedTotal = plan.reduce((sum, row) => sum + (LOST.includes(deal.proposals.find((p) => p.id === row.id)?.status ?? "rascunho") ? 0 : row.planned), 0);
  const changes = plan.filter((row) => row.action === "gravar" || row.action === "revisar").length;
  const live = deal.proposals.filter((p) => !LOST.includes(p.status));
  const targets = discount.targets.length ? discount.targets : deal.proposals.map((p) => p.id);
  const toggle = (list: number[], id: number, on: boolean) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));
  const conditionHint = DISCOUNT_CONDITIONS.find((c) => c.id === discount.condition)?.hint;
  const holds = dirtyDiscount && preview ? preview.conditionHolds : deal.conditionHolds;

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/comercial/negociacoes" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Negociações</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{deal.number}</h1>
            <DealStatusBadge status={deal.status} />
          </div>
          <p className="text-sm text-muted-foreground truncate">{[deal.customer?.name, deal.title, deal.seller?.name].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canUpdate && (
            <Tip text={deal.publicUrl ? "Copiar o link do cliente (todas as propostas enviadas, cada uma com o aceite)" : "Gerar o link do cliente com todas as propostas enviadas"}>
              <Button type="button" variant="outline" onClick={() => (deal.publicUrl ? copy(deal.publicUrl) : link.mutate())} disabled={link.isPending}><Icon name="link" className="w-4 h-4 mr-1" /> Link do cliente</Button>
            </Tip>
          )}
          {canUpdate && (
            <ConfirmDialog title={`Desfazer ${deal.number}?`} description="As propostas continuam, cada uma sozinha. O desconto conjunto sai das que estão em rascunho; as enviadas precisam de revisão." onConfirm={() => inactivate.mutate()}>
              <Button type="button" variant="outline"><Icon name="unlink" className="w-4 h-4 mr-1" /> Desfazer</Button>
            </ConfirmDialog>
          )}
        </div>
      </div>

      {deal.breach && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40 grid gap-1">
          <p className="font-semibold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1"><Icon name="triangle-alert" className="w-4 h-4" /> {deal.breach.action === "avisar" ? "A condição do desconto caiu: revise" : deal.breach.action === "retirar" ? "A condição do desconto caiu: desconto retirado" : "Desconto recalculado"}</p>
          <p>{deal.breach.reason}.</p>
          {deal.breach.pending.length > 0 && <p>Ainda com o desconto antigo{deal.breach.action === "avisar" ? "" : " (enviadas: precisam de revisão)"}: {deal.proposals.filter((p) => deal.breach!.pending.includes(p.id)).map((p) => p.number).join(", ")}.</p>}
          {deal.breach.locked.length > 0 && <p>Já aceitas com o desconto (o contrato não muda): {deal.proposals.filter((p) => deal.breach!.locked.includes(p.id)).map((p) => p.number).join(", ")}.</p>}
          {canUpdate && <Button type="button" size="sm" variant="outline" className="w-fit mt-1" onClick={() => dismiss.mutate()}>Entendi</Button>}
        </div>
      )}

      <div className="mt-4 grid xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 grid gap-4">
          <section className="rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Propostas</h2>
              <p className="text-sm">Total: <span className="text-lg font-bold tabular-nums">{money(deal.total)}</span>{deal.won > 0 && <span className="text-muted-foreground"> · ganho {money(deal.won)}</span>}</p>
            </div>
            <p className="text-xs text-muted-foreground">Cada proposta vira o seu contrato e a sua nota. Recusadas, expiradas e canceladas ficam fora do total.</p>
            {deal.proposals.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma proposta ainda. Adicione abaixo as propostas deste cliente.</p> : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left font-medium py-1.5 pr-2">Proposta</th>
                      <th className="text-right font-medium py-1.5 px-2">Valor</th>
                      <th className="text-right font-medium py-1.5 px-2">Desc. conjunto</th>
                      <th className="text-right font-medium py-1.5 px-2">Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {deal.proposals.map((p) => {
                      const row = planOf(p.id);
                      const changing = row && (row.action === "gravar" || row.action === "revisar");
                      return (
                        <tr key={p.id} className={cn("border-b last:border-0 align-top", LOST.includes(p.status) && "opacity-60")}>
                          <td className="py-2 pr-2 min-w-[14rem]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link to="/comercial/propostas/$proposalId" params={{ proposalId: String(p.id) }} className="font-medium tabular-nums hover:underline">{p.number}</Link>
                              <KindBadge kind={p.kind} />
                              <StatusBadge status={p.status} />
                              <Tip text={`Painel de ${p.number}: situação, retornos e venda`}>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Painel de ${p.number}`} onClick={() => setPanel(p.id)}><Icon name="panel-right-open" className="w-3.5 h-3.5" /></Button>
                              </Tip>
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{p.title}</p>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{money(p.base)}{p.ownDiscount > 0 && <p className="text-xs text-muted-foreground">já com {money(p.ownDiscount)} dela</p>}</td>
                          <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                            {p.dealDiscount > 0 ? `− ${money(p.dealDiscount)}` : "—"}
                            {changing && <p className="text-xs text-amber-700 dark:text-amber-300">→ {row.planned > 0 ? `− ${money(row.planned)}` : "sem desconto"}{row.action === "revisar" ? " (revisão)" : ""}</p>}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums font-medium whitespace-nowrap">{money(p.total)}</td>
                          <td className="py-2 pl-2 text-right">
                            {canUpdate && (
                              <ConfirmDialog title={`Tirar ${p.number} da negociação?`} description="A proposta continua, sozinha. Se estiver em rascunho, o desconto conjunto sai dela." onConfirm={() => remove.mutate(p.id)}>
                                <Button type="button" variant="ghost" size="icon" aria-label={`Tirar ${p.number}`}><Icon name="x" className="w-4 h-4" /></Button>
                              </ConfirmDialog>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {canUpdate && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                <div className="grid gap-1 w-full sm:w-96">
                  <Label>Adicionar proposta do cliente</Label>
                  <Select name="addProposal" searchable state={adding} onChange={(_, value) => setAdding(String(value ?? ""))}
                    placeholder={candidates?.length ? "Escolha a proposta" : "Nenhuma outra proposta deste cliente"} disabled={!candidates?.length}
                    options={(candidates ?? []).map((c) => ({ id: String(c.id), name: `${c.number} · ${c.title} · ${money(c.total)}` }))} />
                </div>
                <Button type="button" variant="outline" disabled={!adding || add.isPending} onClick={() => add.mutate(Number(adding))}><Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar</Button>
                <Button asChild type="button" variant="ghost"><Link to="/comercial/propostas/nova">Nova proposta</Link></Button>
              </div>
            )}
          </section>

          <section className="rounded-lg border p-4 grid gap-4">
            <div>
              <h2 className="font-semibold">Desconto pelo fechamento conjunto</h2>
              <p className="text-xs text-muted-foreground">Opcional. O desconto é rateado entre as propostas e gravado em cada uma: o contrato e a nota já nascem com o valor certo. O desconto de cada proposta sozinha continua na própria proposta.</p>
            </div>
            <label className="flex items-center gap-2 text-sm w-fit">
              <Checkbox checked={discount.enabled} disabled={!canUpdate} onCheckedChange={(checked) => set("enabled", checked === true)} />
              Dar desconto se o cliente fechar junto
            </label>
            {discount.enabled && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label>Forma</Label>
                    <Select name="discountType" options={DISCOUNT_TYPES} state={discount.type} disabled={!canUpdate} onChange={(_, value) => setDiscount((d) => (d ? { ...d, type: value as DealDiscount["type"], value: 0 } : d))} />
                  </div>
                  <div className="grid gap-1">
                    <Label>{discount.type === "percentual" ? "Percentual" : "Valor total do desconto"}</Label>
                    <NumField kind={discount.type === "percentual" ? "percent" : "money"} value={discount.value} disabled={!canUpdate} ariaLabel="Valor do desconto" onChange={(value) => set("value", Math.max(0, value))} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Rateio</Label>
                    <Select name="discountSplit" options={DISCOUNT_SPLITS} state={discount.split} disabled={!canUpdate} onChange={(_, value) => set("split", value as DealDiscount["split"])} />
                    <p className="text-xs text-muted-foreground">{DISCOUNT_SPLITS.find((s) => s.id === discount.split)?.hint}</p>
                  </div>
                  <div className="grid gap-1">
                    <Label>Condição</Label>
                    <Select name="discountCondition" options={DISCOUNT_CONDITIONS} state={discount.condition} disabled={!canUpdate} onChange={(_, value) => set("condition", value as DealDiscount["condition"])} />
                    <p className="text-xs text-muted-foreground">{conditionHint}</p>
                  </div>
                  <div className="grid gap-1 sm:col-span-2">
                    <Label>Se uma proposta for perdida</Label>
                    <Select name="discountBreak" options={DISCOUNT_BREAKS} state={discount.onBreak} disabled={!canUpdate} onChange={(_, value) => set("onBreak", value as DealDiscount["onBreak"])} />
                    <p className="text-xs text-muted-foreground">{DISCOUNT_BREAKS.find((b) => b.id === discount.onBreak)?.hint}{discount.condition === "incondicional" && discount.onBreak !== "recalcular" ? " Sem condição, perder uma proposta não muda as outras." : ""}</p>
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
                    <span>Em quais propostas{discount.condition === "marcadas" ? " · quais precisam fechar" : ""}</span>
                    <span className="text-right">Desconto</span>
                  </div>
                  <ul className="divide-y">
                    {deal.proposals.map((p) => {
                      const row = planOf(p.id);
                      const closed = LOST.includes(p.status) || p.status === "aceita";
                      return (
                        <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <label className="flex items-center gap-2">
                              <Checkbox checked={targets.includes(p.id)} disabled={!canUpdate || closed}
                                onCheckedChange={(checked) => set("targets", toggle(targets, p.id, checked === true).length === deal.proposals.length ? [] : toggle(targets, p.id, checked === true))} />
                              <span className="tabular-nums">{p.number}</span> <KindBadge kind={p.kind} />
                            </label>
                            {discount.condition === "marcadas" && (
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Checkbox checked={discount.requiredIds.includes(p.id)} disabled={!canUpdate} onCheckedChange={(checked) => set("requiredIds", toggle(discount.requiredIds, p.id, checked === true))} />
                                precisa fechar
                              </label>
                            )}
                            {row?.action === "travada" && <span className="text-xs text-muted-foreground">aceita: não muda</span>}
                          </div>
                          {discount.split === "manual" && !closed && targets.includes(p.id) ? (
                            <NumField kind="money" className="w-36" value={discount.manual[String(p.id)] ?? 0} disabled={!canUpdate} ariaLabel={`Desconto de ${p.number}`}
                              onChange={(value) => set("manual", { ...discount.manual, [String(p.id)]: Math.max(0, value) })} />
                          ) : (
                            <span className="tabular-nums text-right">{row && row.planned > 0 ? `− ${money(row.planned)}` : "—"}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="px-3 py-2 border-t text-sm flex justify-between gap-2"><span className="text-muted-foreground">Desconto conjunto</span><span className="font-semibold tabular-nums">{money(plannedTotal)}</span></p>
                </div>
                {!holds && <p className="text-sm text-red-600 dark:text-red-400">A condição já não vale: uma proposta exigida foi perdida. Mude a condição ou retire o desconto.</p>}
              </>
            )}

            {canUpdate && (dirtyDiscount || changes > 0) && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <Button type="button" disabled={applyDiscount.isPending || (discount.enabled && !holds)} onClick={() => applyDiscount.mutate(false)}>
                  {applyDiscount.isPending ? "Aplicando..." : discount.enabled ? "Aplicar nas propostas" : "Retirar o desconto das propostas"}
                </Button>
                {dirtyDiscount && <Button type="button" variant="outline" onClick={() => setDiscount(deal.discount)}>Desfazer</Button>}
                <p className="text-xs text-muted-foreground">{changes ? `${changes} ${changes === 1 ? "proposta muda" : "propostas mudam"}.` : "Nenhuma proposta muda."} Enviadas só mudam por revisão (o cliente recebe de novo); aceitas não mudam.</p>
              </div>
            )}
            {deal.discount.appliedAt && !dirtyDiscount && changes === 0 && deal.discount.enabled && <p className="text-xs text-muted-foreground">Aplicado em {dateBr(deal.discount.appliedAt)}.</p>}
          </section>
        </div>

        <div className="grid gap-4">
          <section className="rounded-lg border p-4 text-sm grid gap-3">
            <h2 className="font-semibold">Resumo</h2>
            <dl className="grid gap-1">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Em aberto e ganhas</dt><dd className="tabular-nums">{live.length} de {deal.proposals.length}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Total</dt><dd className="tabular-nums font-semibold">{money(deal.total)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Desconto conjunto</dt><dd className="tabular-nums">{money(deal.discountTotal)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Ganho</dt><dd className="tabular-nums">{money(deal.won)}</dd></div>
            </dl>
            {canUpdate && (
              <form className="grid gap-2 border-t pt-3" onSubmit={(event) => { event.preventDefault(); save.mutate({ title, notes }); }}>
                <div><Label htmlFor="dealTitle">Título</Label><Input id="dealTitle" name="dealTitle" value={title} maxLength={200} onValueChange={(_, value) => setTitle(String(value))} className="mt-1" /></div>
                <div><Label htmlFor="dealNotes">Observações</Label><Textarea id="dealNotes" className="mt-1" rows={3} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
                {(title !== deal.title || notes !== (deal.notes ?? "")) && <Button type="submit" size="sm" className="w-fit" disabled={save.isPending}>Salvar</Button>}
              </form>
            )}
          </section>

          <section className="rounded-lg border p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Acompanhamento</h2>
              <Link to="/comercial/acompanhamento" className="text-xs underline text-primary">Abrir</Link>
            </div>
            {deal.activities.length === 0 ? <p className="mt-2 text-muted-foreground">Nenhum contato registrado nesta negociação ou nas propostas dela.</p> : (
              <ul className="mt-2 grid gap-1.5">
                {deal.activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <Icon name={a.doneAt ? "check" : "clock"} className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", a.doneAt ? "text-green-600" : "text-muted-foreground")} />
                    <span className="min-w-0"><span className="block truncate">{a.subject}</span><span className="text-xs text-muted-foreground">{a.doneAt ? `feito em ${dateBr(a.doneAt)}` : a.dueDate ? `marcado para ${dateBr(a.dueDate)}${a.dueTime ? ` ${a.dueTime}` : ""}` : ""}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog open={askRevise} onOpenChange={setAskRevise} title="Criar revisões das propostas enviadas?"
        description="Proposta enviada não muda: o cliente leu e pode aceitar aquele documento. Com o desconto novo nasce uma revisão em rascunho de cada enviada (a anterior fica como substituída). Depois é preciso enviar as revisões ao cliente."
        onConfirm={() => applyDiscount.mutate(true)} />
      <ProposalPanelSheet proposalId={panel} onClose={() => setPanel(null)} />
    </>
  );
}
