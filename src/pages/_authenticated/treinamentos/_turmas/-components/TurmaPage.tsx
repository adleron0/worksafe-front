import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { z } from "zod";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Icon from "@/components/general-components/Icon";
import FaqGenerator from "@/components/general-components/FaqGenerator";

import Step1BasicInfo from "./steps/Step1BasicInfo";
import Step2Period from "./steps/Step2Period";
import Step3Subscriptions from "./steps/Step3Subscriptions";
import Step4Payment from "./steps/Step4Payment";
import Step5Content from "./steps/Step5Content";
import Step6Media from "./steps/Step6Media";
import Step7Evaluation from "./steps/Step7Evaluation";
import DuplicateTurmaModal from "./DuplicateTurmaModal";

import { IEntity } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import useWindowSize from "@/hooks/use-windowSize";
import { useFormDraft } from "@/hooks/use-form-draft";

// ─── Schema (idêntico ao de TurmasFormSteps, sem alterações) ─────────────────

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

// ─── Utilitários ──────────────────────────────────────────────────────────────

const generateClassCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ─── Mapeamento campo → tab ───────────────────────────────────────────────────

const FIELD_TO_TAB: Record<string, string> = {
  courseId: "basico",
  name: "basico",
  hasOnlineCourse: "basico",
  onlineCourseModelId: "basico",
  openClass: "basico",
  certificateId: "basico",
  hoursDuration: "periodo",
  daysDuration: "periodo",
  initialDate: "periodo",
  finalDate: "periodo",
  landingPagesDates: "periodo",
  periodClass: "periodo",
  allowSubscriptions: "inscricoes",
  maxSubscriptions: "inscricoes",
  unlimitedSubscriptions: "inscricoes",
  minimumQuorum: "inscricoes",
  periodSubscriptionsType: "inscricoes",
  periodSubscriptionsInitialDate: "inscricoes",
  periodSubscriptionsFinalDate: "inscricoes",
  price: "pagamento",
  discountPrice: "pagamento",
  dividedIn: "pagamento",
  paymentMethods: "pagamento",
  allowCheckout: "pagamento",
  description: "conteudo",
  gradeTheory: "conteudo",
  gradePracticle: "conteudo",
  gifts: "conteudo",
  whyUs: "conteudo",
  imageUrl: "midia",
  image: "midia",
  videoUrl: "midia",
  videoTitle: "midia",
  videoSubtitle: "midia",
  videoDescription: "midia",
  faq: "midia",
  allowExam: "avaliacao",
  allowReview: "avaliacao",
  classCode: "avaliacao",
  address: "avaliacao",
  addressNumber: "avaliacao",
  addressComplement: "avaliacao",
  neighborhood: "avaliacao",
  city: "avaliacao",
  state: "avaliacao",
  zipCode: "avaliacao",
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
  { slug: "basico", label: "Básico" },
  { slug: "periodo", label: "Período" },
  { slug: "inscricoes", label: "Inscrições" },
  { slug: "pagamento", label: "Pagamento" },
  { slug: "conteudo", label: "Conteúdo" },
  { slug: "midia", label: "Mídia" },
  { slug: "avaliacao", label: "Avaliação" },
] as const;

type TabSlug = (typeof TABS)[number]["slug"];

