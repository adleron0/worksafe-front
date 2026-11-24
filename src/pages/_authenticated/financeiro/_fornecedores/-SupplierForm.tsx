import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { SimpleEntity, SimplePages, useSimpleSave } from "../-shared/SimpleCrud";
import { SUPPLIER_OPTIONS_KEY, Supplier, formatDocument } from "../-shared/payables";

export const SUPPLIER_ENTITY: SimpleEntity = {
  name: "Fornecedor",
  pluralName: "Fornecedores",
  model: "financial-suppliers",
  article: "o",
  description: "De quem a empresa compra, aluga ou contrata. Usado nas contas a pagar.",
  optionKeys: [SUPPLIER_OPTIONS_KEY],
};

export const SUPPLIER_PAGES: SimplePages = {
  list: "/financeiro/fornecedores",
  new: "/financeiro/fornecedores/nova",
  edit: "/financeiro/fornecedores/$supplierId",
  param: "supplierId",
};

const FIELDS = ["name", "legalName", "document", "supplies", "contactName", "phone", "phone2", "email", "stateRegistration", "pixKey", "bankName", "agency", "account", "notes",
  "zipcode", "street", "number", "complement", "neighborhood", "city", "state"] as const;
type Field = typeof FIELDS[number];

export default function SupplierForm({ formData, close, onSaved }: { formData?: Supplier; close: () => void; onSaved: () => void }) {
  const [state, setState] = useState<Record<Field, string>>(() =>
    Object.fromEntries(FIELDS.map((field) => [field, field === "document" ? formatDocument(formData?.document) : formData?.[field] ?? ""])) as Record<Field, string>);
  const { save, isPending, error, setError } = useSimpleSave(SUPPLIER_ENTITY, formData, close, onSaved);
  const set = (name: string, value: string | number) => setState((prev) => ({ ...prev, [name]: String(value) }));
  const [loadingCep, setLoadingCep] = useState(false);

  // CEP completo: preenche rua, bairro, cidade e UF pelo ViaCEP (número e complemento ficam como estão)
  const setCep = async (name: string, value: string | number) => {
    set(name, value);
    const cep = String(value).replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoadingCep(true);
    try {
      const data = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((res) => res.json());
      if (!data?.erro) setState((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch { /* sem internet ou CEP fora do ViaCEP: segue manual */ }
    finally { setLoadingCep(false); }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (state.name.trim().length < 2) return setError("Informe o nome do fornecedor");
    const digits = state.document.replace(/\D/g, "");
    if (digits && digits.length !== 11 && digits.length !== 14) return setError("CNPJ deve ter 14 dígitos e CPF, 11");
    const cep = state.zipcode.replace(/\D/g, "");
    if (cep && cep.length !== 8) return setError("CEP deve ter 8 dígitos");
    if (state.state.trim() && !/^[A-Za-z]{2}$/.test(state.state.trim())) return setError("UF deve ter 2 letras");
    setError("");
    save(Object.fromEntries(FIELDS.map((field) => [field, field === "document" ? digits : field === "state" ? state.state.trim().toUpperCase() : state[field].trim()])));
  };

  const text = (name: Field, label: string, props: { max: number; placeholder?: string; required?: boolean; className?: string; onChange?: typeof set }) => (
    <div className={props.className}>
      <Label htmlFor={name}>{label} {props.required && <span>*</span>}</Label>
      <Input id={name} name={name} value={state[name]} maxLength={props.max} placeholder={props.placeholder} onValueChange={props.onChange ?? set} className="mt-1" />
    </div>
  );

  const documentLabel = formatDocument(state.document);
  return (
    <form onSubmit={handleSubmit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Fornecedor">{state.name.trim() || "—"}</SummaryRow>
          <SummaryRow label="CNPJ/CPF">{documentLabel || "—"}</SummaryRow>
          <SummaryRow label="Cidade">{[state.city.trim(), state.state.trim().toUpperCase()].filter(Boolean).join("/") || "—"}</SummaryRow>
          <SummaryRow label="Pagamento">{state.pixKey.trim() ? "Pix" : state.bankName.trim() || "—"}</SummaryRow>
        </section>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending}>{formData ? "Atualizar" : "Cadastrar"}</Button>
          <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados" description="Como a empresa é conhecida e os dados fiscais.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {text("name", "Nome", { max: 160, placeholder: "Como a empresa é conhecida", required: true })}
            {text("legalName", "Razão social", { max: 200, placeholder: "Opcional" })}
            {text("document", "CNPJ ou CPF", { max: 18, placeholder: "Só números" })}
            {text("stateRegistration", "Inscrição estadual", { max: 30, placeholder: "Opcional" })}
          </div>
          {text("supplies", "O que fornece", { max: 255, placeholder: "Ex.: locação de andaimes" })}
        </FormSection>

        <FormSection title="Contato" description="Com quem falar e como.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {text("contactName", "Pessoa de contato", { max: 120, className: "sm:col-span-2" })}
            {text("phone", "Telefone", { max: 30 })}
            {text("phone2", "Telefone 2", { max: 30 })}
            {text("email", "E-mail", { max: 160, className: "sm:col-span-2" })}
          </div>
        </FormSection>

        <FormSection title="Endereço" description={loadingCep ? "Buscando o CEP…" : "Com o CEP completo, rua, bairro, cidade e UF são preenchidos sozinhos."}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {text("zipcode", "CEP", { max: 9, placeholder: "Só números", onChange: setCep })}
            {text("street", "Rua", { max: 255, className: "sm:col-span-2" })}
            {text("number", "Número", { max: 20, placeholder: "Ou S/N" })}
            {text("complement", "Complemento", { max: 255 })}
            {text("neighborhood", "Bairro", { max: 120 })}
          </div>
          <div className="grid grid-cols-[1fr_4.5rem] gap-4">
            {text("city", "Cidade", { max: 120 })}
            {text("state", "UF", { max: 2 })}
          </div>
        </FormSection>

        <FormSection title="Dados para pagamento" description="Aparecem na conta a pagar na hora de pagar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {text("pixKey", "Chave Pix", { max: 140 })}
            {text("bankName", "Banco", { max: 120 })}
            {text("agency", "Agência", { max: 20 })}
            {text("account", "Conta", { max: 30 })}
          </div>
        </FormSection>

        <FormSection title="Observações">
          <Input id="notes" name="notes" type="textArea" value={state.notes} maxLength={500} onValueChange={set} />
        </FormSection>
      </FormPageGrid>
    </form>
  );
}
