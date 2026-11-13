import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, NumField, commercialApi, dateBr, errorMessage, money, newUid, percent } from "../-shared/commercial";
import {
  CustomerOption, DraftSection, KIND_LABEL, isBlankItem, PROPOSALS_KEY, PROPOSAL_KEY, Proposal, ProposalCalc, ProposalDraft, ProposalOptions, STATUS_LABEL, StatusBadge,
} from "../-shared/proposals";
import CustomerStep from "./-CustomerStep";
import ProposalDocumentTab, { LinkPanel, ProposalHistory } from "./-ProposalDocumentTab";
import ProposalItemsTab from "./-ProposalItemsTab";
import { ProposalInfoStep, ProposalPaymentTab } from "./-ProposalTabs";
import WizardSteps, { STEPS, StepKey, StepState } from "./-WizardSteps";

/** Título provisório de quem acabou de escolher o cliente e ainda não deu nome à proposta. */
const PLACEHOLDER_TITLE = "Nova proposta";

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
  // o título pode ficar em branco enquanto se preenche: a API exige um, então segue o provisório
  title: draft.title.trim().length >= 2 ? draft.title : PLACEHOLDER_TITLE,
  commission: { rate: draft.commissionRate, base: draft.commissionBase, inPrice: draft.commissionInPrice },
  // etapa do cronograma ainda sem nome fica só na tela
  schedule: { unit: draft.schedule?.unit ?? "dia", steps: (draft.schedule?.steps ?? []).filter((step) => step.title.trim()) },
  // linhas em branco ficam só na tela
  sections: draft.sections.map((section) => ({ ...strip(section), items: section.items.filter((item) => !isBlankItem(item)).map(strip) })),
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
  const [tab, setTab] = useState<StepKey>("proposta");
  const [landed, setLanded] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
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
    // proposta que já saiu do rascunho abre direto no acompanhamento
    if (!landed) { setLanded(true); if (proposal.status !== "rascunho") setTab("envio"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    mutationFn: (extra: { refreshBase?: boolean; goTo?: StepKey; openClientView?: boolean } | void) =>
      commercialApi.put<Proposal>(`proposals/${proposalId}`, { ...payload, ...(extra?.refreshBase ? { refreshBase: true } : {}) }),
    onSuccess: (result, extra) => {
      apply(result);
      if (extra?.goTo) setTab(extra.goTo);
      if (extra?.openClientView) window.open(`/proposta/rascunho/${proposalId}`, "_blank", "noopener");
      // avançar de passo já salva: não precisa avisar a cada clique
      if (!extra?.goTo && !extra?.openClientView) toast({ title: extra?.refreshBase ? "Recalculada com a base atual" : "Proposta salva", variant: "success" });
    },
    onError: fail("Não foi possível salvar"),
  });
  const { mutate: setStatus, isPending: changing } = useMutation({
    mutationFn: (body: { status: string; note?: string }) => commercialApi.patch<Proposal>(`proposals/status/${proposalId}`, body),
    onSuccess: (result) => {
      apply(result); setDecision(null);
      if (result.status === "enviada") { setTab("envio"); toast({ title: "Proposta enviada", description: "Copie o link e mande para o cliente.", variant: "success" }); }
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
  const titled = draft.title.trim().length >= 2 && draft.title !== PLACEHOLDER_TITLE;
  // trocar o tipo antes de lançar itens troca também as seções sugeridas
  const changeKind = (kind: ProposalDraft["kind"]) => setDraftSafe((d) => {
    if (d.kind === kind) return d;
    const empty = d.sections.every((section) => section.items.length === 0);
    return {
      ...d, kind,
      sections: empty ? options.presets[kind].map((preset) => ({ uid: newUid(), title: preset.title, kind: preset.kind, margin: preset.margin ?? options.defaults.margins?.[preset.kind] ?? 0, showInDocument: true, items: [] })) : d.sections,
    };
  });
  const sent = proposal.status === "enviada" || proposal.status === "visualizada";
  const itemCount = draft.sections.reduce((sum, section) => sum + section.items.filter((item) => !isBlankItem(item)).length, 0);

  // O que falta em cada passo: alimenta o indicador do passo a passo e a revisão final.
  const total = calc?.totals.total ?? 0;
  const paymentDiff = Math.abs(calc?.installmentsDiff ?? 0);
  const checks: Array<{ step: StepKey; ok: boolean; label: string; fix: string }> = [
    { step: "proposta", ok: titled, label: "Título da proposta", fix: "Dê um título à proposta" },
    { step: "proposta", ok: Boolean(draft.validUntil), label: "Validade da proposta", fix: "Defina até quando a proposta vale (dá urgência ao cliente e evita preço antigo)" },
    { step: "itens", ok: itemCount > 0 && total > 0, label: "Itens e valores", fix: itemCount === 0 ? "Adicione ao menos um item" : "O total está zerado: informe os valores" },
    { step: "pagamento", ok: draft.installments.length > 0 && paymentDiff < 0.005, label: "Condições de pagamento",
      fix: draft.installments.length === 0 ? "Defina as parcelas" : "As parcelas não fecham o total da proposta" },
  ];
  // a validade é recomendação; o resto impede o envio
  const blocking = checks.filter((check) => !check.ok && check.label !== "Validade da proposta");
  const stepIndex = STEPS.findIndex((item) => item.key === tab);
  const isDraft = proposal.status === "rascunho";
  const states = Object.fromEntries(STEPS.map((step, i): [StepKey, StepState] => {
    const missing = step.key === "envio" ? blocking.length > 0 : blocking.some((check) => check.step === step.key);
    // só cobra o que ficou para trás; o que está à frente ainda é "a fazer"
    return [step.key, !isDraft ? "done" : i >= stepIndex ? "todo" : missing ? "attention" : "done"];
  })) as Record<StepKey, StepState>;
  const goTo = (key: StepKey) => {
    if (key === tab) return;
    // trocar de passo salva o rascunho (quando dá para calcular): nada se perde no caminho
    if (!readOnly && dirty && !calcError) save({ goTo: key });
    else setTab(key);
  };
  const openClientView = () => {
    if (!readOnly && dirty && !calcError) save({ openClientView: true });
    else window.open(`/proposta/rascunho/${proposalId}`, "_blank", "noopener");
  };

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/comercial/propostas" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Propostas</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{proposal.number}</h1>
            <StatusBadge status={proposal.status} expired={proposal.expired} />
            {proposal.inactiveAt && <span className="text-xs rounded bg-muted px-1.5 py-0.5">Inativa</span>}
            {!readOnly && <span className="text-xs text-muted-foreground">{saving ? "Salvando..." : dirty ? "Alterações não salvas" : "Tudo salvo"}</span>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{[customer.name, titled ? draft.title : null, KIND_LABEL[draft.kind]].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={openClientView} disabled={saving}><Icon name="eye" className="w-4 h-4 mr-1" /> Ver como o cliente</Button>
          {sent && canUpdate && <>
            <Button type="button" onClick={() => setDecision("aceita")}><Icon name="check" className="w-4 h-4 mr-1" /> Registrar aceite</Button>
            <Button type="button" variant="outline" onClick={() => setDecision("recusada")}>Registrar recusa</Button>
          </>}
          {canCreate && (sent || proposal.status === "recusada" || proposal.status === "expirada") && (
            <Button type="button" variant="outline" disabled={copying} onClick={() => copy("revise")}><Icon name="git-branch" className="w-4 h-4 mr-1" /> Criar revisão</Button>
          )}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" aria-label="Mais ações"><Icon name="ellipsis" className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!readOnly && dirty && (
                <DropdownMenuItem className="gap-2" onSelect={() => { const next = toDraft(proposal); setDraft(next); setCalc(proposal.calc); setCalcError(""); setCustomer(proposal.customer); }}>
                  <Icon name="undo-2" className="w-3 h-3" /> Descartar alterações
                </DropdownMenuItem>
              )}
              {canCreate && <DropdownMenuItem className="gap-2" disabled={copying || dirty} onSelect={() => copy("duplicate")}><Icon name="copy" className="w-3 h-3" /> Duplicar proposta</DropdownMenuItem>}
              {canUpdate && (proposal.status === "rascunho" || sent) && !proposal.inactiveAt && (
                <DropdownMenuItem className="p-0" onSelect={(event) => event.preventDefault()}>
                  <ConfirmDialog title={`Cancelar ${proposal.number}?`} description="A proposta deixa de valer. Ela continua no histórico." onConfirm={() => setStatus({ status: "cancelada" })}
                    titleBttn="Cancelar proposta" iconBttn="ban" />
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <WizardSteps current={tab} states={states} titles={isDraft ? undefined : { envio: "Acompanhar" }} onGo={goTo} />

      <div className="grid gap-2 mb-4">
        {proposal.status !== "rascunho" && (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {proposal.status === "substituida" ? "Esta versão foi substituída por uma revisão mais nova." : `Proposta ${STATUS_LABEL[proposal.status].toLowerCase()}: somente leitura.`}
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

      {/* No passo de itens a área de trabalho precisa de largura: o resumo só vai para o lado em tela bem larga */}
      <div className={cn("grid gap-4 items-start", tab === "itens" ? "2xl:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="min-w-0 grid gap-4">
          <section className="rounded-lg border bg-background p-4 sm:p-5 grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">{STEPS[stepIndex].heading}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[stepIndex].description}</p>
          </div>

          {tab === "cliente" && (
            <CustomerStep kind={draft.kind} onKind={changeKind} selected={customer} readOnly={readOnly}
              onSelect={(picked) => { setCustomer(picked); setDraftSafe((d) => ({ ...d, customerId: picked.id })); }} />
          )}
          {tab === "proposta" && <ProposalInfoStep draft={draft} setDraft={setDraftSafe} options={options} readOnly={readOnly} canSeeCosts={proposal.canSeeCosts} customer={customer} />}
          {tab === "itens" && <ProposalItemsTab draft={draft} setSections={setSections} calc={calc ?? undefined} options={options} readOnly={readOnly} canSeeCosts={proposal.canSeeCosts} />}
          {tab === "pagamento" && <ProposalPaymentTab draft={draft} setDraft={setDraftSafe} calc={calc ?? undefined} readOnly={readOnly} />}
          {tab === "documento" && <ProposalDocumentTab proposal={proposal} draft={draft} setDraft={setDraftSafe} options={options} readOnly={readOnly} payload={payload} />}
          {tab === "envio" && (
            <div className="grid gap-4">
              {proposal.publicKey && <LinkPanel proposal={proposal} />}
              {proposal.status === "rascunho" && (
                <section className="rounded-lg border p-4 grid gap-3">
                  <h3 className="font-semibold">Antes de enviar</h3>
                  <ul className="grid gap-2">
                    {checks.map((check) => (
                      <li key={check.label} className="flex items-start gap-3 text-sm">
                        <span className={cn("mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                          check.ok ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200")}>
                          {check.ok ? <Icon name="check" className="w-3 h-3" /> : "!"}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="font-medium">{check.label}</span>
                          {!check.ok && <span className="block text-muted-foreground">{check.fix}</span>}
                        </span>
                        {!check.ok && <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => goTo(check.step)}>Resolver</Button>}
                      </li>
                    ))}
                    <li className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"><Icon name="check" className="w-3 h-3" /></span>
                      <span className="flex-1"><span className="font-medium">Documento</span>
                        <span className="block text-muted-foreground">{draft.documentBody ? "Texto próprio desta proposta" : "Modelo padrão, com a sua identidade"}{draft.images.length ? ` · ${draft.images.length} imagem(ns)` : ""}</span></span>
                    </li>
                  </ul>
                  <div className="rounded-md bg-muted/50 p-3 text-sm grid sm:grid-cols-3 gap-2">
                    <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium truncate">{customer.name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Total da proposta</p><p className="font-semibold tabular-nums">{money(total)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Válida até</p><p className="font-medium">{draft.validUntil ? dateBr(draft.validUntil) : "sem validade"}</p></div>
                  </div>
                  {!readOnly && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="button" variant="outline" onClick={openClientView} disabled={saving}><Icon name="eye" className="w-4 h-4 mr-1" /> Ver como o cliente vai ver</Button>
                      <ConfirmDialog title={`Enviar ${proposal.number}?`}
                        description="O documento é congelado e a proposta ganha um link para o cliente ler e aceitar. Depois de enviada ela não é mais editada: para mudar algo, cria-se uma revisão."
                        onConfirm={() => setStatus({ status: "enviada" })}>
                        <Button type="button" disabled={changing || saving || dirty || blocking.length > 0}><Icon name="send" className="w-4 h-4 mr-1" /> Enviar proposta</Button>
                      </ConfirmDialog>
                    </div>
                  )}
                  {!readOnly && (dirty || blocking.length > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {blocking.length > 0 ? "Resolva os itens marcados para liberar o envio." : "Salve as alterações para liberar o envio."}
                    </p>
                  )}
                </section>
              )}
              <ProposalHistory proposal={proposal} />
            </div>
          )}

          </section>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => (stepIndex === 0 ? navigate({ to: "/comercial/propostas" }) : goTo(STEPS[stepIndex - 1].key))}>
              <Icon name="arrow-left" className="w-4 h-4 mr-1" /> {stepIndex === 0 ? "Propostas" : "Voltar"}
            </Button>
            <div className="grid grid-cols-2 sm:flex gap-2">
              {!readOnly && (
                <Button type="button" variant="ghost" className={cn(stepIndex === STEPS.length - 1 && "col-span-2")} onClick={() => save()} disabled={!dirty || saving || Boolean(calcError)}>
                  {saving ? "Salvando..." : "Salvar rascunho"}
                </Button>
              )}
              {stepIndex < STEPS.length - 1 && (
                <Button type="button" className={cn(readOnly && "col-span-2")} disabled={saving} onClick={() => goTo(STEPS[stepIndex + 1].key)}>
                  Avançar <Icon name="arrow-right" className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <TotalsPanel calc={calc} draft={draft} readOnly={readOnly} canSeeCosts={proposal.canSeeCosts} stale={dirty && Boolean(calcError)}
          customer={customer.name} wide={tab === "itens"} open={summaryOpen} onToggle={() => setSummaryOpen(!summaryOpen)}
          onDiscount={(discount) => setDraftSafe((d) => ({ ...d, discount }))} />
      </div>

      {decision && (
        <DecisionDialog decision={decision} number={proposal.number} pending={changing} onClose={() => setDecision(null)}
          onConfirm={(note) => setStatus({ status: decision, note })} />
      )}
    </>
  );
}

/** Rótulo à esquerda (pode quebrar), valor à direita sempre em uma linha só. */
const Line = ({ label, value, strong, muted, negative, hint, small, bold }: { label: React.ReactNode; value: string; strong?: boolean; muted?: boolean; negative?: boolean; hint?: string; small?: boolean; bold?: boolean }) => (
  <div title={hint} className={cn("flex items-baseline justify-between gap-3", small ? "py-0.5 text-xs" : "py-1 text-sm", strong && "font-semibold text-base", bold && "font-semibold", muted && "text-muted-foreground")}>
    <span className="min-w-0">{label}</span><span className={cn("shrink-0 whitespace-nowrap tabular-nums", negative && "text-destructive")}>{value}</span>
  </div>
);
/** Percentual discreto ao lado do rótulo, para o valor ficar sozinho na coluna da direita. */
const Rate = ({ children }: { children: React.ReactNode }) => <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap tabular-nums">{children}</span>;

/**
 * Resumo da proposta. Em tela estreita fica em cima, recolhido (cliente e total),
 * e abre com um toque; com espaço vai para o lado e acompanha a rolagem.
 * A parte de custo e margem só aparece para quem tem a permissão.
 */
function TotalsPanel({ calc, draft, readOnly, canSeeCosts, stale, onDiscount, customer, wide, open, onToggle }: {
  calc: ProposalCalc | null; draft: ProposalDraft; readOnly: boolean; canSeeCosts: boolean; stale: boolean; onDiscount: (value: number) => void;
  customer: string; wide: boolean; open: boolean; onToggle: () => void;
}) {
  const t = calc?.totals;
  const m = calc?.margin;
  // classes escritas por extenso: o Tailwind só gera as que encontra no código
  const side = wide ? "2xl:order-none 2xl:sticky 2xl:top-4" : "lg:order-none lg:sticky lg:top-4";
  const onlyNarrow = wide ? "2xl:hidden" : "lg:hidden";
  const body = wide ? "2xl:grid" : "lg:grid";
  return (
    <aside className={cn("order-first rounded-lg border bg-background", side, stale && "opacity-50")} aria-live="polite">
      <button type="button" onClick={onToggle} aria-expanded={open} className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left", onlyNarrow)}>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground truncate">{customer}</span>
          <span className="block font-semibold tabular-nums">{money(t?.total)}</span>
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Fechar" : "Ver resumo"}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className={cn("gap-3 p-4", open ? "grid border-t" : "hidden", body, wide ? "2xl:border-t-0" : "lg:border-t-0")}>
      <div>
        <h2 className="font-semibold">Resumo</h2>
        <p className="text-sm text-muted-foreground truncate mb-1">{customer}</p>
        <Line label="Prazo" value={draft.workDays ? `${draft.workDays} dia(s) útil(eis)` : "—"} muted />
        <Line label="Válida até" value={draft.validUntil ? dateBr(draft.validUntil) : "sem validade"} muted />
        <div className="border-t my-1" />
        <Line label="Itens" value={money(t?.subtotal)} />
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
          <p className="text-xs text-muted-foreground mb-1">Uso interno: não vai para o cliente.</p>
          <Line label="Custo" value={money(t.cost)} />
          <Line label={<>Imposto{calc?.tax.inside != null && <Rate>{percent(calc.tax.inside)}</Rate>}</>} value={money(t.tax)} />
          <Line label="Comissão" value={money(t.commission)} />
          <div className="border-t mt-1 pt-1">
            <Line label={<>Lucro estimado<Rate>{percent(t.profitRate, 1)}</Rate></>} value={money(t.profit)} negative={(t.profit ?? 0) < 0} bold />
          </div>

          <div className="mt-3 rounded-md bg-muted/50 px-3 py-2.5">
            <p className="text-xs font-semibold">Margem real</p>
            <p className="text-[11px] leading-snug text-muted-foreground">Imposto efetivo e comissão já descontados. A folga é a imprevisibilidade.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 tabular-nums">
              {([
                ["Sem usar a folga", m.unusedRate, m.unused, "Se a imprevisibilidade cobrada não for gasta na obra, ela vira lucro."],
                ["Usando a folga", m.usedRate, m.used, "Se toda a imprevisibilidade cobrada for gasta na obra."],
              ] as const).map(([label, rate, value, hint]) => (
                <div key={label} title={hint} className="rounded-md border bg-background px-2.5 py-2">
                  <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
                  <p className={cn("text-lg font-semibold leading-tight mt-0.5", value < 0 && "text-destructive")}>{percent(rate, 1)}</p>
                  <p className={cn("text-xs whitespace-nowrap", value < 0 ? "text-destructive" : "text-muted-foreground")}>{money(value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t pt-1.5 text-xs">
              <p className="font-medium text-muted-foreground mb-0.5">Até onde dá para negociar</p>
              <Line small label="Preço mínimo" value={money(m.minTotal)} muted hint="Total em que a margem real chega a zero." />
              <Line small label="Mínimo sem a dívida" value={money(m.minTotalOperational)} muted hint="Preço mínimo sem contar a parcela de dívida que entra no custo." />
              <Line small label="Desconto máximo" value={percent(m.maxDiscountRate, 1)} muted hint="Quanto dá para descontar do total antes de dar prejuízo." />
            </div>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground mt-2">{[calc?.tax.name, calc?.costBase].filter(Boolean).join(" · ")}</p>
        </div>
      )}
      </div>
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
