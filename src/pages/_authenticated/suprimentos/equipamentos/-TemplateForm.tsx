import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { Tip, errorMessage, newUid } from "../../comercial/-shared/commercial";
import { stockApi } from "../-shared/stock";
import { EQUIP_KEYS, Template, TemplateQuestion } from "../-shared/equipment";

const KINDS = [{ id: "ok_nok", name: "OK / Não OK" }, { id: "texto", name: "Texto" }, { id: "numero", name: "Número" }];
const KIND_LABEL: Record<string, string> = { ok_nok: "OK / Não OK", texto: "texto", numero: "número" };

type Question = TemplateQuestion & { uid: string };

/** Cadastro e edição de um roteiro de inspeção: o nome e as perguntas, em tela cheia. */
export default function TemplateForm({ template, close }: { template?: Template; close: () => void }) {
  const queryClient = useQueryClient();
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [EQUIP_KEYS.templates] }); toast({ title: template ? "Roteiro salvo" : "Roteiro criado", variant: "success" }); close(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome do roteiro.");
    if (!items.some((q) => q.label.trim())) return setError("O roteiro precisa de pelo menos uma pergunta.");
    setError(""); mutate();
  };
  const filled = items.filter((q) => q.label.trim());

  return (
    <form onSubmit={submit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Roteiro">{name.trim() || "—"}</SummaryRow>
          <SummaryRow label="Perguntas">{`${filled.length} pergunta(s)`}</SummaryRow>
          <SummaryRow label="Obrigatórias">{filled.filter((q) => q.required).length}</SummaryRow>
        </section>
        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Roteiro" description="Vale para as próximas inspeções; as já registradas guardam as respostas como foram dadas.">
          <div className="sm:max-w-md"><Label htmlFor="templateName">Nome <span>*</span></Label>
            <Input id="templateName" name="templateName" value={name} maxLength={120} onValueChange={(_, value) => setName(String(value))} className="mt-1" placeholder="Ex.: Cinturão paraquedista" /></div>
        </FormSection>
        <FormSection title="Perguntas" description={`O que o inspetor responde. Tipos: ${Object.values(KIND_LABEL).join(", ")}. Um "Não OK" impede o resultado "aprovado".`}>
          <div className="grid gap-2">
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
          </div>
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
