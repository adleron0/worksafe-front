import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import CalendarPicker from "@/components/general-components/Calendar";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import FaqGenerator from "@/components/general-components/FaqGenerator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IEntity as Course } from "../../_cursos/-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { RefreshCw, HelpCircle, ChevronDown, MapPin, Loader2 } from "lucide-react";
import WhyUsEditor from "./WhyUsEditor";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Função para gerar hash alfanumérico de 4 dígitos
  const generateClassCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Schema
  const Schema = z
    .object({
      name: z
        .string()
        .min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
      imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
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
            // Se não há valor ou tem 1 caractere ou menos, passa na validação
            if (!value || value.length <= 1) return true;

            // Se tem mais de 1 caractere, valida se é URL válida
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
      // Period class field
      periodClass: z.string().optional(),
      // New subscription fields
      allowSubscriptions: z.boolean().optional(),
      periodSubscriptionsType: z.string().optional().nullable(),
      periodSubscriptionsInitialDate: z.string().optional().nullable(),
      periodSubscriptionsFinalDate: z.string().optional().nullable(),
      unlimitedSubscriptions: z.boolean().optional(),
      // Online course fields
      hasOnlineCourse: z.boolean().optional(),
      onlineCourseModelId: z.number().optional().nullable(),
      // Address fields
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
        // Se allowExam é true, classCode é obrigatório
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
        // Se periodClass é LIMITED, initialDate é obrigatório
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
        // Se periodClass é LIMITED, finalDate é obrigatório
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
        // Se periodClass é LIMITED, landingPagesDates é obrigatório
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
        // Se unlimitedSubscriptions é false, maxSubscriptions é obrigatório e deve ser maior que 0
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
        // Se periodSubscriptionsType é LIMITED, a data inicial é obrigatória
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
        // Se periodSubscriptionsType é LIMITED, a data final é obrigatória
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
        // Se hasOnlineCourse é true, onlineCourseModelId é obrigatório
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

  type FormData = z.infer<typeof Schema>;

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
    openClass: formData?.openClass ?? false,
    gifts: formData?.gifts || "",
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    videoUrl: formData?.videoUrl || "",
    videoTitle: formData?.videoTitle || "",
    videoSubtitle: formData?.videoSubtitle || "",
    videoDescription: formData?.videoDescription || "",
    active: formData?.active || null,
    faq: FaqGenerator.parseFaqString(formData?.faq),
    initialDate: formData?.initialDate || null,
    finalDate: formData?.finalDate || null,
    landingPagesDates: formData?.landingPagesDates || "",
    allowExam: formData?.allowExam ?? true,
    allowReview: formData?.allowReview,
    allowCheckout: (formData as any)?.allowCheckout || false,
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
    // Period class field
    periodClass: (formData as any)?.periodClass || "UNLIMITED",
    // New subscription fields
    allowSubscriptions: (formData as any)?.allowSubscriptions || false,
    periodSubscriptionsType:
      (formData as any)?.periodSubscriptionsType || "LIMITED",
    periodSubscriptionsInitialDate:
      (formData as any)?.periodSubscriptionsInitialDate || null,
    periodSubscriptionsFinalDate:
      (formData as any)?.periodSubscriptionsFinalDate || null,
    unlimitedSubscriptions: (formData as any)?.unlimitedSubscriptions || false,
    // Online course fields
    hasOnlineCourse: (formData as any)?.hasOnlineCourse || false,
    onlineCourseModelId: (formData as any)?.onlineCourseModelId || null,
    // Address fields
    address: (formData as any)?.address || "",
    addressNumber: (formData as any)?.addressNumber || "",
    addressComplement: (formData as any)?.addressComplement || "",
    neighborhood: (formData as any)?.neighborhood || "",
    city: (formData as any)?.city || "",
    state: (formData as any)?.state || "",
    zipCode: (formData as any)?.zipCode || "",
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(""); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isAddressOpen, setIsAddressOpen] = useState<boolean>(
    !!(formData as any)?.address || false
  );
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [lastFetchedCep, setLastFetchedCep] = useState<string>("");

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

  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  // Função para buscar CEP
  const fetchAddressByCep = async (cep: string) => {
    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, "");
    
    // Verifica se o CEP tem 8 dígitos
    if (cleanCep.length !== 8) return;
    
    // Não busca se já foi o último CEP buscado (evita requisições desnecessárias)
    if (cleanCep === lastFetchedCep) return;
    
    setIsLoadingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        // Atualiza os campos com os dados do CEP
        setDataForm(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          // Mantém número e complemento que o usuário já digitou
          addressNumber: prev.addressNumber,
          addressComplement: prev.addressComplement,
        }));
        
        // Expande a seção de endereço se estava fechada
        setIsAddressOpen(true);
        
        // Salva o CEP buscado
        setLastFetchedCep(cleanCep);
        
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
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Handler específico para o campo CEP
  const handleCepChange = (name: string, value: string | number | null | string[]) => {
    const cepValue = String(value);
    handleChange(name, cepValue);
    
    // Remove caracteres não numéricos para verificar
    const cleanCep = cepValue.replace(/\D/g, "");
    
    // Se tem 8 dígitos e é diferente do último buscado, busca o endereço
    if (cleanCep.length === 8 && cleanCep !== lastFetchedCep) {
      fetchAddressByCep(cepValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};

    // Zod schema validation
    const result = Schema.safeParse(dataForm);

    if (!result.success) {
      result.error.errors.forEach((error) => {
        const path = error.path.join(".");
        if (path) {
          newErrors[path] = error.message;
        }
      });

      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    // Create a copy of the data form with faq converted to JSON string
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

  // Buscas de valores para variaveis de formulário
  const { data: courses, isLoading: isLoadingCourses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "order-name", value: "asc" },
      ];
      return get("courses", "", params);
    },
  });

  const { data: certificates, isLoading: isLoadingCertificates } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listCertificates`, dataForm.courseId],
    queryFn: async () => {
      const params = [
        { key: "active", value: true },
        { key: "courseId", value: dataForm.courseId },
        { key: "limit", value: 'all' },
        { key: "order-name", value: "asc" },
      ];
      return get("certificate", "", params);
    },
    // Only run the query if courseId is valid (greater than 0)
    enabled: dataForm.courseId > 0,
  });

  const { data: onlineCourses, isLoading: isLoadingOnlineCourses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listOnlineCourses`, dataForm.courseId],
    queryFn: async () => {
      const params = [
        { key: "courseId", value: dataForm.courseId },
        { key: "limit", value: 'all' },
        { key: "order-name", value: "asc" },
      ];
      return get("online-courses", "", params);
    },
    // Only run the query if hasOnlineCourse is true and courseId is valid
    enabled: dataForm.hasOnlineCourse && dataForm.courseId > 0,
  });

  // Função para encontrar um curso pelo ID
  const findCourseById = (id: number) => {
    if (!courses) return null;
    return courses?.rows?.find((course) => course.id === id);
  };

  // Função genérica para atualizar um campo do formulário com base em outro valor
  const updateFormField = <T,>(
    fieldToUpdate: keyof FormData,
    valueGetter: (
      selectedName: string,
      selectedValue: string | string[],
    ) => T | undefined,
  ) => {
    return (selectedName: string, selectedValue: string | string[]) => {
      const newValue = valueGetter(selectedName, selectedValue);
      if (newValue !== undefined && dataForm[fieldToUpdate] !== newValue) {
        setDataForm((prev) => ({ ...prev, [fieldToUpdate]: newValue }));
      }
    };
  };

  // Helper para atualizar campos com base em propriedades do curso
  const updateFromCourse = <T extends keyof FormData>(
    field: T,
    propertyGetter: (course: Course) => FormData[T] | undefined,
  ) =>
    updateFormField(field, (_, value) => {
      // Ensure value is a string and can be converted to a number
      const courseId = typeof value === "string" ? parseInt(value, 10) : null;
      if (courseId === null) return undefined;

      const course = findCourseById(courseId) as Course | null;
      return course ? propertyGetter(course) : undefined;
    });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <div className="h-60">
        <DropUpload setImage={setDataForm} EditPreview={preview} />
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center">
        <div className="flex flex-col">
          <Label
            htmlFor="openClass"
            className="cursor-pointer flex items-center gap-2"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Turma aberta
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Aparecer no site e na landingPage
          </p>
        </div>
        <Switch
          id="openClass"
          name="openClass"
          checked={dataForm.openClass ? true : false}
          onCheckedChange={() =>
            setDataForm((prev) => ({ ...prev, openClass: !prev.openClass }))
          }
        />
      </div>

      <div>
        <Label htmlFor="courseId">
          Curso<span>*</span>
        </Label>
        <Select
          name="courseId"
          disabled={isLoadingCourses}
          options={courses?.rows || []}
          onChange={(name, value) => handleChange(name, +value)}
          state={dataForm.courseId ? String(dataForm.courseId) : ""}
          placeholder="Selecione o curso"
          callBacks={[
            updateFromCourse("name", (course) => course.name),
            updateFromCourse("hoursDuration", (course) => course.hoursDuration),
            updateFromCourse("description", (course) => course.description),
            updateFromCourse("gradeTheory", (course) => course.gradeTheory),
            updateFromCourse(
              "gradePracticle",
              (course) => course.gradePracticle,
            ),
            updateFromCourse("faq", (course) =>
              FaqGenerator.parseFaqString(course.faq),
            ),
          ]}
        />
        {errors.courseId && (
          <p className="text-red-500 text-sm">{errors.courseId}</p>
        )}
      </div>

      <div>
        <Label htmlFor="certificateId">Certificado</Label>
        <Select
          name="certificateId"
          disabled={!dataForm.courseId || isLoadingCertificates}
          options={certificates?.rows || []}
          onChange={(name, value) => handleChange(name, value ? +value : null)}
          state={dataForm.certificateId ? String(dataForm.certificateId) : ""}
          placeholder={
            !dataForm.courseId
              ? "Selecione um curso primeiro"
              : "Selecione o certificado"
          }
        />
        {errors.certificateId && (
          <p className="text-red-500 text-sm">{errors.certificateId}</p>
        )}
      </div>

      {/* Online Course Section */}
      <div
        className={`mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.hasOnlineCourse ? "pb-4" : ""}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="hasOnlineCourse"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Curso Online
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Vincula um modelo de curso online à esta turma
            </p>
          </div>
          <Switch
            id="hasOnlineCourse"
            name="hasOnlineCourse"
            checked={dataForm.hasOnlineCourse ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({
                ...prev,
                hasOnlineCourse: !prev.hasOnlineCourse,
                onlineCourseModelId: !prev.hasOnlineCourse ? prev.onlineCourseModelId : null,
              }))
            }
          />
        </div>

        {dataForm.hasOnlineCourse && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="onlineCourseModelId">
              Modelo de Curso Online <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Selecione o modelo de curso online para esta turma
            </p>
            <Select
              name="onlineCourseModelId"
              disabled={!dataForm.courseId || isLoadingOnlineCourses}
              options={onlineCourses?.rows || []}
              onChange={(name, value) => handleChange(name, value ? +value : null)}
              state={dataForm.onlineCourseModelId ? String(dataForm.onlineCourseModelId) : ""}
              placeholder={
                !dataForm.courseId
                  ? "Selecione um curso primeiro"
                  : isLoadingOnlineCourses
                  ? "Carregando modelos..."
                  : "Selecione o modelo de curso online"
              }
            />
            {errors.onlineCourseModelId && (
              <p className="text-red-500 text-sm mt-1">{errors.onlineCourseModelId}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="name">
          Nome da Turma <span>*</span>
        </Label>
        <Input
          id="name"
          name="name"
          placeholder={`Digite nome da ${entity.name}`}
          value={dataForm.name}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      {/* Address Section - Optional Collapsible */}
      <Collapsible
        open={isAddressOpen}
        onOpenChange={setIsAddressOpen}
        className="mt-4"
      >
        <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
            <div className="flex flex-col text-left">
              <Label className="flex items-center gap-2 cursor-pointer">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Endereço do Curso Presencial
                {dataForm.address && (
                  <span className="text-xs text-green-600 font-medium ml-2">
                    • Preenchido
                  </span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground font-medium">
                Informações opcionais do local onde o curso presencial será realizado
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isAddressOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 border-t border-border/50 pt-4">
              <div className="md:col-span-2">
                <Label htmlFor="zipCode" className="flex items-center gap-2">
                  CEP
                  {isLoadingCep && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  placeholder="00000-000"
                  format="cep"
                  value={dataForm.zipCode || ""}
                  onValueChange={handleCepChange}
                  className="mt-1"
                  disabled={isLoadingCep}
                />
                {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o CEP para buscar o endereço automaticamente
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Rua, Avenida, etc..."
                  value={dataForm.address || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
              </div>

              <div>
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  name="addressNumber"
                  placeholder="Número"
                  value={dataForm.addressNumber || ""}
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
                  placeholder="Apartamento, Sala, etc..."
                  value={dataForm.addressComplement || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.addressComplement && <p className="text-red-500 text-sm">{errors.addressComplement}</p>}
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  placeholder="Bairro"
                  value={dataForm.neighborhood || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.neighborhood && <p className="text-red-500 text-sm">{errors.neighborhood}</p>}
              </div>

              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Cidade"
                  value={dataForm.city || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
              </div>

              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="Ex: SP, RJ, MG"
                  value={dataForm.state || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.state && <p className="text-red-500 text-sm">{errors.state}</p>}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <div>
        <Label htmlFor="hoursDuration">
          Carga Horária (Horas) <span>*</span>
        </Label>
        <NumberInput
          id="hoursDuration"
          name="hoursDuration"
          min={1}
          max={1000}
          value={dataForm.hoursDuration}
          onValueChange={handleChange}
        />
        {errors.hoursDuration && (
          <p className="text-red-500 text-sm">{errors.hoursDuration}</p>
        )}
      </div>

      <div>
        <Label htmlFor="daysDuration">
          Dias de Duração <span>*</span>
        </Label>
        <NumberInput
          id="daysDuration"
          name="daysDuration"
          min={1}
          max={365}
          value={dataForm.daysDuration}
          onValueChange={handleChange}
        />
        {errors.daysDuration && (
          <p className="text-red-500 text-sm">{errors.daysDuration}</p>
        )}
      </div>

      {/* Period Class Fields */}
      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex flex-col mb-4">
          <Label htmlFor="periodClass" className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Período da Turma
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Define o período de duração da turma
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="periodClass">Tipo de Período</Label>
            <Select
              name="periodClass"
              options={[
                { id: "LIMITED", name: "Por Período" },
                { id: "UNLIMITED", name: "Ilimitado" },
              ]}
              state={dataForm.periodClass || "UNLIMITED"}
              onChange={(name, value) => handleChange(name, value)}
              placeholder="Selecione o tipo de período"
            />
            {errors.periodClass && (
              <p className="text-red-500 text-sm">{errors.periodClass}</p>
            )}
          </div>

          {dataForm.periodClass === "LIMITED" && (
            <>
              <div>
                <Label htmlFor="initialDate">
                  Data de Início <span>*</span>
                </Label>
                <CalendarPicker
                  mode="single"
                  name="initialDate"
                  value={dataForm.initialDate}
                  onValueChange={(name, value) => handleChange(name, value)}
                  formField="initialDate"
                  placeholder="Selecione a data de início"
                  className="mt-1"
                />
                {errors.initialDate && (
                  <p className="text-red-500 text-sm">{errors.initialDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="finalDate">
                  Data de Fim <span>*</span>
                </Label>
                <CalendarPicker
                  mode="single"
                  name="finalDate"
                  value={dataForm.finalDate}
                  onValueChange={(name, value) => handleChange(name, value)}
                  formField="finalDate"
                  placeholder="Selecione a data de fim"
                  className="mt-1"
                />
                {errors.finalDate && (
                  <p className="text-red-500 text-sm">{errors.finalDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landingPagesDates">
                  Datas Exatas para Divulgação <span>*</span>
                </Label>
                <Input
                  id="landingPagesDates"
                  name="landingPagesDates"
                  placeholder="Ex: 12, 13 e 14 de janeiro"
                  value={dataForm.landingPagesDates ?? ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.landingPagesDates && (
                  <p className="text-red-500 text-sm">
                    {errors.landingPagesDates}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subscription Management Fields */}
      <div
        className={`mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowSubscriptions ? "pb-4" : ""}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="allowSubscriptions"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Inscrições
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Habilita subscrições na turma e configura período e limites.
            </p>
          </div>
          <Switch
            id="allowSubscriptions"
            name="allowSubscriptions"
            checked={dataForm.allowSubscriptions ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({
                ...prev,
                allowSubscriptions: !prev.allowSubscriptions,
              }))
            }
          />
        </div>

        {dataForm.allowSubscriptions && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="periodSubscriptionsType">
                Período de Inscrição
              </Label>
              <Select
                name="periodSubscriptionsType"
                options={[
                  { id: "LIMITED", name: "Por Período" },
                  { id: "UNLIMITED", name: "Ilimitado" },
                ]}
                state={dataForm.periodSubscriptionsType || "LIMITED"}
                onChange={(name, value) => handleChange(name, value)}
                placeholder="Selecione o tipo de inscrição"
              />
              {errors.periodSubscriptionsType && (
                <p className="text-red-500 text-sm">
                  {errors.periodSubscriptionsType}
                </p>
              )}
            </div>

            {dataForm.periodSubscriptionsType === "LIMITED" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="periodSubscriptionsInitialDate">
                    Data Inicial do Período <span>*</span>
                  </Label>
                  <CalendarPicker
                    mode="single"
                    name="periodSubscriptionsInitialDate"
                    value={dataForm.periodSubscriptionsInitialDate}
                    onValueChange={(name, value) => handleChange(name, value)}
                    formField="periodSubscriptionsInitialDate"
                    placeholder="Selecione a data inicial"
                    className="mt-1"
                  />
                  {errors.periodSubscriptionsInitialDate && (
                    <p className="text-red-500 text-sm">
                      {errors.periodSubscriptionsInitialDate}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="periodSubscriptionsFinalDate">
                    Data Final do Período <span>*</span>
                  </Label>
                  <CalendarPicker
                    mode="single"
                    name="periodSubscriptionsFinalDate"
                    value={dataForm.periodSubscriptionsFinalDate}
                    onValueChange={(name, value) => handleChange(name, value)}
                    formField="periodSubscriptionsFinalDate"
                    placeholder="Selecione a data final"
                    className="mt-1"
                  />
                  {errors.periodSubscriptionsFinalDate && (
                    <p className="text-red-500 text-sm">
                      {errors.periodSubscriptionsFinalDate}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="minimumQuorum">Quorum Mínimo</Label>
                <p className="text-xs text-muted-foreground font-medium">
                  Mínimo de inscritos para confirmação da turma
                </p>
                <NumberInput
                  id="minimumQuorum"
                  name="minimumQuorum"
                  min={0}
                  max={100}
                  value={dataForm.minimumQuorum}
                  onValueChange={handleChange}
                />
                {errors.minimumQuorum && (
                  <p className="text-red-500 text-sm">{errors.minimumQuorum}</p>
                )}
              </div>

              <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                <div className="flex flex-col">
                  <Label
                    htmlFor="unlimitedSubscriptions"
                    className="cursor-pointer"
                  >
                    Inscrições Ilimitadas
                  </Label>
                  <p className="text-xs text-muted-foreground font-medium">
                    Permite inscrições sem limite de vagas
                  </p>
                </div>
                <Switch
                  id="unlimitedSubscriptions"
                  name="unlimitedSubscriptions"
                  checked={dataForm.unlimitedSubscriptions ? true : false}
                  onCheckedChange={() =>
                    setDataForm((prev) => ({
                      ...prev,
                      unlimitedSubscriptions: !prev.unlimitedSubscriptions,
                    }))
                  }
                />
              </div>

              {!dataForm.unlimitedSubscriptions && (
                <div>
                  <Label htmlFor="maxSubscriptions">
                    Máximo de Inscrições <span>*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground font-medium">
                    Máximo de participantes que podem se inscrever na turma
                  </p>
                  <NumberInput
                    id="maxSubscriptions"
                    name="maxSubscriptions"
                    min={0}
                    max={100}
                    value={dataForm.maxSubscriptions}
                    onValueChange={handleChange}
                  />
                  {errors.maxSubscriptions && (
                    <p className="text-red-500 text-sm">
                      {errors.maxSubscriptions}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="price">Valor</Label>
        <Input
          id="price"
          name="price"
          value={dataForm.price}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
        />
        {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
      </div>

      <div>
        <Label htmlFor="discountPrice">Valor promocional</Label>
        <p className="text-xs text-muted-foreground font-medium">
          Para evidenciar quando houver promoções
        </p>
        <Input
          id="discountPrice"
          name="discountPrice"
          value={dataForm.discountPrice}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
        />
        {errors.discountPrice && (
          <p className="text-red-500 text-sm">{errors.discountPrice}</p>
        )}
      </div>

      <div
        className={`mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowCheckout ? "pb-4" : ""}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="allowCheckout"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Checkout
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Habilita pagamento online na inscrição
            </p>
          </div>
          <Switch
            id="allowCheckout"
            name="allowCheckout"
            checked={dataForm.allowCheckout ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({
                ...prev,
                allowCheckout: !prev.allowCheckout,
              }))
            }
          />
        </div>

        {dataForm.allowCheckout && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="paymentMethods">Métodos de Pagamento</Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Selecione os métodos de pagamento ativos para esta turma
            </p>
            <Select
              name="paymentMethods"
              multiple={true}
              options={[
                { id: "cartaoCredito", name: "Cartão de Crédito" },
                { id: "boleto", name: "Boleto" },
                { id: "pix", name: "PIX" },
              ]}
              state={dataForm.paymentMethods || []}
              onChange={(name, value) => handleChange(name, value)}
              placeholder="Selecione os métodos de pagamento"
            />
            {errors.paymentMethods && (
              <p className="text-red-500 text-sm">{errors.paymentMethods}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="dividedIn">Parcelamento</Label>
        <p className="text-xs text-muted-foreground font-medium">
          Número de parcelas permitidas no pagamento
        </p>
        <NumberInput
          id="dividedIn"
          name="dividedIn"
          min={1}
          max={12}
          value={dataForm.dividedIn || 1}
          onValueChange={handleChange}
          placeholder="Ex: 3"
        />
        {errors.dividedIn && (
          <p className="text-red-500 text-sm">{errors.dividedIn}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Descrição <span>*</span>
        </Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite a descrição"
          value={dataForm.description}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.description && (
          <p className="text-red-500 text-sm">{errors.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradeTheory">
          Grade curricular teórica <span>*</span>
        </Label>
        <p className="text-xs text-muted-foreground font-medium">
          Adicione os itens da grade curricular teórica
        </p>
        <TagInput
          value={dataForm.gradeTheory}
          onChange={(value) => handleChange("gradeTheory", value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradeTheory && (
          <p className="text-red-500 text-sm">{errors.gradeTheory}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradePracticle">Grade curricular prática</Label>
        <p className="text-xs text-muted-foreground font-medium">
          Adicione os itens da grade curricular prática
        </p>
        <TagInput
          value={dataForm.gradePracticle}
          onChange={(value) => handleChange("gradePracticle", value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradePracticle && (
          <p className="text-red-500 text-sm">{errors.gradePracticle}</p>
        )}
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex flex-col mb-4">
          <Label htmlFor="periodClass" className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Período da Turma
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Define o período de duração da turma
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="periodClass">Tipo de Período</Label>
            <Select
              name="periodClass"
              options={[
                { id: "LIMITED", name: "Por Período" },
                { id: "UNLIMITED", name: "Ilimitado" },
              ]}
              state={dataForm.periodClass || "UNLIMITED"}
              onChange={(name, value) => handleChange(name, value)}
              placeholder="Selecione o tipo de período"
            />
            {errors.periodClass && (
              <p className="text-red-500 text-sm">{errors.periodClass}</p>
            )}
          </div>

          {dataForm.periodClass === "LIMITED" && (
            <>
              <div>
                <Label htmlFor="initialDate">
                  Data de Início <span>*</span>
                </Label>
                <CalendarPicker
                  mode="single"
                  name="initialDate"
                  value={dataForm.initialDate}
                  onValueChange={(name, value) => handleChange(name, value)}
                  formField="initialDate"
                  placeholder="Selecione a data de início"
                  className="mt-1"
                />
                {errors.initialDate && (
                  <p className="text-red-500 text-sm">{errors.initialDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="finalDate">
                  Data de Fim <span>*</span>
                </Label>
                <CalendarPicker
                  mode="single"
                  name="finalDate"
                  value={dataForm.finalDate}
                  onValueChange={(name, value) => handleChange(name, value)}
                  formField="finalDate"
                  placeholder="Selecione a data de fim"
                  className="mt-1"
                />
                {errors.finalDate && (
                  <p className="text-red-500 text-sm">{errors.finalDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landingPagesDates">
                  Datas Exatas para Divulgação <span>*</span>
                </Label>
                <Input
                  id="landingPagesDates"
                  name="landingPagesDates"
                  placeholder="Ex: 12, 13 e 14 de janeiro"
                  value={dataForm.landingPagesDates ?? ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.landingPagesDates && (
                  <p className="text-red-500 text-sm">
                    {errors.landingPagesDates}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={`mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowExam ? "pb-4" : ""}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="allowExam"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Prova Virtual
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Habilita exame/prova de Avaliação virtual sobre os conhecimentos
              adquiridos
            </p>
          </div>
          <Switch
            id="allowExam"
            name="allowExam"
            checked={dataForm.allowExam ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({ ...prev, allowExam: !prev.allowExam }))
            }
          />
        </div>

        {dataForm.allowExam && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="classCode">
              Código de Acesso à Prova <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Código de acesso a prova
            </p>
            <div className="flex gap-2">
              <Input
                id="classCode"
                name="classCode"
                placeholder="Ex: A3B9"
                value={dataForm.classCode || ""}
                onValueChange={handleChange}
                className="flex-1"
                required={dataForm.allowExam}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newCode = generateClassCode();
                  handleChange("classCode", newCode);
                }}
                title="Gerar novo código"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {errors.classCode && (
              <p className="text-red-500 text-sm mt-1">{errors.classCode}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center">
        <div className="flex flex-col">
          <Label
            htmlFor="allowReview"
            className="cursor-pointer flex items-center gap-2"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Habilitar Avaliação
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Permite coleta de avaliação dos alunos sobre o curso ao final do
            exame
          </p>
        </div>
        <Switch
          id="allowReview"
          name="allowReview"
          checked={dataForm.allowReview ? true : false}
          onCheckedChange={() =>
            setDataForm((prev) => ({ ...prev, allowReview: !prev.allowReview }))
          }
        />
      </div>

      <div>
        <Label htmlFor="gifts">Brindes do Curso</Label>
        <p className="text-xs text-muted-foreground font-medium">
          Adicione os brindes oferecidos no curso
        </p>
        <TagInput
          value={dataForm.gifts ?? ""}
          onChange={(value) => handleChange("gifts", value)}
          separator="#"
          placeholder="Digite um brinde e pressione Enter"
          className="mt-1"
        />
        {errors.gifts && <p className="text-red-500 text-sm">{errors.gifts}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl">URL do vídeo</Label>
        <Input
          id="videoUrl"
          name="videoUrl"
          placeholder="Digite a URL do vídeo"
          value={dataForm.videoUrl || ""}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoUrl && (
          <p className="text-red-500 text-sm">{errors.videoUrl}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoTitle">Título do vídeo</Label>
        <Input
          id="videoTitle"
          name="videoTitle"
          placeholder="Digite o título do vídeo"
          value={dataForm.videoTitle}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoTitle && (
          <p className="text-red-500 text-sm">{errors.videoTitle}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoSubtitle">Subtítulo do vídeo</Label>
        <Input
          id="videoSubtitle"
          name="videoSubtitle"
          placeholder="Digite o subtítulo do vídeo"
          value={dataForm.videoSubtitle}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoSubtitle && (
          <p className="text-red-500 text-sm">{errors.videoSubtitle}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoDescription">Descrição do vídeo</Label>
        <Input
          id="videoDescription"
          name="videoDescription"
          placeholder="Digite a descrição do vídeo"
          value={dataForm.videoDescription}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.videoDescription && (
          <p className="text-red-500 text-sm">{errors.videoDescription}</p>
        )}
      </div>

      <div className="mt-6">
        <WhyUsEditor
          value={dataForm.whyUs || ""}
          onChange={(value) => handleChange("whyUs", value)}
          errors={errors}
        />
      </div>

      <div className="mt-6">
        <FaqGenerator
          formData={dataForm}
          setFormData={setDataForm}
          fieldName="faq"
          errors={errors}
          setErrors={setErrors}
          title="Perguntas Frequentes (FAQ)"
          description="Adicione perguntas e respostas comuns sobre o curso"
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
