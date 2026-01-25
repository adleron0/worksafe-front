import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { ICategoria } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { useLoader } from "@/context/GeneralContext";

interface FormProps {
  formData?: ICategoria;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const CategoriaForm = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Busca total de categorias para calcular a ordem
  const { data: categoriesData } = useQuery<{ total: number } | undefined>({
    queryKey: [`countBlogCategories`],
    queryFn: async () => {
      const params = [{ key: 'limit', value: 1 }];
      return get(entity.model, '', params);
    },
    enabled: !formData, // Só busca se for criação
  });

  const categoriaSchema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    slug: z.string().min(3, { message: "Slug deve ter pelo menos 3 caracteres" }),
    description: z.string().optional().or(z.literal('')),
    order: z.number(),
    active: z.boolean(),
  });

  type CategoriaFormData = z.infer<typeof categoriaSchema>;

  const [dataForm, setDataForm] = useState<CategoriaFormData>({
    name: formData?.name || "",
    slug: formData?.slug || "",
    description: formData?.description || "",
    order: formData?.order ?? 0,
    active: formData?.active ?? true,
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

  const { mutate: createCategoria, isPending } = useMutation({
    mutationFn: (newCategoria: CategoriaFormData) => {
      showLoader(`Criando ${entity.name}...`);
      return post<ICategoria>(entity.model, '', newCategoria);
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

  const { mutate: updateCategoria, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedCategoria: CategoriaFormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put<ICategoria>(entity.model, `${formData?.id}`, updatedCategoria);
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

    // Calcula a ordem automaticamente para novas categorias
    const submitData = {
      ...dataForm,
      order: formData ? dataForm.order : ((categoriesData?.total || 0) + 1) * 10000,
    };

    const result = categoriaSchema.safeParse(submitData);

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
      updateCategoria(submitData);
    } else {
      createCategoria(submitData);
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
          placeholder="Nome da categoria"
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
          placeholder="slug-da-categoria"
          value={dataForm.slug}
          onValueChange={handleChange}
          required
        />
        {errors.slug && <p className="text-red-500 text-sm">{errors.slug}</p>}
      </div>

      {/* Descrição */}
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Descrição da categoria"
          value={dataForm.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <Label htmlFor="active">Ativo</Label>
        <Switch
          id="active"
          checked={dataForm.active}
          onCheckedChange={(checked) => setDataForm(prev => ({ ...prev, active: checked }))}
        />
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

export default CategoriaForm;
