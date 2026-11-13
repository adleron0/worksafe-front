import { useState } from "react";
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
import ProposalSchedule from "./-ProposalSchedule";
import {
  CustomerOption, DUE_RULE_OPTIONS, DraftInstallment, DueRule, ProposalCalc, ProposalDraft, ProposalOptions,
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

interface InfoProps {
  draft: ProposalDraft; setDraft: SetDraft; options: ProposalOptions; readOnly: boolean; canSeeCosts: boolean; customer: CustomerOption;
}

/**
 * Passo 2: o cabeçalho da planilha — o que é, prazo, imprevisibilidade e
 * validade. O que quase nunca muda fica recolhido em "Mais opções".
 */
export function ProposalInfoStep({ draft, setDraft, options, readOnly, canSeeCosts, customer }: InfoProps) {
  const [more, setMore] = useState(false);
  const set = <K extends keyof ProposalDraft>(key: K, value: ProposalDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const textField = (key: "contactName" | "contactEmail" | "contactPhone" | "requester" | "department", label: string, max: number, placeholder?: string) => (
    <F label={label}>
      <ShadInput value={draft[key] ?? ""} maxLength={max} disabled={readOnly} placeholder={placeholder} aria-label={label}
        onChange={(event) => set(key, event.target.value || null)} />
    </F>
  );
  const levels = options.defaults.contingencyLevels;
  const custom = !levels.some((l) => Math.abs(l.rate - draft.contingencyRate) < 1e-9);
  const automaticBase = (options.costBases ?? []).find((base) => base.current);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        <F label="Título do serviço ou treinamento">
          <ShadInput value={draft.title === "Nova proposta" ? "" : draft.title} maxLength={200} disabled={readOnly} aria-label="Título da proposta" autoFocus={draft.title === "Nova proposta"}
            placeholder="Ex.: Jateamento e pintura do tanque 3" onChange={(event) => set("title", event.target.value)} />
        </F>
        <F label="Descrição" hint="O que o cliente pediu e o que será feito. Aparece no começo da proposta.">
          <Textarea value={draft.description ?? ""} rows={3} disabled={readOnly} aria-label="Descrição" onChange={(event) => set("description", event.target.value || null)} />
        </F>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="Prazo em dias úteis" hint="Quantos dias a equipe trabalha. Usado nas linhas de mão de obra.">
            <NumField digits={0} value={draft.workDays} disabled={readOnly} ariaLabel="Prazo em dias úteis" onChange={(workDays) => set("workDays", workDays)} />
          </F>
          <F label="Proposta válida até">
            <CalendarPicker mode="single" name="validUntil" className="w-full" value={draft.validUntil} disabled={readOnly} placeholder="Sem validade" fromYear={2024} toYear={2040}
              onValueChange={(_, value) => set("validUntil", value)} />
          </F>
        </div>
        <F label="Imprevisibilidade" hint="Folga somada ao total, depois da margem.">
          <div className="flex flex-wrap rounded-md border overflow-hidden w-fit" role="radiogroup" aria-label="Imprevisibilidade">
            {levels.map((l) => {
              const active = Math.abs(l.rate - draft.contingencyRate) < 1e-9;
              return (
                <button key={l.label} type="button" role="radio" aria-checked={active} disabled={readOnly} onClick={() => set("contingencyRate", l.rate)}
                  className={cn("px-3 py-2 text-sm border-l first:border-l-0 disabled:cursor-not-allowed", active ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
                  {l.label} <span className="opacity-70 tabular-nums">{percent(l.rate, 0)}</span>
                </button>
              );
            })}
            {custom && <span className="px-3 py-2 text-sm border-l bg-primary text-inverse-foreground">Outra <span className="opacity-80 tabular-nums">{percent(draft.contingencyRate)}</span></span>}
          </div>
        </F>
      </div>

      <ProposalSchedule schedule={draft.schedule ?? { unit: "dia", steps: [] }} onChange={(schedule) => set("schedule", schedule)} kind={draft.kind} workDays={draft.workDays} readOnly={readOnly} />

      <div className="border-t pt-3">
        <button type="button" className="flex items-center gap-2 text-sm font-medium" aria-expanded={more} onClick={() => setMore(!more)}>
          <Icon name={more ? "chevron-down" : "chevron-right"} className="w-4 h-4" /> Mais opções
          <span className="font-normal text-muted-foreground">contato, vendedor, {canSeeCosts ? "base de cálculo, imposto, comissão, " : ""}observações</span>
        </button>
      </div>

      {more && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Contato no cliente" description="Quem recebe a proposta. Aparece na capa como A/C.">
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
              {textField("contactName", "Contato", 160)}
              {textField("contactEmail", "E-mail do contato", 255)}
              {textField("contactPhone", "Telefone", 60)}
              {textField("requester", "Solicitante", 160)}
              {textField("department", "Setor", 160)}
            </div>
          </Card>

          <Card title="Proposta">
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="Vendedor">
                <Select name="sellerId" state={draft.sellerId ? String(draft.sellerId) : ""} disabled={readOnly} modal={false} clearable placeholder="Sem vendedor"
                  options={options.sellers} onChange={(_, value) => set("sellerId", Number(value) || null)} />
              </F>
              <F label="Data prevista do serviço" hint="Define a base de cálculo e o imposto vigentes.">
                <CalendarPicker mode="single" name="referenceDate" className="w-full" value={draft.referenceDate} disabled={readOnly} fromYear={2024} toYear={2040}
                  onValueChange={(_, value) => { if (value) set("referenceDate", value); }} />
              </F>
              <F label="Dias de FDS/feriado" hint="Só para profissionais marcados com ⭐.">
                <NumField digits={0} value={draft.weekendDays} disabled={readOnly} ariaLabel="Dias de fim de semana ou feriado" onChange={(weekendDays) => set("weekendDays", weekendDays)} />
              </F>
              <F label="Imprevisibilidade (outro %)">
                <NumField kind="percent" value={draft.contingencyRate} disabled={readOnly} ariaLabel="Percentual de imprevisibilidade" onChange={(rate) => set("contingencyRate", rate)} />
              </F>
            </div>
          </Card>

          {canSeeCosts && (
            <Card title="Base de cálculo, imposto e comissão" description="Só quem tem a permissão de custos vê e altera.">
              <F label="Base de cálculo" hint={draft.costBaseId
                ? "Base escolhida à mão: os valores sugeridos usam esta, qualquer que seja a data."
                : `Automática: usa a base vigente na data prevista do serviço${automaticBase ? ` (hoje, "${automaticBase.name}")` : ""}.`}>
                <Select name="costBaseId" state={draft.costBaseId ? String(draft.costBaseId) : ""} disabled={readOnly} modal={false} clearable
                  placeholder={automaticBase ? `Automática — ${automaticBase.name}` : "Automática (vigente na data)"}
                  options={(options.costBases ?? []).map((base) => ({ id: base.id, name: `${base.name} · desde ${base.effectiveFrom.split("-").reverse().join("/")}${base.current ? " · vigente" : ""}` }))}
                  onChange={(_, value) => set("costBaseId", Number(value) || null)} />
              </F>
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
      )}
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
  const [nfDays, setNfDays] = useState("30");
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
              <Button type="button" variant="outline" size="sm"
                onClick={() => replace([installment({ percent: 1, dueRule: "dias_apos_conclusao", dueDays: 0, description: "Na conclusão do serviço" })])}>No fim da obra</Button>
              {/* à vista depois da nota: o operador só informa quantos dias */}
              <div className="inline-flex items-center h-8 rounded-md border bg-background shadow-xs text-xs font-medium overflow-hidden">
                <span className="pl-3 pr-1.5">NF +</span>
                <ShadInput value={nfDays} inputMode="numeric" maxLength={3} aria-label="Dias após a nota fiscal" className="h-6 w-11 px-1 text-center text-xs"
                  onChange={(event) => setNfDays(event.target.value.replace(/\D/g, ""))} />
                <span className="px-1.5">dias</span>
                <button type="button" className="h-full px-2.5 border-l hover:bg-accent" aria-label="Aplicar pagamento após a nota fiscal"
                  onClick={() => { const days = Number(nfDays) || 0; replace([installment({ percent: 1, dueRule: "dias_apos_nf", dueDays: days, description: days ? `${days} dias após a nota fiscal` : "Na emissão da nota fiscal" })]); }}>
                  Aplicar
                </button>
              </div>
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
