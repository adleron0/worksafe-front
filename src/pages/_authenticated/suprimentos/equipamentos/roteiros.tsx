import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import RowActions from "../-shared/row-actions";
import { Tip, errorMessage, newUid } from "../../comercial/-shared/commercial";
import { stockApi } from "../-shared/stock";
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
  const { data, isLoading, error, refetch } = useQuery({
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

  const columns: DataColumn<Template>[] = [
    {
      id: "name", header: "Roteiro", cell: (template) => (
        <div className="min-w-0 max-w-xl">
          <p className="font-medium flex items-center gap-2">{template.name} {!template.active && <StatusBadge tone="neutral">Inativo</StatusBadge>}</p>
          <p className="text-xs text-muted-foreground truncate">{template.items.map((q) => q.label).join(" · ")}</p>
        </div>
      ),
    },
    { id: "items", header: "Perguntas", className: "w-32 text-muted-foreground whitespace-nowrap", cell: (template) => `${template.items.length} pergunta(s)` },
  ];

  return (
    <>
      <PageHeader title="Roteiros de inspeção" description="As perguntas de cada inspeção. Os roteiros iniciais são um ponto de partida: revise com o responsável técnico." />
      <ListCard>
        <ListToolbar>
          <div className="flex items-center gap-2">
            <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
            <Label htmlFor="showInactive">Mostrar inativos</Label>
          </div>
          {canWrite && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4" /> Novo roteiro</Button>}
        </ListToolbar>
        <DataTable rows={data} columns={columns} getRowId={(template) => template.id} ariaLabel="Roteiros de inspeção" skeletonRows={4} minWidth={560}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          rowClassName={(template) => (template.active ? undefined : "opacity-60")}
          actions={canWrite ? (template) => (
            <RowActions label={`Ações do roteiro ${template.name}`} actions={[
              { id: "edit", label: "Editar", icon: "pencil", onSelect: () => setEditing(template) },
              { id: "toggle", label: template.active ? "Inativar" : "Reativar", icon: template.active ? "archive" : "archive-restore", separator: true, onSelect: () => toggle({ id: template.id, active: !template.active }) },
            ]} />
          ) : undefined}
          empty={<EmptyState title="Nenhum roteiro." />} />
      </ListCard>
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
