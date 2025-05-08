import React, { useState, useEffect, useRef } from "react";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
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
  const { showLoader, hideLoader } = useLoader();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    corporateName: z.string().min(2, { message: "Razão social deve ter pelo menos 2 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }),
    cnpj: z.string().length(14, { message: "CNPJ deve ter 14 dígitos" }),
    stateId: z.number().min(1, { message: "Estado deve ser selecionado" }),
    cityId: z.number().min(1, { message: "Cidade deve ser selecionada" }),
    neighborhood: z.string().optional(),
    zipcode: z.string().optional(),
    street: z.string().optional(),
    number: z.number().optional(),
    rankId: z.number().min(1, { message: "Classificação deve ser selecionada" }),
    description: z.string().optional(),
    complement: z.string().optional(),
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
    corporateName: formData?.corporateName || "",
    email: formData?.email || "",
    imageUrl: formData?.imageUrl || null,
    image: null,
    phone: formData?.phone || "",
    cnpj: formData?.cnpj || "",
    stateId: formData?.stateId || 0,
    cityId: formData?.cityId || 0,
    neighborhood: formData?.neighborhood || "",
    zipcode: formData?.zipcode || "",
    street: formData?.street || "",
    number: formData?.number || 0,
    rankId: formData?.rankId || 0,
    description: formData?.description || "",
    complement: formData?.complement || "",
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
    isFetching: isLoadingCities,
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
    // Only run the query if stateId is valid (greater than 0)
    enabled: dataForm.stateId > 0,
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
          placeholder="Digite nome do usuário"
          value={dataForm.name}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="corporateName">Razão Social <span>*</span></Label>
        <Input
          id="corporateName"
          name="corporateName"
          placeholder="Digite a razão social"
          value={dataForm.corporateName}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.corporateName && <p className="text-red-500 text-sm">{errors.corporateName}</p>}
      </div>
      <div>
        <Label htmlFor="cnpj">CNPJ <span>*</span></Label>
        <Input
          id="cnpj"
          name="cnpj"
          placeholder="00.000.000/0000-00"
          format="cnpj"
          value={dataForm.cnpj}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.cnpj && <p className="text-red-500 text-sm">{errors.cnpj}</p>}
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
        <Label htmlFor="rankId">Classificação <span>*</span></Label>
        <Select 
          name="rankId"
          options={ranks?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.rankId ? String(dataForm.rankId) : ""}
          placeholder="Selecione a classificação"
        />
      </div>
      
      <div>
        <Label htmlFor="stateId">Estado <span>*</span></Label>
        <Select 
          name="stateId"
          options={states?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.stateId ? String(dataForm.stateId) : ""}
          placeholder="Selecione o estado"
        />
        {errors.stateId && <p className="text-red-500 text-sm">{errors.stateId}</p>}
      </div>
      
      <div>
        <Label htmlFor="cityId">Cidade <span>*</span></Label>
        <Select 
          name="cityId"
          disabled={isLoadingCities}
          options={cities?.rows || []} 
          onChange={(name, value) => handleChange(name, Number(value))} 
          state={dataForm.cityId ? String(dataForm.cityId) : ""}
          placeholder="Selecione a cidade"
        />
        {errors.cityId && <p className="text-red-500 text-sm">{errors.cityId}</p>}
      </div>
      
      <div>
        <Label htmlFor="zipcode">CEP</Label>
        <Input
          id="zipcode"
          name="zipcode"
          placeholder="00000-000"
          format="cep"
          unformat={false}
          value={dataForm.zipcode}
          onValueChange={handleChange}
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
          onValueChange={handleChange}
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
          onValueChange={(name, value) => handleChange(name, Number(value))}
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
          onValueChange={handleChange}
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
          onValueChange={handleChange}
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
          onValueChange={handleChange}
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
