import React, { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { HelpCircle } from "lucide-react";

interface FormProps {
  formData?: IEntity | null;
  setOpenForm: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, setOpenForm, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema de validação
  const Schema = z.object({
    courseId: z.number().nullable().optional(),
    title: z.string().min(3, { message: "Título deve ter pelo menos 3 caracteres" }),
    description: z.string().optional(),
    version: z.string().optional(),
    isActive: z.boolean(),
    progressConfig: z.object({
      videoCompletePercent: z.number().min(0).max(100),
      textCompletePercent: z.number().min(0).max(100),
      requireSequential: z.boolean(),
      allowSkip: z.boolean(),
      isRequired: z.boolean(),
    }),
  });

  type FormData = z.infer<typeof Schema>;

  // Parse progressConfig se vier como string
  const parseProgressConfig = (config: string | IEntity['progressConfig'] | undefined) => {
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch {
        return {
          videoCompletePercent: 85,
          textCompletePercent: 90,
          requireSequential: true,
          allowSkip: false,
          isRequired: true,
        };
      }
    }
    return config || {
      videoCompletePercent: 85,
      textCompletePercent: 90,
      requireSequential: true,
      allowSkip: false,
      isRequired: true,
    };
  };

  const [dataForm, setDataForm] = useState<FormData>({
    courseId: formData?.courseId || null,
    title: formData?.title || '',
    description: formData?.description || '',
    version: formData?.version || '1.0.0',
    isActive: formData?.isActive !== undefined ? formData.isActive : true,
    progressConfig: parseProgressConfig(formData?.progressConfig),
  });

  const initialFormRef = useRef(dataForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showProgressConfig, setShowProgressConfig] = useState(false);

  const { mutate: registerEntity, isPending } = useMutation({
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
      setDataForm(initialFormRef.current);
      setOpenForm(false);
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

  const { mutate: updateEntityMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put<Partial<IEntity>>(entity.model, `${formData?.id}`, updatedItem);
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
      setOpenForm(false);
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

  // Buscar cursos disponíveis
  const { 
    data: courses, 
    isLoading: isLoadingCourses,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      return get('courses', '', params);
    },
  });

  const handleChange = (name: string, value: string | number | boolean | null) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo ao modificar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleProgressConfigChange = (key: string, value: number | boolean) => {
    setDataForm((prev) => ({
      ...prev,
      progressConfig: {
        ...prev.progressConfig,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    // Validação com Zod
    const result = Schema.safeParse(dataForm);
    
    if (!result.success) {
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
        }
      });
      
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // Preparar dados para envio
    const submissionData = {
      ...dataForm,
      courseId: dataForm.courseId || null,
      progressConfig: JSON.stringify(dataForm.progressConfig)
    } as unknown as FormData;

    if (formData) {
      updateEntityMutation(submissionData);
    } else {
      registerEntity(submissionData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      <div>
        <Label htmlFor="courseId">Curso (Opcional)</Label>
        <Select 
          name="courseId"
          isLoading={isLoadingCourses}
          options={courses?.rows || []}
          onChange={(name, value) => handleChange(name, value ? +value : null)} 
          state={dataForm.courseId ? String(dataForm.courseId) : ""}
          placeholder="Selecione o curso (opcional)"
          clearable={true}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Associe esta aula a um curso específico se desejar.
        </p>
        {errors.courseId && <p className="text-red-500 text-sm mt-1">{errors.courseId}</p>}
      </div>

      <div>
        <Label htmlFor="title">Título <span className="text-red-500">*</span></Label>
        <Input
          id="title"
          name="title"
          placeholder="Digite o título da aula online"
          value={dataForm.title}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Digite uma descrição para a aula online"
          value={dataForm.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="mt-1 min-h-[100px]"
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div>
        <Label htmlFor="version">Versão</Label>
        <Input
          id="version"
          name="version"
          placeholder="Ex: 1.0.0"
          value={dataForm.version}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.version && <p className="text-red-500 text-sm mt-1">{errors.version}</p>}
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label htmlFor="isActive" className="cursor-pointer">
              Aula Ativa
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Define se a aula está disponível para os alunos
            </p>
          </div>
          <Switch
            id="isActive"
            name="isActive"
            checked={dataForm.isActive}
            onCheckedChange={(checked) => handleChange('isActive', checked)}
          />
        </div>
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setShowProgressConfig(!showProgressConfig)}
        >
          <div className="flex flex-col">
            <Label className="cursor-pointer flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Configurações de Progresso
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Configure como o progresso do aluno será calculado
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowProgressConfig(!showProgressConfig);
            }}
          >
            {showProgressConfig ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        {showProgressConfig && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="videoCompletePercent">Vídeo - % Mínimo para Completar</Label>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                  {dataForm.progressConfig?.videoCompletePercent || 85}%
                </span>
              </div>
              <Slider
                id="videoCompletePercent"
                value={[dataForm.progressConfig?.videoCompletePercent || 85]}
                onValueChange={(value) => handleProgressConfigChange('videoCompletePercent', value[0])}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Porcentagem mínima do vídeo assistida para considerá-lo completo
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="textCompletePercent">Texto - % Mínimo para Completar</Label>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                  {dataForm.progressConfig?.textCompletePercent || 90}%
                </span>
              </div>
              <Slider
                id="textCompletePercent"
                value={[dataForm.progressConfig?.textCompletePercent || 90]}
                onValueChange={(value) => handleProgressConfigChange('textCompletePercent', value[0])}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Porcentagem mínima do texto lida para considerá-lo completo
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requireSequential" className="cursor-pointer">
                Exigir Ordem Sequencial
              </Label>
              <Switch
                id="requireSequential"
                checked={dataForm.progressConfig?.requireSequential || false}
                onCheckedChange={(checked) => handleProgressConfigChange('requireSequential', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allowSkip" className="cursor-pointer">
                Permitir Pular Etapas
              </Label>
              <Switch
                id="allowSkip"
                checked={dataForm.progressConfig?.allowSkip || false}
                onCheckedChange={(checked) => handleProgressConfigChange('allowSkip', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isRequired" className="cursor-pointer">
                Lição Obrigatória
              </Label>
              <Switch
                id="isRequired"
                checked={dataForm.progressConfig?.isRequired || true}
                onCheckedChange={(checked) => handleProgressConfigChange('isRequired', checked)}
              />
            </div>
          </div>
        )}
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