import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, NumField, commercialApi, dateBr, errorMessage, money, newUid, percent } from "../-shared/commercial";
import {
  CustomerOption, DraftSection, KIND_LABEL, PROPOSALS_KEY, PROPOSAL_KEY, Proposal, ProposalCalc, ProposalDraft, ProposalOptions, STATUS_LABEL, StatusBadge,
} from "../-shared/proposals";
import ProposalDocumentTab from "./-ProposalDocumentTab";
import ProposalItemsTab from "./-ProposalItemsTab";
import { ProposalDataTab, ProposalPaymentTab } from "./-ProposalTabs";

export const Route = createFileRoute("/_authenticated/comercial/_propostas/propostas_/$proposalId")({
  component: ProposalEditorPage,
});

const toDraft = (proposal: Proposal): ProposalDraft => ({
  ...proposal.draft,
  sections: proposal.draft.sections.map((section) => ({ ...section, uid: newUid(), items: section.items.map((item) => ({ ...item, uid: newUid() })) })),
  installments: proposal.draft.installments.map((item) => ({ ...item, uid: newUid() })),
});
/** O que vai para a API (e o que conta para saber se há alteração): sem os ids de tela. */
const strip = <T extends { uid: string }>(row: T) => { const copy: Partial<T> = { ...row }; delete copy.uid; return copy; };
const payloadOf = (draft: ProposalDraft) => ({
  ...draft,
  commission: { rate: draft.commissionRate, base: draft.commissionBase, inPrice: draft.commissionInPrice },
  sections: draft.sections.map((section) => ({ ...strip(section), items: section.items.map(strip) })),
  installments: draft.installments.map(strip),
});

