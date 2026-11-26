import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { StatusTone } from "@/components/general-components/StatusBadge";

/** Área fiscal (NFS-e Nacional): tipos e consultas usados nas telas de notas e de configuração. */

export type InvoiceStatus = "rascunho" | "emitindo" | "autorizada" | "rejeitada" | "cancelada" | "substituida";
export type FederalTax = "inss" | "ir" | "csll" | "pis" | "cofins";

export const STATUS_INFO: Record<InvoiceStatus, { label: string; tone: StatusTone; pulse?: boolean }> = {
  rascunho: { label: "Rascunho", tone: "neutral", pulse: false },
  emitindo: { label: "Enviando", tone: "info" },
  autorizada: { label: "Autorizada", tone: "success", pulse: false },
  rejeitada: { label: "Rejeitada", tone: "danger" },
  cancelada: { label: "Cancelada", tone: "neutral", pulse: false },
  substituida: { label: "Substituída", tone: "neutral", pulse: false },
};

export const FEDERAL_TAXES: Array<{ id: FederalTax; name: string; hint: string }> = [
  { id: "inss", name: "INSS", hint: "Cessão de mão de obra (normalmente 11%)" },
  { id: "ir", name: "IR", hint: "Normalmente 1,5% (serviços profissionais) ou 1%" },
  { id: "csll", name: "CSLL", hint: "Normalmente 1%" },
  { id: "pis", name: "PIS", hint: "Normalmente 0,65%" },
  { id: "cofins", name: "COFINS", hint: "Normalmente 3%" },
];

export interface TakerSnapshot {
  kind: "cliente" | "aluno" | "avulso";
  document: string;
  name: string;
  municipalRegistration?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: { ibge: string | null; cityName?: string | null; uf?: string | null; cep: string; street: string; number: string; complement?: string | null; district: string } | null;
}

/** CNPJ do grupo de um registro, como as listas mostram. */
export interface EntityRef { tradeName: string; color: string | null; cnpj: string }

export interface Invoice {
  id: number;
  status: InvoiceStatus;
  /** CNPJ do grupo que emite a nota */
  entityId: number | null;
  entity?: EntityRef | null;
  statusLabel: string;
  provider: "sefin" | "externa";
  environment: "restrita" | "producao";
  takerKind: TakerSnapshot["kind"];
  customerId: number | null;
  traineeId: number | null;
  taker: TakerSnapshot;
  service: { serviceCodeId: number | null; name: string | null; nationalCode: string; nationalLabel?: string | null; nbsCode?: string | null; issTaxation: number };
  serviceCodeId: number | null;
  description: string;
  placeOfService: string;
  competence: string;
  grossValue: number;
  discountValue: number;
  issRate: number | null;
  issValue: number;
  issWithheld: boolean;
  federalRetentions: Record<FederalTax, number> | null;
  retentions: Partial<Record<FederalTax, { rate?: number | null; value?: number | null }>>;
  reference: string | null;
  order: string | null;
  notes: string | null;
  netValue: number;
  dpsSeries: string | null;
  dpsNumber: number | null;
  dpsId: string | null;
  accessKey: string | null;
  number: string | null;
  issuedAt: string | null;
  sentAt: string | null;
  hasXml: boolean;
  externalUrl: string | null;
  messages: Array<{ code: string; message: string }>;
  receivable: { dueDate?: string; description?: string | null; paymentMethod?: string } | null;
  origin: (InvoiceOrigin & { label?: string }) | null;
  originBilledAt: string | null;
  replacesId: number | null;
  replacedById: number | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  emailSentAt: string | null;
  emailSentTo: string | null;
  createdAt: string;
  events?: Array<{ id: number; kind: string; detail: Record<string, unknown> | null; createdAt: string; userId: number | null }>;
  receivables?: Array<{ id: number; description: string | null; value: number; netValue: number | null; status: string; dueDate: string | null; paidAt: string | null; inactiveAt: string | null }>;
}

export interface InvoiceOrigin {
  kind: "installments" | "measurement" | "rental" | "contract" | "subscriptions";
  subscriptionIds?: number[];
  mode?: "total" | "saldo" | "livre";
  contractId: number;
  installmentIds?: number[];
  measurementId?: number;
  rentalId?: number;
  dueDate?: string | null;
  paymentMethod?: string | null;
}

/** Rascunho sugerido a partir de uma origem (GET fiscal/invoices/from-origin). */
export interface OriginDraft {
  takerKind: "cliente" | "avulso";
  customerId: number | null;
  taker?: Partial<TakerSnapshot>;
  serviceCodeId: number | null;
  grossValue: number;
  competence: string;
  issWithheld: boolean;
  issRate: number | null;
  retentions: Partial<Record<FederalTax, { rate?: number | null }>>;
  reference: string | null;
  order: string | null;
  description: string;
  origin: InvoiceOrigin;
  originLabel: string;
}

export interface InvoiceList {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  summary: { authorized: number; gross: number; iss: number; net: number; retained: number; byStatus: Partial<Record<InvoiceStatus, number>> };
}

export interface ServiceCode {
  id: number;
  /** CNPJ do grupo (nulo = vale para todos) */
  entityId: number | null;
  name: string;
  nationalCode: string;
  nationalLabel: string | null;
  municipalCode: string | null;
  nbsCode: string | null;
  nbsLabel: string | null;
  issRate: number | null;
  issTaxation: number;
  description: string;
  isDefault: boolean;
  inactiveAt: string | null;
  ibsCbsIndOp: string | null;
  ibsCbsClassTrib: string | null;
  ibsCbsIndOpLabel: string | null;
  ibsCbsSuggestion: { indOp: string; classTrib: string; name: string; note?: string } | null;
}

