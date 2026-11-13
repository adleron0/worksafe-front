import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { commercialApi } from "./commercial";

export type ProposalKind = "servico" | "treinamento" | "misto";
export type ProposalStatus = "rascunho" | "enviada" | "visualizada" | "aceita" | "recusada" | "expirada" | "cancelada" | "substituida";
export type ItemType = "mao_de_obra" | "locacao" | "material" | "treinamento" | "avulso";
export type DueRule = "data_fixa" | "dias_apos_aceite" | "dias_apos_nf" | "dias_apos_conclusao";

export interface DraftItem {
  /** só na tela */
  uid: string;
  id?: number; type: ItemType; description: string; unit: string | null; quantity: number;
  professionalId: number | null; night: boolean; travel: boolean; weekend: boolean;
  workDays: number | null; weekendDays: number | null; hoursPerDay: number | null;
  courseId: number | null; extra: { students?: number | null; workload?: number | null; dates?: string; location?: string } | null;
  unitCost: number; extraCost: number; margin?: number | null; finalValue: number | null; showInDocument: boolean;
}
export interface DraftSection { uid: string; id?: number; title: string; kind: ItemType; margin?: number; showInDocument: boolean; items: DraftItem[] }
export interface DraftInstallment { uid: string; percent: number | null; amount: number | null; dueRule: DueRule; dueDate: string | null; dueDays: number | null; description: string | null }

export interface ProposalDraft {
  kind: ProposalKind; customerId: number; contactName: string | null; contactEmail: string | null; contactPhone: string | null;
  requester: string | null; department: string | null; title: string; description: string | null; sellerId: number | null;
  validUntil: string | null; referenceDate: string; workDays: number; weekendDays: number;
  contingencyRate: number; commissionRate?: number; commissionBase?: "faturado" | "lucro"; commissionInPrice?: boolean;
  taxRegime: "tradicional" | "hibrido" | null; discount: number; internalNotes: string | null;
  sections: DraftSection[]; installments: DraftInstallment[];
}

export interface CalcLine { suggested: number; value: number; hours: number | null; listPrice: number | null; cost?: number; margin?: number | null; hourCost?: number | null }
export interface ProposalCalc {
  sections: Array<{ suggested: number; value: number; cost?: number; margin?: number; lines: CalcLine[] }>;
  totals: {
    suggested: number; subtotal: number; contingency: number; discount: number; net: number; taxOutside: number; total: number;
    cost?: number; taxInside?: number; tax?: number; profit?: number; profitRate?: number; commission?: number; customerCredit?: number; customerCost?: number;
  };
  installments: Array<{ value: number }>;
  installmentsTotal: number; installmentsDiff: number;
  margin?: { realTax: number; unused: number; unusedRate: number; used: number; usedRate: number; minTotal: number; minTotalOperational: number; maxDiscountRate: number };
  tax: { regime: "tradicional" | "hibrido"; outside: number; name?: string; inside?: number };
  costBase?: string;
}

export interface CustomerOption {
  id: number; name: string; corporateName: string; cnpj: string; email: string; phone: string;
  contacts?: Array<{ id: number; name: string; email: string; phone: string }>;
}

export interface Proposal {
  id: number; number: string; revision: number; rootId: number | null; status: ProposalStatus; inactiveAt: string | null;
  expired: boolean; editable: boolean; canSeeCosts: boolean; customer: CustomerOption;
  sentAt: string | null; decidedAt: string | null; statusNote: string | null; createdAt: string; updatedAt: string;
  baseOutdated: boolean; baseCapturedAt: string;
  versions: Array<{ id: number; number: string; revision: number; status: ProposalStatus; total: number }>;
  draft: Omit<ProposalDraft, "sections" | "installments"> & {
    sections: Array<Omit<DraftSection, "uid" | "items"> & { items: Array<Omit<DraftItem, "uid">> }>;
    installments: Array<Omit<DraftInstallment, "uid">>;
  };
  calc: ProposalCalc;
}

