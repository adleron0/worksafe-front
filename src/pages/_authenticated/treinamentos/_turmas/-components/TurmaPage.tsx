import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { z } from "zod";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/general-components/StatusBadge";
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
import Step8Page from "./steps/Step8Page";
import PaginaResultados from "./pagina/PaginaResultados";
import TurmaVenda from "./TurmaVenda";
import VagasEmpresas from "../-empresas/VagasEmpresas";
import { compactLandingContent, layoutName, parseLandingContent } from "./pagina/landing";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import DuplicateTurmaModal from "./DuplicateTurmaModal";

import { IEntity } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { useFormDraft } from "@/hooks/use-form-draft";

// ─── Schema (idêntico ao de TurmasFormSteps, sem alterações) ─────────────────

const Schema = z
  .object({
    name: z
      .string()
      .min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    imageUrl: z.string().nullable(),
    customerId: z.number().optional().nullable(),
    courseId: z.number().min(1, { message: "Escolha o curso" }),
    certificateId: z.number().optional().nullable(),
    highlightTheme: z.enum(["ouro", "prata", "holografico"]).optional().nullable(),
    highlightLabel: z.string().max(60, "Máximo de 60 caracteres").optional().nullable(),
    highlightPattern: z.enum(["rosetas", "estrelas", "estilhacos", "bolhas", "espiral", "glitter", "arco_iris", "gravado", "nenhum"]).optional().nullable(),
    highlightBorder: z.enum(["corda", "reflexo", "glitter", "cristais", "nenhum"]).optional().nullable(),
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
    // Página de inscrição (conteúdo editável, layout e teste A/B)
    landingContent: z.any().optional().nullable(),
    landingLayout: z.string().optional().nullable(),
    landingAbTest: z.boolean().optional(),
    landingAbLayouts: z.array(z.string()).optional(),
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

// ─── Passos do formulário ─────────────────────────────────────────────────────
// Agrupados pelo que a pessoa pensa ao montar uma turma. O slug fica na URL (?tab=)
// e continua o mesmo de antes onde o assunto não mudou.

const TABS = [
  { slug: "basico", label: "Turma", heading: "Que turma é esta", description: "Nome, curso, se é aberta ao público ou fechada para um cliente, e o certificado." },
  { slug: "periodo", label: "Datas e local", heading: "Quando e onde", description: "Carga horária, datas e como elas aparecem no site. O endereço aparece na página da turma." },
  { slug: "inscricoes", label: "Vagas e inscrições", heading: "Quem pode se inscrever e até quando", description: "Abra as inscrições, defina o período (até a véspera do início) e o limite de vagas." },
  { slug: "pagamento", label: "Valores", heading: "Quanto custa e como pagar", description: "Valor zerado aparece como \"sob consulta\". Com checkout ligado, o aluno paga direto no site." },
  { slug: "conteudo", label: "Conteúdo", heading: "O que o aluno aprende", description: "Descrição, grade teórica e prática, o que está incluso, dúvidas frequentes e por que escolher a WorkSafe." },
  { slug: "pagina", label: "Página no site", heading: "Como a turma aparece no site", description: "Foto, vídeo, layout da página e teste A/B. O que ficar vazio não aparece." },
  { slug: "avaliacao", label: "Prova e avaliação", heading: "Depois da turma", description: "Prova online com código de acesso e a avaliação do curso pelos alunos." },
  { slug: "venda", label: "Venda", heading: "De onde vem o dinheiro desta turma", description: "Turma fechada precisa de uma venda (contrato) ou da marcação \"sem cobrança\", com o motivo. Aqui também ficam as compras da turma (material, coffee, instrutor de fora) e o resultado." },
  { slug: "resultados", label: "Resultados", heading: "Resultados da página", description: "Visitas, inscrições e qual layout da página converte mais." },
  { slug: "empresas", label: "Vagas de empresas", heading: "Vagas compradas por empresas", description: "Empresas que compraram vagas nesta turma aberta. Os alunos delas entram sem cobrança e o certificado sai com a empresa contratante." },
] as const;

type TabSlug = (typeof TABS)[number]["slug"];
/** Abas só de consulta: ficam fora da sequência de passos do formulário. */
const VIEW_TABS: readonly TabSlug[] = ["venda", "resultados", "empresas"];

/** Em qual passo cada campo fica (para levar a pessoa ao lugar certo do erro). */
const FIELD_TO_TAB: Record<string, TabSlug> = {
  courseId: "basico", name: "basico", hasOnlineCourse: "basico", onlineCourseModelId: "basico", openClass: "basico", customerId: "basico",
  certificateId: "basico", highlightTheme: "basico", highlightLabel: "basico", highlightPattern: "basico", highlightBorder: "basico",
  hoursDuration: "periodo", daysDuration: "periodo", initialDate: "periodo", finalDate: "periodo", landingPagesDates: "periodo", periodClass: "periodo",
  address: "periodo", addressNumber: "periodo", addressComplement: "periodo", neighborhood: "periodo", city: "periodo", state: "periodo", zipCode: "periodo",
  allowSubscriptions: "inscricoes", maxSubscriptions: "inscricoes", unlimitedSubscriptions: "inscricoes", minimumQuorum: "inscricoes",
  periodSubscriptionsType: "inscricoes", periodSubscriptionsInitialDate: "inscricoes", periodSubscriptionsFinalDate: "inscricoes",
  price: "pagamento", discountPrice: "pagamento", dividedIn: "pagamento", paymentMethods: "pagamento", allowCheckout: "pagamento",
  description: "conteudo", gradeTheory: "conteudo", gradePracticle: "conteudo", gifts: "conteudo", whyUs: "conteudo", faq: "conteudo",
  imageUrl: "pagina", image: "pagina", videoUrl: "pagina", videoTitle: "pagina", videoSubtitle: "pagina", videoDescription: "pagina",
  landingContent: "pagina", landingLayout: "pagina", landingAbTest: "pagina", landingAbLayouts: "pagina",
  allowExam: "avaliacao", allowReview: "avaliacao", classCode: "avaliacao",
};

/** Nome do campo como aparece na tela (lista do que falta). */
const FIELD_LABEL: Record<string, string> = {
  courseId: "Curso", name: "Nome da turma", onlineCourseModelId: "Modelo do curso online", customerId: "Cliente",
  hoursDuration: "Carga horária", daysDuration: "Dias de duração", initialDate: "Data de início", finalDate: "Data de fim",
  landingPagesDates: "Datas no site", maxSubscriptions: "Máximo de inscrições", periodSubscriptionsInitialDate: "Início das inscrições",
  periodSubscriptionsFinalDate: "Fim das inscrições", price: "Valor", discountPrice: "Valor promocional", dividedIn: "Parcelamento",
  description: "Descrição", gradeTheory: "Grade teórica", gradePracticle: "Grade prática", whyUs: "Por que nos escolher", faq: "Perguntas frequentes",
  videoUrl: "URL do vídeo", image: "Imagem", classCode: "Código de acesso da prova", highlightLabel: "Texto da faixa",
};

const tabOf = (field: string): TabSlug => FIELD_TO_TAB[field.split(".")[0]] ?? "basico";

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
    highlightTheme: (fd?.highlightTheme as FormData["highlightTheme"]) || null,
    highlightLabel: fd?.highlightLabel || null,
    highlightPattern: (fd?.highlightPattern as FormData["highlightPattern"]) || null,
    highlightBorder: (fd?.highlightBorder as FormData["highlightBorder"]) || null,
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
    landingContent: parseLandingContent(formData?.landingContent),
    landingLayout: formData?.landingLayout || "classico",
    landingAbTest: !!formData?.landingAbTest,
    landingAbLayouts: Array.isArray(formData?.landingAbLayouts) ? formData.landingAbLayouts : [],
    // a API devolve o JSON como objeto (antes vinha texto); o editor trabalha com texto
    whyUs:
      (fd?.whyUs && typeof fd.whyUs === "object" ? JSON.stringify(fd.whyUs) : fd?.whyUs) ||
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

// ─── Validação ────────────────────────────────────────────────────────────────

/** Erros do formulário inteiro, pelo mesmo Schema do envio (campo → mensagem). */
function collectErrors(dataForm: FormData): Record<string, string> {
  const result = Schema.safeParse(dataForm);
  if (result.success) return {};
  const out: Record<string, string> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join(".");
    if (path && !out[path]) out[path] = error.message;
  });
  return out;
}

