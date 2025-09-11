import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Input from '@/components/general-components/Input';
import Select from '@/components/general-components/Select';
import CalendarPicker from '@/components/general-components/Calendar';
import DropUpload from '@/components/general-components/DropUpload';
import { get, put } from '@/services/api-s';
import { useToast } from '@/hooks/use-toast';
import Loader from '@/components/general-components/Loader';
import { ApiError, Response } from '@/general-interfaces/api.interface';
import { ArrowLeft, Save, User } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/student/profile')({
  component: StudentProfile,
});

// Schema de validação
const profileSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos" }),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }).optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  birthDate: z.string().nullable().optional(),
  zipCode: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  addressNumber: z.number().nullable().optional(),
  complement: z.string().optional().or(z.literal('')),
  cityId: z.number().optional(),
  stateId: z.number().optional(),
  imageUrl: z.string().nullable().optional(),
  image: z.instanceof(File).nullable().or(z.literal(null)).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface StudentData {
  id: number;
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  occupation?: string;
  birthDate?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: number;
  complement?: string;
  cityId?: number;
  stateId?: number;
  imageUrl?: string;
  city?: { id: number; name: string };
  state?: { id: number; name: string; uf: string };
  customerId?: number;
  active?: boolean;
}

interface StudentResponse {
  total: number;
  rows: StudentData[];
}

function StudentProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dataForm, setDataForm] = useState<ProfileFormData>({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    occupation: '',
    birthDate: null,
    zipCode: '',
    address: '',
    addressNumber: null,
    complement: '',
    cityId: 0,
    stateId: 0,
    imageUrl: null,
    image: null,
  });
  
  const [preview, setPreview] = useState<string | null>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Buscar dados do aluno
  const { data: studentData, isLoading: isLoadingStudent } = useQuery<StudentData | null, ApiError>({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const response = await get<StudentResponse>('student');
      if (response && response.rows && response.rows.length > 0) {
        return response.rows[0];
      }
      return null;
    },
  });

  // Busca de estados
  const { 
      data: stateOptions, 
      isFetching: isFetchingStates,
    } = useQuery<Response | undefined, ApiError>({
      queryKey: [`listStates`],
      queryFn: async () => {
        const params = [
          { key: 'limit', value: 'all' },
          { key: 'order-name', value: 'asc' },
        ];
        return get('states', '', params);
      },
    });
  
    const { 
      data: citiesOptions,
      isFetching: isFetchingCities,
    } = useQuery<Response | undefined, ApiError>({
      queryKey: [`listCities`, dataForm.stateId],
      queryFn: async () => {
        const params = [
          { key: 'stateId', value: dataForm.stateId },
          { key: 'limit', value: 'all' },
          { key: 'order-name', value: 'asc' },
        ];
        return get('cities', '', params);
      },
      // Only run the query if stateId is valid (greater than 0)
      enabled: !!dataForm.stateId,
    });

  // Atualizar form quando dados do aluno carregarem
  useEffect(() => {
    if (studentData) {
      setDataForm({
        name: studentData.name || '',
        cpf: studentData.cpf || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        occupation: studentData.occupation || '',
        birthDate: studentData.birthDate ? new Date(studentData.birthDate).toISOString() : null,
        zipCode: studentData.zipCode || '',
        address: studentData.address || '',
        addressNumber: studentData.addressNumber || null,
        complement: studentData.complement || '',
        cityId: studentData.cityId || 0,
        stateId: studentData.stateId || 0,
        imageUrl: studentData.imageUrl || null,
        image: null,
      });
      
      if (studentData.imageUrl) {
        setPreview(studentData.imageUrl);
      }
    }
  }, [studentData, stateOptions, citiesOptions]);

  // Efeito para preview de imagem quando formData for alterado (para edição)
  useEffect(() => {
    if (studentData?.imageUrl && !preview) {
      setPreview(studentData.imageUrl);
    }
  }, [studentData, preview]);

  // Mutation para atualizar perfil
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // O put já converte para FormData automaticamente e lida com a imagem
      return put<StudentData>('student', studentData?.id?.toString() || '', data as unknown as StudentData);
    },
    onSuccess: () => {
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram atualizadas com sucesso.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.response?.data?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    },
  });

  const handleChange = (name: string, value: string | number | null) => {
    if (name === 'addressNumber' && value !== null) {
      setDataForm((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setDataForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleStateChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ 
        ...prev, 
        stateId: Number(value),
        cityId: 0 // Reset city when state changes
      }));
    }
  };

  const handleCityChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, cityId: Number(value) }));
    }
  };

  const handleDateChange = (_name: string, value: string | null) => {
    setDataForm(prev => ({ ...prev, birthDate: value }));
  };

  // Função para lidar com a mudança de imagem sem manipulação complexa
  // O DropUpload já lida com o preview internamente

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = profileSchema.safeParse(dataForm);

    if (!result.success) {
      const formattedErrors = result.error.format();
      const newErrors: { [key: string]: string } = {};
      for (const key in formattedErrors) {
        if (key !== "_errors" && formattedErrors[key as keyof typeof formattedErrors]) {
          const fieldError = formattedErrors[key as keyof typeof formattedErrors];
          if (typeof fieldError === 'object' && '_errors' in fieldError) {
            newErrors[key] = fieldError._errors[0] || "";
          }
        }
      }
      setErrors(newErrors);
      return;
    }

    setErrors({});
    updateProfile(dataForm);
  };

  if (isLoadingStudent) {
    return <Loader title="Carregando perfil..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/student' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize seus dados pessoais e de contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto de Perfil - No topo */}
            <div className="flex justify-start mb-12">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center w-50 h-50">
                  <Label htmlFor="image" className="mb-2">Foto de Perfil</Label>
                  <DropUpload
                    setImage={setDataForm}
                    EditPreview={preview}
                    acceptedFiles="image/*"
                    itemFormData="image"
                  />
                  {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Nome */}
              <div className="md:col-span-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nome completo"
                  value={dataForm.name}
                  onValueChange={handleChange}
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                  disabled // CPF não pode ser alterado
                  required
                />
                {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
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
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Profissão */}
              <div>
                <Label htmlFor="occupation">Profissão</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  placeholder="Ex: Técnico de Segurança"
                  value={dataForm.occupation || ""}
                  onValueChange={handleChange}
                />
                {errors.occupation && <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>}
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
                {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
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
                {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
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
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
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
                {errors.addressNumber && <p className="text-red-500 text-sm mt-1">{errors.addressNumber}</p>}
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
                {errors.complement && <p className="text-red-500 text-sm mt-1">{errors.complement}</p>}
              </div>

              {/* Estado */}
              <div>
                <Label htmlFor="stateId">Estado</Label>
                <Select
                  name="stateId"
                  disabled={isFetchingStates}
                  options={stateOptions?.rows || []}
                  state={dataForm.stateId ? String(dataForm.stateId) : ""}
                  onChange={handleStateChange}
                  placeholder="Selecione o estado"
                  value="id"
                  label="name"
                />
                {errors.stateId && <p className="text-red-500 text-sm mt-1">{errors.stateId}</p>}
              </div>

              {/* Cidade */}
              <div>
                <Label htmlFor="cityId">Cidade</Label>
                <Select
                  name="cityId"
                  disabled={isFetchingCities || !dataForm.stateId}
                  options={citiesOptions?.rows || []}
                  state={dataForm.cityId ? String(dataForm.cityId) : ""}
                  onChange={handleCityChange}
                  placeholder={dataForm.stateId ? "Selecione a cidade" : "Selecione um estado primeiro"}
                  value="id"
                  label="name"
                />
                {errors.cityId && <p className="text-red-500 text-sm mt-1">{errors.cityId}</p>}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/student' })}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}