export interface FiscalSettings {
  entityId: number;
  environment: "restrita" | "producao";
  municipalRegistration: string | null;
  simplesNacional: number;
  simplesRegime: number | null;
  specialRegime: number;
  simplesTotalRate: number | null;
  pisCofinsCst: string;
  dpsSeries: string;
  nextDpsNumber: number;
  nextDpsNumberTest: number;
  autoSendEmail: boolean;
  autoEmitTraining: boolean;
  ibsCbsEnabled: boolean;
  rentalNfseFrom: string | null;
  autoEmitTrainingSince: string | null;
  defaultNotes: string | null;
  certificateSubject: string | null;
  certificateDocument: string | null;
  certificateValidFrom: string | null;
  certificateValidTo: string | null;
  certificateUpdatedAt: string | null;
  certificateDaysLeft: number | null;
  hasCertificate: boolean;
  emitter: { entityId: number; tradeName: string; cnpj: string; name: string; ibge: string | null; cityName: string | null; uf: string | null; address: string };
  serviceCodes: number;
  ready: boolean;
  pending: string[];
}

export interface Preview {
  entityId: number;
  emitter: { entityId: number; tradeName: string; cnpj: string; name: string };
  taker: TakerSnapshot;
  description: string;
  notes: string | null;
  competence: string;
  placeOfService: string;
  environment: "restrita" | "producao";
  calc: {
    gross: number; discount: number; base: number; issRate: number | null; issValue: number; issWithheld: boolean;
    federal: Record<FederalTax, { tax: FederalTax; rate: number | null; value: number }>;
    federalTotal: number; retainedTotal: number; net: number;
  };
  errors: string[];
  warnings: string[];
  canEmit: boolean;
}

export const FISCAL_KEYS = { settings: "fiscalSettings", invoices: "fiscalInvoices", invoice: "fiscalInvoice", services: "fiscalServiceCodes" } as const;

/** Configuração fiscal de um CNPJ do grupo (sem `entityId`, a do CNPJ padrão). */
export function useFiscalSettings(enabled = true, entityId?: number | null) {
  return useQuery({
    queryKey: [FISCAL_KEYS.settings, entityId ?? null],
    queryFn: async () => (await api.get<FiscalSettings>("fiscal/settings", { params: entityId ? { entityId } : {} })).data,
    enabled,
  });
}

/** Situação fiscal de cada CNPJ do grupo (pronto para emitir? o que falta?). */
export interface FiscalOverview { entityId: number; tradeName: string; cnpj: string; color: string | null; environment: "restrita" | "producao"; hasCertificate: boolean; certificateDaysLeft: number | null; ready: boolean; pending: string[] }
export function useFiscalOverview(enabled = true) {
  return useQuery({ queryKey: [FISCAL_KEYS.settings, "overview"], queryFn: async () => (await api.get<FiscalOverview[]>("fiscal/settings/overview")).data, enabled });
}

/** Serviços fiscais; com `entityId`, só os que valem para aquele CNPJ (os dele e os de todos). */
export function useServiceCodes(all = false, entityId?: number | null) {
  return useQuery({
    queryKey: [FISCAL_KEYS.services, all, entityId ?? null],
    queryFn: async () => (await api.get<ServiceCode[]>("fiscal/service-codes", { params: { ...(all ? { all: 1 } : {}), ...(entityId ? { entityId } : {}) } })).data,
  });
}

export const formatDoc = (doc?: string | null) => {
  const d = String(doc ?? "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc ?? "";
};

export const dateBr = (iso?: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
export const dateTimeBr = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
export const todayIso = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

/** Baixa ou abre um arquivo protegido da API (PDF/XML da nota). */
export async function openFile(path: string, fileName: string, download = false, params: Record<string, string> = {}) {
  const response = await api.get<Blob>(path, { responseType: "blob", params: download ? { ...params, download: 1 } : params });
  const url = URL.createObjectURL(response.data);
  if (download) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Inscrição paga de turma aberta sem nota (GET fiscal/training/pending). */
export interface PendingTraining {
  subscriptionId: number;
  /** CNPJ da turma: a nota sai por ele */
  entityId: number | null;
  name: string;
  cpf: string;
  email: string;
  classId: number | null;
  className: string | null;
  courseName: string | null;
  customer: { id: number; name: string } | null;
  value: number;
  paidAt: string | null;
  invoice: { id: number; status: InvoiceStatus } | null;
}

export function usePendingTraining(enabled = true) {
  return useQuery({ queryKey: ["fiscalPendingTraining"], queryFn: async () => (await api.get<PendingTraining[]>("fiscal/training/pending")).data, enabled });
}

/** NFS-e que fornecedores emitiram contra a empresa (GET fiscal/received). */
export type ReceivedStatus = "nova" | "lancada" | "ignorada" | "cancelada";
export interface ReceivedInvoice {
  id: number;
  entityId: number | null;
  entity?: EntityRef | null;
  nsu: number;
  accessKey: string;
  number: string | null;
  issuedAt: string | null;
  competence: string | null;
  issuerDocument: string;
  issuerName: string;
  description: string | null;
  grossValue: number;
  netValue: number;
  issWithheld: boolean;
  issValue: number;
  retentions: Partial<Record<FederalTax, number>> | null;
  status: ReceivedStatus;
  supplierId: number | null;
  payableId: number | null;
}
export interface ReceivedList { data: ReceivedInvoice[]; byStatus: Partial<Record<ReceivedStatus, number>>; syncedAt: string | null }

export const RECEIVED_STATUS: Record<ReceivedStatus, { label: string; tone: StatusTone }> = {
  nova: { label: "A lançar", tone: "warning" },
  lancada: { label: "Lançada", tone: "success" },
  ignorada: { label: "Ignorada", tone: "neutral" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};
