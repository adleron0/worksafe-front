import React, { useState, useRef } from "react";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { IEntity } from "./interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
  customerId: number;
}

const Form = ({ formData, openSheet, entity, customerId }: FormProps) => {
  const queryClient = useQueryClient();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }),
    profileId: z.number().min(1, { message: "Setor deve ser selecionada" }),
    customerId: z.number(),
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
    email: formData?.email || "",
    phone: formData?.phone || "",
    profileId: formData?.profileId || 0,
    customerId: formData?.customerId || customerId,
  });
  const initialFormRef = useRef(dataForm);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { mutate: registerCustomer, isPending } = useMutation({
    mutationFn: (newItem: FormData) => post<IEntity>(entity.model, '', newItem),
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
    onError: (error: any) => {
      toast({
        title: `Erro ao cadastrar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => put<IEntity>(entity.model, `${formData?.id}`, updatedItem),
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
    onError: (error: any) => {
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

    if (formData) {
      updateCustomerMutation(dataForm);
    } else {
      registerCustomer(dataForm);
    }
  };

  // Buscas de valores para variaveis de formulário
  const { 
    data: roles, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listRoles`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-id', value: 'asc' },
      ];
      return get('roles', '', params);
    },
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <div>
        <Label htmlFor="name">Nome <span>*</span></Label>
          <Input
            id="name"
            name="name"
            placeholder="Digite nome do usuário"
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
            type="email"
            placeholder="Digite email do usuário"
            value={dataForm.email}
            onValueChange={handleChange}
            className="mt-1"
          />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Telefone <span>*</span></Label>
          <Input
            id="phone"
            name="phone"
            placeholder="(11) 99999-9999"
            format="phone"
            value={dataForm.phone}
            onValueChange={handleChange}
            className="mt-1"
          />
        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
      </div>
      <div>
        <Label htmlFor="profileId">Setor <span>*</span></Label>
        <Select 
          name="profileId"
          options={roles?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.profileId !== undefined ? String(dataForm.profileId) : ""}
          placeholder="Selecione a classificação"
        />
        {errors.profileId && <p className="text-red-500 text-sm">{errors.profileId}</p>}
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
      {(isPending || isPendingUpdate) && (
        <Loader title={formData ? `Atualizando ${entity.name}...` : `Registrando ${entity.name}...`} />
      )}
    </form>
  );
};

export default Form;