const errorsOfTab = (errors: Record<string, string>, tab: TabSlug) =>
  Object.fromEntries(Object.entries(errors).filter(([field]) => tabOf(field) === tab));

// ─── Componente principal ─────────────────────────────────────────────────────

const TurmaPage = ({ formData, onSuccess }: TurmaPageProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoader();

  // Lê ?tab= da URL (useSearch precisa de um tipo; usamos as any para não depender do tipo gerado)
  const search = useSearch({ strict: false }) as Record<string, string>;
  // "midia" não existe mais: foto e vídeo foram para "Página no site"
  const requestedTab = search.tab === "midia" ? "pagina" : search.tab;
  const activeTab: TabSlug = TABS.some((tab) => tab.slug === requestedTab) ? (requestedTab as TabSlug) : "basico";

  const [dataForm, setDataForm] = useState<FormData>(() =>
    buildDefaults(formData),
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [initialSnapshot] = useState(() => JSON.stringify(buildDefaults(formData)));
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);

  // Erros do formulário inteiro a cada mudança; `errors` (o que aparece em vermelho)
  // só ganha campos quando a pessoa tenta avançar ou salvar, e perde os que ela corrige
  const liveErrors = useMemo(() => collectErrors(dataForm), [dataForm]);
  useEffect(() => {
    setErrors((prev) => {
      const kept = Object.fromEntries(Object.keys(prev).filter((field) => liveErrors[field]).map((field) => [field, liveErrors[field]]));
      return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
    });
  }, [liveErrors]);
  // passos já visitados (na criação, os de depois ficam "a fazer" até a pessoa chegar neles)
  const [visited, setVisited] = useState<Set<TabSlug>>(() => new Set(formData ? TABS.map((tab) => tab.slug) : ["basico"]));
  // Resultados, Venda e Vagas de empresas só existem para turma salva; Venda, só para turma
  // fechada (com cliente); Vagas de empresas, só para turma aberta
  const visibleTabs = formData
    ? TABS.filter((tab) => tab.slug !== "empresas" || !formData.customerId)
    : TABS.filter((tab) => !VIEW_TABS.includes(tab.slug));

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
      setVisited((prev) => (prev.has(tab as TabSlug) ? prev : new Set([...prev, tab as TabSlug])));
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
        // a tela de edição guarda a turma em ["classes", id]: sem isso, reabrir a turma
        // mostrava a versão antiga e o próximo salvamento regravava dados velhos
        // (ex.: o endereço de uma foto que a API já tinha apagado ao trocar)
        queryClient.invalidateQueries({ queryKey: ["classes"] });
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
    const all = collectErrors(dataForm);
    if (Object.keys(all).length) {
      setErrors(all);
      const first = TABS.find((tab) => Object.keys(all).some((field) => tabOf(field) === tab.slug));
      if (first && first.slug !== activeTab) handleTabChange(first.slug);
      focusFirstError();
      toast({
        title: "Falta corrigir antes de salvar",
        description: first ? `Os campos marcados em "${first.label}".` : "Confira os campos marcados.",
        variant: "destructive",
      });
      return;
    }

    const submissionData = {
      ...dataForm,
      faq: JSON.stringify(dataForm.faq || []),
      // vazio = "sem destaque" (o envio pula null; a API trata "" como limpar)
      highlightTheme: dataForm.highlightTheme || "",
      highlightLabel: dataForm.highlightLabel || "",
      highlightPattern: dataForm.highlightPattern || "",
      highlightBorder: dataForm.highlightBorder || "",
      landingContent: JSON.stringify(compactLandingContent(parseLandingContent(dataForm.landingContent))),
      landingAbLayouts: JSON.stringify(dataForm.landingAbLayouts || []),
      landingLayout: dataForm.landingLayout || "classico",
      landingAbTest: !!dataForm.landingAbTest && (dataForm.landingAbLayouts || []).length >= 2,
    } as unknown as FormData;

    // a foto muda pelo upload (campo image) ou é removida (imageUrl vazio); reenviar o
    // mesmo endereço não muda nada e, com dado velho, pode apontar para foto apagada
    if (formData && (submissionData as unknown as Record<string, unknown>).imageUrl === formData.imageUrl) {
      delete (submissionData as unknown as Record<string, unknown>).imageUrl;
    }

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

  // ── Conteúdo de cada passo ────────────────────────────────────────────────
  const stepProps = { dataForm, setDataForm, errors, setErrors };

  const stepContent: Record<TabSlug, React.ReactNode> = {
    basico: <Step1BasicInfo {...stepProps} section="dados" />,
    periodo: (
      <div className="space-y-8">
        <Step2Period {...stepProps} />
        <Step7Evaluation {...stepProps} generateClassCode={generateClassCode} section="local" />
      </div>
    ),
    inscricoes: <Step3Subscriptions {...stepProps} />,
    pagamento: <Step4Payment {...stepProps} />,
    conteudo: (
      <div className="space-y-8">
        <Step5Content {...stepProps} />
        <Step6Media {...stepProps} section="conteudo" />
      </div>
    ),
    pagina: (
      <div className="space-y-8">
        <section className="rounded-card border bg-card p-4 space-y-4">
          <div>
            <h3 className="font-semibold">Foto e vídeo da turma</h3>
            <p className="text-xs text-muted-foreground">A foto aparece na lista de turmas e no topo da página. O vídeo é opcional.</p>
          </div>
          <Step1BasicInfo {...stepProps} section="imagem" />
          <Step6Media {...stepProps} section="video" />
        </section>
        <Step8Page {...stepProps} classId={formData?.id} />
      </div>
    ),
    avaliacao: <Step7Evaluation {...stepProps} generateClassCode={generateClassCode} section="prova" />,
    venda: formData?.id ? <TurmaVenda classId={formData.id} /> : null,
    resultados: formData?.id ? <PaginaResultados classId={formData.id} /> : null,
    empresas: formData?.id ? <VagasEmpresas classId={formData.id} isClosed={Boolean(formData.customerId)} /> : null,
  };

  const isSaving = isPending || isPendingUpdate;

  // ── Navegação entre passos ─────────────────────────────────────────────────
  // Avança só com o passo completo; Resultados é só leitura e fica fora da sequência
  const formTabs = TABS.filter((tab) => !VIEW_TABS.includes(tab.slug));
  const currentTabIndex = formTabs.findIndex((tab) => tab.slug === activeTab);
  const isFirstTab = currentTabIndex <= 0;
  const isLastTab = VIEW_TABS.includes(activeTab) || currentTabIndex === formTabs.length - 1;

  /** Leva a pessoa ao primeiro campo marcado (depois que a tela troca de passo). */
  const focusFirstError = () => {
    window.setTimeout(() => {
      const el = formRef.current?.querySelector<HTMLElement>("[data-field-error]");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof el.focus === "function") el.focus({ preventScroll: true });
    }, 120);
  };

  /** Mostra os erros de um passo e diz o que falta. Devolve true se o passo está completo. */
  const checkTab = (tab: TabSlug) => {
    const mine = errorsOfTab(collectErrors(dataForm), tab);
    if (!Object.keys(mine).length) return true;
    setErrors((prev) => ({ ...prev, ...mine }));
    const label = TABS.find((t) => t.slug === tab)?.label ?? "";
    toast({ title: `Falta preencher em "${label}"`, description: "Os campos marcados em vermelho são obrigatórios ou estão inválidos.", variant: "destructive" });
    return false;
  };

  const goToTab = (target: TabSlug) => {
    if (target === activeTab) return;
    const targetIndex = formTabs.findIndex((tab) => tab.slug === target);
    // voltar ou ir para Resultados é livre; avançar exige os passos do caminho completos
    if (!VIEW_TABS.includes(target) && targetIndex > currentTabIndex) {
      for (const tab of formTabs.slice(Math.max(0, currentTabIndex), targetIndex)) {
        if (!checkTab(tab.slug)) {
          if (tab.slug !== activeTab) handleTabChange(tab.slug);
          focusFirstError();
          return;
        }
      }
    }
    handleTabChange(target);
  };
  const goToNextTab = () => {
    const next = formTabs[currentTabIndex + 1];
    if (!next) return;
    if (!checkTab(activeTab)) return focusFirstError();
    handleTabChange(next.slug);
  };
  const goToPrevTab = () => {
    const prev = formTabs[currentTabIndex - 1];
    if (prev) handleTabChange(prev.slug);
  };

  // Marca em vermelho exatamente os campos com erro do passo aberto
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = formRef.current;
    if (!root) return;
    root.querySelectorAll("[data-field-error]").forEach((el) => {
      el.removeAttribute("data-field-error");
      el.removeAttribute("aria-invalid");
    });
    Object.keys(errors).forEach((field) => {
      const name = field.split(".")[0];
      const el =
        root.querySelector<HTMLElement>(`#${CSS.escape(name)}, [name="${CSS.escape(name)}"]`) ??
        // seletores próprios (Select, calendário) não têm id: marca o controle logo abaixo do rótulo
        root.querySelector<HTMLElement>(`label[for="${CSS.escape(name)}"]`)?.parentElement?.querySelector<HTMLElement>("button, input, textarea, [role=combobox]") ??
        null;
      if (el) {
        el.setAttribute("data-field-error", "");
        el.setAttribute("aria-invalid", "true");
      }
    });
  });

  const tabState = (tab: TabSlug): "done" | "attention" | "todo" => {
    if (VIEW_TABS.includes(tab)) return "todo";
    const has = Object.keys(liveErrors).some((field) => tabOf(field) === tab);
    if (!visited.has(tab)) return "todo";
    return has ? "attention" : "done";
  };

  const currentErrors = Object.entries(errors).filter(([field]) => tabOf(field) === activeTab);
  const pendingTabs = formTabs.filter((tab) => Object.keys(liveErrors).some((field) => tabOf(field) === tab.slug));
  const tabInfo = TABS.find((tab) => tab.slug === activeTab) ?? TABS[0];

  const SaveButton = (
    <Button onClick={handleSubmit} disabled={isSaving} variant={isLastTab || !formData ? "default" : "outline"}>
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
          <StatusBadge tone={formData.active ? "success" : "neutral"}>
            {formData.active ? "Ativa" : "Inativa"}
          </StatusBadge>
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
      <style>{`.turma-form [data-field-error]{border-color:hsl(var(--destructive))!important;box-shadow:0 0 0 1px hsl(var(--destructive))!important}`}</style>
      <div className="sticky top-0 z-10 bg-background border-b">
        {HeaderBar}
        <div className="px-4 pb-3">
          <StepsBar tabs={visibleTabs} current={activeTab} state={tabState} onGo={goToTab} />
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
          <div ref={formRef} className="turma-form min-w-0 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{tabInfo.heading}</h2>
              <p className="text-sm text-muted-foreground">{tabInfo.description}</p>
            </div>
            {currentErrors.length > 0 && (
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Falta corrigir {currentErrors.length === 1 ? "1 campo" : `${currentErrors.length} campos`} neste passo
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {currentErrors.map(([field, message]) => (
                    <li key={field}>
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => {
                          const el = formRef.current?.querySelector<HTMLElement>("[data-field-error]");
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          el?.focus?.({ preventScroll: true });
                        }}
                      >
                        <span className="font-medium">{FIELD_LABEL[field.split(".")[0]] ?? field}:</span> {message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stepContent[activeTab]}
          </div>

          <TurmaSummary dataForm={dataForm} formData={formData} pendingTabs={pendingTabs.map((tab) => tab.label)} onGo={(label) => {
            const tab = TABS.find((t) => t.label === label);
            if (tab) handleTabChange(tab.slug);
          }} />
        </div>
      </div>

      {/* ── Rodapé fixo ──────────────────────────────────────────────────────── */}
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
        <div className="flex flex-wrap justify-end gap-2">
          {!isFirstTab && !VIEW_TABS.includes(activeTab) && (
            <Button variant="outline" onClick={goToPrevTab}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          {/* na edição dá para salvar de qualquer passo; na criação, no último */}
          {(formData || isLastTab) && SaveButton}
          {!isLastTab && (
            <Button onClick={goToNextTab}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
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

// ─── Linha de passos ──────────────────────────────────────────────────────────

function StepsBar({ tabs, current, state, onGo }: {
  tabs: readonly { slug: TabSlug; label: string }[];
  current: TabSlug;
  state: (tab: TabSlug) => "done" | "attention" | "todo";
  onGo: (tab: TabSlug) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const row = list.current, button = active.current;
    if (!row || !button) return;
    const left = button.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    row.scrollTo({ left: left - (row.clientWidth - button.clientWidth) / 2, behavior: "smooth" });
  }, [current]);
  const index = tabs.findIndex((tab) => tab.slug === current);
  return (
    <nav aria-label="Passos da turma">
      <p className="sm:hidden text-xs text-muted-foreground mb-1">Passo {index + 1} de {tabs.length}</p>
      <ol ref={list} className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab, i) => {
          const isCurrent = tab.slug === current;
          const st = state(tab.slug);
          return (
            <li key={tab.slug} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <span aria-hidden className={cn("h-px w-3 sm:w-6", i <= index ? "bg-primary" : "bg-border")} />}
              <button
                type="button"
                ref={isCurrent ? active : undefined}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onGo(tab.slug)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm transition-colors",
                  isCurrent ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                    isCurrent ? "bg-primary-foreground/25" : st === "done" ? "bg-emerald-500 text-white" : st === "attention" ? "bg-destructive text-white" : "border border-border",
                  )}
                >
                  {st === "done" && !isCurrent ? "✓" : st === "attention" && !isCurrent ? "!" : ""}
                </span>
                {tab.label}
                {st === "attention" && <span className="sr-only">(falta preencher)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Resumo fixo ──────────────────────────────────────────────────────────────

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : null);

function TurmaSummary({ dataForm, formData, pendingTabs, onGo }: { dataForm: FormData; formData?: IEntity; pendingTabs: string[]; onGo: (label: string) => void }) {
  const { theme } = useTheme();
  const price = Number(dataForm.price) || 0;
  const discount = Number(dataForm.discountPrice) || 0;
  const siteBase = process.env.NODE_ENV === "development" ? "http://localhost:3030" : theme.companyData?.lp_domain ? `https://${theme.companyData.lp_domain}` : "https://www.worksafebrasil.com.br";
  const abLayouts = (dataForm.landingAbLayouts as string[] | undefined) ?? [];
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Turma", value: dataForm.name || <span className="text-muted-foreground">Sem nome</span> },
    { label: "Datas", value: dataForm.periodClass === "UNLIMITED" ? "Turma contínua" : dataForm.landingPagesDates || [shortDate(dataForm.initialDate), shortDate(dataForm.finalDate)].filter(Boolean).join(" a ") || "—" },
    { label: "Carga", value: `${dataForm.hoursDuration || 0} h · ${dataForm.daysDuration || 0} ${dataForm.daysDuration === 1 ? "dia" : "dias"}` },
    { label: "Local", value: [dataForm.city, dataForm.state].filter(Boolean).join(" · ") || "—" },
    {
      label: "Inscrições",
      value: !dataForm.allowSubscriptions
        ? "Fechadas"
        : dataForm.periodSubscriptionsType === "LIMITED" && dataForm.periodSubscriptionsFinalDate
          ? `Abertas até ${shortDate(dataForm.periodSubscriptionsFinalDate)}`
          : "Sempre abertas",
    },
    { label: "Vagas", value: dataForm.unlimitedSubscriptions ? "Ilimitadas" : `${dataForm.maxSubscriptions || 0}${dataForm.minimumQuorum ? ` · quórum ${dataForm.minimumQuorum}` : ""}` },
    { label: "Valor", value: price > 0 ? `${brl(discount > 0 ? discount : price)}${(dataForm.dividedIn || 1) > 1 ? ` em até ${dataForm.dividedIn}x` : ""}` : "Sob consulta" },
    { label: "Pagamento no site", value: dataForm.allowCheckout ? "Checkout ligado" : "Pelo WhatsApp" },
    { label: "Página", value: dataForm.landingAbTest && abLayouts.length >= 2 ? `Teste A/B: ${abLayouts.map(layoutName).join(", ")}` : layoutName(dataForm.landingLayout) },
    { label: "Prova", value: dataForm.allowExam ? `Sim · código ${dataForm.classCode || "—"}` : "Não" },
  ];
  return (
    <aside className="hidden lg:block lg:sticky lg:top-36 rounded-lg border bg-background p-4 text-sm" aria-live="polite">
      <h2 className="font-semibold">Resumo</h2>
      <dl className="mt-2 grid gap-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t pt-3">
        {pendingTabs.length ? (
          <>
            <p className="text-xs font-medium text-destructive">Falta preencher</p>
            <ul className="mt-1 space-y-0.5">
              {pendingTabs.map((label) => (
                <li key={label}><button type="button" className="text-left text-sm hover:underline" onClick={() => onGo(label)}>{label}</button></li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Tudo certo para salvar.</p>
        )}
      </div>
      {formData?.id && (
        <a href={`${siteBase}/turma/${formData.id}?preview=1`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Icon name="external-link" className="w-3.5 h-3.5" /> Ver a página salva no site
        </a>
      )}
    </aside>
  );
}

export default TurmaPage;
