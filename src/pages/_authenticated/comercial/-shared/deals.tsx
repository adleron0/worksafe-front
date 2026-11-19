import { cn } from "@/lib/utils";
import { ProposalKind, ProposalStatus } from "./proposals";

/** Negociação: propostas do mesmo cliente agrupadas (espelha a API). */
export type DealStatus = "aberta" | "ganha" | "parcial" | "perdida" | "vazia";
export type DiscountType = "percentual" | "valor";
export type DiscountSplit = "proporcional" | "igual" | "manual";
export type DiscountCondition = "incondicional" | "todas" | "marcadas";
export type DiscountBreak = "avisar" | "recalcular" | "retirar";
export type PlanAction = "gravar" | "revisar" | "travada" | "fora" | "igual";

export interface DealDiscount {
  enabled: boolean; type: DiscountType; value: number; split: DiscountSplit; manual: Record<string, number>;
  targets: number[]; condition: DiscountCondition; requiredIds: number[]; onBreak: DiscountBreak; appliedAt: string | null;
}
export interface DealBreach { at: string; reason: string; lost: number[]; action: DiscountBreak; pending: number[]; locked: number[] }
export interface DealProposal {
  id: number; number: string; title: string; kind: ProposalKind; status: ProposalStatus; total: number; base: number;
  ownDiscount: number; dealDiscount: number; planned: number; action: PlanAction; publicUrl: string | null;
}
export interface Deal {
  id: number; number: string; title: string; notes: string | null; createdAt: string;
  customer: { id: number; name: string } | null; seller: { id: number; name: string } | null;
  discount: DealDiscount; proposals: DealProposal[]; pendingChanges: number;
  status: DealStatus; statusLabel: string; total: number; won: number; discountTotal: number; conditionHolds: boolean; breach: DealBreach | null;
  publicUrl: string | null;
  activities: Array<{ id: number; type: string; subject: string; dueDate: string | null; dueTime: string | null; doneAt: string | null; proposalId: number | null; dealId: number | null }>;
  revised?: string[];
}
export interface DealRow {
  id: number; number: string; title: string; createdAt: string; customer: { id: number; name: string } | null; seller: string | null;
  discountEnabled: boolean; discountCondition: DiscountCondition;
  proposals: Array<{ id: number; number: string; kind: ProposalKind; status: ProposalStatus; total: number }>;
  status: DealStatus; statusLabel: string; total: number; won: number; discountTotal: number; conditionHolds: boolean; breach: DealBreach | null;
}
export interface DealPlan { plan: Array<{ id: number; number: string; status: ProposalStatus; base: number; current: number; planned: number; action: PlanAction }>; total: number; conditionHolds: boolean }

export const DEALS_KEY = "commercialDeals";
export const DEAL_KEY = "commercialDeal";

export const DEAL_STATUS: Record<DealStatus, { label: string; color: string }> = {
  aberta: { label: "Aberta", color: "#3b82f6" }, ganha: { label: "Ganha", color: "#22c55e" }, parcial: { label: "Parcialmente ganha", color: "#a3a635" },
  perdida: { label: "Perdida", color: "#ef4444" }, vazia: { label: "Sem propostas", color: "#9ca3af" },
};
export const DISCOUNT_TYPES: Array<{ id: DiscountType; name: string }> = [
  { id: "percentual", name: "Percentual sobre cada proposta" }, { id: "valor", name: "Valor em R$ no total" },
];
export const DISCOUNT_SPLITS: Array<{ id: DiscountSplit; name: string; hint: string }> = [
  { id: "proporcional", name: "Proporcional ao valor", hint: "Cada proposta leva a parte do desconto do tamanho do valor dela." },
  { id: "igual", name: "Em partes iguais", hint: "O desconto é dividido igualmente entre as propostas." },
  { id: "manual", name: "À mão (cada uma o seu)", hint: "Você digita o desconto de cada proposta." },
];
export const DISCOUNT_CONDITIONS: Array<{ id: DiscountCondition; name: string; hint: string }> = [
  { id: "incondicional", name: "Incondicional", hint: "Vale para cada proposta, feche o cliente todas ou não." },
  { id: "todas", name: "Só se fechar todas", hint: "Se uma proposta for perdida, a condição cai." },
  { id: "marcadas", name: "Só se fechar as marcadas", hint: "Se uma das marcadas for perdida, a condição cai." },
];
export const DISCOUNT_BREAKS: Array<{ id: DiscountBreak; name: string; hint: string }> = [
  { id: "avisar", name: "Avisar (o vendedor revisa)", hint: "Nada muda sozinho: aparece um aviso na negociação." },
  { id: "recalcular", name: "Recalcular entre as que ficaram", hint: "O desconto é rateado de novo só entre as propostas em aberto." },
  { id: "retirar", name: "Retirar o desconto", hint: "O desconto sai das propostas em aberto." },
];
export const ACTION_LABEL: Record<PlanAction, string> = {
  gravar: "Vai mudar", revisar: "Muda por revisão", travada: "Aceita: não muda", fora: "Fora da conta", igual: "Sem mudança",
};

export function DealStatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  const meta = DEAL_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", className)}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} /> {meta.label}
    </span>
  );
}
