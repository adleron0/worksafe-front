import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, decimal, money, newUid, percent } from "../-shared/commercial";
import { CalcLine, DraftItem, DraftSection, ITEM_LABEL, ItemType, ProposalCalc, ProposalDraft, ProposalOptions } from "../-shared/proposals";

interface Props {
  draft: ProposalDraft;
  setSections: (updater: (sections: DraftSection[]) => DraftSection[]) => void;
  calc?: ProposalCalc;
  options: ProposalOptions;
  readOnly: boolean;
  canSeeCosts: boolean;
}

const newItem = (type: ItemType): DraftItem => ({
  uid: newUid(), type, description: "", unit: null, quantity: 1, professionalId: null, night: false, travel: false, weekend: false,
  workDays: null, weekendDays: null, hoursPerDay: null, overtimeHours: 0, courseId: null, extra: type === "treinamento" ? { students: null, workload: null, dates: "", location: "" } : null,
  unitCost: 0, extraCost: 0, margin: null, finalValue: null, showInDocument: true,
});

const Field = ({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) => (
  <div className={cn("min-w-0", className)}>
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    {children}
  </div>
);

/** Passo 2: seções (cada uma com sua margem) e itens, com valor sugerido × valor final. */
export default function ProposalItemsTab({ draft, setSections, calc, options, readOnly, canSeeCosts }: Props) {
  const [newKind, setNewKind] = useState<ItemType>("avulso");
  const updateSection = (uid: string, patch: Partial<DraftSection>) => setSections((list) => list.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
  const updateItem = (sectionUid: string, itemUid: string, patch: Partial<DraftItem>) =>
    setSections((list) => list.map((s) => (s.uid === sectionUid ? { ...s, items: s.items.map((i) => (i.uid === itemUid ? { ...i, ...patch } : i)) } : s)));
  const move = (index: number, delta: number) => setSections((list) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return (
    <div className="grid gap-4">
      {draft.sections.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhuma seção. Adicione uma abaixo para começar a incluir itens.</p>}
      {draft.sections.map((section, s) => {
        const sectionCalc = calc?.sections[s];
        return (
          <section key={section.uid} className="rounded-lg border">
            <header className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3 p-4 border-b bg-muted/30">
              <Field label="Seção" className="flex-1 lg:min-w-[200px]">
                <ShadInput value={section.title} maxLength={120} disabled={readOnly} aria-label="Título da seção"
                  onChange={(event) => updateSection(section.uid, { title: event.target.value })} />
              </Field>
              {canSeeCosts && (
                <Field label="Margem da seção" className="lg:w-32">
                  <NumField kind="percent" value={section.margin ?? 0} disabled={readOnly} ariaLabel={`Margem de ${section.title}`}
                    onChange={(margin) => updateSection(section.uid, { margin })} />
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm lg:pb-2">
                <Switch checked={section.showInDocument} disabled={readOnly} aria-label={`Mostrar ${section.title} no documento`}
                  onCheckedChange={(checked) => updateSection(section.uid, { showInDocument: checked })} />
                No documento
              </label>
              <div className="lg:pb-1 text-sm lg:text-right lg:w-40">
                <p className="text-xs text-muted-foreground">Total da seção</p>
                <p className="font-semibold tabular-nums">{money(sectionCalc?.value)}</p>
              </div>
              {!readOnly && (
                <div className="flex gap-1 lg:pb-0.5">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={s === 0} aria-label={`Subir ${section.title}`} onClick={() => move(s, -1)}><Icon name="arrow-up" className="w-4 h-4" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={s === draft.sections.length - 1} aria-label={`Descer ${section.title}`} onClick={() => move(s, 1)}><Icon name="arrow-down" className="w-4 h-4" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Remover a seção ${section.title}`}
                    onClick={() => { if (!section.items.length || window.confirm(`Remover a seção "${section.title}" e os ${section.items.length} item(ns) dela?`)) setSections((list) => list.filter((x) => x.uid !== section.uid)); }}>
                    <Icon name="trash-2" className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </header>

            <div className="divide-y">
              {section.items.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum item nesta seção.</p>}
              {section.items.map((item, i) => (
                <ItemRow key={item.uid} item={item} line={sectionCalc?.lines[i]} draft={draft} options={options} readOnly={readOnly} canSeeCosts={canSeeCosts}
                  update={(patch) => updateItem(section.uid, item.uid, patch)}
                  remove={() => updateSection(section.uid, { items: section.items.filter((x) => x.uid !== item.uid) })} />
              ))}
            </div>

            {!readOnly && (
              <footer className="p-3 border-t flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => updateSection(section.uid, { items: [...section.items, newItem(section.kind)] })}>
                  <Icon name="plus" className="w-4 h-4 mr-1" /> {ITEM_LABEL[section.kind]}
                </Button>
                {section.kind !== "avulso" && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => updateSection(section.uid, { items: [...section.items, newItem("avulso")] })}>
                    <Icon name="plus" className="w-4 h-4 mr-1" /> Item avulso
                  </Button>
                )}
              </footer>
            )}
          </section>
        );
      })}

      {!readOnly && (
        <div className="rounded-lg border border-dashed p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <Field label="Nova seção de" className="sm:w-64">
            <Select name="newKind" state={newKind} modal={false} options={Object.entries(ITEM_LABEL).map(([id, name]) => ({ id, name }))}
              onChange={(_, value) => setNewKind(String(value) as ItemType)} />
          </Field>
          <Button type="button" variant="outline" onClick={() => setSections((list) => [...list, {
            uid: newUid(), title: ITEM_LABEL[newKind], kind: newKind, margin: options.defaults.margins?.[newKind] ?? 0, showInDocument: true, items: [],
          }])}>
            <Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar seção
          </Button>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  item: DraftItem; line?: CalcLine; draft: ProposalDraft; options: ProposalOptions; readOnly: boolean; canSeeCosts: boolean;
  update: (patch: Partial<DraftItem>) => void; remove: () => void;
}

function ItemRow({ item, line, draft, options, readOnly, canSeeCosts, update, remove }: RowProps) {
  const typed = item.finalValue !== null && item.finalValue !== undefined;
  const diff = typed && line && line.suggested > 0 ? item.finalValue! / line.suggested - 1 : null;
  const course = item.courseId ? options.courses.find((c) => c.id === item.courseId) : undefined;
  const flag = (key: "night" | "travel" | "weekend", label: string) => (
    <label className={cn("flex items-center gap-1.5 rounded-md border px-2 h-9 text-sm cursor-pointer select-none", item[key] && "bg-primary/10 border-primary", readOnly && "cursor-default opacity-70")}>
      <input type="checkbox" checked={item[key]} disabled={readOnly} onChange={(event) => update({ [key]: event.target.checked })} /> {label}
    </label>
  );

  return (
    <div className="p-4 grid gap-3">
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
        {item.type === "mao_de_obra" && <>
          <Field label="Profissional" className="lg:flex-1 lg:min-w-[220px]">
            <Select name={`pro-${item.uid}`} state={item.professionalId ? String(item.professionalId) : ""} disabled={readOnly} modal={false} placeholder="Selecione o profissional"
              options={options.professionals.map((p) => ({ id: p.id, name: canSeeCosts && p.hourCost ? `${p.name} · ${money(p.hourCost)}/h` : p.name }))}
              onChange={(_, value) => { const pro = options.professionals.find((p) => String(p.id) === String(value)); update({ professionalId: Number(value) || null, description: pro?.name ?? "" }); }} />
          </Field>
          <Field label="Quantidade" className="lg:w-24">
            <NumField digits={0} value={item.quantity} disabled={readOnly} ariaLabel="Quantidade de profissionais" onChange={(quantity) => update({ quantity })} />
          </Field>
          <Field label="Dias úteis" className="lg:w-28">
            <NumField digits={0} value={item.workDays} disabled={readOnly} ariaLabel="Dias úteis desta linha" placeholder={String(draft.workDays || 0)}
              onChange={(workDays) => update({ workDays })} onEmpty={() => update({ workDays: null })} />
          </Field>
          <Field label="Horas extras" className="lg:w-28">
            <NumField digits={1} suffix="h" value={item.overtimeHours || null} disabled={readOnly} ariaLabel="Horas extras por profissional desta linha" placeholder="0"
              onChange={(overtimeHours) => update({ overtimeHours })} onEmpty={() => update({ overtimeHours: 0 })} />
          </Field>
          <Field label="Adicionais">
            <div className="flex flex-wrap gap-1.5">{flag("night", "Noturno")}{flag("travel", "Viagem")}{flag("weekend", "FDS/feriado")}</div>
          </Field>
          {item.weekend && (
            <Field label="Dias de FDS" className="lg:w-28">
              <NumField digits={0} value={item.weekendDays} disabled={readOnly} ariaLabel="Dias de FDS/feriado desta linha" placeholder={String(draft.weekendDays || 0)}
                onChange={(weekendDays) => update({ weekendDays })} onEmpty={() => update({ weekendDays: null })} />
            </Field>
          )}
        </>}

        {item.type === "treinamento" && <>
          <Field label="Curso" className="lg:flex-1 lg:min-w-[220px]">
            <Select name={`course-${item.uid}`} state={item.courseId ? String(item.courseId) : ""} disabled={readOnly} modal={false} clearable placeholder="Selecione o curso"
              options={options.courses.map((c) => ({ id: c.id, name: c.name }))}
              onChange={(_, value) => {
                const picked = options.courses.find((c) => String(c.id) === String(value));
                update({ courseId: picked?.id ?? null, description: picked?.name ?? item.description, extra: { ...item.extra, workload: picked?.hoursDuration ?? item.extra?.workload ?? null } });
              }} />
          </Field>
          <Field label="Turmas" className="lg:w-24">
            <NumField digits={0} value={item.quantity} disabled={readOnly} ariaLabel="Quantidade de turmas" onChange={(quantity) => update({ quantity })} />
          </Field>
          <Field label="Alunos" className="lg:w-24">
            <NumField digits={0} value={item.extra?.students} disabled={readOnly} ariaLabel="Total de alunos"
              onChange={(students) => update({ extra: { ...item.extra, students } })} onEmpty={() => update({ extra: { ...item.extra, students: null } })} />
          </Field>
          <Field label="Carga horária" className="lg:w-28">
            <NumField digits={0} suffix="h" value={item.extra?.workload} disabled={readOnly} ariaLabel="Carga horária"
              onChange={(workload) => update({ extra: { ...item.extra, workload } })} onEmpty={() => update({ extra: { ...item.extra, workload: null } })} />
          </Field>
        </>}

        {item.type !== "mao_de_obra" && item.type !== "treinamento" && <>
          <Field label="Descrição" className="lg:flex-1 lg:min-w-[220px]">
            <ShadInput value={item.description} maxLength={300} disabled={readOnly} aria-label="Descrição do item" placeholder={item.type === "locacao" ? "Ex.: Andaime tubular" : item.type === "material" ? "Ex.: Tinta epóxi" : "Ex.: Mobilização"}
              onChange={(event) => update({ description: event.target.value })} />
          </Field>
          <Field label="Unidade" className="lg:w-24">
            <ShadInput value={item.unit ?? ""} maxLength={30} disabled={readOnly} aria-label="Unidade" placeholder="un" onChange={(event) => update({ unit: event.target.value || null })} />
          </Field>
          <Field label="Quantidade" className="lg:w-24">
            <NumField digits={2} value={item.quantity} disabled={readOnly} ariaLabel="Quantidade" onChange={(quantity) => update({ quantity })} />
          </Field>
        </>}

        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 self-end shrink-0" aria-label={`Remover ${item.description || "item"}`} onClick={remove}>
            <Icon name="trash-2" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {item.type === "treinamento" && (
        <div className="flex flex-col lg:flex-row gap-3">
          <Field label="Descrição no documento" className="lg:flex-1">
            <ShadInput value={item.description} maxLength={300} disabled={readOnly} aria-label="Descrição do treinamento" onChange={(event) => update({ description: event.target.value })} />
          </Field>
          <Field label="Datas previstas" className="lg:w-56">
            <ShadInput value={item.extra?.dates ?? ""} maxLength={200} disabled={readOnly} aria-label="Datas previstas" placeholder="Ex.: 10 e 11/02" onChange={(event) => update({ extra: { ...item.extra, dates: event.target.value } })} />
          </Field>
          <Field label="Local" className="lg:w-56">
            <ShadInput value={item.extra?.location ?? ""} maxLength={200} disabled={readOnly} aria-label="Local" placeholder="Ex.: Planta do cliente" onChange={(event) => update({ extra: { ...item.extra, location: event.target.value } })} />
          </Field>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3">
        {item.type !== "mao_de_obra" && <>
          <Field label={item.type === "treinamento" ? "Custo por turma (opcional)" : "Custo unitário"} className="lg:w-40">
            <NumField kind="money" value={item.unitCost} disabled={readOnly} ariaLabel="Custo unitário" onChange={(unitCost) => update({ unitCost })} onEmpty={() => update({ unitCost: 0 })} />
          </Field>
          <Field label={item.type === "material" ? "Frete" : "Outras taxas"} className="lg:w-36">
            <NumField kind="money" value={item.extraCost} disabled={readOnly} ariaLabel="Taxas ou frete" onChange={(extraCost) => update({ extraCost })} onEmpty={() => update({ extraCost: 0 })} />
          </Field>
        </>}
        {item.type === "mao_de_obra" && (
          <p className="text-xs text-muted-foreground lg:pb-2 lg:flex-1">
            {line?.hours ? `${decimal(line.hours, 0)} h por profissional` : "Informe o prazo em dias úteis (em Dados) ou os dias desta linha"}
            {item.overtimeHours > 0 ? ` + ${decimal(item.overtimeHours, 1)} h extras${item.quantity > 1 ? " cada" : ""}` : ""}
            {canSeeCosts && line?.hourCost ? ` · custo hora ${money(line.hourCost)}` : ""}
          </p>
        )}
        {item.type === "treinamento" && (
          <p className="text-xs text-muted-foreground lg:pb-2 lg:flex-1">
            {!course ? "Escolha o curso para usar a tabela in-company."
              : line?.listPrice != null ? `Tabela in-company: ${money(line.listPrice)}`
              : "Este curso não tem tabela in-company (Base de cálculo → Treinamentos): digite o valor final."}
          </p>
        )}
        {item.type !== "mao_de_obra" && item.type !== "treinamento" && <div className="lg:flex-1" />}

        {canSeeCosts && (
          <div className="lg:w-32 text-sm lg:text-right">
            <p className="text-xs text-muted-foreground">Custo</p>
            <p className="tabular-nums lg:pb-2">{money(line?.cost)}</p>
          </div>
        )}
        <div className="lg:w-36 text-sm lg:text-right">
          <p className="text-xs text-muted-foreground">Valor sugerido</p>
          <p className="tabular-nums lg:pb-2">{money(line?.suggested)}</p>
        </div>
        <Field label="Valor final" className="lg:w-44">
          <NumField kind="money" value={item.finalValue} disabled={readOnly} ariaLabel={`Valor final de ${item.description || "item"}`}
            placeholder={line ? decimal(line.suggested) : "sugerido"} onChange={(finalValue) => update({ finalValue })} onEmpty={() => update({ finalValue: null })} />
        </Field>
        <div className="lg:w-36 text-xs lg:pb-2">
          {typed ? (
            <>
              {diff !== null && <p className={cn("tabular-nums", diff < 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>{diff >= 0 ? "+" : "−"}{percent(Math.abs(diff), 1)} sobre o sugerido</p>}
              {!readOnly && <button type="button" className="underline text-muted-foreground" onClick={() => update({ finalValue: null })}>usar o sugerido</button>}
            </>
          ) : <p className="text-muted-foreground">usando o sugerido</p>}
          {canSeeCosts && line?.margin != null && <p className={cn("tabular-nums", line.margin < 0 ? "text-destructive font-medium" : "text-muted-foreground")}>margem {percent(line.margin, 1)}</p>}
        </div>
      </div>
    </div>
  );
}
