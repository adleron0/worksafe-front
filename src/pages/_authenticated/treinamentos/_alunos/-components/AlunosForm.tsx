import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { IEntity } from "../-interfaces/entity.interface";
import Select from "@/components/general-components/Select";
import DropUpload from "@/components/general-components/DropUpload";
import CalendarPicker from "@/components/general-components/Calendar";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { useLoader } from "@/context/GeneralContext";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const AlunosForm = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema
  const traineeSchema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos" }),
    email: z.string().email({ message: "Email inválido" }).optional().or(z.literal('')),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }).optional().or(z.literal('')),
    birthDate: z.string().nullable().optional(),
    zipCode: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    addressNumber: z.number().nullable().optional(),
    complement: z.string().optional().or(z.literal('')),
    cityId: z.number().nullable().optional(),
    stateId: z.number().nullable().optional(),
    customerId: z.number().nullable().optional(),
    password: z.string().optional().or(
      z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" })
    ),
    imageUrl: z.string().nullable().optional(),
    image: z.instanceof(File).nullable().or(z.literal(null)).optional(),
    active: z.boolean(),
  }).refine((data) => {
    if (!formData && !data.password) {
      return false;
    }
    return true;
  }, {
    message: "A senha é obrigatória para novos alunos.",
    path: ["password"],
  });

  type TraineeFormData = z.infer<typeof traineeSchema>;

  const [dataForm, setDataForm] = useState<TraineeFormData>({
    name: formData?.name || "",
    cpf: formData?.cpf || "",
    email: formData?.email || "",
    phone: formData?.phone || "",
    birthDate: formData?.birthDate ? new Date(formData.birthDate).toISOString() : null,
    zipCode: formData?.zipCode || "",
    address: formData?.address || "",
    addressNumber: formData?.addressNumber || null,
    complement: formData?.complement || "",
    cityId: formData?.cityId || null,
    stateId: formData?.stateId || null,
    customerId: formData?.customerId || null,
    password: "",
    imageUrl: formData?.imageUrl || null,
    image: null,
    active: formData?.active ?? true,
  });
  
  const initialFormRef = useRef(dataForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Efeito para preview de imagem se necessário
  useEffect(() => {
    if (formData?.imageUrl) {
      setPreview(formData.imageUrl);
    }
  }, [formData]);

  const { mutate: createTrainee, isPending } = useMutation({
    mutationFn: (newTrainee: TraineeFormData) => {
      showLoader(`Criando ${entity.name}...`);
      // Remove null values and keep only defined values
      const cleanPayload = Object.entries({
        ...newTrainee,
        companyId: 1
      }).reduce((acc, [key, value]) => {
        if (value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      return post<IEntity>('trainee', '', cleanPayload);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} criado!`,
        description: `${entity.name} criado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao criar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateTrainee, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedTrainee: TraineeFormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      // Remove null values and keep only defined values
      const cleanPayload = Object.entries({
        ...updatedTrainee,
        companyId: 1
      }).reduce((acc, [key, value]) => {
        if (value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      return put<IEntity>('trainee', `${formData?.id}`, cleanPayload);
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

  const handleChange = (name: string, value: string | number | null) => {
    if (name === "addressNumber" && value !== null) {
      setDataForm((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setDataForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = traineeSchema.safeParse(dataForm);

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

    setErrors({});
    
    if (formData) {
      updateTrainee(dataForm);
    } else {
      createTrainee(dataForm);
    }
  };

  // Busca de estados
  const { data: stateOptions, isFetching: isFetchingStates } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listStates`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('states', '', params);
    },
  });

  // Busca de cidades baseado no estado selecionado
  const { data: cityOptions, isFetching: isFetchingCities } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCities`, dataForm.stateId],
    queryFn: async () => {
      if (!dataForm.stateId) return undefined;
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
        { key: 'stateId', value: dataForm.stateId },
      ];
      return get('cities', '', params);
    },
    enabled: !!dataForm.stateId,
  });

  // Busca de clientes/empresas
  const { data: customerOptions, isFetching: isFetchingCustomers } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCustomers`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('customer', '', params);
    },
  });

  const handleStateChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ 
        ...prev, 
        stateId: Number(value),
        cityId: null // Reset city when state changes
      }));
    }
  };

  const handleCityChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, cityId: Number(value) }));
    }
  };

  const handleCustomerChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, customerId: Number(value) }));
    }
  };

  const handleDateChange = (_name: string, value: string | null) => {
    setDataForm(prev => ({ ...prev, birthDate: value }));
  };

  const handleImageChange = (files: File[] | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setDataForm((prev) => ({ ...prev, image: file }));
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setDataForm((prev) => ({ ...prev, image: null }));
      setPreview(null);
    }
  };

  const statusOptions = [
    { id: "true", name: "Ativo" },
    { id: "false", name: "Inativo" }
  ];

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, active: value === "true" }));
    }
  };

  if (isPending || isPendingUpdate) {
    return <Loader title="Carregando..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Nome completo"
          value={dataForm.name}
          onValueChange={handleChange}
          required
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      {/* CPF */}
      <div>
        <Label htmlFor="cpf">CPF *</Label>
        <Input
          id="cpf"
          name="cpf"
          placeholder="000.000.000-00"
          format="cpf"
          value={dataForm.cpf}
          onValueChange={handleChange}
          required
        />
        {errors.cpf && <p className="text-red-500 text-sm">{errors.cpf}</p>}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="email@exemplo.com"
          value={dataForm.email || ""}
          onValueChange={handleChange}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      {/* Telefone */}
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="(00) 0 0000-0000"
          format="phone"
          value={dataForm.phone || ""}
          onValueChange={handleChange}
        />
        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
      </div>

      {/* Data de Nascimento */}
      <div>
        <Label htmlFor="birthDate">Data de Nascimento</Label>
        <CalendarPicker
          mode="single"
          name="birthDate"
          value={dataForm.birthDate}
          onValueChange={handleDateChange}
          placeholder="Selecione a data"
          numberOfMonths={1}
        />
        {errors.birthDate && <p className="text-red-500 text-sm">{errors.birthDate}</p>}
      </div>

      {/* Empresa/Cliente */}
      <div>
        <Label htmlFor="customerId">Empresa</Label>
        <Select
          name="customerId"
          disabled={isFetchingCustomers}
          options={customerOptions?.rows || []}
          state={dataForm.customerId?.toString() || ""}
          onChange={handleCustomerChange}
          placeholder="Selecione a empresa"
        />
        {errors.customerId && <p className="text-red-500 text-sm">{errors.customerId}</p>}
      </div>

      {/* CEP */}
      <div>
        <Label htmlFor="zipCode">CEP</Label>
        <Input
          id="zipCode"
          name="zipCode"
          placeholder="00000-000"
          format="cep"
          value={dataForm.zipCode || ""}
          onValueChange={handleChange}
        />
        {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode}</p>}
      </div>

      {/* Endereço */}
      <div>
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          name="address"
          placeholder="Rua, Avenida, etc..."
          value={dataForm.address || ""}
          onValueChange={handleChange}
        />
        {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
      </div>

      {/* Número */}
      <div>
        <Label htmlFor="addressNumber">Número</Label>
        <Input
          id="addressNumber"
          name="addressNumber"
          type="number"
          placeholder="Número do endereço"
          value={dataForm.addressNumber?.toString() || ""}
          onValueChange={handleChange}
        />
        {errors.addressNumber && <p className="text-red-500 text-sm">{errors.addressNumber}</p>}
      </div>

      {/* Complemento */}
      <div>
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          name="complement"
          placeholder="Apartamento, bloco, etc..."
          value={dataForm.complement || ""}
          onValueChange={handleChange}
        />
        {errors.complement && <p className="text-red-500 text-sm">{errors.complement}</p>}
      </div>

      {/* Estado */}
      <div>
        <Label htmlFor="stateId">Estado</Label>
        <Select
          name="stateId"
          disabled={isFetchingStates}
          options={stateOptions?.rows || []}
          state={dataForm.stateId?.toString() || ""}
          onChange={handleStateChange}
          placeholder="Selecione o estado"
        />
        {errors.stateId && <p className="text-red-500 text-sm">{errors.stateId}</p>}
      </div>

      {/* Cidade */}
      <div>
        <Label htmlFor="cityId">Cidade</Label>
        <Select
          name="cityId"
          disabled={isFetchingCities || !dataForm.stateId}
          options={cityOptions?.rows || []}
          state={dataForm.cityId?.toString() || ""}
          onChange={handleCityChange}
          placeholder={dataForm.stateId ? "Selecione a cidade" : "Selecione um estado primeiro"}
        />
        {errors.cityId && <p className="text-red-500 text-sm">{errors.cityId}</p>}
      </div>

      {/* Senha */}
      {!formData && (
        <div>
          <Label htmlFor="password">Senha *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={dataForm.password || ""}
            onValueChange={handleChange}
            required={!formData}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
        </div>
      )}

      {/* Status */}
      <div>
        <Label htmlFor="active">Status</Label>
        <Select
          name="active"
          options={statusOptions}
          state={dataForm.active.toString()}
          onChange={handleStatusChange}
          placeholder="Selecione o status"
        />
        {errors.active && <p className="text-red-500 text-sm">{errors.active}</p>}
      </div>

      {/* Imagem */}
      <div>
        <Label htmlFor="image">Foto</Label>
        <DropUpload
          setImage={(file: any) => handleImageChange(file ? [file] : null)}
          EditPreview={preview}
          acceptedFiles="image/*"
        />
        {preview && (
          <div className="mt-2">
            <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded" />
          </div>
        )}
        {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {formData ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => openSheet(false)}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default AlunosForm;