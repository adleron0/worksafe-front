import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import StatusBadge from "@/components/general-components/StatusBadge";
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
      columns={[
        { id: "name", header: "Centro de custo", mobile: "title", cell: (item) => (
          <div className="min-w-0">
            <p className="font-medium">{item.name}{item.inactiveAt && <StatusBadge className="ml-2">Inativo</StatusBadge>}</p>
            {item.description && <p className="text-xs text-muted-foreground truncate max-w-md">{item.description}</p>}
          </div>
        ) },
        { id: "code", header: "Código", cell: (item) => <span className="text-muted-foreground"><span className="sm:hidden">Código </span>{item.code || "—"}</span> },
        { id: "count", header: "Lançamentos", align: "right", mobile: "end", cell: (item) => <span className="tabular-nums">{(item._count?.financialRecords ?? 0) + (item._count?.payables ?? 0)}</span> },
      ]}
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
