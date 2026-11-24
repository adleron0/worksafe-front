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
import { NumField, errorMessage } from "../../comercial/-shared/commercial";
import { DOCS_ABILITY, DOCS_EXPIRING_KEY, DOCS_KEY, DOC_TYPES_KEY, DocType, DocTypes, documentsApi } from "../-shared/documents";
import DocumentTypeRowActions from "./-components/DocumentTypeRowActions";

export const Route = createFileRoute("/_authenticated/rh/_documentos/tipos-de-documento")({
  component: DocumentTypesPage,
});

interface Draft { name: string; folder: string; expires: boolean; validityMonths: number; warnDays: number; required: boolean; requiredProfessionalIds: string[]; inIntegration: boolean }
const draftOf = (type?: DocType): Draft => ({
  name: type?.name ?? "", folder: type?.folder ?? "treinamentos", expires: type?.expires ?? false, validityMonths: type?.validityMonths ?? 12, warnDays: type?.warnDays ?? 30,
  required: type?.required ?? false, requiredProfessionalIds: (type?.requiredProfessionalIds ?? []).map(String), inIntegration: type?.inIntegration ?? false,
});

const tag = "rounded bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap";
const columnsOf = (folders: DocTypes["folders"]): DataColumn<DocType>[] => [
  { id: "name", header: "Tipo", className: "min-w-[200px]", cell: (type) => <p className="font-medium truncate max-w-[18rem]">{type.name}</p> },
  {
    id: "folder", header: "Pasta",
    cell: (type) => <span className="inline-flex items-center gap-1.5 text-muted-foreground whitespace-nowrap"><Icon name="folder" className="w-3.5 h-3.5" /> {folders.find((folder) => folder.id === type.folder)?.name ?? type.folder}</span>,
  },
  {
    id: "validity", header: "Validade",
    cell: (type) => <span className="text-muted-foreground whitespace-nowrap">{type.expires ? `Vence${type.validityMonths ? ` em ${type.validityMonths} ${type.validityMonths === 1 ? "mês" : "meses"}` : ""} · aviso ${type.warnDays} dias antes` : "Não vence"}</span>,
  },
  {
    id: "rules", header: "Regras",
    cell: (type) => (type.required || type.inIntegration
      ? (
        <div className="flex gap-1">
          {type.required && <span className={tag}>{type.requiredProfessionalIds.length ? `Obrigatório para ${type.requiredProfessionalIds.length} ${type.requiredProfessionalIds.length === 1 ? "função" : "funções"}` : "Obrigatório para todos"}</span>}
          {type.inIntegration && <span className={tag}>Entra na integração</span>}
        </div>
      )
      : <span className="text-muted-foreground">—</span>),
  },
];

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

  // na ordem das pastas, como antes (uma pasta depois da outra)
  const rows = data ? data.folders.flatMap((folder) => data.rows.filter((type) => type.folder === folder.id)) : undefined;

  return (
    <>
      <PageHeader title="Tipos de documento" description="O que cada funcionário pode ter na pasta: se vence, com quanta antecedência avisar e o que é obrigatório." />

      <ListCard>
        {canWrite && <ListToolbar><Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Novo tipo</span></Button></ListToolbar>}
        <DataTable rows={rows} columns={columnsOf(data?.folders ?? [])} getRowId={(type) => type.id} ariaLabel="Tipos de documento" minWidth={760}
          loading={isLoading} error={error ? errorMessage(error) : null}
          actions={canWrite ? (type) => (
            <DocumentTypeRowActions name={type.name} onEdit={() => setEditing(type)} onInactivate={() => inactivate(type.id)}
              inactivateDescription="O tipo deixa de aparecer para novos envios. Os documentos que já existem continuam nas pastas." />
          ) : undefined}
          empty={<EmptyState title="Nenhum tipo de documento cadastrado." />} />
      </ListCard>

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

          <div className="grid gap-3 rounded-card border bg-card p-3">
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

          <div className="grid gap-3 rounded-card border bg-card p-3">
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
