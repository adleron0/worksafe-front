import React, { useState, useEffect, useRef } from "react";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { useAuth } from "@/context/AuthContext";
import { formatCNPJ, unformatCNPJ } from "@/utils/cpnj-mask";
import { formatPHONE } from "@/utils/phone-mask";
import { formatCEP } from "@/utils/cep-mask";
import { Customer as EntityInterface } from "@/pages/Customers/interfaces/customer.interface";
import DropUpload from "@/components/general-components/DropUpload";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface FormProps {
  formData?: EntityInterface;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); 
  const companyId = user?.companyId || 1;

  // Schema
  const Schema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    corporateName: z.string().min(2, { message: "Razão social deve ter pelo menos 2 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }),
    cnpj: z.string().length(14, { message: "CNPJ deve ter 14 dígitos" }),
    stateId: z.number(),
    cityId: z.number(),
    neighborhood: z.string().optional(),
    zipcode: z.string().optional(),
    street: z.string().optional(),
    number: z.number().optional(),
    rankId: z.number().optional(),
    description: z.string().optional(),
    complement: z.string().optional(),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
    companyId: z.number(),
  })

  type FormData = z.infer<typeof Schema>;

  const [dataForm, setDataForm] = useState<FormData>({
    name: "",
    corporateName: "",
    companyId,
    email: "",
    imageUrl: null,
    image: null,
    phone: "",
    cnpj: "",
    stateId: 0,
    cityId: 0,
    neighborhood: "",
    zipcode: "",
    street: "",
    number: 0,
    rankId: 0,
    description: "",
    complement: "",
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(null); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Efeito para pré-preencher o formulário quando formData for fornecido
  useEffect(() => {
    if (formData) {
      Object.keys(formData).forEach((key) => {
        setDataForm((prev) => ({ ...prev, [key]: formData[key as keyof typeof formData] }));
      });
      if (formData.imageUrl) {
        setPreview(formData.imageUrl);
      }
    }
  }, [formData, companyId]);

  // Se for formulário de criação, limpa os campos
  useEffect(() => {
    if (!formData) {
      setDataForm(initialFormRef.current);
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
    onError: (error: any) => {
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
    data: ranks, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listRanks`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-id', value: 'asc' },
      ];
      return get('ranks', '', params);
    },
  });

  const { 
    data: states, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listStates`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('states', '', params);
    },
  });

  const { 
    data: cities, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCities`, dataForm.stateId],
    queryFn: async () => {
      const params = [
        { key: 'stateId', value: dataForm.stateId },
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('cities', '', params);
    },
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <DropUpload
        setImage={setDataForm}
        EditPreview={preview}
      />
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          placeholder="Digite nome do usuário"
          value={dataForm.name}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="corporateName">Razão Social</Label>
        <Input
          id="corporateName"
          name="corporateName"
          placeholder="Digite a razão social"
          value={dataForm.corporateName}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
        {errors.corporateName && <p className="text-red-500 text-sm">{errors.corporateName}</p>}
      </div>
      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          name="cnpj"
          placeholder="00.000.000/0000-00"
          value={formatCNPJ(dataForm.cnpj)}
          onChange={(e) => {
            const rawValue = unformatCNPJ(e.target.value);
            const sanitizedValue = rawValue.slice(0, 14);
            handleChange(e.target.name, sanitizedValue);
          }}
          className="mt-1"
        />
        {errors.cnpj && <p className="text-red-500 text-sm">{errors.cnpj}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Digite email do usuário"
          value={dataForm.email}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="(11) 99999-9999"
          value={formatPHONE(dataForm.phone)}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
      </div>
      <div>
        <Label htmlFor="rankId">Classificação</Label>
        <Select 
          name="rankId"
          options={ranks?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.rankId !== undefined ? String(dataForm.rankId) : ""}
          placeholder="Selecione a classificação"
        />
      </div>
      
      <div>
        <Label htmlFor="stateId">Estado</Label>
        <Select 
          name="stateId"
          options={states?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.stateId !== undefined ? String(dataForm.stateId) : ""}
          placeholder="Selecione o estado"
        />
      </div>
      
      <div>
        <Label htmlFor="cityId">Cidade</Label>
        <Select 
          name="cityId"
          options={cities?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.cityId !== undefined ? String(dataForm.cityId) : ""}
          placeholder="Selecione a cidade"
        />
      </div>
      
      <div>
        <Label htmlFor="zipcode">CEP</Label>
        <Input
          id="zipcode"
          name="zipcode"
          placeholder="00000-000"
          value={formatCEP(dataForm.zipcode)}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, ''); // só números
            handleChange(e.target.name, formatCEP(raw));
          }}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="street">Rua</Label>
        <Input
          id="street"
          name="street"
          placeholder="Digite o nome da rua"
          value={dataForm.street}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="number">Número</Label>
        <Input
          id="number"
          name="number"
          type="number"
          placeholder="Digite o número"
          value={dataForm.number || ""}
          onChange={(e) => handleChange(e.target.name, Number(e.target.value))}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input
          id="neighborhood"
          name="neighborhood"
          placeholder="Digite o bairro"
          value={dataForm.neighborhood}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          name="complement"
          placeholder="Digite o complemento"
          value={dataForm.complement}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite uma descrição"
          value={dataForm.description}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
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
      {(isPending || isPendingUpdate) && (
        <Loader title={formData ? `Atualizando ${entity.name}...` : `Registrando ${entity.name}...`} />
      )}
    </form>
  );
};

export default Form;
