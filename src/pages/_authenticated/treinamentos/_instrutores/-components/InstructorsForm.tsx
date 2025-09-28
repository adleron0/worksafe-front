import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
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
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
    email: z.string().email({ message: "Email inválido" }),
    cpf: z.string().min(11, { message: "CPF deve ter pelo menos 11 caracteres" }),
    phone: z.string().optional(),
    curriculum: z.string(),
    highlight: z.string().optional(),
    formation: z.string(),
    formationCode: z.string().optional(),
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
    imageUrl: formData?.imageUrl || null,
    image: formData?.image || null,
    email: formData?.email || "",
    cpf: formData?.cpf || "",
    phone: formData?.phone || "",
    curriculum: formData?.curriculum || "",
    highlight: formData?.highlight || "",
    formation: formData?.formation || "",
    formationCode: formData?.formationCode || "",
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
      return put<IEntity>(entity.model, `${formData?.id}`, updatedItem);
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
    
    // Clean up all string fields before submission
    const cleanedData = { ...dataForm };
    
    // Process all string fields
    Object.keys(cleanedData).forEach(key => {
      const value = cleanedData[key as keyof FormData];
      if (typeof value === 'string') {
        // Apply trim to all string fields
        const cleanedValue = value.trim();
        
        // Update the cleaned data with proper type handling
        if (key === 'name') {
          cleanedData.name = cleanedValue;
        } else if (key === 'email') {
          cleanedData.email = cleanedValue;
        } else if (key === 'cpf') {
          cleanedData.cpf = cleanedValue;
        } else if (key === 'phone') {
          cleanedData.phone = cleanedValue;
        } else if (key === 'curriculum') {
          cleanedData.curriculum = cleanedValue;
        } else if (key === 'highlight') {
          cleanedData.highlight = cleanedValue;
        } else if (key === 'formation') {
          cleanedData.formation = cleanedValue;
        } else if (key === 'formationCode') {
          cleanedData.formationCode = cleanedValue;
        } else if (key === 'imageUrl' && cleanedValue) {
          cleanedData.imageUrl = cleanedValue;
        }
      }
    });
    
    const result = Schema.safeParse(cleanedData);

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
      updateCustomerMutation(cleanedData);
    } else {
      registerCustomer(cleanedData);
    }
  };

  // Buscas de valores para variaveis de formulário

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <div className="h-60">
        <DropUpload
          setImage={setDataForm}
          EditPreview={preview}
          cover={false}
        />
      </div>
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
        <Label htmlFor="email">Email <span>*</span></Label>
        <Input
          id="email"
          name="email"
          placeholder="Digite o email do instrutor"
          value={dataForm.email}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      <div>
        <Label htmlFor="cpf">CPF <span>*</span></Label>
        <Input
          id="cpf"
          name="cpf"
          placeholder="Digite o CPF do instrutor"
          value={dataForm.cpf}
          onValueChange={handleChange}
          className="mt-1"
          format="cpf"
        />
        {errors.cpf && <p className="text-red-500 text-sm">{errors.cpf}</p>}
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="Digite o telefone do instrutor"
          value={dataForm.phone}
          onValueChange={handleChange}
          className="mt-1"
          format="phone"
        />
        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
      </div>

      <div>
        <Label htmlFor="curriculum">Currículo <span>*</span></Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione os itens do currículo do instrutor</p>
        <TagInput
          value={dataForm.curriculum}
          onChange={(value) => handleChange('curriculum', value)}
          separator="#"
          placeholder="Digite um item do currículo e pressione Enter"
          className="mt-1"
        />
        {errors.curriculum && <p className="text-red-500 text-sm">{errors.curriculum}</p>}
      </div>

      <div>
        <Label htmlFor="highlight">Destaque</Label>
        <Input
          id="highlight"
          name="highlight"
          placeholder="Digite algo de destque do instrutor"
          value={dataForm.highlight}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.highlight && <p className="text-red-500 text-sm">{errors.highlight}</p>}
      </div>

      <div>
        <Label htmlFor="formation">Formação <span>*</span></Label>
        <p className="text-xs text-muted-foreground font-medium">Apenas a principal formação</p>
        <Input
          id="formation"
          name="formation"
          placeholder="Digite a formação do instrutor"
          value={dataForm.formation}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.formation && <p className="text-red-500 text-sm">{errors.formation}</p>}
      </div>

      <div>
        <Label htmlFor="formationCode">Código da Formação</Label>
        <Input
          id="formationCode"
          name="formationCode"
          placeholder="Digite o código da formação"
          value={dataForm.formationCode}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.formationCode && <p className="text-red-500 text-sm">{errors.formationCode}</p>}
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