const ENTITY = {
  name: "Turma",
  pluralName: "Turmas",
  model: "classes",
  ability: "classes",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TurmaPageProps {
  formData?: IEntity;
  onSuccess: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function buildDefaults(formData?: IEntity): FormData {
  // IEntity não declara todos os campos extras; cast necessário para compat com legado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd = formData as any;
  return {
    name: formData?.name || "",
    imageUrl: formData?.imageUrl || "",
    customerId: formData?.customerId || null,
    courseId: formData?.courseId || 0,
    certificateId: fd?.certificateId || null,
    price: Number(formData?.price) || 0,
    discountPrice: Number(fd?.discountPrice) || 0,
    dividedIn: fd?.dividedIn || null,
    hoursDuration: formData?.hoursDuration || 1,
    daysDuration: fd?.daysDuration || 1,
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
    allowCheckout: fd?.allowCheckout ?? false,
    classCode:
      formData?.classCode ||
      (!formData
        ? generateClassCode()
        : formData?.classCode || generateClassCode()),
    minimumQuorum: formData?.minimumQuorum || 0,
    maxSubscriptions: formData?.maxSubscriptions || 0,
    paymentMethods: fd?.paymentMethods || [
      "cartaoCredito",
      "boleto",
      "pix",
    ],
    image: formData?.image || null,
    whyUs:
      fd?.whyUs ||
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
    periodClass: fd?.periodClass || "LIMITED",
    allowSubscriptions: fd?.allowSubscriptions ?? true,
    periodSubscriptionsType: fd?.periodSubscriptionsType || "LIMITED",
    periodSubscriptionsInitialDate: fd?.periodSubscriptionsInitialDate || null,
    periodSubscriptionsFinalDate: fd?.periodSubscriptionsFinalDate || null,
    unlimitedSubscriptions: fd?.unlimitedSubscriptions || false,
    hasOnlineCourse: fd?.hasOnlineCourse || false,
    onlineCourseModelId: fd?.onlineCourseModelId || null,
    address: fd?.address || "",
    addressNumber: fd?.addressNumber || "",
    addressComplement: fd?.addressComplement || "",
    neighborhood: fd?.neighborhood || "",
    city: fd?.city || "",
    state: fd?.state || "",
    zipCode: fd?.zipCode || "",
  };
}

// ─── Validação visual por tab (reutiliza lógica de validateAllSteps) ──────────

function computeTabErrors(
  dataForm: FormData,
): Record<TabSlug, boolean> {
  const result: Record<TabSlug, boolean> = {
    basico: false,
    periodo: false,
    inscricoes: false,
    pagamento: false,
    conteudo: false,
    midia: false,
    avaliacao: false,
  };

  // basico
  if (!dataForm.courseId || dataForm.courseId === 0) result.basico = true;
  if (!dataForm.name || dataForm.name.trim().length < 3) result.basico = true;
  if (
    dataForm.hasOnlineCourse &&
    (!dataForm.onlineCourseModelId || dataForm.onlineCourseModelId <= 0)
  )
    result.basico = true;

  // periodo
  if (!dataForm.hoursDuration || dataForm.hoursDuration < 1)
    result.periodo = true;
  if (!dataForm.daysDuration || dataForm.daysDuration < 1)
    result.periodo = true;
  if (dataForm.periodClass === "LIMITED") {
    if (!dataForm.initialDate) result.periodo = true;
    if (!dataForm.finalDate) result.periodo = true;
    if (!dataForm.landingPagesDates || dataForm.landingPagesDates.trim() === "")
      result.periodo = true;
  }

  // inscricoes
  if (dataForm.allowSubscriptions) {
    if (dataForm.periodSubscriptionsType === "LIMITED") {
      if (!dataForm.periodSubscriptionsInitialDate) result.inscricoes = true;
      if (!dataForm.periodSubscriptionsFinalDate) result.inscricoes = true;
    }
    if (
      !dataForm.unlimitedSubscriptions &&
      (!dataForm.maxSubscriptions || dataForm.maxSubscriptions <= 0)
    )
      result.inscricoes = true;
  }

  // conteudo
  if (!dataForm.description || dataForm.description.length < 10)
    result.conteudo = true;
  if (!dataForm.gradeTheory || dataForm.gradeTheory.length < 10)
    result.conteudo = true;

  // avaliacao
  if (
    dataForm.allowExam &&
    (!dataForm.classCode || dataForm.classCode.trim() === "")
  )
    result.avaliacao = true;

  return result;
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TurmaPage = ({ formData, onSuccess }: TurmaPageProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoader();
  const { width } = useWindowSize();
  const isMobile = (width ?? 0) < 768;

  // Lê ?tab= da URL (useSearch precisa de um tipo; usamos as any para não depender do tipo gerado)
  const search = useSearch({ strict: false }) as Record<string, string>;
  const activeTab = (search.tab as TabSlug) || "basico";

  const [dataForm, setDataForm] = useState<FormData>(() =>
    buildDefaults(formData),
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [initialSnapshot] = useState(() => JSON.stringify(buildDefaults(formData)));
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);

  const tabErrors = computeTabErrors(dataForm);

  // ── Rascunho em localStorage (apenas criação) ─────────────────────────────
  const { clearDraft } = useFormDraft({
    storageKey: formData ? null : "turma-draft-new",
    dataForm,
    setDataForm,
    excludeKeys: ["image"],
  });

  // ── Sincronia tab ↔ URL ────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (tab: string) => {
      // navigate tipado pela rota gerada; cast necessário pois TurmaPage é componente reutilizável
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigate as any)({
        search: (prev: Record<string, string>) => ({ ...prev, tab }),
        replace: true,
      });
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: registerCustomer, isPending } = useMutation({
    mutationFn: (newItem: FormData) => {
      showLoader(`Registrando ${ENTITY.name}...`);
      return post<IEntity>(ENTITY.model, "", newItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${ENTITY.name} cadastrado!`,
        description: `Novo ${ENTITY.name} cadastrado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${ENTITY.pluralName}`] });
      clearDraft();
      onSuccess();
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao cadastrar ${ENTITY.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } =
    useMutation({
      mutationFn: (updatedItem: FormData) => {
        showLoader(`Atualizando ${ENTITY.name}...`);
        return put<IEntity>(ENTITY.model, `${formData?.id}`, updatedItem);
      },
      onSuccess: () => {
        hideLoader();
        toast({
          title: `${ENTITY.name} atualizado!`,
          description: `${ENTITY.name} atualizado com sucesso.`,
          variant: "success",
        });
        queryClient.invalidateQueries({
          queryKey: [`list${ENTITY.pluralName}`],
        });
        onSuccess();
      },
      onError: (error: ApiError) => {
        hideLoader();
        toast({
          title: `Erro ao atualizar ${ENTITY.name}`,
          description: error.response?.data?.message || "Erro desconhecido.",
          variant: "destructive",
        });
      },
    });

  // ── Submit ─────────────────────────────────────────────────────────────────
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

      // Encontra a primeira tab com campo em erro
      const firstTabWithError = TABS.find((tab) =>
        Object.keys(newErrors).some(
          (field) => FIELD_TO_TAB[field] === tab.slug,
        ),
      );
      if (firstTabWithError) {
        handleTabChange(firstTabWithError.slug);
      }

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

  // ── Navegação ─────────────────────────────────────────────────────────────
  const isCreating = !formData;
  const hasChanges = JSON.stringify(dataForm) !== initialSnapshot;
  // Edição: alerta padrão "descartar alterações?" (sem draft).
  // Criação: alerta com 3 opções (salvar rascunho / descartar / continuar editando).
  const needsCreateDraftPrompt = isCreating && hasChanges;
  const needsEditConfirmPrompt = !isCreating && hasChanges;

  const handleBackKeepDraft = () => {
    navigate({ to: "/treinamentos/turmas" });
  };
  const handleBackDiscardDraft = () => {
    clearDraft();
    navigate({ to: "/treinamentos/turmas" });
  };
  // Compat: handleBack para fluxos sem prompt (edição sem changes, fechar limpa)
  const handleBack = handleBackDiscardDraft;

  const [backDialogOpen, setBackDialogOpen] = useState(false);
  const BackDraftDialog = (
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
              handleBackDiscardDraft();
            }}
          >
            Descartar
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setBackDialogOpen(false);
              handleBackKeepDraft();
            }}
          >
            Salvar rascunho
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ── Título ─────────────────────────────────────────────────────────────────
  const pageTitle = formData
    ? `Editar Turma: ${formData.name}`
    : "Nova Turma";

  // ── Conteúdo de cada step ──────────────────────────────────────────────────
  const stepProps = { dataForm, setDataForm, errors, setErrors };

  const stepContent: Record<TabSlug, React.ReactNode> = {
    basico: <Step1BasicInfo {...stepProps} />,
    periodo: <Step2Period {...stepProps} />,
    inscricoes: <Step3Subscriptions {...stepProps} />,
    pagamento: <Step4Payment {...stepProps} />,
    conteudo: <Step5Content {...stepProps} />,
    midia: <Step6Media {...stepProps} />,
    avaliacao: (
      <Step7Evaluation
        {...stepProps}
        generateClassCode={generateClassCode}
      />
    ),
  };

  const isSaving = isPending || isPendingUpdate;

  // ── Navegação entre tabs ───────────────────────────────────────────────────
  const currentTabIndex = TABS.findIndex((tab) => tab.slug === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;
  const goToNextTab = () => {
    const next = TABS[currentTabIndex + 1];
    if (next) handleTabChange(next.slug);
  };
  const goToPrevTab = () => {
    const prev = TABS[currentTabIndex - 1];
    if (prev) handleTabChange(prev.slug);
  };

  // ── Botão Voltar (anterior) — escondido na primeira tab ────────────────────
  const PrevTabButton = !isFirstTab ? (
    <Button variant="outline" onClick={goToPrevTab}>
      <ChevronLeft className="w-4 h-4 mr-2" />
      Voltar
    </Button>
  ) : null;

  // ── Botão de ação principal: Próximo (tabs intermediárias) ou Salvar (última) ─
  const PrimaryActionButton = isLastTab ? (
    <Button onClick={handleSubmit} disabled={isSaving}>
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {formData ? "Atualizando..." : "Salvando..."}
        </>
      ) : (
        <>
          <Icon name="save" className="w-4 h-4 mr-2" />
          Salvar
        </>
      )}
    </Button>
  ) : (
    <Button onClick={goToNextTab}>
      Próximo
      <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  );

  const HeaderBar = (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {needsEditConfirmPrompt ? (
          <ConfirmDialog
            title="Descartar alterações?"
            description="Existem alterações não salvas. Ao voltar, elas serão perdidas."
            onConfirm={handleBack}
          >
            <Button variant="ghost" size="icon" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </ConfirmDialog>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            onClick={() =>
              needsCreateDraftPrompt ? setBackDialogOpen(true) : handleBack()
            }
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-base font-semibold truncate">{pageTitle}</h1>
        {formData && (
          <Badge variant={formData.active ? "default" : "secondary"}>
            {formData.active ? "Ativa" : "Inativa"}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {formData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenDuplicateModal(true)}
          >
            <Icon name="copy" className="w-4 h-4 mr-1" />
            Duplicar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {isMobile ? (
        <>
          {/* ── Header sticky (mobile) ─────────────────────────────────────── */}
          <div className="sticky top-0 z-10 bg-background border-b">
            {HeaderBar}
          </div>

          {/* ── Accordion em mobile ────────────────────────────────────────── */}
          <div className="flex-1 px-4 py-4">
            <Accordion type="single" collapsible className="w-full">
              {TABS.map((tab) => (
                <AccordionItem key={tab.slug} value={tab.slug}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      {tab.label}
                      {tabErrors[tab.slug] && (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {stepContent[tab.slug]}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      ) : (
        /* ── Desktop: Tabs envolve header (com TabsList) + content ────────── */
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col"
        >
          {/* Header sticky com TabsList integrada */}
          <div className="sticky top-0 z-10 bg-background border-b">
            {HeaderBar}
            <div className="px-4 pb-2">
              <TabsList className="w-full overflow-x-auto justify-start h-auto flex-wrap">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.slug}
                    value={tab.slug}
                    className="flex items-center gap-1.5"
                  >
                    {tab.label}
                    {tabErrors[tab.slug] && (
                      <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Conteúdo da tab ativa */}
          <div className="flex-1 px-4 py-4">
            {TABS.map((tab) => (
              <TabsContent key={tab.slug} value={tab.slug}>
                {stepContent[tab.slug]}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}

      {/* ── Footer sticky ──────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-3 flex items-center justify-between gap-2">
        {needsEditConfirmPrompt ? (
          <ConfirmDialog
            title="Descartar alterações?"
            description="Existem alterações não salvas. Ao cancelar, elas serão perdidas."
            onConfirm={handleBack}
            titleBttn="Cancelar"
            iconBttn="x"
          />
        ) : (
          <Button
            variant="outline"
            onClick={() =>
              needsCreateDraftPrompt ? setBackDialogOpen(true) : handleBack()
            }
          >
            Cancelar
          </Button>
        )}
        <div className="flex gap-2">
          {PrevTabButton}
          {PrimaryActionButton}
        </div>
      </div>

      {/* ── Modal de duplicação ────────────────────────────────────────────── */}
      {formData && (
        <DuplicateTurmaModal
          turma={formData}
          open={openDuplicateModal}
          onOpenChange={setOpenDuplicateModal}
        />
      )}

      {/* ── Dialog de saída com rascunho (só criação) ──────────────────────── */}
      {isCreating && BackDraftDialog}
    </div>
  );
};

export default TurmaPage;
