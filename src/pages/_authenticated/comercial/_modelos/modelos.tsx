import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import RichTextEditor from "@/components/general-components/RichTextEditor";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { COMMERCIAL_ABILITY, EditorFrame, commercialApi, errorMessage } from "../-shared/commercial";
import { ITEMS_MODE_OPTIONS, ItemsMode, KIND_LABEL, ProposalKind, VariableOption } from "../-shared/proposals";
import { VariablePalette } from "../_propostas/-ProposalDocumentTab";
import BrandTab from "./-BrandTab";

/**
 * Criar e editar modelos de proposta está fechado por enquanto (decisão do dono em 13/11/2026):
 * as propostas usam só os modelos padrão de serviço e de treinamento. Para reabrir, basta trocar para true.
 */
const TEMPLATES_OPEN: boolean = false;

export const Route = createFileRoute("/_authenticated/comercial/_modelos/modelos")({
  component: TemplatesPage,
});

interface Template { id: number; name: string; kind: ProposalKind | null; body: string; itemsMode: ItemsMode; termIds: number[]; isDefault: boolean; inactiveAt: string | null }
interface Term { id: number; title: string; kind: string; body: string; order: number; inactiveAt: string | null }
const TEMPLATES = "commercialTemplates";
const TERMS = "commercialTerms";

