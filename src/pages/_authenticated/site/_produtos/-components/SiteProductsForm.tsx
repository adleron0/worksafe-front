import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import Select from "@/components/general-components/Select";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { IEntity } from "@/pages/_authenticated/site/_produtos/-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    featured: z.boolean(),
    features: z.string().optional(),
    categoryId: z.string(),
    brandId: z.string(),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    price: z.number().optional(),
    oldPrice: z.number().optional(),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
    features: formData?.features || "",
    categoryId: formData?.categoryId ? String(formData.categoryId) : "",
    brandId: formData?.brandId ? String(formData.brandId) : "",
    featured: formData?.featured || false,
    description: formData?.description || "",
    price: Number(formData?.price) || 0,
    oldPrice: Number(formData?.oldPrice) || 0,
    imageUrl: formData?.imageUrl || "",
    image: formData?.image || null,
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(''); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Efeito para preview de imagem se necessário
  useEffect(() => {
    if (formData) {
      if (formData.imageUrl) {
        setPreview(formData.imageUrl);
      }
    }
  }, []);

  const { mutate: registerCustomer, isPending } = useMutation({
    mutationFn: (newItem: FormData) => {
      showLoader(`Registrando ${entity.name}...`);
      return post<IEntity>(entity.model, '', newItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} cadastrado!`,
        description: `Novo ${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao cadastrar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      // o form manda categoryId/brandId como texto (vazio = sem); a API converte
      return put<FormData>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      // Limpa o formulário e fecha o Sheet
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

  const handleChange = (name: string, value: string | number) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = Schema.safeParse(dataForm);

    if (!result.success) {
      // Extract error messages from Zod validation result
      const newErrors: { [key: string]: string } = {};
      
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
        }
      });
      
      setErrors(newErrors);
      return;
    }

    if (formData) {
      updateCustomerMutation(dataForm);
    } else {
      registerCustomer(dataForm);
    }
  };

  // Categorias e marcas vêm dos cadastros em Site → Categorias da Loja / Marcas.
  // Só as ativas viram opção; a atual do produto continua visível mesmo inativa.
  const useOptions = (model: string, current?: { id: number; name: string } | null) =>
    useQuery({
      queryKey: [`options${model}`],
      queryFn: () =>
        get<{ rows: { id: number; name: string }[] }>(model, "", [
          { key: "limit", value: 1000 },
          { key: "active", value: true },
          { key: "order-name", value: "asc" },
        ]),
      staleTime: 60 * 1000,
      select: (data) => {
        const rows = data?.rows ?? [];
        return current && !rows.some((r) => r.id === current.id) ? [...rows, current] : rows;
      },
    });
  const { data: categoryOptions = [], isLoading: loadingCategories } = useOptions("site-product-categories", formData?.category);
  const { data: brandOptions = [], isLoading: loadingBrands } = useOptions("site-product-brands", formData?.brand);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <DropUpload
        setImage={setDataForm}
        EditPreview={preview}
      />
      <div>
        <Label htmlFor="name">Nome <span>*</span></Label>
          <Input
            id="name"
            name="name"
            placeholder={`Digite nome do ${entity.name}`}
            value={dataForm.name}
            onValueChange={handleChange}
            className="mt-1"
          />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div className="flex gap-2 items-center my-2">
        <Label htmlFor="featured" className="cursor-pointer">Produto Destaque</Label>
        <Switch
          id="featured"
          name="featured"
          checked={dataForm.featured}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, featured: !prev.featured }))}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <Select
            name="categoryId"
            options={categoryOptions}
            state={dataForm.categoryId}
            onChange={(_, value) => handleChange("categoryId", String(value ?? ""))}
            placeholder="Sem categoria"
            isLoading={loadingCategories}
            clearable
          />
        </div>
        <div>
          <Label htmlFor="brandId">Marca</Label>
          <Select
            name="brandId"
            options={brandOptions}
            state={dataForm.brandId}
            onChange={(_, value) => handleChange("brandId", String(value ?? ""))}
            placeholder="Sem marca"
            isLoading={loadingBrands}
            clearable
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium -mt-1">
        {/* texto sem link: a lista de opções abre por cima e o clique atravessava */}
        Viram os filtros da loja no site. Cadastre novas em Site → Categorias da Loja / Marcas.
      </p>

      <div>
        <Label htmlFor="price">Valor de venda atual</Label>
        <Input
          id="price"
          name="price"
          value={dataForm.price}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="oldPrice">Valor antigo</Label>
        <p className="text-xs text-muted-foreground font-medium">Para evidenciar quando houver promoções</p>
        <Input
          id="oldPrice"
          name="oldPrice"
          value={dataForm.oldPrice}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição <span>*</span></Label>
        <Input
          id="description"
          name="description"
          placeholder="Descreva o produto"
          value={dataForm.description}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1"
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>
      
      <div>
        <Label htmlFor="features">Características</Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione as características do produto</p>
        <TagInput
          value={dataForm.features || ''}
          onChange={(value) => handleChange('features', value)}
          separator="#"
          placeholder="Digite uma característica e pressione Enter"
          className="mt-1"
        />
      </div>

      <Button
        type="submit"
        className="w-full my-4"
        disabled={isPending || isPendingUpdate}
      >
        {isPending || isPendingUpdate
          ? formData
            ? "Atualizando..."
            : "Registrando..."
          : formData
          ? `Atualizar ${entity.name}`
          : `Registrar ${entity.name}`}
      </Button>
    </form>
  );
};

export default Form;
