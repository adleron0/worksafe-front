import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import Loader from "@/components/general-components/Loader";
import DropUpload from "@/components/general-components/DropUpload";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { Instructors as EntityInterface } from "./interfaces/instructors.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";

interface FormProps {
  formData?: EntityInterface;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const SignatureForm = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    signatureUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    signature: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Assinatura deve ser um arquivo ou nulo.",
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
    signatureUrl: formData?.signatureUrl || null,
    signature: formData?.signature || null,
    imageUrl: formData?.imageUrl || null,
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

  // Efeito para preview de imagem se necessário
  useEffect(() => {
    if (formData) {
      if (formData.signatureUrl) {
        setPreview(formData.signatureUrl);
      }
    }
  }, []);

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => put<EntityInterface>(entity.model, `${formData?.id}/signature`, updatedItem),
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

  // const handleChange = (name: string, value: string | number) => {
  //   setDataForm((prev) => ({ ...prev, [name]: value }));
  // };

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
       if (key === 'signatureUrl' && cleanedValue) {
          cleanedData.signatureUrl = cleanedValue;
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
      // TODO: Display errors to the user, for example, using toast notifications or inline messages.
      // For now, we'll log them to the console.
      console.error("Validation errors:", newErrors);
      return;
    }

    updateCustomerMutation(cleanedData);
  };

  // Buscas de valores para variaveis de formulário

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <Label>Assinatura do instrutor </Label>
      <DropUpload
        setImage={setDataForm}
        EditPreview={preview}
        itemFormData="signature"
        cover={false}
        acceptedFiles="image/png"
      />

      <Button
        type="submit"
        className="w-full my-4"
        disabled={isPendingUpdate}
      >
        {isPendingUpdate
          ? formData
            ? "Atualizando..."
            : "Registrando..."
          : formData
          ? `Atualizar Assinatura`
          : `Registrar Assinatura`}
      </Button>
      {(isPendingUpdate) && (
        <Loader title={formData ? `Atualizando Assinatura...` : `Registrando Assinatura...`} />
      )}
    </form>
  );
};

export default SignatureForm;