function ProposalEditorPage() {
  const { proposalId } = Route.useParams();
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [saved, setSaved] = useState("");
  const [calc, setCalc] = useState<ProposalCalc | null>(null);
  const [calcError, setCalcError] = useState("");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [tab, setTab] = useState("dados");
  const [decision, setDecision] = useState<"aceita" | "recusada" | null>(null);

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: [PROPOSAL_KEY, proposalId],
    queryFn: () => commercialApi.get<Proposal>(`proposals/${proposalId}`),
    // o rascunho da tela nasce desta resposta: não recarregar sozinho por cima do que está sendo editado
    refetchOnWindowFocus: false, staleTime: Infinity,
  });
  const { data: options } = useQuery({
    queryKey: ["commercialProposalOptions", proposal?.draft.referenceDate, proposal?.draft.taxRegime],
    queryFn: () => commercialApi.get<ProposalOptions>("proposals/options", {
      date: proposal!.draft.referenceDate, ...(proposal!.draft.taxRegime ? { regime: proposal!.draft.taxRegime } : {}),
    }),
    enabled: Boolean(proposal),
  });

  useEffect(() => {
    if (!proposal) return;
    const next = toDraft(proposal);
    setDraft(next);
    setSaved(JSON.stringify(payloadOf(next)));
    setCalc(proposal.calc);
    setCalcError("");
    setCustomer(proposal.customer);
  }, [proposal]);

  const payload = useMemo(() => (draft ? payloadOf(draft) : null), [draft]);
  const serialized = useMemo(() => (payload ? JSON.stringify(payload) : ""), [payload]);
  const dirty = Boolean(draft) && serialized !== saved;
  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`);
  const readOnly = !proposal?.editable || !canUpdate;

  // Totais ao vivo: a API calcula o rascunho com a mesma base guardada na proposta.
  const ticket = useRef(0);
  useEffect(() => {
    if (!payload || !dirty || !proposal) return;
    const current = ++ticket.current;
    const timer = setTimeout(async () => {
      try {
        const result = await commercialApi.post<ProposalCalc>("proposals/preview", { ...payload, id: proposal.id });
        if (current === ticket.current) { setCalc(result); setCalcError(""); }
      } catch (err) {
        if (current === ticket.current) setCalcError(errorMessage(err));
      }
    }, 400);
    return () => clearTimeout(timer);
  // serialized cobre o rascunho inteiro
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const apply = (result: Proposal) => {
    queryClient.setQueryData([PROPOSAL_KEY, String(result.id)], result);
    queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
  };
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (extra: { refreshBase?: boolean } | void) => commercialApi.put<Proposal>(`proposals/${proposalId}`, { ...payload, ...(extra ?? {}) }),
    onSuccess: (result, extra) => {
      apply(result);
      toast({ title: extra && extra.refreshBase ? "Recalculada com a base atual" : "Proposta salva", variant: "success" });
    },
    onError: fail("Não foi possível salvar"),
  });
  const { mutate: setStatus, isPending: changing } = useMutation({
    mutationFn: (body: { status: string; note?: string }) => commercialApi.patch<Proposal>(`proposals/status/${proposalId}`, body),
    onSuccess: (result) => {
      apply(result); setDecision(null);
      if (result.status === "enviada") { setTab("documento"); toast({ title: "Proposta enviada", description: "O link do cliente está na aba Documento.", variant: "success" }); }
      else toast({ title: `Proposta ${STATUS_LABEL[result.status].toLowerCase()}`, variant: "success" });
    },
    onError: fail("Não foi possível mudar a situação"),
  });
  const { mutate: copy, isPending: copying } = useMutation({
    mutationFn: (action: "duplicate" | "revise") => commercialApi.post<Proposal>(`proposals/${proposalId}/${action}`),
    onSuccess: (result, action) => {
      apply(result);
      queryClient.invalidateQueries({ queryKey: [PROPOSAL_KEY, proposalId] });
      toast({ title: action === "revise" ? `Revisão ${result.number} criada` : `Proposta ${result.number} criada`, variant: "success" });
      navigate({ to: "/comercial/propostas/$proposalId", params: { proposalId: String(result.id) } });
    },
    onError: fail("Não foi possível concluir"),
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p><Link to="/comercial/propostas" className="underline text-sm">Voltar para as propostas</Link></div>;
  if (isLoading || !proposal || !draft || !options || !customer) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const setDraftSafe = (updater: (d: ProposalDraft) => ProposalDraft) => setDraft((prev) => (prev ? updater(prev) : prev));
  const setSections = (updater: (sections: DraftSection[]) => DraftSection[]) => setDraftSafe((d) => ({ ...d, sections: updater(d.sections) }));
  const sent = proposal.status === "enviada" || proposal.status === "visualizada";
  const itemCount = draft.sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/comercial/propostas" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Propostas</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{proposal.number}</h1>
            <StatusBadge status={proposal.status} expired={proposal.expired} />
            {proposal.inactiveAt && <span className="text-xs rounded bg-muted px-1.5 py-0.5">Inativa</span>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{customer.name} · {draft.title} · {KIND_LABEL[draft.kind]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!readOnly && dirty && <Button type="button" variant="ghost" onClick={() => { const next = toDraft(proposal); setDraft(next); setCalc(proposal.calc); setCalcError(""); setCustomer(proposal.customer); }}>Descartar</Button>}
          {!readOnly && (
            <Button type="button" onClick={() => save()} disabled={!dirty || saving || Boolean(calcError)}>
              <Icon name="save" className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
          {!readOnly && !dirty && (
            <ConfirmDialog title={`Enviar ${proposal.number}?`}
              description="O documento é congelado e a proposta ganha um link para o cliente ler e aceitar. Depois de enviada ela não é mais editada: para mudar algo, cria-se uma revisão."
              onConfirm={() => setStatus({ status: "enviada" })}>
              <Button type="button" variant="outline" disabled={changing}><Icon name="send" className="w-4 h-4 mr-1" /> Enviar</Button>
            </ConfirmDialog>
          )}
          {sent && canUpdate && <>
            <Button type="button" onClick={() => setDecision("aceita")}><Icon name="check" className="w-4 h-4 mr-1" /> Registrar aceite</Button>
            <Button type="button" variant="outline" onClick={() => setDecision("recusada")}>Registrar recusa</Button>
          </>}
          {canCreate && (sent || proposal.status === "recusada") && (
            <Button type="button" variant="outline" disabled={copying} onClick={() => copy("revise")}><Icon name="git-branch" className="w-4 h-4 mr-1" /> Criar revisão</Button>
          )}
          {canCreate && <Button type="button" variant="ghost" disabled={copying || dirty} onClick={() => copy("duplicate")}><Icon name="copy" className="w-4 h-4 mr-1" /> Duplicar</Button>}
          {canUpdate && (proposal.status === "rascunho" || sent) && !proposal.inactiveAt && (
            <ConfirmDialog title={`Cancelar ${proposal.number}?`} description="A proposta deixa de valer. Ela continua no histórico." onConfirm={() => setStatus({ status: "cancelada" })}>
              <Button type="button" variant="ghost">Cancelar proposta</Button>
            </ConfirmDialog>
          )}
        </div>
      </div>

      <div className="grid gap-2 my-4">
        {proposal.status !== "rascunho" && (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {proposal.status === "substituida" ? "Esta versão foi substituída por uma revisão mais nova." : `Proposta ${STATUS_LABEL[proposal.status].toLowerCase()}: somente leitura.`}
            {(proposal.status === "enviada" || proposal.status === "visualizada") && " O link do cliente está na aba Documento."}
            {proposal.sentAt && ` Enviada em ${dateBr(proposal.sentAt)}.`}
            {proposal.decidedAt && ` Decisão em ${dateBr(proposal.decidedAt)}.`}
            {proposal.statusNote && ` Observação: ${proposal.statusNote}`}
            {proposal.contract && (
              <> Virou o contrato <Link to="/comercial/contratos/$contractId" params={{ contractId: String(proposal.contract.id) }} className="underline font-medium text-foreground">{proposal.contract.number}</Link>.</>
            )}
          </p>
        )}
        {proposal.baseOutdated && !readOnly && (
          <div className="rounded-md border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>A base de cálculo ou o imposto mudaram depois que esta proposta foi calculada (em {dateBr(proposal.baseCapturedAt)}). Os valores sugeridos aqui ainda são os de antes.</span>
            <ConfirmDialog title="Recalcular com a base atual?" description="Custos e valores sugeridos passam a usar a configuração de hoje. Valores finais digitados não mudam." onConfirm={() => save({ refreshBase: true })}>
              <Button type="button" size="sm" variant="outline" className="shrink-0">Recalcular com a base atual</Button>
            </ConfirmDialog>
          </div>
        )}
        {proposal.versions.length > 1 && (
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            Versões:
            {proposal.versions.map((version) => version.id === proposal.id
              ? <b key={version.id} className="text-foreground">{version.number}</b>
              : <Link key={version.id} to="/comercial/propostas/$proposalId" params={{ proposalId: String(version.id) }} className="underline">{version.number} ({STATUS_LABEL[version.status].toLowerCase()})</Link>)}
          </p>
        )}
        {calcError && <p className="rounded-md border border-destructive text-destructive px-3 py-2 text-sm">Não dá para calcular: {calcError}</p>}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList>
            <TabsTrigger value="dados">1. Dados</TabsTrigger>
            <TabsTrigger value="itens">2. Itens <span className="ml-1 opacity-70 tabular-nums">{itemCount}</span></TabsTrigger>
            <TabsTrigger value="pagamento">3. Pagamento <span className="ml-1 opacity-70 tabular-nums">{draft.installments.length}</span></TabsTrigger>
            <TabsTrigger value="documento">4. Documento</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="mt-4">
            <ProposalDataTab draft={draft} setDraft={setDraftSafe} options={options} readOnly={readOnly} canSeeCosts={proposal.canSeeCosts} customer={customer} onCustomer={setCustomer} />
          </TabsContent>
          <TabsContent value="itens" className="mt-4">
            <ProposalItemsTab draft={draft} setSections={setSections} calc={calc ?? undefined} options={options} readOnly={readOnly} canSeeCosts={proposal.canSeeCosts} />
          </TabsContent>
          <TabsContent value="pagamento" className="mt-4">
            <ProposalPaymentTab draft={draft} setDraft={setDraftSafe} calc={calc ?? undefined} readOnly={readOnly} />
          </TabsContent>
          <TabsContent value="documento" className="mt-4">
            <ProposalDocumentTab proposal={proposal} draft={draft} setDraft={setDraftSafe} options={options} readOnly={readOnly} payload={payload} />
          </TabsContent>
        </Tabs>

        <TotalsPanel calc={calc} draft={draft} readOnly={readOnly} canSeeCosts={proposal.canSeeCosts} stale={dirty && Boolean(calcError)}
          onDiscount={(discount) => setDraftSafe((d) => ({ ...d, discount }))} />
      </div>

      {decision && (
        <DecisionDialog decision={decision} number={proposal.number} pending={changing} onClose={() => setDecision(null)}
          onConfirm={(note) => setStatus({ status: decision, note })} />
      )}
    </>
  );
}

const Line = ({ label, value, strong, muted, negative }: { label: string; value: string; strong?: boolean; muted?: boolean; negative?: boolean }) => (
  <div className={cn("flex items-baseline justify-between gap-3 py-1 text-sm", strong && "font-semibold text-base", muted && "text-muted-foreground")}>
    <span>{label}</span><span className={cn("tabular-nums", negative && "text-destructive")}>{value}</span>
  </div>
);

/** Painel fixo de totais; a parte de custo e margem só para quem tem a permissão. */
function TotalsPanel({ calc, draft, readOnly, canSeeCosts, stale, onDiscount }: {
  calc: ProposalCalc | null; draft: ProposalDraft; readOnly: boolean; canSeeCosts: boolean; stale: boolean; onDiscount: (value: number) => void;
}) {
  const t = calc?.totals;
  const m = calc?.margin;
  return (
    <aside className={cn("rounded-lg border p-4 xl:sticky xl:top-4 grid gap-3", stale && "opacity-50")} aria-live="polite">
      <div>
        <h2 className="font-semibold">Totais</h2>
        <Line label="Itens (valor em uso)" value={money(t?.subtotal)} />
        {t && Math.abs(t.subtotal - t.suggested) > 0.005 && <Line label="Itens pelo sugerido" value={money(t.suggested)} muted />}
        <Line label={`Imprevisibilidade (${percent(draft.contingencyRate, 0)})`} value={money(t?.contingency)} />
        <div className="flex items-center justify-between gap-3 py-1 text-sm">
          <Label htmlFor="discount" className="font-normal">Desconto</Label>
          <NumField id="discount" kind="money" className="w-36" value={draft.discount} disabled={readOnly} onChange={onDiscount} onEmpty={() => onDiscount(0)} />
        </div>
        {t && t.taxOutside > 0 && <>
          <Line label="Valor líquido" value={money(t.net)} />
          <Line label={`Tributos destacados (${percent(calc?.tax.outside)})`} value={money(t.taxOutside)} />
        </>}
        <div className="border-t mt-1 pt-1"><Line label="Total da proposta" value={money(t?.total)} strong /></div>
      </div>

      {canSeeCosts && t && m && (
        <div className="border-t pt-3">
          <h3 className="text-sm font-semibold">Custos e margem</h3>
          <p className="text-xs text-muted-foreground mb-1">Só para quem tem a permissão de custos. Não vai para o cliente.</p>
          <Line label="Custo" value={money(t.cost)} />
          <Line label={`Imposto${calc?.tax.inside != null ? ` (${percent(calc.tax.inside)} por dentro)` : ""}`} value={money(t.tax)} />
          <Line label="Lucro estimado" value={`${money(t.profit)} · ${percent(t.profitRate, 1)}`} negative={(t.profit ?? 0) < 0} />
          <Line label="Comissão" value={money(t.commission)} />
          <div className="mt-2 rounded-md bg-muted/50 p-2">
            <p className="text-xs font-medium">Margem real (imposto efetivo e comissão descontados)</p>
            <Line label="Sem usar a contingência" value={`${percent(m.unusedRate, 1)} · ${money(m.unused)}`} negative={m.unused < 0} />
            <Line label="Usando toda a contingência" value={`${percent(m.usedRate, 1)} · ${money(m.used)}`} negative={m.used < 0} />
            <Line label="Preço mínimo (margem zero)" value={money(m.minTotal)} muted />
            <Line label="Mínimo sem a parcela de dívida" value={money(m.minTotalOperational)} muted />
            <Line label="Desconto máximo antes do prejuízo" value={percent(m.maxDiscountRate, 1)} muted />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{calc?.tax.name}{calc?.costBase ? ` · ${calc.costBase}` : ""}</p>
        </div>
      )}
    </aside>
  );
}

function DecisionDialog({ decision, number, pending, onClose, onConfirm }: { decision: "aceita" | "recusada"; number: string; pending: boolean; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  const accepted = decision === "aceita";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{accepted ? `Registrar o aceite de ${number}` : `Registrar a recusa de ${number}`}</DialogTitle>
          <DialogDescription>
            {accepted ? "Use quando o cliente aceitou por fora do sistema (e-mail, pedido de compra). Anote como foi." : "Anote o motivo, se souber. Dá para criar uma revisão depois."}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="decisionNote">Observação</Label>
          <Textarea id="decisionNote" className="mt-1" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
            placeholder={accepted ? "Ex.: aceite por e-mail em 14/11, pedido de compra 4500123" : "Ex.: preço acima do orçamento do cliente"} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" disabled={pending} onClick={() => onConfirm(note)}>{accepted ? "Registrar aceite" : "Registrar recusa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
