import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Import dos steps
import Step1BasicInfo from "./steps/Step1BasicInfo";
import Step2Period from "./steps/Step2Period";
import Step3Subscriptions from "./steps/Step3Subscriptions";
import Step4Payment from "./steps/Step4Payment";
import Step5Content from "./steps/Step5Content";
import Step6Media from "./steps/Step6Media";
import Step7Evaluation from "./steps/Step7Evaluation";

// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";
import FaqGenerator from "@/components/general-components/FaqGenerator";

interface FormProps {
  formData?: IEntity;
  onClose: () => void;
  entity: IDefaultEntity;
}

// Schema de validação (mesmo do form original)
const Schema = z
  .object({
    name: z
      .string()
      .min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    imageUrl: z.string().nullable(),
    customerId: z.number().optional().nullable(),
    courseId: z.number().min(1, { message: "Id do curso é obrigatório" }),
    certificateId: z.number().optional().nullable(),
    price: z.number().min(0, { message: "Valor de venda é obrigatório" }),
    discountPrice: z.number(),
    dividedIn: z.number().min(1).optional().nullable(),
    hoursDuration: z.number().min(1, { message: "Duração é obrigatório" }),
    daysDuration: z
      .number()
      .min(1, { message: "Dias de duração é obrigatório" }),
    openClass: z.boolean(),
    gifts: z.string().optional().nullable(),
    description: z
      .string()
      .min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, {
      message: "Grade teórica deve ter pelo menos 10 caracteres",
    }),
    gradePracticle: z.string().nullable().optional(),
    videoUrl: z
      .string()
      .optional()
      .nullable()
      .refine(
        (value) => {
          if (!value || value.length <= 1) return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        {
          message: "URL do vídeo deve ser uma URL válida",
        },
      ),
    videoTitle: z.string().optional(),
    videoSubtitle: z.string().optional(),
    videoDescription: z.string().optional(),
    active: z.boolean().optional().nullable(),
    faq: z
      .array(
        z.object({
          question: z
            .string()
            .min(3, { message: "Pergunta deve ter pelo menos 3 caracteres" }),
          answer: z
            .string()
            .min(3, { message: "Resposta deve ter pelo menos 3 caracteres" }),
        }),
      )
      .optional(),
    initialDate: z.string().optional().nullable(),
    finalDate: z.string().optional().nullable(),
    landingPagesDates: z.string().optional().nullable(),
    allowExam: z.boolean().optional(),
    allowReview: z.boolean().optional(),
    allowCheckout: z.boolean().optional(),
    classCode: z.string().optional().nullable(),
    minimumQuorum: z.number().optional(),
    maxSubscriptions: z.number().optional(),
    paymentMethods: z
      .array(z.enum(["cartaoCredito", "boleto", "pix"]))
      .optional(),
    image: z
      .instanceof(File)
      .nullable()
      .or(z.literal(null))
      .refine((value) => value === null || value instanceof File, {
        message: "Imagem deve ser um arquivo ou nulo.",
      }),
    whyUs: z.string().optional(),
    periodClass: z.string().optional(),
    allowSubscriptions: z.boolean().optional(),
    periodSubscriptionsType: z.string().optional().nullable(),
    periodSubscriptionsInitialDate: z.string().optional().nullable(),
    periodSubscriptionsFinalDate: z.string().optional().nullable(),
    unlimitedSubscriptions: z.boolean().optional(),
    hasOnlineCourse: z.boolean().optional(),
    onlineCourseModelId: z.number().optional().nullable(),
    address: z.string().optional().nullable(),
    addressNumber: z.string().optional().nullable(),
    addressComplement: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zipCode: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.allowExam &&
        (!data.classCode || data.classCode.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Código de acesso é obrigatório quando a turma tem prova",
      path: ["classCode"],
    },
  )
  .refine(
    (data) => {
      if (
        data.periodClass === "LIMITED" &&
        (!data.initialDate || data.initialDate.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Data de início é obrigatória quando o período é limitado",
      path: ["initialDate"],
    },
  )
  .refine(
    (data) => {
      if (
        data.periodClass === "LIMITED" &&
        (!data.finalDate || data.finalDate.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Data de fim é obrigatória quando o período é limitado",
      path: ["finalDate"],
    },
  )
  .refine(
    (data) => {
      if (
        data.periodClass === "LIMITED" &&
        (!data.landingPagesDates || data.landingPagesDates.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Datas de divulgação são obrigatórias quando o período é limitado",
      path: ["landingPagesDates"],
    },
  )
  .refine(
    (data) => {
      if (
        !data.unlimitedSubscriptions &&
        (!data.maxSubscriptions || data.maxSubscriptions <= 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Máximo de inscrições deve ser maior que 0 quando não for ilimitado",
      path: ["maxSubscriptions"],
    },
  )
  .refine(
    (data) => {
      if (
        data.allowSubscriptions &&
        data.periodSubscriptionsType === "LIMITED"
      ) {
        if (
          !data.periodSubscriptionsInitialDate ||
          data.periodSubscriptionsInitialDate.trim() === ""
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "Data inicial do período é obrigatória quando o tipo é por período",
      path: ["periodSubscriptionsInitialDate"],
    },
  )
  .refine(
    (data) => {
      if (
        data.allowSubscriptions &&
        data.periodSubscriptionsType === "LIMITED"
      ) {
        if (
          !data.periodSubscriptionsFinalDate ||
          data.periodSubscriptionsFinalDate.trim() === ""
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "Data final do período é obrigatória quando o tipo é por período",
      path: ["periodSubscriptionsFinalDate"],
    },
  )
  .refine(
    (data) => {
      if (
        data.hasOnlineCourse &&
        (!data.onlineCourseModelId || data.onlineCourseModelId <= 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Modelo de curso online é obrigatório quando habilitado",
      path: ["onlineCourseModelId"],
    },
  );

export type FormData = z.infer<typeof Schema>;

// Função para gerar hash alfanumérico de 4 dígitos
const generateClassCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const TurmasFormSteps = ({ formData, onClose, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
    imageUrl: formData?.imageUrl || "",
    customerId: formData?.customerId || null,
    courseId: formData?.courseId || 0,
    certificateId: (formData as any)?.certificateId || null,
    price: Number(formData?.price) || 0,
    discountPrice: Number((formData as any)?.discountPrice) || 0,
    dividedIn: (formData as any)?.dividedIn || null,
    hoursDuration: formData?.hoursDuration || 1,
    daysDuration: (formData as any)?.daysDuration || 1,
    openClass: formData?.openClass ?? true,
    gifts: formData?.gifts || "",
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    videoUrl: formData?.videoUrl || "",
    videoTitle: formData?.videoTitle || "",
    videoSubtitle: formData?.videoSubtitle || "",
    videoDescription: formData?.videoDescription || "",
    active: formData?.active ?? true,
    faq: FaqGenerator.parseFaqString(formData?.faq),
    initialDate: formData?.initialDate || null,
    finalDate: formData?.finalDate || null,
    landingPagesDates: formData?.landingPagesDates || "",
    allowExam: formData?.allowExam ?? true,
    allowReview: formData?.allowReview,
    allowCheckout: (formData as any)?.allowCheckout ?? false,
    classCode:
      formData?.classCode ||
      (!formData
        ? generateClassCode()
        : formData?.classCode || generateClassCode()),
    minimumQuorum: formData?.minimumQuorum || 0,
    maxSubscriptions: formData?.maxSubscriptions || 0,
    paymentMethods: (formData as any)?.paymentMethods || [
      "cartaoCredito",
      "boleto",
      "pix",
    ],
    image: formData?.image || null,
    whyUs:
      (formData as any)?.whyUs ||
      JSON.stringify({
        active: true,
        title: "Por que nos escolher?",
        subtitle:
          "Somos referência em nossa área de atuação, com anos de mercado.",
        cards: [
          {
            icon: "award",
            title: "Certificação Reconhecida",
            description: "Certificados válidos em todo território nacional",
          },
          {
            icon: "users",
            title: "Turmas Reduzidas",
            description: "Atenção personalizada para cada aluno",
          },
          {
            icon: "shield",
            title: "Instrutores Especializados",
            description: "Profissionais com vasta experiência no mercado",
          },
          {
            icon: "clock",
            title: "Horários Flexíveis",
            description: "Turmas em diversos horários para sua conveniência",
          },
        ],
      }),
    periodClass: (formData as any)?.periodClass || "LIMITED",
    allowSubscriptions: (formData as any)?.allowSubscriptions ?? true,
    periodSubscriptionsType:
      (formData as any)?.periodSubscriptionsType || "LIMITED",
    periodSubscriptionsInitialDate:
      (formData as any)?.periodSubscriptionsInitialDate || null,
    periodSubscriptionsFinalDate:
      (formData as any)?.periodSubscriptionsFinalDate || null,
    unlimitedSubscriptions: (formData as any)?.unlimitedSubscriptions || false,
    hasOnlineCourse: (formData as any)?.hasOnlineCourse || false,
    onlineCourseModelId: (formData as any)?.onlineCourseModelId || null,
    address: (formData as any)?.address || "",
    addressNumber: (formData as any)?.addressNumber || "",
    addressComplement: (formData as any)?.addressComplement || "",
    neighborhood: (formData as any)?.neighborhood || "",
    city: (formData as any)?.city || "",
    state: (formData as any)?.state || "",
    zipCode: (formData as any)?.zipCode || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [stepErrors, setStepErrors] = useState<{ [key: number]: boolean }>({});

  // Valida todos os steps ao carregar (apenas para marcar visualmente os com erro)
  useEffect(() => {
    const validateAllSteps = () => {
      const stepsWithErrors: { [key: number]: boolean } = {};
      for (let i = 1; i <= totalSteps; i++) {
        let hasError = false;

        // Reutiliza a lógica de validação mas sem mostrar toast
        switch (i) {
          case 1:
            if (!dataForm.courseId || dataForm.courseId === 0) hasError = true;
            if (!dataForm.name || dataForm.name.trim().length < 3) hasError = true;
            if (dataForm.hasOnlineCourse && (!dataForm.onlineCourseModelId || dataForm.onlineCourseModelId <= 0)) hasError = true;
            break;
          case 2:
            if (!dataForm.hoursDuration || dataForm.hoursDuration < 1) hasError = true;
            if (!dataForm.daysDuration || dataForm.daysDuration < 1) hasError = true;
            if (dataForm.periodClass === "LIMITED") {
              if (!dataForm.initialDate) hasError = true;
              if (!dataForm.finalDate) hasError = true;
              if (!dataForm.landingPagesDates || dataForm.landingPagesDates.trim() === "") hasError = true;
            }
            break;
          case 3:
            if (dataForm.allowSubscriptions) {
              if (dataForm.periodSubscriptionsType === "LIMITED") {
                if (!dataForm.periodSubscriptionsInitialDate) hasError = true;
                if (!dataForm.periodSubscriptionsFinalDate) hasError = true;
              }
              if (!dataForm.unlimitedSubscriptions && (!dataForm.maxSubscriptions || dataForm.maxSubscriptions <= 0)) hasError = true;
            }
            break;
          case 5:
            if (!dataForm.description || dataForm.description.length < 10) hasError = true;
            if (!dataForm.gradeTheory || dataForm.gradeTheory.length < 10) hasError = true;
            break;
          case 7:
            if (dataForm.allowExam && (!dataForm.classCode || dataForm.classCode.trim() === "")) hasError = true;
            break;
        }
        stepsWithErrors[i] = hasError;
      }
      setStepErrors(stepsWithErrors);
    };

    validateAllSteps();
  }, [dataForm, totalSteps]);

  // Mutations
  const { mutate: registerCustomer, isPending } = useMutation({
    mutationFn: (newItem: FormData) => {
      showLoader(`Registrando ${entity.name}...`);
      return post<IEntity>(entity.model, "", newItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} cadastrado!`,
        description: `Novo ${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      onClose();
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

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } =
    useMutation({
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
        queryClient.invalidateQueries({
          queryKey: [`list${entity.pluralName}`],
        });
        onClose();
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

  // Validação por step
  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    switch (step) {
      case 1: // Informações Básicas
        if (!dataForm.courseId || dataForm.courseId === 0) {
          newErrors.courseId = "Curso é obrigatório";
          isValid = false;
        }
        if (!dataForm.name || dataForm.name.trim().length < 3) {
          newErrors.name = "Nome da turma deve ter pelo menos 3 caracteres";
          isValid = false;
        }
        if (dataForm.hasOnlineCourse && (!dataForm.onlineCourseModelId || dataForm.onlineCourseModelId <= 0)) {
          newErrors.onlineCourseModelId = "Modelo de curso online é obrigatório quando habilitado";
          isValid = false;
        }
        break;

      case 2: // Período e Duração
        if (!dataForm.hoursDuration || dataForm.hoursDuration < 1) {
          newErrors.hoursDuration = "Carga horária é obrigatória";
          isValid = false;
        }
        if (!dataForm.daysDuration || dataForm.daysDuration < 1) {
          newErrors.daysDuration = "Dias de duração é obrigatório";
          isValid = false;
        }
        if (dataForm.periodClass === "LIMITED") {
          if (!dataForm.initialDate) {
            newErrors.initialDate = "Data de início é obrigatória para período limitado";
            isValid = false;
          }
          if (!dataForm.finalDate) {
            newErrors.finalDate = "Data de fim é obrigatória para período limitado";
            isValid = false;
          }
          if (!dataForm.landingPagesDates || dataForm.landingPagesDates.trim() === "") {
            newErrors.landingPagesDates = "Datas de divulgação são obrigatórias para período limitado";
            isValid = false;
          }
        }
        break;

      case 3: // Inscrições e Vagas
        if (dataForm.allowSubscriptions) {
          if (dataForm.periodSubscriptionsType === "LIMITED") {
            if (!dataForm.periodSubscriptionsInitialDate) {
              newErrors.periodSubscriptionsInitialDate = "Data inicial do período é obrigatória";
              isValid = false;
            }
            if (!dataForm.periodSubscriptionsFinalDate) {
              newErrors.periodSubscriptionsFinalDate = "Data final do período é obrigatória";
              isValid = false;
            }
          }
          if (!dataForm.unlimitedSubscriptions && (!dataForm.maxSubscriptions || dataForm.maxSubscriptions <= 0)) {
            newErrors.maxSubscriptions = "Máximo de inscrições deve ser maior que 0";
            isValid = false;
          }
        }
        break;

      case 4: // Preços e Pagamento
        // Não há campos obrigatórios neste step
        break;

      case 5: // Conteúdo e Detalhes
        if (!dataForm.description || dataForm.description.length < 10) {
          newErrors.description = "Descrição deve ter pelo menos 10 caracteres";
          isValid = false;
        }
        if (!dataForm.gradeTheory || dataForm.gradeTheory.length < 10) {
          newErrors.gradeTheory = "Grade teórica deve ter pelo menos 10 caracteres";
          isValid = false;
        }
        break;

      case 6: // Mídia e FAQ
        // Validação de URL de vídeo se houver
        if (dataForm.videoUrl && dataForm.videoUrl.length > 1) {
          try {
            new URL(dataForm.videoUrl);
          } catch {
            newErrors.videoUrl = "URL do vídeo deve ser uma URL válida";
            isValid = false;
          }
        }
        break;

      case 7: // Avaliação e Endereço
        if (dataForm.allowExam && (!dataForm.classCode || dataForm.classCode.trim() === "")) {
          newErrors.classCode = "Código de acesso é obrigatório quando a turma tem prova";
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    setStepErrors(prev => ({ ...prev, [step]: !isValid }));

    // Se houver erros, mostra um toast informativo
    if (!isValid) {
      const errorCount = Object.keys(newErrors).length;
      toast({
        title: "Campos obrigatórios",
        description: `Por favor, preencha ${errorCount === 1 ? 'o campo obrigatório' : `os ${errorCount} campos obrigatórios`} antes de continuar.`,
        variant: "destructive",
      });
    }

    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Limpa erros do step anterior ao avançar
      setErrors({});
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Limpa erros ao voltar
      setErrors({});
    }
  };

  // Função para navegar direto para um step
  const handleStepClick = (stepNumber: number) => {
    // Só permite navegar para steps anteriores ou o próximo se o atual estiver válido
    if (stepNumber < currentStep) {
      setCurrentStep(stepNumber);
      setErrors({});
    } else if (stepNumber === currentStep + 1) {
      if (validateStep(currentStep)) {
        setCurrentStep(stepNumber);
        setErrors({});
      }
    } else if (stepNumber === currentStep) {
      // Já está no step atual, não faz nada
      return;
    } else {
      // Tentando pular steps, não permite
      toast({
        title: "Navegação bloqueada",
        description: "Complete os passos anteriores antes de avançar.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = () => {
    const result = Schema.safeParse(dataForm);

    if (!result.success) {
      const newErrors: { [key: string]: string } = {};
      result.error.errors.forEach((error) => {
        const path = error.path.join(".");
        if (path) {
          newErrors[path] = error.message;
        }
      });
      setErrors(newErrors);

      // Encontrar o primeiro step com erro
      // Por agora, vamos apenas mostrar o toast
      toast({
        title: "Erro de validação",
        description: "Por favor, verifique todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const submissionData = {
      ...dataForm,
      faq: JSON.stringify(dataForm.faq || []),
    } as unknown as FormData;

    if (formData) {
      updateCustomerMutation(submissionData);
    } else {
      registerCustomer(submissionData);
    }
  };

  const stepTitles = [
    "Informações Básicas",
    "Período e Duração",
    "Inscrições e Vagas",
    "Preços e Pagamento",
    "Conteúdo e Detalhes",
    "Mídia e FAQ",
    "Avaliação e Endereço",
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 2:
        return (
          <Step2Period
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 3:
        return (
          <Step3Subscriptions
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 4:
        return (
          <Step4Payment
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 5:
        return (
          <Step5Content
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 6:
        return (
          <Step6Media
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 7:
        return (
          <Step7Evaluation
            dataForm={dataForm}
            setDataForm={setDataForm}
            errors={errors}
            setErrors={setErrors}
            generateClassCode={generateClassCode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header com progresso */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-semibold">
              {stepTitles[currentStep - 1]}
            </h3>
            {Object.keys(errors).length > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">
                  {Object.keys(errors).length} {Object.keys(errors).length === 1 ? 'campo pendente' : 'campos pendentes'}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
            {currentStep}/{totalSteps}
          </span>
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="h-1.5 md:h-2" />

        {/* Indicadores de steps - Mobile: apenas pontos, Desktop: com labels */}
        <div className="flex justify-between mt-3 md:mt-4 px-2 md:px-0">
          {stepTitles.map((title, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col items-center cursor-pointer",
                currentStep === index + 1 && "text-primary",
                currentStep > index + 1 && "text-green-600",
                stepErrors[index + 1] && "text-destructive"
              )}
              onClick={() => handleStepClick(index + 1)}
            >
              <div
                className={cn(
                  "w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-[10px] md:text-xs font-semibold transition-all",
                  currentStep === index + 1 && "border-primary bg-primary text-primary-foreground scale-110",
                  currentStep > index + 1 && "border-green-600 bg-green-600 text-white",
                  currentStep < index + 1 && "border-muted-foreground bg-background",
                  stepErrors[index + 1] && "border-destructive bg-destructive text-destructive-foreground"
                )}
              >
                {currentStep > index + 1 ? (
                  <Check className="w-3 h-3 md:w-4 md:h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-[10px] mt-1 hidden lg:block text-center max-w-[100px]">
                {title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo do step */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4">
        {renderStep()}
      </div>

      {/* Footer com botões de navegação */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-background">
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          {/* Botão Anterior - Mobile: ocupa largura total */}
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="sm:inline">Anterior</span>
          </Button>

          {/* Botões de ação - Mobile: em linha */}
          <div className="flex gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              <span className="sm:hidden">Sair</span>
              <span className="hidden sm:inline">Cancelar</span>
            </Button>

            {currentStep === totalSteps ? (
              <Button
                onClick={handleSubmit}
                disabled={isPending || isPendingUpdate}
                className="flex-1 sm:flex-initial"
              >
                {isPending || isPendingUpdate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    <span className="hidden sm:inline">
                      {formData ? "Atualizando..." : "Salvando..."}
                    </span>
                    <span className="sm:hidden">
                      {formData ? "Atualizar" : "Salvar"}
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1 sm:mr-2" />
                    <span>{formData ? "Atualizar" : "Salvar"}</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1 sm:flex-initial"
              >
                <span className="sm:inline">Próximo</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurmasFormSteps;