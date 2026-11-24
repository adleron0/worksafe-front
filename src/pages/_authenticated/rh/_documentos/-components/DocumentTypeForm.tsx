import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { NumField, errorMessage } from "../../../comercial/-shared/commercial";
import { DOCS_EXPIRING_KEY, DOCS_KEY, DOC_TYPES_KEY, DocType, DocTypes, documentsApi } from "../../-shared/documents";

interface Draft { name: string; folder: string; expires: boolean; validityMonths: number; warnDays: number; required: boolean; requiredProfessionalIds: string[]; inIntegration: boolean }
const draftOf = (type?: DocType): Draft => ({
  name: type?.name ?? "", folder: type?.folder ?? "treinamentos", expires: type?.expires ?? false, validityMonths: type?.validityMonths ?? 12, warnDays: type?.warnDays ?? 30,
  required: type?.required ?? false, requiredProfessionalIds: (type?.requiredProfessionalIds ?? []).map(String), inIntegration: type?.inIntegration ?? false,
});

/** Cadastro e edição de um tipo de documento do funcionário, em tela cheia. */
export default function DocumentTypeForm({ type, options, close }: { type?: DocType; options: DocTypes; close: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(draftOf(type));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [DOC_TYPES_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOCS_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOCS_EXPIRING_KEY] });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name.trim(), folder: draft.folder, expires: draft.expires, validityMonths: draft.expires ? draft.validityMonths || null : null, warnDays: draft.warnDays,
        required: draft.required, requiredProfessionalIds: draft.required ? draft.requiredProfessionalIds.map(Number) : [], inIntegration: draft.inIntegration,
      };
      return type ? documentsApi.put<DocType>(`types/${type.id}`, body) : documentsApi.post<DocType>("types", body);
    },
    onSuccess: () => { refresh(); toast({ title: type ? "Tipo de documento salvo" : "Tipo de documento criado", variant: "success" }); close(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Informe o nome do tipo de documento.");
    setError(""); mutate();
  };
  const folderName = options.folders.find((folder) => folder.id === draft.folder)?.name ?? draft.folder;
  const roles = draft.requiredProfessionalIds.length;

  return (
    <form onSubmit={submit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Tipo">{draft.name.trim() || "—"}</SummaryRow>
          <SummaryRow label="Pasta">{folderName}</SummaryRow>
          <SummaryRow label="Validade">{draft.expires ? `${draft.validityMonths ? `${draft.validityMonths} ${draft.validityMonths === 1 ? "mês" : "meses"}` : "Vence"} · aviso ${draft.warnDays} dias antes` : "Não vence"}</SummaryRow>
          <SummaryRow label="Obrigatório">{draft.required ? (roles ? `Para ${roles} ${roles === 1 ? "função" : "funções"}` : "Para todos") : "Não"}</SummaryRow>
          <SummaryRow label="Integração de obra">{draft.inIntegration ? "Entra no pacote" : "Não entra"}</SummaryRow>
        </section>
        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados do tipo" description="Vale para os próximos envios; os documentos já enviados não mudam.">
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
        </FormSection>

        <FormSection title="Vencimento" description="Se o documento vence, a validade sugerida e com quanta antecedência avisar.">
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
        </FormSection>

        <FormSection title="Regras" description="O que é obrigatório e o que vai para a integração de obra.">
          <div className="flex items-center gap-2">
            <Checkbox id="required" checked={draft.required} onCheckedChange={(checked) => set("required", checked === true)} />
            <Label htmlFor="required">Obrigatório (aparece como "faltando" enquanto não for enviado)</Label>
          </div>
          {draft.required && (
            <div className="sm:max-w-md">
              <Label className="text-xs">Só para estas funções</Label>
              <Select name="requiredProfessionalIds" multiple modal options={options.professionals} state={draft.requiredProfessionalIds} placeholder="Todas as funções"
                onChange={(_, value) => set("requiredProfessionalIds", Array.isArray(value) ? value.map(String) : value ? [String(value)] : [])} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="inIntegration" checked={draft.inIntegration} onCheckedChange={(checked) => set("inIntegration", checked === true)} />
            <Label htmlFor="inIntegration">Entra no pacote de documentos para a integração de obra</Label>
          </div>
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
