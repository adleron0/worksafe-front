import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import StatusBadge from "@/components/general-components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { money } from "../../../comercial/-shared/commercial";
import { dateBr, InvoiceStatus, STATUS_INFO } from "./fiscal";

export interface ContractFiscalSummary {
  contractId: number;
  number: string;
  value: number;
  invoiced: number;
  invoicedTest: number;
  balance: number;
  invoices: Array<{ id: number; number: string | null; status: InvoiceStatus; provider: string; environment: string; amount: number; issuedAt: string | null; kind: string | null; mode: string | null; label: string | null; coverage: { used: number; left: number } | null }>;
  available: Array<{ id: number; number: string | null; left: number; issuedAt: string | null; environment: string }>;
}

export const contractFiscalKey = (contractId: number) => ["fiscalContractSummary", contractId];

export function useContractFiscal(contractId: number, enabled = true) {
  const { can } = useVerify();
  return useQuery({
    queryKey: contractFiscalKey(contractId),
    queryFn: async () => (await api.get<ContractFiscalSummary>(`fiscal/contracts/${contractId}/summary`)).data,
    enabled: enabled && can("view_nfse") && !!contractId,
  });
}

const KIND_LABEL: Record<string, string> = { installments: "parcela", measurement: "boletim", rental: "locação", contract: "contrato" };

/**
 * Card "Notas fiscais" do contrato: valor, quanto já tem nota e o saldo a notar,
 * as notas do contrato e os atalhos para emitir a nota do saldo, do contrato
 * inteiro ou de um valor livre.
 */
export function ContractFiscalCard({ contractId }: { contractId: number }) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const { data } = useContractFiscal(contractId);
  if (!can("view_nfse") || !data) return null;
  const emit = (mode: "total" | "saldo" | "livre") => navigate({ to: "/financeiro/notas/nova", search: { origem: "contract", contrato: String(contractId), modo: mode } as never });
  const nothingYet = data.invoices.every((i) => i.status !== "autorizada");
  return (
    <section className="rounded-card border bg-card p-4 text-sm" aria-label="Notas fiscais do contrato">
      <h2 className="font-semibold text-base flex items-center gap-1.5"><Icon name="file-badge" className="w-4 h-4" /> Notas fiscais</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border px-2 py-1.5"><p className="text-[11px] text-muted-foreground">Contrato</p><p className="font-semibold tabular-nums">{money(data.value)}</p></div>
        <div className="rounded-lg border px-2 py-1.5"><p className="text-[11px] text-muted-foreground">Com nota</p><p className="font-semibold tabular-nums">{money(data.invoiced + data.invoicedTest)}</p></div>
        <div className="rounded-lg border px-2 py-1.5 bg-primary-soft"><p className="text-[11px] text-muted-foreground">Saldo a notar</p><p className="font-semibold tabular-nums">{money(data.balance)}</p></div>
      </div>
      {data.invoicedTest > 0 && <p className="text-[11px] text-muted-foreground mt-1">Inclui {money(data.invoicedTest)} em notas de teste (sem valor fiscal).</p>}
      {data.invoices.length > 0 && (
        <ul className="mt-3 divide-y">
          {data.invoices.map((inv) => (
            <li key={inv.id} className="py-1.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link to="/financeiro/notas/$invoiceId" params={{ invoiceId: String(inv.id) }} className="underline font-medium">{inv.number ? `NF ${inv.number}` : `Rascunho ${inv.id}`}</Link>
                <span className="text-xs text-muted-foreground"> · {inv.kind ? KIND_LABEL[inv.kind] ?? inv.kind : "avulsa"}{inv.coverage ? ` · saldo ${money(inv.coverage.left)}` : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="tabular-nums">{money(inv.amount)}</span>
                <StatusBadge tone={STATUS_INFO[inv.status].tone} pulse={false}>{STATUS_INFO[inv.status].label}</StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
      {can("emitir_nfse") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.balance > 0.009 && <Button type="button" size="sm" onClick={() => emit(nothingYet ? "total" : "saldo")}>{nothingYet ? "Nota do contrato inteiro" : "Nota do saldo"}</Button>}
          <Button type="button" size="sm" variant="outline" onClick={() => emit("livre")}>Valor livre</Button>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">A nota de cada parcela sai pelo botão de faturar. A nota do contrato não gera cobrança: ao faturar as parcelas, use "nota já emitida".</p>
    </section>
  );
}

/**
 * No faturamento (parcela, boletim, OL): escolher uma nota do contrato que já foi
 * emitida, em vez de digitar o número. Só aparece quando há nota com saldo.
 */
export function UseIssuedInvoice({ contractId, amount, value, onChange }: {
  contractId: number; amount: number; value: number | null;
  onChange: (invoice: { id: number; number: string; issuedAt: string | null } | null) => void;
}) {
  const { data } = useContractFiscal(contractId);
  const options = (data?.available ?? []).filter((i) => i.left + 0.009 >= amount);
  if (!data || !data.available.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2.5 grid gap-1.5">
      <Label>Usar nota já emitida do contrato</Label>
      <Select name="coveringInvoice" modal state={value ? String(value) : "nova"}
        options={[{ id: "nova", name: "Não: registrar outra nota" }, ...options.map((i) => ({ id: String(i.id), name: `NF ${i.number} de ${dateBr(i.issuedAt)} · saldo ${money(i.left)}${i.environment === "restrita" ? " (teste)" : ""}` }))] as never[]}
        onChange={(_, v) => {
          const id = Number(Array.isArray(v) ? v[0] : v) || null;
          const inv = data.available.find((i) => i.id === id);
          onChange(inv ? { id: inv.id, number: inv.number ?? String(inv.id), issuedAt: inv.issuedAt } : null);
        }} />
      {options.length < data.available.length && <p className="text-[11px] text-muted-foreground">Notas com saldo menor que {money(amount)} não aparecem.</p>}
    </div>
  );
}
