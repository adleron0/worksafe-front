import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import RichTextEditor from "@/components/general-components/RichTextEditor";
import Select from "@/components/general-components/Select";
import { Tip, commercialApi, errorMessage } from "../-shared/commercial";
import { DocumentPaper } from "../-shared/document";
import ProposalImages from "./-ProposalImages";
import { EVENT_LABEL, ITEMS_MODE_OPTIONS, ItemsMode, Proposal, ProposalDraft, ProposalOptions, VariableOption } from "../-shared/proposals";

interface Props {
  proposal: Proposal;
  draft: ProposalDraft;
  setDraft: (updater: (draft: ProposalDraft) => ProposalDraft) => void;
  options: ProposalOptions;
  readOnly: boolean;
  /** rascunho da tela, no formato da API (para a pré-visualização) */
  payload: unknown;
}

const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Variáveis e blocos: clicar copia o código para colar no texto. */
export function VariablePalette({ variables }: { variables: VariableOption[] }) {
  const copy = async (variable: VariableOption) => {
    const code = `{{${variable.key}}}`;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: `${code} copiado`, description: "Cole no ponto do texto onde o valor deve aparecer.", variant: "success" });
    } catch {
      toast({ title: "Não foi possível copiar", description: `Digite ${code} no texto.`, variant: "destructive" });
    }
  };
  const chip = (variable: VariableOption) => (
    <Tip key={variable.key} text={`Copiar {{${variable.key}}}`}>
      <button type="button" onClick={() => copy(variable)} className="rounded border px-2 py-1 text-xs hover:bg-muted text-left">
        <span className="font-medium">{variable.label}</span> <code className="text-muted-foreground">{`{{${variable.key}}}`}</code>
      </button>
    </Tip>
  );
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-xs font-medium mb-1">Blocos (ocupam um parágrafo inteiro)</p>
        <div className="flex flex-wrap gap-1.5">{variables.filter((v) => v.block).map(chip)}</div>
      </div>
      <div>
        <p className="text-xs font-medium mb-1">Variáveis</p>
        <div className="flex flex-wrap gap-1.5">{variables.filter((v) => !v.block).map(chip)}</div>
      </div>
      <p className="text-xs text-muted-foreground">Clique para copiar e cole no texto. O valor real entra na pré-visualização e no documento enviado.</p>
    </div>
  );
}

