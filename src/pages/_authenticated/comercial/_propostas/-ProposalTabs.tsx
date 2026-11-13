import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, money, newUid, percent } from "../-shared/commercial";
import {
  CustomerOption, CustomerPicker, DUE_RULE_OPTIONS, DraftInstallment, DueRule, KIND_LABEL, ProposalCalc, ProposalDraft, ProposalKind, ProposalOptions, formatCnpj,
} from "../-shared/proposals";

type SetDraft = (updater: (draft: ProposalDraft) => ProposalDraft) => void;

const Card = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <section className="rounded-lg border p-4">
    <h3 className="font-semibold">{title}</h3>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    <div className="mt-3 grid gap-3">{children}</div>
  </section>
);
const F = ({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) => (
  <div className={className}>
    <Label className="text-xs">{label}</Label>
    <div className="mt-1">{children}</div>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

interface HeaderProps {
  draft: ProposalDraft; setDraft: SetDraft; options: ProposalOptions; readOnly: boolean; canSeeCosts: boolean;
  customer: CustomerOption; onCustomer: (customer: CustomerOption) => void;
}

/** Passo 1: para quem é, o que é, prazos e condições que entram na conta. */
export function ProposalDataTab({ draft, setDraft, options, readOnly, canSeeCosts, customer, onCustomer }: HeaderProps) {
  const set = <K extends keyof ProposalDraft>(key: K, value: ProposalDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const textField = (key: "contactName" | "contactEmail" | "contactPhone" | "requester" | "department", label: string, max: number, placeholder?: string) => (
    <F label={label}>
      <ShadInput value={draft[key] ?? ""} maxLength={max} disabled={readOnly} placeholder={placeholder} aria-label={label}
        onChange={(event) => set(key, event.target.value || null)} />
    </F>
  );
  const levels = options.defaults.contingencyLevels;
  const level = levels.find((l) => Math.abs(l.rate - draft.contingencyRate) < 1e-9);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Cliente">
        <F label="Empresa">
          <CustomerPicker value={draft.customerId} initial={customer} disabled={readOnly}
            onChange={(picked) => { if (picked) { onCustomer(picked); set("customerId", picked.id); } }} />
          <p className="text-xs text-muted-foreground mt-1">{customer.corporateName} · CNPJ {formatCnpj(customer.cnpj)}</p>
        </F>
        {!readOnly && Boolean(customer.contacts?.length) && (
          <F label="Usar um contato cadastrado">
            <Select name="contact" state="" modal={false} placeholder="Escolha para preencher os campos abaixo"
              options={customer.contacts!.map((c) => ({ id: c.id, name: `${c.name} — ${c.email}` }))}
              onChange={(_, id) => {
                const contact = customer.contacts!.find((c) => String(c.id) === String(id));
                if (contact) setDraft((d) => ({ ...d, contactName: contact.name, contactEmail: contact.email, contactPhone: contact.phone }));
              }} />
          </F>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {textField("contactName", "Contato", 160, "Quem recebe a proposta")}
          {textField("contactEmail", "E-mail do contato", 255)}
          {textField("contactPhone", "Telefone", 60)}
          {textField("requester", "Solicitante", 160)}
          {textField("department", "Setor", 160)}
        </div>
      </Card>

      <Card title="Proposta">
        <F label="Título">
          <ShadInput value={draft.title} maxLength={200} disabled={readOnly} aria-label="Título da proposta" onChange={(event) => set("title", event.target.value)} />
        </F>
        <F label="Descrição do serviço ou treinamento">
          <Textarea value={draft.description ?? ""} rows={4} disabled={readOnly} aria-label="Descrição" onChange={(event) => set("description", event.target.value || null)} />
        </F>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="Tipo">
            <Select name="kind" state={draft.kind} disabled={readOnly} modal={false} options={Object.entries(KIND_LABEL).map(([id, name]) => ({ id, name }))}
              onChange={(_, value) => set("kind", String(value) as ProposalKind)} />
          </F>
          <F label="Vendedor">
            <Select name="sellerId" state={draft.sellerId ? String(draft.sellerId) : ""} disabled={readOnly} modal={false} clearable placeholder="Sem vendedor"
              options={options.sellers} onChange={(_, value) => set("sellerId", Number(value) || null)} />
          </F>
          <F label="Validade da proposta">
            <CalendarPicker mode="single" name="validUntil" className="w-full" value={draft.validUntil} disabled={readOnly} placeholder="Sem validade" fromYear={2024} toYear={2040}
              onValueChange={(_, value) => set("validUntil", value)} />
          </F>
          <F label="Data prevista do serviço" hint="Define a base de cálculo e o imposto que valem (por vigência).">
            <CalendarPicker mode="single" name="referenceDate" className="w-full" value={draft.referenceDate} disabled={readOnly} fromYear={2024} toYear={2040}
              onValueChange={(_, value) => { if (value) set("referenceDate", value); }} />
          </F>
        </div>
      </Card>

      <Card title="Prazo e condições" description="Entram na conta dos itens de mão de obra e no total.">
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="Prazo em dias úteis" hint="Vale para as linhas de mão de obra que não tiverem dias próprios.">
            <NumField digits={0} value={draft.workDays} disabled={readOnly} ariaLabel="Prazo em dias úteis" onChange={(workDays) => set("workDays", workDays)} />
          </F>
          <F label="Dias de FDS/feriado" hint="Só para profissionais marcados com FDS/feriado.">
            <NumField digits={0} value={draft.weekendDays} disabled={readOnly} ariaLabel="Dias de fim de semana ou feriado" onChange={(weekendDays) => set("weekendDays", weekendDays)} />
          </F>
          <F label="Imprevisibilidade" hint="Somada ao total, depois da margem.">
            <Select name="contingency" state={level ? String(level.rate) : ""} disabled={readOnly} modal={false} placeholder={`Outro: ${percent(draft.contingencyRate)}`}
              options={levels.map((l) => ({ id: String(l.rate), name: `${l.label} (${percent(l.rate, 0)})` }))}
              onChange={(_, value) => set("contingencyRate", Number(value))} />
          </F>
          <F label="Imprevisibilidade (%)">
            <NumField kind="percent" value={draft.contingencyRate} disabled={readOnly} ariaLabel="Percentual de imprevisibilidade" onChange={(rate) => set("contingencyRate", rate)} />
          </F>
        </div>
      </Card>

      <div className="grid gap-4 content-start">
        {canSeeCosts && (
          <Card title="Imposto e comissão" description="Só quem tem a permissão de custos vê e altera.">
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="Regime tributário" hint="Vale só para esta proposta.">
                <Select name="taxRegime" state={draft.taxRegime ?? ""} disabled={readOnly} modal={false} clearable placeholder="Padrão da empresa"
                  options={[{ id: "tradicional", name: "Simples tradicional" }, { id: "hibrido", name: "Simples híbrido" }]}
                  onChange={(_, value) => set("taxRegime", (String(value) || null) as ProposalDraft["taxRegime"])} />
              </F>
              <F label="Comissão">
                <NumField kind="percent" value={draft.commissionRate ?? 0} disabled={readOnly} ariaLabel="Comissão" onChange={(rate) => set("commissionRate", rate)} />
              </F>
              <F label="Comissão sobre">
                <Select name="commissionBase" state={draft.commissionBase ?? "faturado"} disabled={readOnly} modal={false}
                  options={[{ id: "faturado", name: "Valor faturado" }, { id: "lucro", name: "Lucro" }]}
                  onChange={(_, value) => set("commissionBase", String(value) as "faturado" | "lucro")} />
              </F>
              <label className="flex items-center gap-2 text-sm sm:pt-6">
                <Switch checked={Boolean(draft.commissionInPrice)} disabled={readOnly} aria-label="Comissão dentro do preço" onCheckedChange={(checked) => set("commissionInPrice", checked)} />
                Comissão dentro do preço
              </label>
            </div>
          </Card>
        )}
        <Card title="Observações internas" description="Não aparecem para o cliente.">
          <Textarea value={draft.internalNotes ?? ""} rows={3} disabled={readOnly} aria-label="Observações internas" onChange={(event) => set("internalNotes", event.target.value || null)} />
        </Card>
      </div>
    </div>
  );
}

const installment = (patch: Partial<DraftInstallment>): DraftInstallment => ({
  uid: newUid(), percent: null, amount: null, dueRule: "dias_apos_nf", dueDate: null, dueDays: 30, description: null, ...patch,
});
const split = (parts: number, firstDays = 30, step = 30) => Array.from({ length: parts }, (_, i) => installment({
  // a última parcela fecha os 100% (ex.: 33,33 + 33,33 + 33,34)
  percent: i === parts - 1 ? Math.round((1 - Math.floor(10000 / parts) / 10000 * (parts - 1)) * 1e6) / 1e6 : Math.floor(10000 / parts) / 10000,
  dueDays: firstDays + step * i, description: parts === 1 ? "Pagamento único" : `Parcela ${i + 1} de ${parts}`,
}));

/** Passo 3: parcelas previstas. Viram contas a receber quando houver contrato. */
export function ProposalPaymentTab({ draft, setDraft, calc, readOnly }: { draft: ProposalDraft; setDraft: SetDraft; calc?: ProposalCalc; readOnly: boolean }) {
  const setList = (updater: (list: DraftInstallment[]) => DraftInstallment[]) => setDraft((d) => ({ ...d, installments: updater(d.installments) }));
  const update = (uid: string, patch: Partial<DraftInstallment>) => setList((list) => list.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));
  const diff = calc?.installmentsDiff ?? 0;
  const replace = (list: DraftInstallment[]) => { if (!draft.installments.length || window.confirm("Substituir as parcelas atuais?")) setList(() => list); };

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border p-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Condições de pagamento</h3>
            <p className="text-xs text-muted-foreground">Cada parcela é um percentual do total ou um valor fixo, com vencimento por data ou por evento.</p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => replace(split(1))}>À vista</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => replace([
                installment({ percent: 0.5, dueRule: "dias_apos_aceite", dueDays: 0, description: "Entrada" }),
                installment({ percent: 0.5, dueRule: "dias_apos_conclusao", dueDays: 0, description: "Na conclusão" }),
              ])}>50% + 50%</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => replace(split(3))}>3 parcelas</Button>
            </div>
          )}
        </div>

        <div className="mt-3 divide-y">
          {draft.installments.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhuma parcela. Use um dos atalhos acima ou adicione uma.</p>}
          {draft.installments.map((item, index) => {
            const byPercent = item.percent !== null;
            return (
              <div key={item.uid} className="py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
                <F label={`Parcela ${index + 1}`} className="sm:flex-1 sm:min-w-[220px]">
                  <ShadInput value={item.description ?? ""} maxLength={200} disabled={readOnly} placeholder="Descrição (opcional)" aria-label={`Descrição da parcela ${index + 1}`}
                    onChange={(event) => update(item.uid, { description: event.target.value || null })} />
                </F>
                <F label="Tipo" className="sm:w-40">
                  <Select name={`mode-${item.uid}`} state={byPercent ? "percent" : "amount"} disabled={readOnly} modal={false}
                    options={[{ id: "percent", name: "% do total" }, { id: "amount", name: "Valor fixo" }]}
                    onChange={(_, value) => update(item.uid, value === "percent"
                      ? { percent: calc && calc.totals.total > 0 ? Math.round(((calc.installments[index]?.value ?? 0) / calc.totals.total) * 1e4) / 1e4 : 0, amount: null }
                      : { amount: calc?.installments[index]?.value ?? 0, percent: null })} />
                </F>
                <F label={byPercent ? "Percentual" : "Valor"} className="sm:w-36">
                  {byPercent
                    ? <NumField kind="percent" value={item.percent} disabled={readOnly} ariaLabel={`Percentual da parcela ${index + 1}`} onChange={(value) => update(item.uid, { percent: value })} />
                    : <NumField kind="money" value={item.amount} disabled={readOnly} ariaLabel={`Valor da parcela ${index + 1}`} onChange={(value) => update(item.uid, { amount: value })} />}
                </F>
                <F label="Vencimento" className="sm:w-56">
                  <Select name={`rule-${item.uid}`} state={item.dueRule} disabled={readOnly} modal={false} options={DUE_RULE_OPTIONS}
                    onChange={(_, value) => update(item.uid, String(value) === "data_fixa" ? { dueRule: "data_fixa", dueDays: null } : { dueRule: String(value) as DueRule, dueDate: null, dueDays: item.dueDays ?? 30 })} />
                </F>
                <F label={item.dueRule === "data_fixa" ? "Data" : "Dias"} className="sm:w-40">
                  {item.dueRule === "data_fixa"
                    ? <CalendarPicker mode="single" name={`due-${item.uid}`} className="w-full" value={item.dueDate} disabled={readOnly} fromYear={2024} toYear={2040} onValueChange={(_, value) => update(item.uid, { dueDate: value })} />
                    : <NumField digits={0} value={item.dueDays} disabled={readOnly} ariaLabel={`Dias da parcela ${index + 1}`} onChange={(value) => update(item.uid, { dueDays: value })} />}
                </F>
                <div className="sm:w-32 sm:ml-auto text-sm sm:text-right">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold tabular-nums sm:pb-2">{money(calc?.installments[index]?.value)}</p>
                </div>
                {!readOnly && (
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 self-end" aria-label={`Remover a parcela ${index + 1}`} onClick={() => setList((list) => list.filter((i) => i.uid !== item.uid))}>
                    <Icon name="trash-2" className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <Button type="button" variant="outline" size="sm" className="mt-2"
            onClick={() => setList((list) => [...list, installment(list.length ? { amount: Math.max(0, diff), dueDays: (list[list.length - 1].dueDays ?? 0) + 30 } : { percent: 1 })])}>
            <Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar parcela
          </Button>
        )}
      </section>

      {draft.installments.length > 0 && (
        <p className={cn("rounded-md border px-3 py-2 text-sm", Math.abs(diff) > 0.005 ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "text-muted-foreground")}>
          Parcelas somam <b className="tabular-nums">{money(calc?.installmentsTotal)}</b> de <b className="tabular-nums">{money(calc?.totals.total)}</b>.
          {Math.abs(diff) > 0.005 ? ` ${diff > 0 ? "Faltam" : "Sobram"} ${money(Math.abs(diff))}: a proposta só pode ser enviada quando as parcelas fecharem o total.` : " Fechado."}
        </p>
      )}
    </div>
  );
}