export interface ProposalRow {
  id: number; number: string; revision: number; kind: ProposalKind; status: ProposalStatus; title: string; total: number;
  validUntil: string | null; createdAt: string; sentAt: string | null; inactiveAt: string | null; seller: string | null; expired: boolean;
  customer: { id: number; name: string };
}

export interface ProposalOptions {
  date: string; canSeeCosts: boolean; hoursPerDay: number;
  defaults: { contingencyLevels: Array<{ label: string; rate: number }>; contingencyRate: number; margins?: Record<string, number>; commission?: { rate: number; base: string; inPrice: boolean } };
  presets: Record<ProposalKind, Array<{ title: string; kind: ItemType; margin?: number }>>;
  tax: { regime: "tradicional" | "hibrido"; name?: string };
  professionals: Array<{ id: number; name: string; hourCost?: number }>;
  courses: Array<{ id: number; name: string; hoursDuration: number | null; classPrice: number | null; includedStudents: number | null; studentPrice: number | null }>;
  sellers: Array<{ id: number; name: string }>;
}

export const PROPOSALS_KEY = "commercialProposals";
export const PROPOSAL_KEY = "commercialProposal";

export const KIND_LABEL: Record<ProposalKind, string> = { servico: "Serviço", treinamento: "Treinamento", misto: "Serviço + treinamento" };
export const ITEM_LABEL: Record<ItemType, string> = {
  mao_de_obra: "Mão de obra", locacao: "Locação", material: "Material", treinamento: "Treinamento", avulso: "Item avulso",
};
export const STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho", enviada: "Enviada", visualizada: "Visualizada", aceita: "Aceita", recusada: "Recusada",
  expirada: "Expirada", cancelada: "Cancelada", substituida: "Substituída",
};
const STATUS_CLASS: Record<ProposalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  visualizada: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  aceita: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  recusada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  expirada: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  cancelada: "bg-muted text-muted-foreground line-through",
  substituida: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, expired }: { status: ProposalStatus; expired?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>
      {expired && <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLASS.expirada)}>Validade vencida</span>}
    </span>
  );
}

export const DUE_RULE_OPTIONS: Array<{ id: DueRule; name: string }> = [
  { id: "dias_apos_nf", name: "Dias após a nota fiscal" },
  { id: "dias_apos_aceite", name: "Dias após o aceite" },
  { id: "dias_apos_conclusao", name: "Dias após a conclusão" },
  { id: "data_fixa", name: "Data fixa" },
];

export const formatCnpj = (cnpj?: string) =>
  cnpj && cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : cnpj ?? "";

/** Busca de cliente por nome ou CNPJ + lista de resultados no Select do projeto. */
export function CustomerPicker({ value, onChange, disabled, initial, modal }: {
  value: number | null; onChange: (customer: CustomerOption | null) => void; disabled?: boolean; initial?: CustomerOption; modal?: boolean;
}) {
  const [search, setSearch] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["commercialCustomers", search],
    queryFn: () => commercialApi.get<CustomerOption[]>("proposals/customers", search ? { search } : undefined),
    enabled: !disabled,
  });
  // o cliente já escolhido continua na lista mesmo quando a busca não o traz
  const rows = [...(data ?? [])];
  if (initial && value === initial.id && !rows.some((row) => row.id === initial.id)) rows.unshift(initial);
  return (
    <div className="grid gap-2">
      {!disabled && (
        <Input name="customerSearch" value={search} onValueChange={(_, text) => setSearch(String(text))}
          placeholder="Buscar cliente por nome ou CNPJ..." icon="search" />
      )}
      <Select name="customerId" state={value ? String(value) : ""} disabled={disabled} modal={modal}
        placeholder={isFetching ? "Buscando..." : rows.length ? "Selecione o cliente" : "Nenhum cliente encontrado"}
        options={rows.map((row) => ({ id: row.id, name: `${row.name} — ${formatCnpj(row.cnpj)}` }))}
        onChange={(_, id) => onChange(rows.find((row) => String(row.id) === String(id)) ?? null)} />
    </div>
  );
}
