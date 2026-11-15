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
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { NumField, Tip, errorMessage } from "../../comercial/-shared/commercial";
import { DOCS_ABILITY, DOCS_EXPIRING_KEY, DOCS_KEY, DOC_TYPES_KEY, DocType, DocTypes, documentsApi } from "../-shared/documents";

export const Route = createFileRoute("/_authenticated/rh/_documentos/tipos-de-documento")({
  component: DocumentTypesPage,
});

interface Draft { name: string; folder: string; expires: boolean; validityMonths: number; warnDays: number; required: boolean; requiredProfessionalIds: string[]; inIntegration: boolean }
const draftOf = (type?: DocType): Draft => ({
  name: type?.name ?? "", folder: type?.folder ?? "treinamentos", expires: type?.expires ?? false, validityMonths: type?.validityMonths ?? 12, warnDays: type?.warnDays ?? 30,
  required: type?.required ?? false, requiredProfessionalIds: (type?.requiredProfessionalIds ?? []).map(String), inIntegration: type?.inIntegration ?? false,
});

/** Tipos de documento: em que pasta fica, se vence, quando avisar, se é obrigatório e se entra na integração de obra. */
function DocumentTypesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DocType | "novo" | null>(null);
  const canWrite = can(`update_${DOCS_ABILITY}`);

  const { data, isLoading, error } = useQuery({ queryKey: [DOC_TYPES_KEY], queryFn: () => documentsApi.get<DocTypes>("types") });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [DOC_TYPES_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOCS_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOCS_EXPIRING_KEY] });
  };
  const { mutate: inactivate } = useMutation({
    mutationFn: (id: number) => documentsApi.patch<DocType>(`types/${id}/inactive`),
    onSuccess: () => { refresh(); toast({ title: "Tipo de documento inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível inativar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${DOCS_ABILITY}`)) return null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tipos de documento</h1>
          <p className="text-sm text-muted-foreground">O que cada funcionário pode ter na pasta: se vence, com quanta antecedência avisar e o que é obrigatório.</p>
        </div>
        {canWrite && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo tipo</Button>}
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="mt-4 grid gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}

      {data?.folders.map((folder) => {
        const rows = data.rows.filter((type) => type.folder === folder.id);
        if (!rows.length) return null;
        return (
          <section key={folder.id} className="mt-4 rounded-lg border overflow-hidden">
            <h2 className="px-4 py-2 bg-muted/50 font-semibold text-sm flex items-center gap-2"><Icon name="folder" className="w-4 h-4" /> {folder.name}</h2>
            {rows.map((type) => (
              <div key={type.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-t text-sm">
                <div className="flex-1 min-w-0 font-medium">{type.name}</div>
                <div className="lg:w-56 text-muted-foreground">{type.expires ? `Vence${type.validityMonths ? ` em ${type.validityMonths} ${type.validityMonths === 1 ? "mês" : "meses"}` : ""} · aviso ${type.warnDays} dias antes` : "Não vence"}</div>
                <div className="lg:w-72 flex flex-wrap gap-1">
                  {type.required && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{type.requiredProfessionalIds.length ? `Obrigatório para ${type.requiredProfessionalIds.length} ${type.requiredProfessionalIds.length === 1 ? "função" : "funções"}` : "Obrigatório para todos"}</span>}
                  {type.inIntegration && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">Entra na integração</span>}
                </div>
                <div className="lg:w-24 flex lg:justify-end gap-1">
                  {canWrite && <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${type.name}`} onClick={() => setEditing(type)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                  {canWrite && (
                    <ConfirmDialog title={`Inativar "${type.name}"?`} description="O tipo deixa de aparecer para novos envios. Os documentos que já existem continuam nas pastas." onConfirm={() => inactivate(type.id)}>
                      <span><Tip text="Inativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${type.name}`}><Icon name="archive" className="w-4 h-4" /></Button></Tip></span>
                    </ConfirmDialog>
                  )}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {editing && data && <TypeDialog type={editing === "novo" ? undefined : editing} options={data} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  );
}

function TypeDialog({ type, options, onClose, onSaved }: { type?: DocType; options: DocTypes; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(draftOf(type));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name.trim(), folder: draft.folder, expires: draft.expires, validityMonths: draft.expires ? draft.validityMonths || null : null, warnDays: draft.warnDays,
        required: draft.required, requiredProfessionalIds: draft.required ? draft.requiredProfessionalIds.map(Number) : [], inIntegration: draft.inIntegration,
      };
      return type ? documentsApi.put<DocType>(`types/${type.id}`, body) : documentsApi.post<DocType>("types", body);
    },
    onSuccess: () => { onSaved(); toast({ title: type ? "Tipo de documento salvo" : "Tipo de documento criado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Informe o nome do tipo de documento.");
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{type ? "Editar tipo de documento" : "Novo tipo de documento"}</DialogTitle>
          <DialogDescription>Vale para os próximos envios; os documentos já enviados não mudam.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="typeName">Nome <span>*</span></Label>
              <Input id="typeName" name="typeName" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} className="mt-1" placeholder="Ex.: NR-35" />
            </div>
            <div>
              <Label>Pasta</Label>
              <Select name="folder" options={options.folders} state={draft.folder} modal onChange={(_, value) => set("folder", String(value ?? "outros"))} placeholder="Selecione" />
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="expires" checked={draft.expires} onCheckedChange={(checked) => set("expires", checked === true)} />
              <Label htmlFor="expires">Tem data de vencimento</Label>
            </div>
            {draft.expires && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Validade sugerida (meses)</Label>
                  <NumField value={draft.validityMonths} digits={0} ariaLabel="Validade em meses" onChange={(value) => set("validityMonths", Math.round(value))} />
                </div>
                <div>
                  <Label className="text-xs">Avisar quantos dias antes</Label>
                  <NumField value={draft.warnDays} digits={0} ariaLabel="Dias de antecedência do aviso" onChange={(value) => set("warnDays", Math.round(value))} />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="required" checked={draft.required} onCheckedChange={(checked) => set("required", checked === true)} />
              <Label htmlFor="required">Obrigatório (aparece como "faltando" enquanto não for enviado)</Label>
            </div>
            {draft.required && (
              <div>
                <Label className="text-xs">Só para estas funções</Label>
                <Select name="requiredProfessionalIds" multiple modal options={options.professionals} state={draft.requiredProfessionalIds} placeholder="Todas as funções"
                  onChange={(_, value) => set("requiredProfessionalIds", Array.isArray(value) ? value.map(String) : value ? [String(value)] : [])} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="inIntegration" checked={draft.inIntegration} onCheckedChange={(checked) => set("inIntegration", checked === true)} />
              <Label htmlFor="inIntegration">Entra no pacote de documentos para a integração de obra</Label>
            </div>
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
