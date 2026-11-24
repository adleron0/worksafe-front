import { createFileRoute, Link } from "@tanstack/react-router";
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
import { NumField, Tip, errorMessage } from "../../comercial/-shared/commercial";
import { FILES_ABILITY, FILES_KEY, FileType, filesApi } from "../-shared/files";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/tipos-de-documento")({
  component: FileTypesPage,
});

interface Draft { name: string; expires: boolean; validityMonths: number; warnDays: number; required: boolean }
const draftOf = (type?: FileType): Draft => ({ name: type?.name ?? "", expires: type?.expires ?? true, validityMonths: type?.validityMonths ?? 12, warnDays: type?.warnDays ?? 30, required: type?.required ?? false });

/** Tipos de documento da empresa: se vence, a validade sugerida, quando avisar e se é obrigatório ter um vigente. */
function FileTypesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FileType | "novo" | null>(null);
  const canManage = can(`manage_${FILES_ABILITY}`);

  const { data, isLoading, error } = useQuery({ queryKey: [FILES_KEY, "types"], queryFn: () => filesApi.get<{ rows: FileType[] }>("types") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
  const { mutate: inactivate } = useMutation({
    mutationFn: (id: number) => filesApi.patch<FileType>(`types/${id}/inactive`),
    onSuccess: () => { refresh(); toast({ title: "Tipo de documento inativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível inativar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${FILES_ABILITY}`)) return null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tipos de documento</h1>
          <p className="text-sm text-muted-foreground">Os documentos da empresa que têm validade ou que não podem faltar. As validades são sugestões: confira com o que cada documento diz.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/arquivos/vencimentos"><Icon name="calendar-clock" className="w-4 h-4 mr-1" /> Vencimentos</Link></Button>
          {canManage && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo tipo</Button>}
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="mt-4 grid gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {data && !data.rows.length && <p className="mt-4 p-6 rounded-lg border text-sm text-muted-foreground">Nenhum tipo de documento.</p>}

      {!!data?.rows.length && (
        <section className="mt-4 rounded-card border bg-card overflow-hidden">
          {data.rows.map((type) => (
            <div key={type.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm">
              <div className="flex-1 min-w-0 font-medium">{type.name}</div>
              <div className="lg:w-72 text-muted-foreground">{type.expires ? `Vence${type.validityMonths ? ` em ${type.validityMonths} ${type.validityMonths === 1 ? "mês" : "meses"}` : ""} · aviso ${type.warnDays} dias antes` : "Não vence"}</div>
              <div className="lg:w-40">{type.required && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">Obrigatório</span>}</div>
              <div className="lg:w-24 flex lg:justify-end gap-1">
                {canManage && <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${type.name}`} onClick={() => setEditing(type)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                {canManage && (
                  <ConfirmDialog title={`Inativar "${type.name}"?`} description="O tipo deixa de poder ser escolhido e de ser cobrado como obrigatório. Os arquivos que já o usam continuam com ele." onConfirm={() => inactivate(type.id)}>
                    <span><Tip text="Inativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${type.name}`}><Icon name="archive" className="w-4 h-4" /></Button></Tip></span>
                  </ConfirmDialog>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {editing && <TypeDialog type={editing === "novo" ? undefined : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  );
}

function TypeDialog({ type, onClose, onSaved }: { type?: FileType; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(draftOf(type));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { name: draft.name.trim(), expires: draft.expires, validityMonths: draft.expires ? draft.validityMonths || null : null, warnDays: draft.warnDays, required: draft.required };
      return type ? filesApi.put<FileType>(`types/${type.id}`, body) : filesApi.post<FileType>("types", body);
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
          <DialogDescription>A validade vale para os próximos arquivos; os que já têm vencimento não mudam.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label htmlFor="typeName">Nome <span>*</span></Label>
            <Input id="typeName" name="typeName" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} className="mt-1" placeholder="Ex.: Licença ambiental" />
          </div>

          <div className="grid gap-3 rounded-card border bg-card p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="expires" checked={draft.expires} onCheckedChange={(checked) => set("expires", checked === true)} />
              <Label htmlFor="expires">Tem data de vencimento</Label>
            </div>
            {draft.expires && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Validade sugerida (meses; 0 = sem sugestão)</Label>
                  <NumField value={draft.validityMonths} digits={0} ariaLabel="Validade em meses" onChange={(value) => set("validityMonths", Math.round(value))} />
                </div>
                <div>
                  <Label className="text-xs">Avisar quantos dias antes</Label>
                  <NumField value={draft.warnDays} digits={0} ariaLabel="Dias de antecedência do aviso" onChange={(value) => set("warnDays", Math.round(value))} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-card border bg-card p-3">
            <Checkbox id="required" className="mt-0.5" checked={draft.required} onCheckedChange={(checked) => set("required", checked === true)} />
            <Label htmlFor="required" className="leading-snug">Obrigatório: a empresa precisa ter um arquivo vigente deste tipo (aparece como "faltando" enquanto não tiver)</Label>
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
