import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import Number from "@/components/general-components/Number";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import FaqGenerator from "@/components/general-components/FaqGenerator";
import SitePageFields, { SitePageValues } from "@/components/general-components/SitePageFields";
import IconPicker from "@/components/general-components/IconPicker";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import { Label } from "@/components/ui/label";
import { EntitySelect } from "@/components/general-components/EntitySelect";
import { Button } from "@/components/ui/button";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useFormDraft } from "@/hooks/use-form-draft";
import { z } from "zod";
// import { Switch } from "@/components/ui/switch";

interface FormProps {
  formData?: IEntity;
  /** Volta para a lista (tela própria de cadastro/edição). */
  close: () => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, close, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    hoursDuration: z.number().min(1, { message: "Duração deve ser maior que 0" }),
    yearOfValidation: z.number().optional(),
    flags: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, { message: "Grade teórica deve ter pelo menos 10 caracteres" }),
    gradePracticle: z.string().min(10, { message: "Grade prática deve ter pelo menos 10 caracteres" }),
    weekly: z.boolean(),
    weekDays: z.string().optional(),
    media: z.number().min(0, { message: "Média deve ser maior ou igual a 0" }).max(10, { message: "Média deve ser menor ou igual a 10" }),
    faq: z.array(
      z.object({
        question: z.string().min(3, { message: "Pergunta deve ter pelo menos 3 caracteres" }),
        answer: z.string().min(3, { message: "Resposta deve ter pelo menos 3 caracteres" })
      })
    ).optional(),
    slug: z.string().max(120).optional(),
    content: z.string().optional(),
    seoTitle: z.string().max(70, { message: "Título no Google com no máximo 70 caracteres" }).optional(),
    seoDescription: z.string().max(170, { message: "Descrição no Google com no máximo 170 caracteres" }).optional(),
    entityId: z.number().nullable().optional(),
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
    hoursDuration: formData?.hoursDuration || 1,
    yearOfValidation: formData?.yearOfValidation || undefined,
    flags: formData?.flags || "",
    icon: formData?.icon || "",
    color: formData?.color || "#000000",
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    weekly: formData?.weekly || false,
    weekDays: formData?.weekDays || "",
    media: formData?.media || 6,
    faq: FaqGenerator.parseFaqString(formData?.faq),
    slug: formData?.slug || "",
    content: formData?.content || "",
    seoTitle: formData?.seoTitle || "",
    seoDescription: formData?.seoDescription || "",
    entityId: formData?.entityId ?? null,
    imageUrl: formData?.imageUrl || "",
    image: formData?.image || null,
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(''); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Rascunho em localStorage (apenas criação)
  const { clearDraft } = useFormDraft({
    storageKey: formData ? null : "curso-draft-new",
    dataForm,
    setDataForm,
    excludeKeys: ["image"],
  });

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
      return post<IEntity>(entity.model, '', newItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} cadastrado!`,
        description: `Novo ${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['turma'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      // Força refetch de todos os dados
      queryClient.refetchQueries({ queryKey: [`list${entity.pluralName}`] });
      // Limpa o formulário e volta para a lista
      setDataForm(initialFormRef.current);
      clearDraft();
      close();
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
      return put<IEntity>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['turma'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      // Força refetch de todos os dados
      queryClient.refetchQueries({ queryKey: [`list${entity.pluralName}`] });
      // Limpa o formulário e volta para a lista
      setDataForm(initialFormRef.current);
      clearDraft();
      close();
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

  // ── Fechar com guarda de rascunho ─────────────────────────────────────────
  const isCreating = !formData;
  const hasChanges =
    JSON.stringify(dataForm) !== JSON.stringify(initialFormRef.current);
  const [backDialogOpen, setBackDialogOpen] = useState(false);

  const closeKeepDraft = () => close();
  const closeDiscardDraft = () => {
    clearDraft();
    close();
  };
  const handleCancelClick = () => {
    if (isCreating && hasChanges) {
      setBackDialogOpen(true);
    } else {
      closeDiscardDraft();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    // Zod schema validation
    const result = Schema.safeParse(dataForm);
    
    if (!result.success) {
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
          console.log("🚀 ~ result.error.errors.forEach ~ path:", path);
          console.log("🚀 ~ result.error.errors.forEach ~ error.message:", error.message);
        }
      });
      
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // Create a copy of the data form with faq converted to JSON string
    const submissionData = {
      ...dataForm,
      faq: JSON.stringify(dataForm.faq || [])
    } as unknown as FormData;

    if (formData) {
      updateCustomerMutation(submissionData);
    } else {
      registerCustomer(submissionData);
    }
  };


  const isSaving = isPending || isPendingUpdate;
  const errorHint = (name: string) => errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>;

  return (
    <form onSubmit={handleSubmit}>
      <FormPageGrid aside={<>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Imagem</p>
          <DropUpload preset="card"
            setImage={setDataForm}
            EditPreview={preview}
          />
        </section>

        <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
          <SummaryRow label="Curso">{dataForm.name || "—"}</SummaryRow>
          <SummaryRow label="Carga horária">{dataForm.hoursDuration ? `${dataForm.hoursDuration} h` : "—"}</SummaryRow>
          <SummaryRow label="Validade">{dataForm.yearOfValidation ? `${dataForm.yearOfValidation} ano(s)` : "Sem validade"}</SummaryRow>
          <SummaryRow label="Média">{dataForm.media}</SummaryRow>
        </section>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving
              ? formData
                ? "Atualizando..."
                : "Registrando..."
              : formData
              ? `Atualizar ${entity.name}`
              : `Registrar ${entity.name}`}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancelClick}>Cancelar</Button>
        </div>
      </>}>
        <FormSection title="Dados do curso" description="Nome, carga horária, validade do certificado e nota para aprovação.">
          <div>
            <Label htmlFor="name">Nome <span>*</span></Label>
            <Input
              id="name"
              name="name"
              placeholder={`Digite nome do ${entity.name}`}
              value={dataForm.name}
              onValueChange={handleChange}
              className="mt-1"
            />
            {errorHint("name")}
          </div>

          <EntitySelect kind="treinamento" clearable label="CNPJ que vende este curso" hint="As turmas do curso seguem este CNPJ."
            value={dataForm.entityId} onChange={(id) => setDataForm((prev) => ({ ...prev, entityId: id }))} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hoursDuration">Carga Horária (Horas)</Label>
              <Number
                id="hoursDuration"
                name="hoursDuration"
                min={1}
                max={1000}
                value={dataForm.hoursDuration}
                onValueChange={handleChange}
              />
              {errorHint("hoursDuration")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearOfValidation">Anos de Validade do Certificado</Label>
              <Number
                id="yearOfValidation"
                name="yearOfValidation"
                min={0}
                max={100}
                value={dataForm.yearOfValidation || 0}
                onValueChange={handleChange}
                placeholder="Ex: 2 anos"
              />
              {errorHint("yearOfValidation")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="media">Média para Aprovação <span>*</span></Label>
              <Number
                id="media"
                name="media"
                min={0}
                max={10}
                value={dataForm.media}
                onValueChange={handleChange}
                placeholder="Ex: 6"
              />
              <p className="text-xs text-muted-foreground font-medium">Nota mínima necessária para aprovação no exame do curso</p>
              {errorHint("media")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <IconPicker
                value={dataForm.icon}
                onChange={(iconName) => handleChange('icon', iconName)}
                label="Ícone do Curso"
                placeholder="Selecione um ícone para o curso"
              />
              {errorHint("icon")}
            </div>

            <div className="space-y-2">
              <ColorPickerInput
                value={dataForm.color}
                onChange={(color) => handleChange('color', color)}
                label="Cor do Curso"
              />
              {errorHint("color")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flags">Bandeiras do curso</Label>
            <p className="text-xs font-medium text-muted-foreground">Tags ou informações que identificam ou categorizam o curso</p>
            <TagInput
              value={dataForm.flags}
              onChange={(value) => handleChange('flags', value)}
              separator="#"
              placeholder="Digite uma bandeira e pressione Enter"
              className="mt-1"
            />
            {errorHint("flags")}
          </div>
        </FormSection>

        <FormSection title="Conteúdo" description="Descrição e grade curricular que aparecem no site e no certificado.">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              placeholder="Digite uma descrição"
              value={dataForm.description}
              onValueChange={handleChange}
              type="textArea"
              className="mt-1 h-40"
            />
            {errorHint("description")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="gradeTheory">Grade curricular teórica</Label>
              <p className="text-xs text-muted-foreground font-medium">Adicione os itens da grade curricular teórica</p>
              <TagInput
                value={dataForm.gradeTheory}
                onChange={(value) => handleChange('gradeTheory', value)}
                separator="#"
                placeholder="Digite um item da grade e pressione Enter"
                className="mt-1"
              />
              {errorHint("gradeTheory")}
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="gradePracticle">Grade curricular prática</Label>
              <p className="text-xs text-muted-foreground font-medium">Adicione os itens da grade curricular prática</p>
              <TagInput
                value={dataForm.gradePracticle}
                onChange={(value) => handleChange('gradePracticle', value)}
                separator="#"
                placeholder="Digite um item da grade e pressione Enter"
                className="mt-1"
              />
              {errorHint("gradePracticle")}
            </div>
          </div>

          {
            dataForm.weekly && (
              <div className="space-y-2">
                <Label htmlFor="weekDays">Dias da semana</Label>
                <p className="text-xs text-muted-foreground font-medium">Informe os dias da semana que o curso é oferecido</p>
                <Input
                  id="weekDays"
                  name="weekDays"
                  placeholder="ex: seg, ter e qua"
                  value={dataForm.weekDays}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errorHint("weekDays")}
              </div>
            )
          }
        </FormSection>

        {/* O bloco já traz título e moldura próprios: o cartão só troca a moldura. */}
        <section className="rounded-card border bg-card p-4 sm:p-5 [&>div:first-child]:mt-0 [&>div:first-child]:border-0 [&>div:first-child]:p-0">
          <SitePageFields
            values={dataForm as SitePageValues}
            onChange={(field, value) => setDataForm((prev) => ({ ...prev, [field]: value }))}
            name={dataForm.name}
            basePath="/cursos/"
          />
          {(errors.seoTitle || errors.seoDescription) && (
            <p className="text-red-500 text-sm mt-2">{errors.seoTitle || errors.seoDescription}</p>
          )}
        </section>

        <section className="rounded-card border bg-card p-4 sm:p-5">
          <FaqGenerator
            formData={dataForm}
            setFormData={setDataForm}
            fieldName="faq"
            errors={errors}
            setErrors={setErrors}
            title="Perguntas Frequentes (FAQ)"
            description="Adicione perguntas e respostas comuns sobre o curso"
          />
        </section>
      </FormPageGrid>

      {/* Dialog de saída com rascunho (só criação) */}
      {isCreating && (
        <AlertDialog open={backDialogOpen} onOpenChange={setBackDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem dados preenchidos. O que deseja fazer com eles?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => setBackDialogOpen(false)}
              >
                Continuar editando
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setBackDialogOpen(false);
                  closeDiscardDraft();
                }}
              >
                Descartar
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setBackDialogOpen(false);
                  closeKeepDraft();
                }}
              >
                Salvar rascunho
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  );
};

export default Form;
