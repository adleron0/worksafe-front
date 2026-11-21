import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import SimpleCrud, { SimpleEntity, useSimpleSave } from "../-shared/SimpleCrud";
import { SUPPLIER_OPTIONS_KEY, Supplier, formatDocument } from "../-shared/payables";

const entity: SimpleEntity = {
  name: "Fornecedor",
  pluralName: "Fornecedores",
  model: "financial-suppliers",
  article: "o",
  description: "De quem a empresa compra, aluga ou contrata. Usado nas contas a pagar.",
  optionKeys: [SUPPLIER_OPTIONS_KEY],
};

export const Route = createFileRoute("/_authenticated/financeiro/_fornecedores/fornecedores")({
  component: () => (
    <SimpleCrud<Supplier>
      entity={entity}
      header={<>
        <div className="flex-1">Fornecedor</div>
        <div className="w-1/4">Contato</div>
        <div className="w-1/4">Pagamento</div>
        <div className="w-20 text-right pr-4">Contas</div>
      </>}
      renderRow={(item) => <>
        <div className="flex-1 pr-10 lg:pr-2 min-w-0">
          <p className="font-semibold">{item.name}{item.inactiveAt && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5">Inativo</span>}</p>
          <p className="text-xs text-muted-foreground">{[formatDocument(item.document), item.supplies, item.city && [item.city, item.state].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <div className="lg:w-1/4 lg:pr-2 text-xs text-muted-foreground break-words">{[item.contactName, item.phone, item.email].filter(Boolean).join(" · ") || "—"}</div>
        <div className="lg:w-1/4 lg:pr-2 text-xs text-muted-foreground break-words">
          {item.pixKey ? `Pix: ${item.pixKey}` : [item.bankName, item.agency && `Ag. ${item.agency}`, item.account && `Conta ${item.account}`].filter(Boolean).join(" · ") || "—"}
        </div>
        <div className="lg:w-20 lg:text-right lg:pr-4 tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Contas: </span>{item._count?.payables ?? 0}</div>
      </>}
      renderForm={(props) => <SupplierForm {...props} />}
      inactivateWarning="Deixa de aparecer para novas contas. As contas já lançadas continuam ligadas."
    />
  ),
});

const FIELDS = ["name", "legalName", "document", "supplies", "contactName", "phone", "email", "pixKey", "bankName", "agency", "account", "notes",
  "zipcode", "street", "number", "complement", "neighborhood", "city", "state"] as const;
type Field = typeof FIELDS[number];

export function SupplierForm({ formData, close, onSaved }: { formData?: Supplier; close: () => void; onSaved: () => void }) {
  const [state, setState] = useState<Record<Field, string>>(() =>
    Object.fromEntries(FIELDS.map((field) => [field, field === "document" ? formatDocument(formData?.document) : formData?.[field] ?? ""])) as Record<Field, string>);
  const { save, isPending, error, setError } = useSimpleSave(entity, formData, close, onSaved);
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      {text("name", "Nome", { max: 160, placeholder: "Como a empresa é conhecida", required: true })}
      {text("legalName", "Razão social", { max: 200, placeholder: "Opcional" })}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {text("document", "CNPJ ou CPF", { max: 18, placeholder: "Só números" })}
        {text("supplies", "O que fornece", { max: 255, placeholder: "Ex.: locação de andaimes" })}
      </div>
      <div className="rounded border p-3 flex flex-col gap-4">
        <p className="font-medium text-sm">Contato</p>
        {text("contactName", "Pessoa de contato", { max: 120 })}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {text("phone", "Telefone", { max: 30 })}
          {text("email", "E-mail", { max: 160 })}
        </div>
      </div>
      <div className="rounded border p-3 flex flex-col gap-4">
        <p className="font-medium text-sm">Endereço {loadingCep && <span className="text-xs font-normal text-muted-foreground">buscando o CEP…</span>}</p>
        <div className="grid grid-cols-2 gap-4">
          {text("zipcode", "CEP", { max: 9, placeholder: "Só números", onChange: setCep })}
          {text("number", "Número", { max: 20, placeholder: "Ou S/N" })}
        </div>
        {text("street", "Rua", { max: 255 })}
        <div className="grid grid-cols-2 gap-4">
          {text("complement", "Complemento", { max: 255 })}
          {text("neighborhood", "Bairro", { max: 120 })}
        </div>
        <div className="grid grid-cols-[1fr_4.5rem] gap-4">
          {text("city", "Cidade", { max: 120 })}
          {text("state", "UF", { max: 2 })}
        </div>
      </div>
      <div className="rounded border p-3 flex flex-col gap-4">
        <p className="font-medium text-sm">Dados para pagamento</p>
        {text("pixKey", "Chave Pix", { max: 140 })}
        {text("bankName", "Banco", { max: 120 })}
        <div className="grid grid-cols-2 gap-4">
          {text("agency", "Agência", { max: 20 })}
          {text("account", "Conta", { max: 30 })}
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Observações</Label>
        <Input id="notes" name="notes" type="textArea" value={state.notes} maxLength={500} onValueChange={set} className="mt-1" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>{formData ? "Atualizar" : "Cadastrar"}</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
      </div>
    </form>
  );
}
