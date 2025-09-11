import React, { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

interface FormProps {
  formData?: IEntity | null;
  setOpenForm: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, setOpenForm, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema de validação
  const Schema = z.object({
    courseId: z.number().min(1, { message: "Curso é obrigatório" }),
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    description: z.string().optional(),
    isActive: z.boolean(),
  });

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    courseId: formData?.courseId || 0,
    name: formData?.name || '',
    description: formData?.description || '',
    isActive: formData?.isActive !== undefined ? formData.isActive : true,
  });

  const initialFormRef = useRef(dataForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { mutate: registerEntity, isPending } = useMutation({
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
      setDataForm(initialFormRef.current);
      setOpenForm(false);
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

  const { mutate: updateEntityMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put<Partial<IEntity>>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      setOpenForm(false);
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

  // Buscar cursos disponíveis
  const { 
    data: courses, 
    isLoading: isLoadingCourses,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      return get('courses', '', params);
    },
  });

  const handleChange = (name: string, value: string | number | boolean | null) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo ao modificar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    // Validação com Zod
    const result = Schema.safeParse(dataForm);
    
    if (!result.success) {
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
        }
      });
      
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    if (formData) {
      updateEntityMutation(dataForm);
    } else {
      registerEntity(dataForm);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="courseId">Curso <span className="text-red-500">*</span></Label>
        <Select 
          name="courseId"
          disabled={!!formData}
          isLoading={isLoadingCourses}
          options={courses?.rows || []}
          onChange={(name, value) => handleChange(name, +value)} 
          state={dataForm.courseId ? String(dataForm.courseId) : ""}
          placeholder="Selecione o curso"
        />
        {!!formData && (
          <p className="text-xs text-muted-foreground mt-1">
            O curso não pode ser alterado após a criação.
          </p>
        )}
        {errors.courseId && <p className="text-red-500 text-sm mt-1">{errors.courseId}</p>}
      </div>

      <div>
        <Label htmlFor="name">Nome <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          placeholder="Digite o nome do modelo online"
          value={dataForm.name}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Digite uma descrição para o modelo online"
          value={dataForm.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="mt-1 min-h-[100px]"
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label htmlFor="isActive" className="cursor-pointer">
              Curso Online Ativo
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Define se o modelo está disponível para os alunos
            </p>
          </div>
          <Switch
            id="isActive"
            name="isActive"
            checked={dataForm.isActive}
            onCheckedChange={(checked) => handleChange('isActive', checked)}
          />
        </div>
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