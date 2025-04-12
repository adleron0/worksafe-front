import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { useAuth } from "@/context/AuthContext";
import { formatCPF, unformatCPF } from "@/utils/cpf-mask";
import { formatPHONE } from "@/utils/phone-mask";
import { User } from "@/pages/Users/Interfaces/user.interface";
import Select from "@/components/general-components/Select";
import DropUpload from "@/components/general-components/DropUpload";

interface UserFormProps {
  formData?: User;
  onlyPassword?: string;
  openSheet: (open: boolean) => void;
  self?: boolean;
}

const UserForm = ({ formData, onlyPassword, openSheet, self }: UserFormProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); 
  const companyId = user?.companyId || 1;

  // Schema
  const userSchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }),
    cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos" }),
    password: z.string().optional().or(
      z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" })
    ),
    companyId: z.number(),
    roleId: z.number(),
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
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    companyId,
    roleId: 4,
    image: null,
    imageUrl: null,
  });

  const [preview, setPreview] = useState<string | null>(null); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Efeito para pré-preencher o formulário quando formData for fornecido
  useEffect(() => {
    if (formData) {
      setDataForm({
        name: formData.name || "",
        email: formData.email || "",
        phone: formData.phone || "",
        cpf: formData.cpf || "",
        password: "",
        companyId: formData.companyId || companyId,
        roleId: formData.roleId || 4,
        image: null,
        imageUrl: formData.imageUrl || null,
      });
      if (formData.imageUrl) {
        setPreview(formData.imageUrl);
      }
    }
  }, [formData, companyId]);

  // Se for formulário de criação, limpa os campos
  useEffect(() => {
    if (!formData) {
      setDataForm({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        password: "",
        companyId,
        roleId: 4,
        image: null,
        imageUrl: null,
      });
    }
  }, []);

  const { mutate: registerUser, isPending } = useMutation({
    mutationFn: (newUser: UserFormData) => post<User>('user', '', newUser),
    onSuccess: () => {
      toast({
        title: "Usuário registrado!",
        description: "Usuário criado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listCompanyUsers"] });
      // Limpa o formulário e fecha o Sheet
      setDataForm({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        password: "",
        companyId,
        roleId: 4,
        image: null,
        imageUrl: null,
      });
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
    mutationFn: (updatedUser: UserFormData) => put<User>('user', `${self ? 'self' : formData?.id}`, updatedUser),
    onSuccess: () => {
      toast({
        title: "Usuário atualizado!",
        description: "Usuário atualizado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listCompanyUsers"] });
      queryClient.invalidateQueries({ queryKey: ["selfUser"] });
      // Limpa o formulário e fecha o Sheet
      if (!self) {
        setDataForm({
          name: "",
          email: "",
          phone: "",
          cpf: "",
          password: "",
          companyId,
          roleId: 4,
          image: null,
          imageUrl: null,
        });
      }
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      {
        onlyPassword !== 'only' && (
          <>
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
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                placeholder="000.000.000-00"
                value={formatCPF(dataForm.cpf)}
                onChange={(e) => {
                  const rawValue = unformatCPF(e.target.value);
                  const sanitizedValue = rawValue.slice(0, 11);
                  handleChange(e.target.name, sanitizedValue);
                }}
                className="mt-1"
              />
              {errors.cpf && <p className="text-red-500 text-sm">{errors.cpf}</p>}
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
            {
              !self && 
              <div>
                <Label htmlFor="roleId">Função</Label>
                <Select 
                  name="roleId"
                  options={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Manager" },
                    { id: 3, name: "User" },
                  ]} 
                  onChange={(name, value) => handleChange(name, Number(value))} 
                  state={dataForm.roleId !== undefined ? String(dataForm.roleId) : ""}
                  placeholder="Selecione a função"
                />
              </div>
            }
          </>
        )
      }

      {
        onlyPassword == 'only' && (
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="text"
              placeholder="Digite nova senha do usuário"
              value={dataForm.password}
              onChange={(e) => handleChange(e.target.name, e.target.value)}
              className="mt-1"
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
        )
      }

{
        onlyPassword == 'both' && (
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="text"
              placeholder="Digite nova senha do usuário"
              value={dataForm.password}
              onChange={(e) => handleChange(e.target.name, e.target.value)}
              className="mt-1"
            />
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
