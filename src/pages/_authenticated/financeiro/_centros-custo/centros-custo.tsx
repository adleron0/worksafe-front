import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import SimpleCrud, { SimpleEntity, useSimpleSave } from "../-shared/SimpleCrud";
import { CostCenter } from "../-shared/financial";

const entity: SimpleEntity = {
  name: "Centro de Custo",
  pluralName: "Centros de Custo",
  model: "financial-cost-centers",
  article: "o",
  description: "Áreas do negócio (ex.: Treinamentos, Serviços). Junto com o plano de contas, mostram quanto cada área recebe e gasta.",
  optionKeys: ["optionsCostCenters"],
};

export const Route = createFileRoute("/_authenticated/financeiro/_centros-custo/centros-custo")({
  component: () => (
    <SimpleCrud<CostCenter>
      entity={entity}
      header={<>
        <div className="flex-1">Centro de custo</div>
        <div className="w-32">Código</div>
        <div className="w-32 text-right pr-6">Lançamentos</div>
      </>}
      renderRow={(item) => <>
        <div className="flex-1 pr-10 lg:pr-2">
          <p className="font-semibold">{item.name}{item.inactiveAt && <span className="ml-2 text-xs font-normal rounded bg-muted px-1.5 py-0.5">Inativo</span>}</p>
          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
        </div>
        <div className="lg:w-32 text-muted-foreground"><span className="lg:hidden text-xs">Código: </span>{item.code || "—"}</div>
        <div className="lg:w-32 lg:text-right lg:pr-6 tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Lançamentos: </span>{item._count?.financialRecords ?? 0}</div>
      </>}
      renderForm={(props) => <CostCenterForm {...props} />}
    />
  ),
});

function CostCenterForm({ formData, close, onSaved }: { formData?: CostCenter; close: () => void; onSaved: () => void }) {
  const [state, setState] = useState({ name: formData?.name ?? "", code: formData?.code ?? "", description: formData?.description ?? "" });
  const { save, isPending, error, setError } = useSimpleSave(entity, formData, close, onSaved);
  const set = (name: string, value: string | number) => setState((prev) => ({ ...prev, [name]: String(value) }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (state.name.trim().length < 2) return setError("Informe o nome do centro de custo");
    setError("");
    save({ name: state.name.trim(), code: state.code.trim(), description: state.description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="name">Nome <span>*</span></Label>
        <Input id="name" name="name" value={state.name} maxLength={120} onValueChange={set} placeholder="Ex.: Serviços" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="code">Código</Label>
        <Input id="code" name="code" value={state.code} maxLength={20} onValueChange={set} placeholder="Opcional" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" type="textArea" value={state.description} maxLength={255} onValueChange={set} className="mt-1" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>{formData ? "Atualizar" : "Cadastrar"}</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
      </div>
    </form>
  );
}
