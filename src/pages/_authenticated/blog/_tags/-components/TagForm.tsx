import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { ITag } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { useLoader } from "@/context/GeneralContext";

interface FormProps {
  formData?: ITag;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const TagForm = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const tagSchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    slug: z.string().min(2, { message: "Slug deve ter pelo menos 2 caracteres" }),
  });

  type TagFormData = z.infer<typeof tagSchema>;

  const [dataForm, setDataForm] = useState<TagFormData>({
    name: formData?.name || "",
    slug: formData?.slug || "",
  });

  const initialFormRef = useRef(dataForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Auto-generate slug from name
  useEffect(() => {
    if (!formData) {
      const slug = dataForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setDataForm(prev => ({ ...prev, slug }));
    }
  }, [dataForm.name, formData]);

  const { mutate: createTag, isPending } = useMutation({
    mutationFn: (newTag: TagFormData) => {
      showLoader(`Criando ${entity.name}...`);
      return post<ITag>(entity.model, '', newTag);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} criada!`,
        description: `${entity.name} criada com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao criar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateTag, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedTag: TagFormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put<ITag>(entity.model, `${formData?.id}`, updatedTag);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizada!`,
        description: `${entity.name} atualizada com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao atualizar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | number | null) => {
    setDataForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = tagSchema.safeParse(dataForm);

    if (!result.success) {
      const formattedErrors: any = result.error.format();
      const newErrors: { [key: string]: string } = {};
      for (const key in formattedErrors) {
        if (key !== "_errors") {
          newErrors[key] = formattedErrors[key]?._errors[0] || "";
        }
      }
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (formData) {
      updateTag(dataForm);
    } else {
      createTag(dataForm);
    }
  };

  if (isPending || isPendingUpdate) {
    return <Loader title="Carregando..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Nome da tag"
          value={dataForm.name}
          onValueChange={handleChange}
          required
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="slug-da-tag"
          value={dataForm.slug}
          onValueChange={handleChange}
          required
        />
        {errors.slug && <p className="text-red-500 text-sm">{errors.slug}</p>}
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {formData ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => openSheet(false)}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default TagForm;
