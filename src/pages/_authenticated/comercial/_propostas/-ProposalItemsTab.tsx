import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, Tip, decimal, money, newUid, percent } from "../-shared/commercial";
import { CalcLine, DraftItem, DraftSection, ITEM_LABEL, ItemType, ProposalCalc, ProposalDraft, ProposalOptions, isBlankItem } from "../-shared/proposals";

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
  workDays: null, weekendDays: null, hoursPerDay: null, overtimeHours: 0, courseId: null,
  extra: type === "treinamento" ? { students: null, workload: null, dates: "", location: "" } : null,
  unitCost: 0, extraCost: 0, margin: null, finalValue: null, showInDocument: true,
});

/**
 * Célula de uma linha. O rótulo em cima do campo só aparece quando a área é
 * estreita; com espaço, a seção ganha um cabeçalho de colunas (como a planilha).
 * As larguras seguem o espaço real da área (container), não o da janela.
 */
const Cell = ({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) => (
  <div className={cn("min-w-0", className)}>
    <p className="@3xl:hidden text-xs text-muted-foreground mb-0.5">{label}</p>
    {children}
  </div>
);

const ADD_LABEL: Record<ItemType, string> = {
  mao_de_obra: "Adicionar profissional", locacao: "Adicionar locação", material: "Adicionar material", treinamento: "Adicionar treinamento", avulso: "Adicionar item",
};

/**
 * Passo 3: como na planilha — uma linha por item. O valor sugerido aparece
 * dentro do campo "Valor final"; só se digita quando se quer outro valor.
 * O ajuste fino (dias próprios da linha, horas extras, local e datas do
 * treinamento) fica recolhido em cada linha.
 */
export default function ProposalItemsTab({ draft, setSections, calc, options, readOnly, canSeeCosts }: Props) {
  const [newKind, setNewKind] = useState<ItemType>("avulso");
  // seção com itens pede confirmação antes de sair
  const [removing, setRemoving] = useState<DraftSection | null>(null);
  const removeSection = (uid: string) => setSections((list) => list.filter((x) => x.uid !== uid));
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
    <div className="@container grid gap-4">
      <ConfirmDialog open={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title={`Remover a seção "${removing?.title ?? ""}"?`} description={`Os ${removing?.items.length ?? 0} item(ns) dela saem da proposta junto.`}
        onConfirm={() => { if (removing) removeSection(removing.uid); setRemoving(null); }} />
      {draft.sections.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhuma seção. Adicione uma abaixo para começar a incluir itens.</p>}
      {draft.sections.map((section, s) => {
        const sectionCalc = calc?.sections[s];
        const labor = section.kind === "mao_de_obra", training = section.kind === "treinamento";
        return (
          <section key={section.uid} className="rounded-lg border overflow-hidden">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-3 pr-2 py-2 border-b bg-muted/50">
              <ShadInput value={section.title} maxLength={120} disabled={readOnly} aria-label="Título da seção"
                className="flex-1 min-w-[140px] h-8 border-transparent bg-transparent shadow-none font-semibold px-1 hover:border-input focus-visible:bg-background disabled:opacity-100"
                onChange={(event) => updateSection(section.uid, { title: event.target.value })} />
              {canSeeCosts && (
                <Tip text="Lucro que se quer ter nos itens desta seção. O valor sugerido de cada linha é o custo mais o imposto e esta margem. Mudar aqui muda só o sugerido; valores finais digitados não mudam.">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Margem de lucro
                    <NumField kind="percent" className="w-24" value={section.margin ?? 0} disabled={readOnly}
                      ariaLabel={`Margem de lucro de ${section.title}`} onChange={(margin) => updateSection(section.uid, { margin })} />
                  </label>
                </Tip>
              )}
              <Tip text="Total da seção"><p className="text-sm font-semibold tabular-nums ml-auto">{money(sectionCalc?.value)}</p></Tip>
              {!readOnly && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Opções da seção ${section.title}`}>
                      <Icon name="ellipsis" className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onSelect={() => updateSection(section.uid, { showInDocument: !section.showInDocument })}>
                      <Icon name={section.showInDocument ? "eye-off" : "eye"} className="w-3 h-3" /> {section.showInDocument ? "Ocultar no documento do cliente" : "Mostrar no documento do cliente"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" disabled={s === 0} onSelect={() => move(s, -1)}><Icon name="arrow-up" className="w-3 h-3" /> Subir a seção</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" disabled={s === draft.sections.length - 1} onSelect={() => move(s, 1)}><Icon name="arrow-down" className="w-3 h-3" /> Descer a seção</DropdownMenuItem>
                    {section.kind !== "avulso" && (
                      <DropdownMenuItem className="gap-2" onSelect={() => updateSection(section.uid, { items: [...section.items, newItem("avulso")] })}><Icon name="plus" className="w-3 h-3" /> Adicionar item avulso</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="gap-2 text-destructive"
                      onSelect={() => { if (section.items.length) setRemoving(section); else removeSection(section.uid); }}>
                      <Icon name="trash-2" className="w-3 h-3" /> Remover a seção
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </header>
            {!section.showInDocument && <p className="px-4 py-1.5 text-xs border-b text-muted-foreground">Esta seção não aparece no documento do cliente (o valor dela continua no total).</p>}

            {section.items.length > 0 && (
              <div className="hidden @3xl:flex items-center gap-2 px-3 py-1.5 border-b text-xs font-medium text-muted-foreground">
                <div className="flex-1">{labor ? "Profissional" : training ? "Curso" : "Descrição"}</div>
                {!labor && !training && <div className="w-14">Un.</div>}
                <div className="w-16">{training ? "Turmas" : "Qtd."}</div>
                {labor && <div className="w-[104px]">Adicionais</div>}
                {training && <div className="w-16">Alunos</div>}
                {!labor && !training && <><div className="w-28">R$ unitário</div><div className="w-28">{section.kind === "material" ? "Frete" : "Taxas"}</div></>}
                {canSeeCosts && <div className="w-24 text-right">Custo</div>}
                <div className="w-32">Valor final</div>
                <div className="w-[68px]" />
              </div>
            )}

            <div className="divide-y">
              {section.items.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum item nesta seção.</p>}
              {section.items.map((item, i) => (
                // o cálculo não recebe as linhas em branco: a posição conta só as preenchidas
                <ItemRow key={item.uid} item={item} line={isBlankItem(item) ? undefined : sectionCalc?.lines[section.items.slice(0, i).filter((x) => !isBlankItem(x)).length]} draft={draft} options={options} readOnly={readOnly} canSeeCosts={canSeeCosts}
                  update={(patch) => updateItem(section.uid, item.uid, patch)}
                  remove={() => updateSection(section.uid, { items: section.items.filter((x) => x.uid !== item.uid) })} />
              ))}
            </div>

            {!readOnly && (
              <footer className="px-3 py-2 border-t flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => updateSection(section.uid, { items: [...section.items, newItem(section.kind)] })}>
                  <Icon name="plus" className="w-4 h-4 mr-1" /> {ADD_LABEL[section.kind]}
                </Button>
                {labor && section.items.length > 0 && <FlagsLegend />}
              </footer>
            )}
          </section>
        );
      })}

      {!readOnly && (
        <div className="flex flex-col @md:flex-row @md:items-center gap-2 text-sm">
          <span className="text-muted-foreground">Outra seção:</span>
          <div className="@md:w-56">
            <Select name="newKind" state={newKind} modal={false} options={Object.entries(ITEM_LABEL).map(([id, name]) => ({ id, name }))}
              onChange={(_, value) => setNewKind(String(value) as ItemType)} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSections((list) => [...list, {
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

/** Os três adicionais da planilha: noturno, viagem e fim de semana/feriado. */
const FLAGS = [["night", "moon", "Noturno"], ["travel", "plane", "Viagem"], ["weekend", "star", "Fim de semana ou feriado"]] as const;

/** Legenda pequena dos adicionais, no rodapé da seção de mão de obra. */
const FlagsLegend = () => (
  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-label="Legenda dos adicionais">
    <span>Adicionais:</span>
    {FLAGS.map(([key, icon, label]) => (
      <span key={key} className="inline-flex items-center gap-1"><Icon name={icon} className="w-3 h-3" /> {label}</span>
    ))}
    <span className="inline-flex items-center gap-1"><Icon name="sliders-horizontal" className="w-3 h-3" /> Dias próprios e horas extras</span>
  </p>
);

function ItemRow({ item, line, draft, options, readOnly, canSeeCosts, update, remove }: RowProps) {
  const labor = item.type === "mao_de_obra", training = item.type === "treinamento";
  const adjusted = labor
    ? item.workDays !== null || item.weekendDays !== null || item.overtimeHours > 0
    : training ? Boolean(item.extra?.dates || item.extra?.location || item.unitCost) : false;
  const [open, setOpen] = useState(false);
  const typed = item.finalValue !== null && item.finalValue !== undefined;
  const diff = typed && line && line.suggested > 0 ? item.finalValue! / line.suggested - 1 : null;

  return (
    <div className="px-3 py-2">
      <div className="flex flex-col @3xl:flex-row @3xl:items-center gap-2">
        {labor && (
          <Cell label="Profissional" className="@3xl:flex-1">
            <Select name={`pro-${item.uid}`} state={item.professionalId ? String(item.professionalId) : ""} disabled={readOnly} modal={false} placeholder="Selecione o profissional"
              options={options.professionals.map((p) => ({ id: p.id, name: canSeeCosts && p.hourCost ? `${p.name} · ${money(p.hourCost)}/h` : p.name }))}
              onChange={(_, value) => { const pro = options.professionals.find((p) => String(p.id) === String(value)); update({ professionalId: Number(value) || null, description: pro?.name ?? "" }); }} />
          </Cell>
        )}
        {training && (
          <Cell label="Curso" className="@3xl:flex-1">
            <Select name={`course-${item.uid}`} state={item.courseId ? String(item.courseId) : ""} disabled={readOnly} modal={false} clearable placeholder="Selecione o curso"
              options={options.courses.map((c) => ({ id: c.id, name: c.name }))}
              onChange={(_, value) => {
                const picked = options.courses.find((c) => String(c.id) === String(value));
                update({ courseId: picked?.id ?? null, description: picked?.name ?? item.description, extra: { ...item.extra, workload: picked?.hoursDuration ?? item.extra?.workload ?? null } });
              }} />
          </Cell>
        )}
        {!labor && !training && (
          <Cell label="Descrição" className="@3xl:flex-1">
            <ShadInput value={item.description} maxLength={300} disabled={readOnly} aria-label="Descrição do item"
              placeholder={item.type === "locacao" ? "Ex.: Andaime tubular" : item.type === "material" ? "Ex.: Tinta epóxi" : "Ex.: Mobilização"}
              onChange={(event) => update({ description: event.target.value })} />
          </Cell>
        )}

        <div className="grid grid-cols-2 @md:grid-cols-4 @3xl:contents gap-2">
          {!labor && !training && (
            <Cell label="Unidade" className="@3xl:w-14">
              <ShadInput value={item.unit ?? ""} maxLength={30} disabled={readOnly} aria-label="Unidade" placeholder="un" onChange={(event) => update({ unit: event.target.value || null })} />
            </Cell>
          )}
          <Cell label={training ? "Turmas" : "Quantidade"} className="@3xl:w-16">
            <NumField digits={labor || training ? 0 : 2} value={item.quantity} disabled={readOnly} ariaLabel={training ? "Quantidade de turmas" : "Quantidade"} onChange={(quantity) => update({ quantity })} />
          </Cell>
          {labor && (
            <Cell label="Adicionais" className="@3xl:w-[104px]">
              <div className="flex gap-1">
                {FLAGS.map(([key, icon, label]) => (
                  <Tip key={key} text={label}>
                    <button type="button" disabled={readOnly} aria-pressed={item[key]} aria-label={label} onClick={() => update({ [key]: !item[key] })}
                      className={cn("h-9 w-8 rounded-md border flex items-center justify-center disabled:cursor-not-allowed", item[key] ? "bg-primary text-inverse-foreground border-primary" : "text-muted-foreground hover:bg-muted")}>
                      <Icon name={icon} className="w-4 h-4" />
                    </button>
                  </Tip>
                ))}
              </div>
            </Cell>
          )}
          {training && (
            <Cell label="Alunos" className="@3xl:w-16">
              <NumField digits={0} value={item.extra?.students} disabled={readOnly} ariaLabel="Total de alunos"
                onChange={(students) => update({ extra: { ...item.extra, students } })} onEmpty={() => update({ extra: { ...item.extra, students: null } })} />
            </Cell>
          )}
          {!labor && !training && <>
            <Cell label="R$ unitário" className="@3xl:w-28">
              <NumField kind="money" value={item.unitCost} disabled={readOnly} ariaLabel="Custo unitário" onChange={(unitCost) => update({ unitCost })} onEmpty={() => update({ unitCost: 0 })} />
            </Cell>
            <Cell label={item.type === "material" ? "Frete" : "Outras taxas"} className="@3xl:w-28">
              <NumField kind="money" value={item.extraCost} disabled={readOnly} ariaLabel="Taxas ou frete" onChange={(extraCost) => update({ extraCost })} onEmpty={() => update({ extraCost: 0 })} />
            </Cell>
          </>}
          {canSeeCosts && (
            <Cell label="Custo" className="@3xl:w-24 @3xl:text-right">
              <p className="text-sm tabular-nums leading-9">{money(line?.cost)}</p>
            </Cell>
          )}
          <Cell label="Valor final" className="@3xl:w-32">
            <NumField kind="money" value={item.finalValue} disabled={readOnly} ariaLabel={`Valor final de ${item.description || "item"}`}
              placeholder={line ? decimal(line.suggested) : "sugerido"} onChange={(finalValue) => update({ finalValue })} onEmpty={() => update({ finalValue: null })} />
          </Cell>
        </div>

        <div className="flex gap-1 @3xl:w-[68px] justify-end">
          {(labor || training) && (
            <Tip text={labor ? "Dias próprios e horas extras" : "Datas, local e custo"}>
              <Button type="button" variant={adjusted && !open ? "outline" : "ghost"} size="sm" className="h-9 w-8 p-0" aria-expanded={open}
                aria-label={open ? "Fechar os ajustes da linha" : "Ajustes da linha"} onClick={() => setOpen(!open)}>
                <Icon name={open ? "chevron-up" : "sliders-horizontal"} className="w-4 h-4" />
              </Button>
            </Tip>
          )}
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm" className="h-9 w-8 p-0" aria-label={`Remover ${item.description || "item"}`} onClick={remove}>
              <Icon name="trash-2" className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Uma linha de contexto: de onde veio o número e o que mudou em relação ao sugerido */}
      <p className="mt-1 text-xs text-muted-foreground">
        {labor && (!item.professionalId ? "Selecione o profissional" : line?.hours ? `${decimal(line.hours, 0)} h por profissional` : "Informe o prazo em dias úteis no passo Proposta")}
        {labor && item.overtimeHours > 0 && ` + ${decimal(item.overtimeHours, 1)} h extras`}
        {labor && canSeeCosts && line?.hourCost ? ` · custo hora ${money(line.hourCost)}` : ""}
        {training && (!item.courseId ? "Escolha o curso para usar a tabela in-company" : line?.listPrice != null ? `Tabela in-company: ${money(line.listPrice)}` : "Curso sem tabela in-company: digite o valor final")}
        {!labor && !training && !typed && (line ? "Valor final: usando o sugerido" : "Descreva o item e informe o valor unitário")}
        {typed && line && <span className={cn("tabular-nums", diff !== null && diff < 0 && "text-amber-700 dark:text-amber-300")}>
          {labor || training ? " · " : ""}sugerido {money(line.suggested)}{diff !== null && ` (${diff >= 0 ? "+" : "−"}${percent(Math.abs(diff), 1)})`}
        </span>}
        {typed && !readOnly && <> · <button type="button" className="underline" onClick={() => update({ finalValue: null })}>usar o sugerido</button></>}
        {canSeeCosts && line?.margin != null && <span className={cn("tabular-nums", line.margin < 0 && "text-destructive font-medium")}> · margem {percent(line.margin, 1)}</span>}
      </p>

      {open && labor && (
        <div className="mt-2 rounded-md bg-muted/40 p-3 grid @md:grid-cols-3 gap-3">
          <div><p className="text-xs text-muted-foreground mb-0.5">Dias úteis só desta linha</p>
            <NumField digits={0} value={item.workDays} disabled={readOnly} ariaLabel="Dias úteis desta linha" placeholder={`${draft.workDays || 0} (o da proposta)`}
              onChange={(workDays) => update({ workDays })} onEmpty={() => update({ workDays: null })} /></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Dias de fim de semana/feriado</p>
            <NumField digits={0} value={item.weekendDays} disabled={readOnly || !item.weekend} ariaLabel="Dias de FDS/feriado desta linha" placeholder={item.weekend ? `${draft.weekendDays || 0} (o da proposta)` : "marque a estrela"}
              onChange={(weekendDays) => update({ weekendDays })} onEmpty={() => update({ weekendDays: null })} /></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Horas extras por profissional</p>
            <NumField digits={1} suffix="h" value={item.overtimeHours || null} disabled={readOnly} ariaLabel="Horas extras por profissional desta linha" placeholder="0"
              onChange={(overtimeHours) => update({ overtimeHours })} onEmpty={() => update({ overtimeHours: 0 })} /></div>
        </div>
      )}
      {open && training && (
        <div className="mt-2 rounded-md bg-muted/40 p-3 grid @md:grid-cols-2 @3xl:grid-cols-4 gap-3">
          <div className="@3xl:col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Descrição no documento</p>
            <ShadInput value={item.description} maxLength={300} disabled={readOnly} aria-label="Descrição do treinamento" onChange={(event) => update({ description: event.target.value })} /></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Carga horária</p>
            <NumField digits={0} suffix="h" value={item.extra?.workload} disabled={readOnly} ariaLabel="Carga horária"
              onChange={(workload) => update({ extra: { ...item.extra, workload } })} onEmpty={() => update({ extra: { ...item.extra, workload: null } })} /></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Custo por turma (opcional)</p>
            <NumField kind="money" value={item.unitCost} disabled={readOnly} ariaLabel="Custo por turma" onChange={(unitCost) => update({ unitCost })} onEmpty={() => update({ unitCost: 0 })} /></div>
          <div className="@3xl:col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Datas previstas</p>
            <ShadInput value={item.extra?.dates ?? ""} maxLength={200} disabled={readOnly} aria-label="Datas previstas" placeholder="Ex.: 10 e 11/02" onChange={(event) => update({ extra: { ...item.extra, dates: event.target.value } })} /></div>
          <div className="@3xl:col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Local</p>
            <ShadInput value={item.extra?.location ?? ""} maxLength={200} disabled={readOnly} aria-label="Local" placeholder="Ex.: Planta do cliente" onChange={(event) => update({ extra: { ...item.extra, location: event.target.value } })} /></div>
        </div>
      )}
    </div>
  );
}
