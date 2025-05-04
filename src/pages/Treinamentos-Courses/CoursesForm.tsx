import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import Loader from "@/components/general-components/Loader";
import DropUpload from "@/components/general-components/DropUpload";
import Number from "@/components/general-components/Number";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { Courses as EntityInterface } from "./interfaces/courses.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

interface FormProps {
  formData?: EntityInterface;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    hoursDuration: z.number().min(1, { message: "Duração deve ser maior que 0" }),
    flags: z.string().min(3, { message: "Curso deve ter pelo menos 1 bandeira" }),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, { message: "Grade teórica deve ter pelo menos 10 caracteres" }),
    gradePracticle: z.string().min(10, { message: "Grade prática deve ter pelo menos 10 caracteres" }),
    weekly: z.boolean(),
    weekDays: z.string().optional(),
    faq: z.string().optional(),
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
    hoursDuration: formData?.hoursDuration || 1,
    flags: formData?.flags || "",
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    weekly: formData?.weekly || false,
    weekDays: formData?.weekDays || "",
    faq: formData?.faq || "",
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
    mutationFn: (newItem: FormData) => post<EntityInterface>(entity.model, '', newItem),
    onSuccess: () => {
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
      toast({
        title: `Erro ao cadastrar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => put<EntityInterface>(entity.model, `${formData?.id}`, updatedItem),
    onSuccess: () => {
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

  // Buscas de valores para variaveis de formulário

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

      <div className="space-y-2">
        <Label htmlFor="hoursDuration">Carga Horária (Horas)</Label>
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

      <div className="space-y-2">
        <Label htmlFor="flags">Bandeiras do curso</Label>
        <p className="text-xs font-medium text-muted-foreground">Tags ou informações que identificam ou categorizam o curso. Separar por #</p>
        <Input
          id="flags"
          name="flags"
          placeholder="Bandeira do curso"
          value={dataForm.flags}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.flags && <p className="text-red-500 text-sm">{errors.flags}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite uma descrição"
          value={dataForm.description}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1"
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradeTheory">Grade curricular teórica</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar com #</p>
        <Input
          id="gradeTheory"
          name="gradeTheory"
          placeholder="Digite a grade teórica"
          value={dataForm.gradeTheory}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1"
        />
        {errors.gradeTheory && <p className="text-red-500 text-sm">{errors.gradeTheory}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradePracticle">Grade curricular prática</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar com #</p>
        <Input
          id="gradePracticle"
          name="gradePracticle"
          placeholder="Digite o grade prática"
          value={dataForm.gradePracticle}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1"
        />
        {errors.gradePracticle && <p className="text-red-500 text-sm">{errors.gradePracticle}</p>}
      </div>

      <div className="space-y-2 flex items-center gap-2">
        <Label htmlFor="weekly">Curso semanal?</Label>
        <Switch
          id="weekly"
          name="weekly"
          checked={dataForm.weekly}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, weekly: !prev.weekly }))}
          className="mt-1"
        />
      </div>

      {
        dataForm.weekly && (
          <div className="space-y-2">
            <Label htmlFor="weekDays">Dias da semana</Label>
            <p className="text-xs text-muted-foreground font-medium">Informe os dias da semana que o curso é oferecido</p>
            <Input
              id="weekDays"
              name="weekDays"
              placeholder="ex: seg, ter e qua"
              value={dataForm.weekDays}
              onValueChange={handleChange}
              className="mt-1"
            />
            {errors.weekDays && <p className="text-red-500 text-sm">{errors.weekDays}</p>}
          </div>
        )
      }

      <div className="space-y-2">
        <Label htmlFor="faq">Perguntas frequentes</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar as perguntas e respostas com #, por ? ao final de cada pergunta e usar a flag r- nas respostas</p>
        <Input
          id="faq"
          name="faq"
          placeholder="ex: Pergunta 01?r-resposta da pergunta 01# Pergunta 02?r-resposta da pergunta 02# Pergunta 03?r-resposta da pergunta 03"
          value={dataForm.faq}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.faq && <p className="text-red-500 text-sm">{errors.faq}</p>}
      </div>
      
      {/* <div className="space-y-2">
        <Label htmlFor="exam">Exame</Label>
        <p className="text-xs text-muted-foreground font-medium">Informe o exame do curso</p>
        <Input
          id="exam"
          name="exam"
          placeholder="ex: Teste de matemática"
          value={dataForm.exam}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.exam && <p className="text-red-500 text-sm">{errors.exam}</p>}
      </div> */}

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
      {(isPending || isPendingUpdate) && (
        <Loader title={formData ? `Atualizando ${entity.name}...` : `Registrando ${entity.name}...`} />
      )}
    </form>
  );
};

export default Form;