/** Passo 4: o documento que o cliente recebe (modelo copiado e editável só nesta proposta). */
export default function ProposalDocumentTab({ proposal, draft, setDraft, options, readOnly, payload }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const { mutate: loadPreview, isPending: previewing } = useMutation({
    mutationFn: () => commercialApi.post<{ html: string }>(`proposals/${proposal.id}/document-preview`, payload),
    onSuccess: (result) => setPreview(result.html),
    onError: (err) => toast({ title: "Não foi possível montar o documento", description: errorMessage(err), variant: "destructive" }),
  });

  type Template = ProposalOptions["templates"][number];
  // Escolher um modelo só aponta para ele: a proposta acompanha o modelo.
  // O texto só é copiado para dentro da proposta quando alguém pede para editar.
  const follow = (template: Template | null) =>
    setDraft((d) => ({ ...d, templateId: template?.id ?? null, documentBody: null, itemsMode: template?.itemsMode ?? d.itemsMode, termIds: template?.termIds ?? [] }));
  // Ao abrir para edição, os termos entram por extenso no texto (título + parágrafos), para
  // qualquer trecho poder ser mudado. O que continua entre {{ }} é o que o sistema preenche
  // sozinho (cabeçalho, cliente, tabelas, valores, datas).
  const copyToEdit = (template: Template) => {
    const terms = template.termIds.map((id) => options.terms.find((term) => term.id === id)).filter((term): term is NonNullable<typeof term> => Boolean(term));
    const written = terms.map((term) => `<h3>${term.title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c))}</h3>${term.body}`).join("");
    const body = template.body.replace(/<p>\s*\{\{\s*termos\s*\}\}\s*<\/p>|\{\{\s*termos\s*\}\}/, () => written);
    setDraft((d) => ({ ...d, templateId: template.id, documentBody: body, itemsMode: template.itemsMode, termIds: body === template.body ? template.termIds : [] }));
  };
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const applyTemplate = (id: string) => {
    const template = options.templates.find((t) => String(t.id) === String(id));
    if (!template) return;
    // já existe texto próprio nesta proposta: confirma antes de descartar
    if (draft.documentBody) setPendingTemplate(template);
    else follow(template);
  };
  const suggested = options.templates.find((t) => t.kind === draft.kind) ?? options.templates.find((t) => t.isDefault) ?? options.templates[0];
  // o modelo em uso: o escolhido nesta proposta ou, sem escolha, o padrão do tipo dela
  const current = options.templates.find((t) => t.id === draft.templateId) ?? suggested;
  // só os modelos padrão (orçamento de serviço e de treinamento) ficam para escolher;
  // o modelo que a proposta já usa continua na lista, mesmo sendo outro
  const standard = options.templates.filter((t) => t.body.includes("{{cabecalho}}") || t.id === draft.templateId);
  const choices = standard.length ? standard : options.templates;
  const body = draft.documentBody || current?.body || "";
  // os termos só se escolhem quando o texto ainda usa o bloco {{termos}}
  const termsByBlock = body.includes("{{termos}}");

  return (
    <div className="grid gap-4">
      <ConfirmDialog open={Boolean(pendingTemplate)} onOpenChange={(open) => { if (!open) setPendingTemplate(null); }}
        title={`Usar o modelo "${pendingTemplate?.name ?? ""}"?`} description="O texto próprio desta proposta é descartado e ela passa a acompanhar o modelo."
        onConfirm={() => { if (pendingTemplate) follow(pendingTemplate); setPendingTemplate(null); }} />
      <section className="rounded-lg border p-4 grid gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Documento</h3>
            <p className="text-xs text-muted-foreground max-w-2xl">
              {proposal.documentFrozen
                ? "Este é o documento que foi enviado. Ele ficou congelado no envio: é exatamente o que o cliente lê e aceita."
                : "A proposta já sai pronta com o modelo padrão, a sua logo e a sua cor. Só mexa aqui se quiser trocar o modelo, os termos ou reescrever o texto desta proposta."}
            </p>
          </div>
          <Button type="button" variant="outline" disabled={previewing} onClick={() => loadPreview()} className="shrink-0">
            <Icon name="eye" className="w-4 h-4 mr-1" /> {previewing ? "Montando..." : proposal.documentFrozen ? "Ver o documento enviado" : "Pré-visualizar"}
          </Button>
        </div>

        {!readOnly && options.brandReady === false && body.includes("{{sobre}}") && (
          <p className="rounded-md border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2 text-sm">
            A seção "Por que nós" ainda está vazia e não aparece na proposta. Preencha quem somos, números e diferenciais em{" "}
            <Link to="/comercial/modelos" className="underline font-medium">Comercial → Identidade e modelos</Link>: é o que dá confiança ao cliente.
          </p>
        )}

        {!readOnly && (
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Modelo</Label>
              <div className="mt-1">
                <Select name="templateId" state={draft.templateId ? String(draft.templateId) : ""} modal={false} placeholder={suggested ? `${suggested.name} (padrão)` : "Escolha um modelo"}
                  options={choices.map((t) => ({ id: t.id, name: t.isDefault ? `${t.name} (padrão)` : t.name }))} onChange={(_, value) => applyTemplate(String(value))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Tabela de itens</Label>
              <div className="mt-1">
                <Select name="itemsMode" state={draft.itemsMode} modal={false} options={ITEMS_MODE_OPTIONS} onChange={(_, value) => setDraft((d) => ({ ...d, itemsMode: String(value) as ItemsMode }))} />
              </div>
            </div>
            {termsByBlock && <div>
              <Label className="text-xs">Termos que entram no documento</Label>
              <div className="mt-1">
                <Select name="termIds" multiple state={draft.termIds.map(String)} modal={false} placeholder="Os termos do modelo"
                  options={options.terms.map((t) => ({ id: t.id, name: t.title }))}
                  onChange={(_, value) => setDraft((d) => ({ ...d, termIds: (Array.isArray(value) ? value : [value]).map(Number).filter(Boolean) }))} />
              </div>
            </div>}
          </div>
        )}

        {!readOnly && !draft.documentBody && (
          <div className="rounded-md border border-dashed p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              {current
                ? `Esta proposta usa o modelo "${current.name}" como ele está: se o modelo mudar, a proposta acompanha até ser enviada.`
                : "Cadastre um modelo em Comercial → Modelos e termos."}
            </span>
            {current && <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => copyToEdit(current)}>Editar o texto só nesta proposta</Button>}
          </div>
        )}

        {!readOnly && Boolean(draft.documentBody) && (
          <div className="rounded-md border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Esta proposta tem texto próprio: ela não acompanha mais as mudanças do modelo.</span>
            <ConfirmDialog title="Voltar a usar o modelo?" description="O texto próprio desta proposta é descartado e ela passa a usar o modelo padrão, como ele está."
              onConfirm={() => follow(null)}>
              <Button type="button" variant="outline" size="sm" className="shrink-0">Voltar a usar o modelo padrão</Button>
            </ConfirmDialog>
          </div>
        )}

        {!readOnly && draft.documentBody !== null && draft.documentBody !== undefined && draft.documentBody !== "" && (
          <>
            <RichTextEditor value={draft.documentBody} height={420} placeholder="Texto da proposta..."
              onChange={(content) => setDraft((d) => (d.documentBody === content ? d : { ...d, documentBody: content }))} />
            <p className="text-xs text-muted-foreground">
              Todo o texto pode ser mudado. O que está entre <code>{"{{ }}"}</code> é preenchido pelo sistema na proposta (cabeçalho, cliente, tabelas, valores e datas):
              mantenha esses trechos onde o conteúdo deve aparecer. Use "Pré-visualizar" para ver o resultado.
            </p>
          </>
        )}
      </section>

      <ProposalImages images={draft.images} setImages={(updater) => setDraft((d) => ({ ...d, images: updater(d.images) }))} readOnly={readOnly} />

      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{proposal.documentFrozen ? "Documento enviado" : "Pré-visualização"}</DialogTitle>
            <DialogDescription>
              {proposal.documentFrozen ? "Exatamente o que o cliente vê pelo link." : "Como o cliente vai ver, com os valores deste rascunho. Custos, margens e imposto nunca aparecem aqui."}
            </DialogDescription>
          </DialogHeader>
          {preview !== null && <DocumentPaper html={preview} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Trilha da proposta: envio, abertura pelo cliente, aceite com as evidências. */
export function ProposalHistory({ proposal }: { proposal: Proposal }) {
  if (!proposal.events.length) return null;
  return (
        <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Histórico</h3>
        <ol className="mt-2 grid gap-2">
          {proposal.events.map((event) => (
            <li key={event.id} className="text-sm border-l-2 pl-3">
              <p><b>{EVENT_LABEL[event.type] ?? event.type}</b> <span className="text-muted-foreground">· {dateTime(event.at)}</span></p>
              {(event.name || event.email) && (
                <p className="text-muted-foreground">
                  {[event.name, event.role, event.cpf ? `CPF ${event.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}` : "", event.email].filter(Boolean).join(" · ")}
                </p>
              )}
              {event.note && <p className="text-muted-foreground">{event.note}</p>}
              {event.type === "aceita" && event.ip && (
                <p className="text-xs text-muted-foreground break-all">
                  Evidências: IP {event.ip} · {event.codeVerified ? "código confirmado por e-mail" : "sem confirmação por código"} · documento {event.documentHash?.slice(0, 16)}… · {event.userAgent}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
  );
}

/** Link do cliente: copiar, abrir e (com e-mail configurado) enviar. */
export function LinkPanel({ proposal }: { proposal: Proposal }) {
  const [emailing, setEmailing] = useState(false);
  const url = proposal.publicUrl ?? `${window.location.origin}/proposta/${proposal.publicKey}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ title: "Link copiado", description: "Cole no WhatsApp ou no e-mail para o cliente.", variant: "success" }); }
    catch { toast({ title: "Não foi possível copiar", description: "Selecione o link e copie manualmente.", variant: "destructive" }); }
  };
  const open = proposal.status === "enviada" || proposal.status === "visualizada";
  return (
    <section className="rounded-lg border p-4 grid gap-2">
      <h3 className="font-semibold">Link do cliente</h3>
      <p className="text-xs text-muted-foreground">
        {open ? "Por este link o cliente lê a proposta, imprime e registra o aceite ou a recusa. " : "A proposta não está mais aberta para decisão; o link só mostra a situação. "}
        {proposal.viewedAt ? `Aberta pelo cliente em ${dateTime(proposal.viewedAt)}.` : open ? "Ainda não foi aberta." : ""}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <ShadInput readOnly value={url} aria-label="Link público da proposta" onFocus={(event) => event.target.select()} className="font-mono text-xs" />
        <Button type="button" onClick={copy} className="shrink-0"><Icon name="copy" className="w-4 h-4 mr-1" /> Copiar link</Button>
        <Button type="button" variant="outline" className="shrink-0" onClick={() => window.open(url, "_blank", "noopener")}><Icon name="external-link" className="w-4 h-4 mr-1" /> Abrir</Button>
        {open && proposal.emailConfigured && <Button type="button" variant="outline" className="shrink-0" onClick={() => setEmailing(true)}><Icon name="mail" className="w-4 h-4 mr-1" /> Enviar por e-mail</Button>}
      </div>
      {open && !proposal.emailConfigured && (
        <p className="text-xs text-muted-foreground">O envio de e-mail pelo sistema não está configurado: copie o link e mande pelo seu e-mail ou WhatsApp. Sem e-mail, o aceite também não pede código de confirmação.</p>
      )}
      {emailing && <EmailDialog proposal={proposal} onClose={() => setEmailing(false)} />}
    </section>
  );
}

function EmailDialog({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const [to, setTo] = useState(proposal.draft.contactEmail ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post(`proposals/${proposal.id}/send-email`, { to, message }),
    onSuccess: () => { toast({ title: `Link enviado para ${to}`, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setError("Informe um e-mail válido");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar {proposal.number} por e-mail</DialogTitle>
          <DialogDescription>O e-mail leva o link da proposta. O cliente lê e aceita pela página.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div><Label htmlFor="emailTo">Para</Label>
            <ShadInput id="emailTo" type="email" className="mt-1" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <div><Label htmlFor="emailMessage">Mensagem (opcional)</Label>
            <Textarea id="emailMessage" className="mt-1" rows={3} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)}
              placeholder={`Segue a proposta ${proposal.number}.`} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
