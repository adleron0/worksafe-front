import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Tip, errorMessage, newUid } from "../../comercial/-shared/commercial";
import { Pill, stockApi } from "../-shared/stock";
import { EQUIP_KEYS, PERM_INSPECT, Template, TemplateQuestion } from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/roteiros")({
  component: TemplatesPage,
});

const KINDS = [{ id: "ok_nok", name: "OK / Não OK" }, { id: "texto", name: "Texto" }, { id: "numero", name: "Número" }];
const KIND_LABEL: Record<string, string> = { ok_nok: "OK / Não OK", texto: "texto", numero: "número" };

/** Roteiros de inspeção: as perguntas que o inspetor responde em cada tipo de equipamento. */
function TemplatesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Template | "novo" | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: [EQUIP_KEYS.templates, showInactive],
    queryFn: () => stockApi.get<Template[]>("inspection-templates", showInactive ? { all: "1" } : undefined),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [EQUIP_KEYS.templates] });
  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => stockApi.put<Template>(`inspection-templates/${id}`, { active }),
    onSuccess: (row) => { refresh(); toast({ title: row.active ? "Roteiro reativado" : "Roteiro inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível alterar o roteiro", description: errorMessage(err), variant: "destructive" }),
  });
  if (!(can(`view_${PERM_INSPECT}`) || can(PERM_INSPECT) || can("view_equipamentos"))) return null;
  const canWrite = can(PERM_INSPECT);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Roteiros de inspeção</h1>
          <p className="text-sm text-muted-foreground">As perguntas de cada inspeção. Os roteiros iniciais são um ponto de partida: revise com o responsável técnico.</p>
        </div>
        {canWrite && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo roteiro</Button>}
      </div>
      <div className="flex items-center gap-2 my-4">
        <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
        <Label htmlFor="showInactive">Mostrar inativos</Label>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="grid gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {data && (
        <div className="rounded-card border bg-card overflow-hidden">
          {data.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum roteiro.</p>}
          {data.map((template) => (
            <div key={template.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium flex items-center gap-2">{template.name} {!template.active && <Pill>Inativo</Pill>}</p>
                <p className="text-xs text-muted-foreground truncate">{template.items.map((q) => q.label).join(" · ")}</p>
              </div>
              <div className="lg:w-32 text-muted-foreground">{template.items.length} pergunta(s)</div>
              <div className="lg:w-24 flex lg:justify-end gap-1">
                {canWrite && <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${template.name}`} onClick={() => setEditing(template)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                {canWrite && (
                  <Tip text={template.active ? "Inativar" : "Reativar"}>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`${template.active ? "Inativar" : "Reativar"} ${template.name}`} onClick={() => toggle({ id: template.id, active: !template.active })}>
                      <Icon name={template.active ? "archive" : "archive-restore"} className="w-4 h-4" />
                    </Button>
                  </Tip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TemplateDialog template={editing === "novo" ? undefined : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  );
}

type Question = TemplateQuestion & { uid: string };

function TemplateDialog({ template, onClose, onSaved }: { template?: Template; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [items, setItems] = useState<Question[]>(() => (template?.items.length ? template.items : [{ key: "", label: "", kind: "ok_nok" as const, required: true }]).map((q) => ({ ...q, uid: newUid() })));
  const [error, setError] = useState("");
  const setItem = (uid: string, patch: Partial<Question>) => setItems((current) => current.map((q) => (q.uid === uid ? { ...q, ...patch } : q)));
  const move = (index: number, delta: number) => setItems((current) => {
    const next = [...current];
    const [row] = next.splice(index, 1);
    next.splice(index + delta, 0, row);
    return next;
  });
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), items: items.filter((q) => q.label.trim()).map(({ key, label, kind, required }) => ({ key, label: label.trim(), kind, required })) };
      return template ? stockApi.put<Template>(`inspection-templates/${template.id}`, body) : stockApi.post<Template>("inspection-templates", body);
    },
    onSuccess: () => { onSaved(); toast({ title: template ? "Roteiro salvo" : "Roteiro criado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome do roteiro.");
    if (!items.some((q) => q.label.trim())) return setError("O roteiro precisa de pelo menos uma pergunta.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar roteiro" : "Novo roteiro de inspeção"}</DialogTitle>
          <DialogDescription>Vale para as próximas inspeções; as já registradas guardam as respostas como foram dadas.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div><Label htmlFor="templateName">Nome <span>*</span></Label>
            <Input id="templateName" name="templateName" value={name} maxLength={120} onValueChange={(_, value) => setName(String(value))} className="mt-1" placeholder="Ex.: Cinturão paraquedista" /></div>
          <div className="grid gap-2">
            <Label>Perguntas</Label>
            {items.map((q, index) => (
              <div key={q.uid} className="rounded border p-2 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 sm:col-span-6"><Input name={`label-${q.uid}`} value={q.label} maxLength={300} onValueChange={(_, value) => setItem(q.uid, { label: String(value) })} placeholder={`Pergunta ${index + 1}`} /></div>
                <div className="col-span-6 sm:col-span-3"><Select name={`kind-${q.uid}`} options={KINDS} state={q.kind} modal onChange={(_, value) => setItem(q.uid, { kind: (String(value || "ok_nok")) as Question["kind"] })} /></div>
                <div className="col-span-6 sm:col-span-3 flex items-center justify-end gap-1">
                  <Tip text="Obrigatória"><span className="flex items-center"><Checkbox aria-label={`Pergunta ${index + 1} obrigatória`} checked={q.required} onCheckedChange={(checked) => setItem(q.uid, { required: checked === true })} /></span></Tip>
                  <Tip text="Subir"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="arrow-up" className="w-4 h-4" /></Button></Tip>
                  <Tip text="Descer"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Descer" disabled={index === items.length - 1} onClick={() => move(index, 1)}><Icon name="arrow-down" className="w-4 h-4" /></Button></Tip>
                  {items.length > 1 && <Tip text="Remover"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Remover a pergunta ${index + 1}`} onClick={() => setItems(items.filter((x) => x.uid !== q.uid))}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip>}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setItems([...items, { key: "", label: "", kind: "ok_nok", required: true, uid: newUid() }])}><Icon name="plus" className="w-3 h-3 mr-1" /> Adicionar pergunta</Button>
            <p className="text-xs text-muted-foreground">Tipos: {Object.values(KIND_LABEL).join(", ")}. Um "Não OK" impede o resultado "aprovado".</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
