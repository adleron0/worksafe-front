import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import Number from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { Turmas as EntityInterface } from "./interfaces/turmas.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";

interface FormProps {
  formData?: EntityInterface;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    customerId: z.number().optional().nullable(),
    courseId: z.number().min(1, { message: "Id do curso é obrigatório" }),
    price: z.number().min(0, { message: "Valor de venda é obrigatório" }),
    oldPrice: z.number(),
    hoursDuration: z.number().min(1, { message: "Duração é obrigatório" }),
    openClass: z.boolean(),
    gifts: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    curriculum: z.string().optional().nullable(),
    videoUrl: z.string().optional().nullable(),
    videoTitle: z.string().optional().nullable(),
    videoSubtitle: z.string().optional().nullable(),
    videoDescription: z.string().optional().nullable(),
    active: z.boolean().optional().nullable(),
    faq: z.string().optional().nullable(),
    initialDate: z.string().optional().nullable(),
    finalDate: z.string().optional().nullable(),
    landingPagesDates: z.string().optional().nullable(),
    allowExam: z.boolean().optional().nullable(),
    allowReview: z.boolean().optional().nullable(),
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || '',
    imageUrl: formData?.imageUrl || '',
    customerId: formData?.customerId || null,
    courseId: formData?.courseId || 1,
    price: formData?.price ?? 0,
    oldPrice: formData?.oldPrice ?? 0,
    hoursDuration: formData?.hoursDuration || 1,
    openClass: formData?.openClass || false,
    gifts: formData?.gifts || '',
    description: formData?.description || null,
    curriculum: formData?.curriculum || null,
    videoUrl: formData?.videoUrl || null,
    videoTitle: formData?.videoTitle || null,
    videoSubtitle: formData?.videoSubtitle || null,
    videoDescription: formData?.videoDescription || null,
    active: formData?.active || null,
    faq: formData?.faq || null,
    initialDate: formData?.initialDate || null,
    finalDate: formData?.finalDate || null,
    landingPagesDates: formData?.landingPagesDates || null,
    allowExam: formData?.allowExam || null,
    allowReview: formData?.allowReview || null,
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
      return post<EntityInterface>(entity.model, '', newItem);
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
      return put<EntityInterface>(entity.model, `${formData?.id}`, updatedItem);
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
    console.log(160, result);
    
    if (!result.success) {
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

  // Buscas de valores para variaveis de formulário

  const { 
      data: courses, 
    } = useQuery<Response | undefined, ApiError>({
      queryKey: [`listCursos`],
      queryFn: async () => {
        const params = [
          { key: 'limit', value: 999 },
          { key: 'order-name', value: 'asc' },
        ];
        return get('courses', '', params);
      },
    });

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

      <div>
        <Label htmlFor="courseId">Curso<span>*</span></Label>
        <Select 
          name="courseId"
          options={courses?.rows || []}
          onChange={(name, value) => handleChange(name, +value)} 
          state={dataForm.courseId ? String(dataForm.courseId) : ""}
          placeholder="Selecione o estado"
        />
        {errors.courseId && <p className="text-red-500 text-sm">{errors.courseId}</p>}
      </div>
      
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
        {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
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
        {errors.oldPrice && <p className="text-red-500 text-sm">{errors.oldPrice}</p>}
      </div>

      <div>
        <Label htmlFor="hoursDuration">Horas de Duração</Label>
        <Number
          id="hoursDuration"
          name="hoursDuration"
          min={1}
          max={1000}
          value={dataForm.hoursDuration}
          onValueChange={handleChange}
        />
        {errors.hoursDuration && <p className="text-red-500 text-sm">{errors.hoursDuration}</p>}
      </div>

      <div className="mt-4 flex justify-between">
        <Label htmlFor="openClass">Turma aberta?</Label>
        <Switch
          id="openClass"
          name="openClass"
          checked={dataForm.openClass ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, openClass: !prev.openClass }))}
          className="mt-1"
        />
      </div>

      <div className="mt-4 flex justify-between">
        <Label htmlFor="allowExam">Tem teste?</Label>
        <Switch
          id="allowExam"
          name="allowExam"
          checked={dataForm.allowExam ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, allowExam: !prev.allowExam }))}
          className="mt-1"
        />
      </div>

      <div className="mt-4 flex justify-between">
        <Label htmlFor="allowReview">Tem correção?</Label>
        <Switch
          id="allowReview"
          name="allowReview"
          checked={dataForm.allowReview ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, allowReview: !prev.allowReview }))}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="gifts">Presentes</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar presentes com #</p>
        <Input
          id="gifts"
          name="gifts"
          placeholder="Presentes"
          value={dataForm.gifts ?? ''}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.hoursDuration && <p className="text-red-500 text-sm">{errors.gifts}</p>}
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
