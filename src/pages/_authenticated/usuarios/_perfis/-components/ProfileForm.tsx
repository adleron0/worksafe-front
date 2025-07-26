import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { IEntity } from "@/old-pages/Profiles/interfaces/entity.interface";
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
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
  });
  const initialFormRef = useRef(dataForm);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
        cleanedData[key as keyof FormData] = cleanedValue;
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
