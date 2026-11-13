import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { NumField } from "../-shared/commercial";
import { ProposalKind, Schedule, ScheduleStep } from "../-shared/proposals";

const UNITS: Array<{ id: Schedule["unit"]; name: string; one: string; many: string }> = [
  { id: "dia", name: "Dias", one: "dia", many: "dias" }, { id: "semana", name: "Semanas", one: "semana", many: "semanas" }, { id: "mes", name: "Meses", one: "mês", many: "meses" },
];

/** Etapas iniciais, uma depois da outra; a execução usa o prazo da proposta. */
export function defaultSchedule(kind: ProposalKind, workDays: number): Schedule {
  const work = Math.max(1, Math.round(workDays) || 1);
  const titles: Array<[string, number]> = kind === "treinamento"
    ? [["Agendamento e preparação", 2], ["Realização do treinamento", work], ["Emissão dos certificados", 3]]
    : [["Mobilização da equipe e dos materiais", 2], ["Execução dos serviços", work], ["Desmobilização", 1], ["Relatório fotográfico", 3]];
  let start = 1;
  const steps = titles.map(([title, duration]) => { const step = { title, start, duration }; start += duration; return step; });
  return { unit: "dia", steps };
}

interface Props { schedule: Schedule; onChange: (schedule: Schedule) => void; kind: ProposalKind; workDays: number; readOnly: boolean }

/** Cronograma da proposta: poucas etapas, cada uma com início e duração. Vira o gráfico de barras do documento. */
export default function ProposalSchedule({ schedule, onChange, kind, workDays, readOnly }: Props) {
  const unit = UNITS.find((u) => u.id === schedule.unit) ?? UNITS[0];
  const steps = schedule.steps;
  const total = steps.length ? Math.max(...steps.map((step) => step.start + step.duration - 1)) : 0;
  const setStep = (index: number, patch: Partial<ScheduleStep>) => onChange({ ...schedule, steps: steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) });
  const add = () => onChange({ ...schedule, steps: [...steps, { title: "", start: total + 1, duration: 1 }] });

  if (!steps.length) {
    return (
      <div className="rounded-lg border border-dashed p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Cronograma</p>
          <p className="text-xs text-muted-foreground">Opcional. Aparece na proposta como um gráfico de barras com as etapas.</p>
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(defaultSchedule(kind, workDays))}>
            <Icon name="calendar-range" className="w-4 h-4 mr-1" /> Montar com as etapas padrão
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-lg border p-4 grid gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Cronograma</h3>
          <p className="text-xs text-muted-foreground">Ajuste as etapas desta proposta. Início e duração em {unit.many}, contados do início das atividades.</p>
        </div>
        <div className="sm:w-36">
          <Select name="scheduleUnit" state={schedule.unit} disabled={readOnly} modal={false} options={UNITS.map(({ id, name }) => ({ id, name }))}
            onChange={(_, value) => onChange({ ...schedule, unit: String(value) as Schedule["unit"] })} />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <div className="flex-1">Etapa</div><div className="w-20">Início</div><div className="w-20">Duração</div><div className="w-40">No tempo</div><div className="w-8" />
        </div>
        {steps.map((step, index) => (
          <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <ShadInput className="basis-full sm:basis-auto sm:flex-1" value={step.title} maxLength={80} disabled={readOnly} placeholder="Nome da etapa" aria-label={`Etapa ${index + 1}`}
              onChange={(event) => setStep(index, { title: event.target.value })} />
            <NumField className="w-20" digits={0} value={step.start} disabled={readOnly} ariaLabel={`Início da etapa ${index + 1}`} onChange={(start) => setStep(index, { start: Math.max(1, start) })} />
            <NumField className="w-20" digits={0} value={step.duration} disabled={readOnly} ariaLabel={`Duração da etapa ${index + 1}`} onChange={(duration) => setStep(index, { duration: Math.max(1, duration) })} />
            <div className="flex-1 sm:flex-none sm:w-40 h-3 rounded bg-muted" aria-hidden="true">
              {total > 0 && <div className="h-3 rounded bg-primary" style={{ marginLeft: `${((step.start - 1) / total) * 100}%`, width: `${(step.duration / total) * 100}%` }} />}
            </div>
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" className="h-9 w-8 p-0" aria-label={`Remover a etapa ${step.title || index + 1}`}
                onClick={() => onChange({ ...schedule, steps: steps.filter((_, i) => i !== index) })}>
                <Icon name="trash-2" className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="text-primary" disabled={steps.length >= 20} onClick={add}><Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar etapa</Button>
            <ConfirmDialog title="Voltar às etapas padrão?" description="As etapas atuais são trocadas pelas etapas padrão, com o prazo da proposta." onConfirm={() => onChange(defaultSchedule(kind, workDays))}>
              <Button type="button" variant="ghost" size="sm">Voltar às etapas padrão</Button>
            </ConfirmDialog>
            <ConfirmDialog title="Remover o cronograma?" description="A seção de cronograma deixa de aparecer nesta proposta." onConfirm={() => onChange({ ...schedule, steps: [] })}>
              <Button type="button" variant="ghost" size="sm">Remover cronograma</Button>
            </ConfirmDialog>
          </div>
        ) : <span />}
        <p className="text-xs text-muted-foreground tabular-nums">Duração total: {total} {total === 1 ? unit.one : unit.many}</p>
      </div>
    </section>
  );
}