const TERM_KINDS = [
  { id: "aceite", name: "Aceite" }, { id: "pagamento", name: "Pagamento" }, { id: "reequilibrio", name: "Reequilíbrio" },
  { id: "cancelamento", name: "Cancelamento" }, { id: "obrigacoes", name: "Obrigações" }, { id: "confidencialidade", name: "Confidencialidade" },
  { id: "lgpd", name: "Proteção de dados" }, { id: "garantia", name: "Garantia" }, { id: "geral", name: "Geral" },
];
const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function TemplatesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [templateForm, setTemplateForm] = useState<{ row?: Template } | null>(null);
  const [termForm, setTermForm] = useState<{ row?: Term } | null>(null);

  const params = showInactive ? { inactive: "true" } : undefined;
  const templates = useQuery({ queryKey: [TEMPLATES, showInactive], queryFn: () => commercialApi.get<Template[]>("templates", params) });
  const terms = useQuery({ queryKey: [TERMS, showInactive], queryFn: () => commercialApi.get<Term[]>("terms", params) });
  const variables = useQuery({ queryKey: ["commercialVariables"], queryFn: () => commercialApi.get<VariableOption[]>("templates/variables"), staleTime: Infinity });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [TEMPLATES] });
    queryClient.invalidateQueries({ queryKey: [TERMS] });
    queryClient.invalidateQueries({ queryKey: ["commercialProposalOptions"] });
  };

  const { mutate: toggle } = useMutation({
    mutationFn: ({ entity, id, action }: { entity: "templates" | "terms"; id: number; action: "inactive" | "active" }) => commercialApi.patch(`${entity}/${action}/${id}`),
    onSuccess: (_, { action }) => { toast({ title: action === "active" ? "Reativado!" : "Inativado!", variant: "success" }); refresh(); },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: makeDefault } = useMutation({
    mutationFn: (row: Template) => commercialApi.put(`templates/${row.id}`, { isDefault: true }),
    onSuccess: () => { toast({ title: "Modelo padrão atualizado", variant: "success" }); refresh(); },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`), canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const canInactivate = can(`inactive_${COMMERCIAL_ABILITY}`), canActivate = can(`activate_${COMMERCIAL_ABILITY}`);
  const termTitle = (id: number) => terms.data?.find((t) => t.id === id)?.title;

  const actions = (entity: "templates" | "terms", row: { id: number; inactiveAt: string | null }, name: string, edit: () => void) => (
    <div className="flex flex-wrap gap-1">
      {canUpdate && !row.inactiveAt && <Button type="button" variant="outline" size="sm" onClick={edit}><Icon name="pencil" className="w-3 h-3 mr-1" /> Editar</Button>}
      {canInactivate && !row.inactiveAt && (
        <ConfirmDialog title={`Inativar ${name}?`} description="Deixa de aparecer para novas propostas. Propostas já feitas guardam o próprio texto e não mudam." onConfirm={() => toggle({ entity, id: row.id, action: "inactive" })}>
          <Button type="button" variant="ghost" size="sm">Inativar</Button>
        </ConfirmDialog>
      )}
      {canActivate && row.inactiveAt && <Button type="button" variant="ghost" size="sm" onClick={() => toggle({ entity, id: row.id, action: "active" })}>Reativar</Button>}
    </div>
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Identidade, modelos e termos</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            A identidade dá cara à proposta, o modelo é o texto-base e os termos são os textos jurídicos. Na proposta, tudo é copiado e pode ser editado sem mexer aqui.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} aria-label="Mostrar inativos" /> Mostrar inativos
        </label>
      </div>

      <Tabs defaultValue="identidade" className="mt-4">
        <TabsList>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          {TEMPLATES_OPEN && <TabsTrigger value="modelos">Modelos de proposta</TabsTrigger>}
          <TabsTrigger value="termos">Termos jurídicos</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-4"><BrandTab canUpdate={canUpdate} /></TabsContent>

        {TEMPLATES_OPEN && <TabsContent value="modelos" className="mt-4 grid gap-3">
          {canCreate && <div><Button type="button" onClick={() => setTemplateForm({})}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo modelo</Button></div>}
          {templates.isLoading && <Skeleton className="h-32 w-full" />}
          {templates.error && <p className="text-destructive text-sm">{errorMessage(templates.error)}</p>}
          <div className="grid lg:grid-cols-2 gap-3">
            {templates.data?.map((row) => (
              <article key={row.id} className={cn("rounded-lg border p-4 grid gap-2", row.inactiveAt && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.kind ? `Para propostas de ${KIND_LABEL[row.kind].toLowerCase()}` : "Para qualquer tipo de proposta"} · {ITEMS_MODE_OPTIONS.find((o) => o.id === row.itemsMode)?.name.split(":")[0]}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {row.isDefault && <span className="text-xs rounded bg-primary text-inverse-foreground px-1.5 py-0.5">Padrão</span>}
                    {row.inactiveAt && <span className="text-xs rounded bg-muted px-1.5 py-0.5">Inativo</span>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{plain(row.body)}</p>
                <p className="text-xs text-muted-foreground">Termos: {row.termIds.map(termTitle).filter(Boolean).join(", ") || "nenhum"}</p>
                <div className="flex flex-wrap gap-1 items-center">
                  {actions("templates", row, row.name, () => setTemplateForm({ row }))}
                  {canUpdate && !row.isDefault && !row.inactiveAt && <Button type="button" variant="ghost" size="sm" onClick={() => makeDefault(row)}>Tornar padrão</Button>}
                </div>
              </article>
            ))}
          </div>
        </TabsContent>}

        <TabsContent value="termos" className="mt-4 grid gap-3">
          <p className="text-xs rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2">
            Os termos iniciais são um ponto de partida. Peça ao seu advogado para revisar os textos antes de usá-los em propostas reais.
          </p>
          {canCreate && <div><Button type="button" onClick={() => setTermForm({})}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo termo</Button></div>}
          {terms.isLoading && <Skeleton className="h-32 w-full" />}
          <div className="grid gap-3">
            {terms.data?.map((row) => (
              <article key={row.id} className={cn("rounded-lg border p-4 grid gap-2", row.inactiveAt && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{row.title}{row.inactiveAt && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5">Inativo</span>}</p>
                  <span className="text-xs text-muted-foreground">{TERM_KINDS.find((k) => k.id === row.kind)?.name ?? row.kind}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plain(row.body)}</p>
                {actions("terms", row, row.title, () => setTermForm({ row }))}
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {templateForm && <TemplateDialog row={templateForm.row} terms={(terms.data ?? []).filter((t) => !t.inactiveAt)} variables={variables.data ?? []} onClose={() => setTemplateForm(null)} onSaved={refresh} />}
      {termForm && <TermDialog row={termForm.row} nextOrder={(terms.data?.length ?? 0) + 1} onClose={() => setTermForm(null)} onSaved={refresh} />}
    </>
  );
}

function TemplateDialog({ row, terms, variables, onClose, onSaved }: { row?: Template; terms: Term[]; variables: VariableOption[]; onClose: () => void; onSaved: () => void }) {
  const [state, setState] = useState({
    name: row?.name ?? "", kind: row?.kind ?? "", itemsMode: row?.itemsMode ?? "detalhado", termIds: (row?.termIds ?? []).map(String), isDefault: row?.isDefault ?? false,
  });
  const [body, setBody] = useState(row?.body ?? "<h1>Proposta comercial {{proposta.numero}}</h1><p>{{tabela_itens}}</p><p>{{condicoes_pagamento}}</p><p>{{termos}}</p>");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload = { ...state, kind: state.kind || null, termIds: state.termIds.map(Number), body };
      return row ? commercialApi.put(`templates/${row.id}`, payload) : commercialApi.post("templates", payload);
    },
    onSuccess: () => { toast({ title: row ? "Modelo atualizado!" : "Modelo criado!", variant: "success" }); onSaved(); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (state.name.trim().length < 2) return setError("Informe o nome do modelo");
    if (!plain(body)) return setError("Escreva o texto do modelo");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? `Editar ${row.name}` : "Novo modelo de proposta"}</DialogTitle>
          <DialogDescription>Mudar o modelo não altera propostas já criadas com ele: cada proposta guarda a própria cópia.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="templateName">Nome <span>*</span></Label>
              <ShadInput id="templateName" className="mt-1" value={state.name} maxLength={120} onChange={(event) => setState((s) => ({ ...s, name: event.target.value }))} /></div>
            <div><Label>Tipo de proposta</Label>
              <div className="mt-1"><Select name="kind" state={state.kind} modal clearable placeholder="Qualquer tipo" options={Object.entries(KIND_LABEL).map(([id, name]) => ({ id, name }))}
                onChange={(_, value) => setState((s) => ({ ...s, kind: String(value) as ProposalKind | "" }))} /></div></div>
            <div><Label>Tabela de itens</Label>
              <div className="mt-1"><Select name="itemsMode" state={state.itemsMode} modal options={ITEMS_MODE_OPTIONS} onChange={(_, value) => setState((s) => ({ ...s, itemsMode: String(value) as ItemsMode }))} /></div></div>
            <div><Label>Termos padrão</Label>
              <div className="mt-1"><Select name="termIds" multiple state={state.termIds} modal placeholder="Nenhum termo" options={terms.map((t) => ({ id: t.id, name: t.title }))}
                onChange={(_, value) => setState((s) => ({ ...s, termIds: Array.isArray(value) ? value : [value] }))} /></div></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={state.isDefault} onCheckedChange={(checked) => setState((s) => ({ ...s, isDefault: checked }))} aria-label="Modelo padrão" />
            Modelo padrão (usado quando não há um modelo do tipo da proposta)
          </label>
          <div>
            <Label>Texto</Label>
            <div className="mt-1"><EditorFrame><RichTextEditor value={body} onChange={setBody} height={360} placeholder="Texto do modelo..." /></EditorFrame></div>
          </div>
          <VariablePalette variables={variables} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{row ? "Salvar" : "Criar modelo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TermDialog({ row, nextOrder, onClose, onSaved }: { row?: Term; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [kind, setKind] = useState(row?.kind ?? "geral");
  const [body, setBody] = useState(row?.body ?? "");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => (row ? commercialApi.put(`terms/${row.id}`, { title, kind, body }) : commercialApi.post("terms", { title, kind, body, order: nextOrder })),
    onSuccess: () => { toast({ title: row ? "Termo atualizado!" : "Termo criado!", variant: "success" }); onSaved(); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 2) return setError("Informe o título do termo");
    if (!plain(body)) return setError("Escreva o texto do termo");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? `Editar ${row.title}` : "Novo termo"}</DialogTitle>
          <DialogDescription>O título aparece como subtítulo no documento, seguido do texto. Propostas já enviadas não mudam.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-[minmax(0,1fr)_220px] gap-3">
            <div><Label htmlFor="termTitle">Título <span>*</span></Label>
              <ShadInput id="termTitle" className="mt-1" value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></div>
            <div><Label>Assunto</Label>
              <div className="mt-1"><Select name="kind" state={kind} modal options={TERM_KINDS} onChange={(_, value) => setKind(String(value))} /></div></div>
          </div>
          <div>
            <Label>Texto</Label>
            <div className="mt-1"><EditorFrame><RichTextEditor value={body} onChange={setBody} height={260} placeholder="Texto do termo..." /></EditorFrame></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{row ? "Salvar" : "Criar termo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
