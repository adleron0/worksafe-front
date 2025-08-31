import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import Number from "@/components/general-components/Number";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import FaqGenerator from "@/components/general-components/FaqGenerator";
import IconPicker from "@/components/general-components/IconPicker";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

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
    hoursDuration: z.number().min(1, { message: "Duração deve ser maior que 0" }),
    yearOfValidation: z.number().min(1, { message: "Anos de validade deve ser maior que 0" }).optional(),
    flags: z.string().min(3, { message: "Curso deve ter pelo menos 1 bandeira" }),
    icon: z.string().optional(),
    color: z.string().optional(),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, { message: "Grade teórica deve ter pelo menos 10 caracteres" }),
    gradePracticle: z.string().min(10, { message: "Grade prática deve ter pelo menos 10 caracteres" }),
    weekly: z.boolean(),
    weekDays: z.string().optional(),
    media: z.number().min(0, { message: "Média deve ser maior ou igual a 0" }).max(10, { message: "Média deve ser menor ou igual a 10" }),
    faq: z.array(
      z.object({
        question: z.string().min(3, { message: "Pergunta deve ter pelo menos 3 caracteres" }),
        answer: z.string().min(3, { message: "Resposta deve ter pelo menos 3 caracteres" })
      })
    ).optional(),
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
    yearOfValidation: formData?.yearOfValidation || undefined,
    flags: formData?.flags || "",
    icon: formData?.icon || "",
    color: formData?.color || "#000000",
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    weekly: formData?.weekly || false,
    weekDays: formData?.weekDays || "",
    media: formData?.media || 6,
    faq: FaqGenerator.parseFaqString(formData?.faq),
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
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['turma'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      // Força refetch de todos os dados
      queryClient.refetchQueries({ queryKey: [`list${entity.pluralName}`] });
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
      return put<IEntity>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['turma'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      // Força refetch de todos os dados
      queryClient.refetchQueries({ queryKey: [`list${entity.pluralName}`] });
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    // Zod schema validation
    const result = Schema.safeParse(dataForm);
    
    if (!result.success) {
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
          console.log("🚀 ~ result.error.errors.forEach ~ path:", path);
          console.log("🚀 ~ result.error.errors.forEach ~ error.message:", error.message);
        }
      });
      
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // Create a copy of the data form with faq converted to JSON string
    const submissionData = {
      ...dataForm,
      faq: JSON.stringify(dataForm.faq || [])
    } as unknown as FormData;

    if (formData) {
      updateCustomerMutation(submissionData);
    } else {
      registerCustomer(submissionData);
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
        <IconPicker
          value={dataForm.icon}
          onChange={(iconName) => handleChange('icon', iconName)}
          label="Ícone do Curso"
          placeholder="Selecione um ícone para o curso"
        />
        {errors.icon && <p className="text-red-500 text-sm">{errors.icon}</p>}
      </div>

      <div className="space-y-2">
        <ColorPickerInput
          value={dataForm.color}
          onChange={(color) => handleChange('color', color)}
          label="Cor do Curso"
        />
        {errors.color && <p className="text-red-500 text-sm">{errors.color}</p>}
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
        <Label htmlFor="yearOfValidation">Anos de Validade do Certificado</Label>
        <Number
          id="yearOfValidation"
          name="yearOfValidation"
          min={1}
          max={100}
          value={dataForm.yearOfValidation || 0}
          onValueChange={handleChange}
          placeholder="Ex: 2 anos"
        />
        {errors.yearOfValidation && <p className="text-red-500 text-sm">{errors.yearOfValidation}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="media">Média para Aprovação <span>*</span></Label>
        <p className="text-xs text-muted-foreground font-medium">Nota mínima necessária para aprovação no exame do curso</p>
        <Number
          id="media"
          name="media"
          min={0}
          max={10}
          value={dataForm.media}
          onValueChange={handleChange}
          placeholder="Ex: 6"
        />
        {errors.media && <p className="text-red-500 text-sm">{errors.media}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="flags">Bandeiras do curso</Label>
        <p className="text-xs font-medium text-muted-foreground">Tags ou informações que identificam ou categorizam o curso</p>
        <TagInput
          value={dataForm.flags}
          onChange={(value) => handleChange('flags', value)}
          separator="#"
          placeholder="Digite uma bandeira e pressione Enter"
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
          className="mt-1 h-40"
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradeTheory">Grade curricular teórica</Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione os itens da grade curricular teórica</p>
        <TagInput
          value={dataForm.gradeTheory}
          onChange={(value) => handleChange('gradeTheory', value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradeTheory && <p className="text-red-500 text-sm">{errors.gradeTheory}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradePracticle">Grade curricular prática</Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione os itens da grade curricular prática</p>
        <TagInput
          value={dataForm.gradePracticle}
          onChange={(value) => handleChange('gradePracticle', value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
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

      <div className="mt-6">
        <FaqGenerator
          formData={dataForm}
          setFormData={setDataForm}
          fieldName="faq"
          errors={errors}
          setErrors={setErrors}
          title="Perguntas Frequentes (FAQ)"
          description="Adicione perguntas e respostas comuns sobre o curso"
        />
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
    </form>
  );
};

export default Form;
