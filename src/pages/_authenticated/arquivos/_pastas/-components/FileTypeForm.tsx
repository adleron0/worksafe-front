import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { NumField, errorMessage } from "../../../comercial/-shared/commercial";
import { FILES_KEY, FileType, filesApi } from "../../-shared/files";

interface Draft { name: string; expires: boolean; validityMonths: number; warnDays: number; required: boolean }
const draftOf = (type?: FileType): Draft => ({ name: type?.name ?? "", expires: type?.expires ?? true, validityMonths: type?.validityMonths ?? 12, warnDays: type?.warnDays ?? 30, required: type?.required ?? false });

/** Cadastro e edição de um tipo de documento da empresa, em tela cheia. */
export default function FileTypeForm({ type, close }: { type?: FileType; close: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(draftOf(type));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { name: draft.name.trim(), expires: draft.expires, validityMonths: draft.expires ? draft.validityMonths || null : null, warnDays: draft.warnDays, required: draft.required };
      return type ? filesApi.put<FileType>(`types/${type.id}`, body) : filesApi.post<FileType>("types", body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); toast({ title: type ? "Tipo de documento salvo" : "Tipo de documento criado", variant: "success" }); close(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Informe o nome do tipo de documento.");
    setError(""); mutate();
  };

  return (
    <form onSubmit={submit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Tipo">{draft.name.trim() || "—"}</SummaryRow>
          <SummaryRow label="Validade">{draft.expires ? `${draft.validityMonths ? `${draft.validityMonths} ${draft.validityMonths === 1 ? "mês" : "meses"}` : "Vence"} · aviso ${draft.warnDays} dias antes` : "Não vence"}</SummaryRow>
          <SummaryRow label="Obrigatório">{draft.required ? "Sim" : "Não"}</SummaryRow>
        </section>
        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados do tipo" description="A validade vale para os próximos arquivos; os que já têm vencimento não mudam.">
          <div className="sm:max-w-md">
            <Label htmlFor="typeName">Nome <span>*</span></Label>
            <Input id="typeName" name="typeName" value={draft.name} maxLength={120} onValueChange={(_, value) => set("name", String(value))} className="mt-1" placeholder="Ex.: Licença ambiental" />
          </div>
        </FormSection>

        <FormSection title="Vencimento" description="As validades são sugestões: confira com o que cada documento diz.">
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
        </FormSection>

        <FormSection title="Regras">
          <div className="flex items-start gap-2">
            <Checkbox id="required" className="mt-0.5" checked={draft.required} onCheckedChange={(checked) => set("required", checked === true)} />
            <Label htmlFor="required" className="leading-snug">Obrigatório: a empresa precisa ter um arquivo vigente deste tipo (aparece como "faltando" enquanto não tiver)</Label>
          </div>
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
