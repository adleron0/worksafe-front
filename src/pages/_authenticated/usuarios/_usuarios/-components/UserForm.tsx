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
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface UserFormProps {
  formData?: IEntity;
  onlyPassword?: string;
  openSheet: (open: boolean) => void;
  self?: boolean;
}

const UserForm = ({ formData, onlyPassword, openSheet, self }: UserFormProps) => {
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
  }).refine((data) => {
    if (!formData && !data.password) {
      return false;
    }
    return true;
  }, {
    message: "A senha é obrigatória para novos usuários.",
    path: ["password"],
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
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(null); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
      queryClient.invalidateQueries({ queryKey: ["listCompanyUsers"] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar usuário",
        description: error.response?.data?.message || "Erro desconhecido.",
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
      queryClient.invalidateQueries({ queryKey: ["listCompanyUsers"] });
      queryClient.invalidateQueries({ queryKey: ["selfUser"] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
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
    const result = userSchema.safeParse(dataForm);

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
      updateUserMutation(dataForm);
    } else {
      registerUser(dataForm);
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
           <div className="h-60">
            <DropUpload
              setImage={setDataForm}
              EditPreview={preview}
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
