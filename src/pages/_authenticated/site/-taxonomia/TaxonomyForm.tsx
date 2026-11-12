import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/general-interfaces/api.interface";
import { ITaxonomy, TaxonomyEntity } from "./types";

interface FormProps {
  formData?: ITaxonomy;
  openSheet: (open: boolean) => void;
  entity: TaxonomyEntity;
}

const TaxonomyForm = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [name, setName] = useState(formData?.name ?? "");
  const [error, setError] = useState("");
  const done = entity.article === "a" ? "a" : "o";

  const onSuccess = (verb: string) => () => {
    hideLoader();
    toast({ title: `${entity.name} ${verb}${done}!`, variant: "success" });
    queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    // o cadastro de produto usa a lista para o seletor
    queryClient.invalidateQueries({ queryKey: [`options${entity.model}`] });
    openSheet(false);
  };
  const onError = (error: ApiError) => {
    hideLoader();
    const message = error.response?.data?.message || "Erro desconhecido.";
    setError(message);
    toast({ title: `Erro ao salvar ${entity.name.toLowerCase()}`, description: message, variant: "destructive" });
  };

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data: ITaxonomy) => {
      showLoader(`Salvando ${entity.name.toLowerCase()}...`);
      return post<ITaxonomy>(entity.model, "", data);
    },
    onSuccess: onSuccess("cadastrad"),
    onError,
  });
  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: (data: ITaxonomy) => {
      showLoader(`Salvando ${entity.name.toLowerCase()}...`);
      return put<ITaxonomy>(entity.model, `${formData?.id}`, data);
    },
    onSuccess: onSuccess("atualizad"),
    onError,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return setError("Informe pelo menos 2 caracteres");
    if (clean.length > 100) return setError("Máximo de 100 caracteres");
    setError("");
    if (formData) update({ name: clean });
    else create({ name: clean });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="name">Nome <span>*</span></Label>
        <Input
          id="name"
          name="name"
          placeholder={entity.placeholder}
          value={name}
          onValueChange={(_, value) => setName(String(value))}
          className="mt-1"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
      <p className="text-xs text-muted-foreground">{entity.description}</p>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending || isUpdating}>
          {formData ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => openSheet(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default TaxonomyForm;
