import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface UserFormProps {
  formData?: IEntity;
  onlyPassword?: string;
  openSheet: (open: boolean) => void;
  self?: boolean;
  defaultIsSeller?: boolean;
}

const UserForm = ({ formData, onlyPassword, openSheet, self, defaultIsSeller = false }: UserFormProps) => {
  const queryClient = useQueryClient();

  // Schema
  const userSchema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }),
    cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos" }),
    password: z.string().optional().or(
      z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" })
    ),
    profileId: z.number().min(1, { message: "Função deve ser selecionada" }),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
    isSeller: z.boolean().optional(),
    birthDate: z.string().nullable().optional(),
    address: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional().refine(
      (val) => !val || val.length === 8 || val.length === 9,
      { message: "CEP deve ter 8 ou 9 caracteres" }
    ),
    pixType: z.string().optional(),
    pixKey: z.string().optional(),
    bankAccount: z.string().optional(),
  }).refine((data) => {
    if (!formData && !data.password) {
      return false;
    }
    return true;
  }, {
    message: "A senha é obrigatória para novos usuários.",
    path: ["password"],
  }).refine((data) => {
    // Se isSeller for true, os campos de endereço são obrigatórios
    if (data.isSeller) {
      if (!data.birthDate || data.birthDate === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Data de nascimento é obrigatória para vendedores.",
    path: ["birthDate"],
  }).refine((data) => {
    // Se isSeller for true, os campos de PIX são obrigatórios
    if (data.isSeller) {
      if (!data.pixType || data.pixType === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Tipo de chave PIX é obrigatório para vendedores.",
    path: ["pixType"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.pixKey || data.pixKey === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Chave PIX é obrigatória para vendedores.",
    path: ["pixKey"],
  }).refine((data) => {
    // Valida chave EVP com exatamente 32 caracteres
    if (data.isSeller && data.pixType === 'EVP' && data.pixKey) {
      if (data.pixKey.length !== 32) {
        return false;
      }
    }
    return true;
  }, {
    message: "Chave aleatória (EVP) deve ter exatamente 32 caracteres.",
    path: ["pixKey"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.address || data.address === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Endereço é obrigatório para vendedores.",
    path: ["address"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.addressNumber || data.addressNumber === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Número é obrigatório para vendedores.",
    path: ["addressNumber"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.neighborhood || data.neighborhood === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Bairro é obrigatório para vendedores.",
    path: ["neighborhood"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.city || data.city === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Cidade é obrigatória para vendedores.",
    path: ["city"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.state || data.state === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "Estado é obrigatório para vendedores.",
    path: ["state"],
  }).refine((data) => {
    if (data.isSeller) {
      if (!data.zipCode || data.zipCode === "") {
        return false;
      }
    }
    return true;
  }, {
    message: "CEP é obrigatório para vendedores.",
    path: ["zipCode"],
  });

  type UserFormData = z.infer<typeof userSchema>;

  const [dataForm, setDataForm] = useState<UserFormData>({
    name: formData?.name || "",
    email: formData?.email || "",
    phone: formData?.phone || "",
    cpf: formData?.cpf || "",
    password: formData?.password || "",
    profileId: formData?.profileId || 3,
    imageUrl: formData?.imageUrl || null,
    image: null,
    isSeller: formData?.isSeller ?? defaultIsSeller,
    birthDate: formData?.birthDate || null,
    address: formData?.address || "",
    addressNumber: formData?.addressNumber || "",
    addressComplement: formData?.addressComplement || "",
    neighborhood: formData?.neighborhood || "",
    city: formData?.city || "",
    state: formData?.state || "",
    zipCode: formData?.zipCode || "",
    pixType: (() => {
      if (formData?.bankAccount) {
        try {
          const parsed = JSON.parse(formData.bankAccount);
          return parsed.pixType || "CPF";
        } catch {
          return "CPF";
        }
      }
      return "CPF";
    })(),
    pixKey: (() => {
      if (formData?.bankAccount) {
        try {
          const parsed = JSON.parse(formData.bankAccount);
          return parsed.pixKey || "";
        } catch {
          return "";
        }
      }
      return "";
    })(),
    bankAccount: formData?.bankAccount || "",
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(null); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Efeito para preview de imagem se necessário
  useEffect(() => {
    if (formData) {
      if (formData.imageUrl) {
        setPreview(formData.imageUrl);
      }
    }
  }, []);

  const { mutate: registerUser, isPending } = useMutation({
    mutationFn: (newUser: UserFormData) => post<IEntity>('user', '', newUser),
    onSuccess: () => {
      toast({
        title: "Usuário registrado!",
        description: "Usuário criado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listUsuários"] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar usuário",
        description: (error as any).response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateUserMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedUser: UserFormData) => put<IEntity>('user', `${self ? 'self' : formData?.id}`, updatedUser),
    onSuccess: () => {
      toast({
        title: "Usuário atualizado!",
        description: "Usuário atualizado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listUsuários"] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: (error as any).response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | number | boolean | null) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));

    // Busca automática de endereço quando o CEP é digitado
    if (name === 'zipCode' && typeof value === 'string') {
      const cleanedCep = value.replace(/\D/g, '');
      if (cleanedCep.length === 8) {
        fetchAddressByCep(cleanedCep);
      }
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setDataForm((prev) => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));

        // Limpa os erros dos campos preenchidos automaticamente
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.address;
          delete newErrors.neighborhood;
          delete newErrors.city;
          delete newErrors.state;
          return newErrors;
        });

        toast({
          title: "CEP encontrado!",
          description: "Endereço preenchido automaticamente.",
          variant: "success",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = userSchema.safeParse(dataForm);

    if (!result.success) {
      const formattedErrors: Record<string, any> = result.error.format();
      const newErrors: { [key: string]: string } = {};
      for (const key in formattedErrors) {
        if (key !== "_errors") {
          newErrors[key] = formattedErrors[key]?._errors[0] || "";
        }
      }
      setErrors(newErrors);
      return;
    }

    // Prepara os dados para envio
    const dataToSend: any = { ...dataForm };

    // Converte pixType e pixKey para bankAccount JSON string
    if (dataForm.pixType && dataForm.pixKey) {
      dataToSend.bankAccount = JSON.stringify({
        pixType: dataForm.pixType,
        pixKey: dataForm.pixKey
      });
    }

    // Remove os campos individuais do PIX
    delete dataToSend.pixType;
    delete dataToSend.pixKey;

    if (!onlyPassword) delete dataToSend.password;

    if (formData) {
      updateUserMutation(dataToSend);
    } else {
      registerUser(dataToSend);
    }
  };

  // Buscas de valores para variaveis de formulário
  const { 
    data: profiles, 
    isFetching: isFetchingProfiles,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listPerfis`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-id', value: 'asc' },
      ];
      return get('profiles', '', params);
    },
    enabled: !self,
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      {
        onlyPassword !== 'only' && (
          <>
            <div className="h-60 mb-2">
              <DropUpload
                setImage={setDataForm}
                EditPreview={preview}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-primary dark:border-gray-700">
              <Label htmlFor="isSeller" className="text-base cursor-pointer font-medium">É vendedor</Label>
              <Switch
                id="isSeller"
                checked={dataForm.isSeller || false}
                onCheckedChange={(checked) => handleChange('isSeller', checked)}
              />
            </div>
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
              <Label htmlFor="cpf">CPF <span>*</span></Label>
              <Input
                id="cpf"
                name="cpf"
                placeholder="000.000.000-00"
                format="cpf"
                value={dataForm.cpf}
                onValueChange={handleChange}
                className="mt-1"
              />
              {errors.cpf && <p className="text-red-500 text-sm">{errors.cpf}</p>}
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
              <Label htmlFor="birthDate">Data de Nascimento {dataForm.isSeller && <span>*</span>}</Label>
              <CalendarPicker
                mode="natural"
                name="birthDate"
                value={dataForm.birthDate}
                onValueChange={handleChange}
                placeholder="DD/MM/AAAA"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
              {errors.birthDate && <p className="text-red-500 text-sm">{errors.birthDate}</p>}
            </div>
            <div>
              <Label htmlFor="zipCode">
                CEP {dataForm.isSeller && <span>*</span>}
                {isLoadingCep && <span className="ml-2 text-xs text-muted-foreground">(buscando...)</span>}
              </Label>
              <Input
                id="zipCode"
                name="zipCode"
                placeholder="00000-000"
                format="cep"
                value={dataForm.zipCode}
                onValueChange={handleChange}
                className="mt-1"
                disabled={isLoadingCep}
              />
              {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode}</p>}
            </div>
            <div>
              <Label htmlFor="address">Endereço {dataForm.isSeller && <span>*</span>}</Label>
              <Input
                id="address"
                name="address"
                placeholder="Digite o endereço"
                value={dataForm.address}
                onValueChange={handleChange}
                className="mt-1"
              />
              {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="addressNumber">Número {dataForm.isSeller && <span>*</span>}</Label>
                <Input
                  id="addressNumber"
                  name="addressNumber"
                  placeholder="Número"
                  value={dataForm.addressNumber}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.addressNumber && <p className="text-red-500 text-sm">{errors.addressNumber}</p>}
              </div>
              <div>
                <Label htmlFor="addressComplement">Complemento</Label>
                <Input
                  id="addressComplement"
                  name="addressComplement"
                  placeholder="Apto, sala, etc"
                  value={dataForm.addressComplement}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.addressComplement && <p className="text-red-500 text-sm">{errors.addressComplement}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro {dataForm.isSeller && <span>*</span>}</Label>
              <Input
                id="neighborhood"
                name="neighborhood"
                placeholder="Digite o bairro"
                value={dataForm.neighborhood}
                onValueChange={handleChange}
                className="mt-1"
              />
              {errors.neighborhood && <p className="text-red-500 text-sm">{errors.neighborhood}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="city">Cidade {dataForm.isSeller && <span>*</span>}</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Digite a cidade"
                  value={dataForm.city}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="state">Estado {dataForm.isSeller && <span>*</span>}</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="UF"
                  maxLength={2}
                  value={dataForm.state}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.state && <p className="text-red-500 text-sm">{errors.state}</p>}
              </div>
            </div>
            {dataForm.isSeller && (
              <>
                <div>
                  <Label htmlFor="pixType">Tipo de Chave PIX <span>*</span></Label>
                  <Select
                    name="pixType"
                    options={[
                      { id: 'CPF', name: 'CPF' },
                      { id: 'CNPJ', name: 'CNPJ' },
                      { id: 'EMAIL', name: 'E-mail' },
                      { id: 'PHONE', name: 'Telefone' },
                      { id: 'EVP', name: 'Chave Aleatória (EVP)' },
                    ]}
                    onChange={(name, value) => handleChange(name, typeof value === 'string' ? value : value[0])}
                    state={dataForm.pixType || "CPF"}
                    placeholder="Selecione o tipo de chave"
                  />
                  {errors.pixType && <p className="text-red-500 text-sm">{errors.pixType}</p>}
                </div>
                <div>
                  <Label htmlFor="pixKey">Chave PIX <span>*</span></Label>
                  <Input
                    id="pixKey"
                    name="pixKey"
                    placeholder={
                      dataForm.pixType === 'CPF' ? '000.000.000-00' :
                      dataForm.pixType === 'CNPJ' ? '00.000.000/0000-00' :
                      dataForm.pixType === 'EMAIL' ? 'email@exemplo.com' :
                      dataForm.pixType === 'PHONE' ? '(00) 00000-0000' :
                      dataForm.pixType === 'EVP' ? 'Chave aleatória de 32 caracteres' :
                      'Digite a chave PIX'
                    }
                    format={
                      dataForm.pixType === 'CPF' ? 'cpf' :
                      dataForm.pixType === 'CNPJ' ? 'cnpj' :
                      dataForm.pixType === 'PHONE' ? 'phone' :
                      'none'
                    }
                    type={dataForm.pixType === 'EMAIL' ? 'email' : 'text'}
                    value={dataForm.pixKey}
                    onValueChange={handleChange}
                    className="mt-1"
                    disabled={!dataForm.pixType}
                    maxLength={dataForm.pixType === 'EVP' ? 32 : undefined}
                    icon={
                      dataForm.pixType === 'CPF' ? 'user' :
                      dataForm.pixType === 'CNPJ' ? 'building' :
                      dataForm.pixType === 'EMAIL' ? 'mail' :
                      dataForm.pixType === 'PHONE' ? 'phone' :
                      dataForm.pixType === 'EVP' ? 'key' :
                      dataForm.pixType ? 'wallet' : undefined
                    }
                    iconPosition="left"
                  />
                  {errors.pixKey && <p className="text-red-500 text-sm">{errors.pixKey}</p>}
                  {dataForm.pixType === 'EVP' && dataForm.pixKey && (
                    <span className={`text-xs ${dataForm.pixKey.length === 32 ? 'text-green-500' : 'text-amber-500'}`}>
                      {dataForm.pixKey.length}/32 caracteres
                    </span>
                  )}
                </div>
              </>
            )}
            {
              !self &&
              <div>
                <Label htmlFor="profileId">Função <span>*</span></Label>
                <Select
                  name="profileId"
                  disabled={isFetchingProfiles}
                  options={profiles?.rows || []}
                  onChange={(name, value) => handleChange(name, Number(value))}
                  state={dataForm.profileId !== undefined ? String(dataForm.profileId) : ""}
                  placeholder="Selecione a função"
                />
                {errors.profileId && <p className="text-red-500 text-sm">{errors.profileId}</p>}
              </div>
            }
          </>
        )
      }

      {
        onlyPassword == 'only' && (
          <div>
            <Label htmlFor="password">Senha <span>*</span></Label>
            <Input
              id="password"
              name="password"
              type="text"
              placeholder="Digite nova senha do usuário"
              value={dataForm.password}
              onValueChange={handleChange}
              className="mt-1"
            />
            {
              dataForm.password && (
                <span className={`${dataForm.password?.length >= 6 ? "text-green-500" : "text-red-500"} text-xs`}>* Mínimo 6 caracteres</span>
              )
            }
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
        )
      }

{
        onlyPassword == 'both' && (
          <div>
            <Label htmlFor="password">Senha <span>*</span></Label>
            <Input
              id="password"
              name="password"
              type="text"
              placeholder="Digite nova senha do usuário"
              value={dataForm.password}
              onValueChange={handleChange}
              className="mt-1"
            />
            {
              dataForm.password && (
                <span className={`${dataForm.password?.length >= 6 ? "text-green-500" : "text-red-500"} text-xs`}>* Mínimo 6 caracteres</span>
              )
            }
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
        )
      }

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
          ? "Atualizar Usuário"
          : "Registrar Usuário"}
      </Button>
      {(isPending || isPendingUpdate) && (
        <Loader title={formData ? "Atualizando Usuário..." : "Registrando Usuário..."} />
      )}
    </form>
  );
};

export default UserForm;
