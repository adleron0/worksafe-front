import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { ORDERS_ABILITY, RDO_PERMISSION, ORDERS_KEY, ORDER_KEY, ordersApi } from "../-shared/orders";
import {
  CONDITION_OPTIONS, CrewMember, DIARY_KEY, OCCURRENCE_OPTIONS, Occurrence, Photo, RECENT_REPORTS_KEY, REPORT_KEY, Report, ReportStatusBadge, SHIFT_OPTIONS, StepProgress, TimeField, WEATHER_OPTIONS,
  hoursText, isTime, reportsApi, spanMinutes, workedHours,
} from "../-shared/reports";
import { TEAM_OPTIONS_KEY, TeamOptions, TeamPicker } from "../-shared/team";
import { useBotContext } from "@/pages/_authenticated/bots/-shared/bot-chat";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/ordens-de-servico_/$orderId_/rdo/$reportId")({
  component: ReportPage,
});

/** Na tela a pessoa sempre tem os três campos (vazios quando segue a hora do dia); `own` abre o bloco da hora própria. */
interface CrewRow extends CrewMember { in: string; out: string; leaveReason: string; own: boolean }
interface Form {
  date: string; shift: string; weather: string; crew: CrewRow[]; activities: string; progress: StepProgress[];
  occurrences: Occurrence[]; equipment: string; photos: Photo[]; notes: string;
  startTime: string; endTime: string; breakMinutes: number; weatherEnd: string; startCondition: string; endCondition: string; startNote: string; endNote: string;
}
const crewRow = (member: CrewMember): CrewRow => ({ ...member, in: member.in ?? "", out: member.out ?? "", leaveReason: member.leaveReason ?? "", own: Boolean(member.in || member.out || member.leaveReason) });
const formOf = (report: Report): Form => ({
  date: report.date, shift: report.shift, weather: report.weather, crew: report.crew.map(crewRow), activities: report.activities ?? "", progress: report.progress,
  occurrences: report.occurrences, equipment: report.equipment ?? "", photos: report.photos, notes: report.notes ?? "",
  startTime: report.startTime ?? "", endTime: report.endTime ?? "", breakMinutes: report.breakMinutes ?? 60, weatherEnd: report.weatherEnd ?? "",
  startCondition: report.startCondition ?? "", endCondition: report.endCondition ?? "", startNote: report.startNote ?? "", endNote: report.endNote ?? "",
});
const MAX_PHOTOS = 30;
/** Horas digitadas: aceita vírgula e não deixa passar texto. */
const toHours = (value: string) => { const out = Number(value.replace(",", ".")); return Number.isFinite(out) && out >= 0 ? out : 0; };
const hoursField = (value: number) => String(value).replace(".", ",");

/** Campo de horas que aceita vírgula ("1,5"): guarda o texto como foi digitado e repassa só o número.
 *  Quando o número muda por fora (horas recalculadas pela entrada e saída), o texto acompanha. */
function HoursInput({ value, onValue, ...props }: Omit<React.ComponentProps<typeof ShadInput>, "value" | "onChange"> & { value: number; onValue: (hours: number) => void }) {
  const [text, setText] = useState(() => hoursField(value));
  useEffect(() => { setText((current) => (toHours(current) === value ? current : hoursField(value))); }, [value]);
  return (
    <ShadInput {...props} inputMode="decimal" value={text}
      onChange={(event) => { const next = event.target.value.replace(/[^\d.,]/g, ""); setText(next); onValue(toHours(next)); }} />
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

/** Condição da frente de trabalho (normal, com restrição, sem condição) e a observação que a explica. */
function ConditionField({ label, value, note, disabled, placeholder, onValue, onNote }: {
  label: string; value: string; note: string; disabled: boolean; placeholder: string; onValue: (value: string) => void; onNote: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {CONDITION_OPTIONS.map((option) => (
          <Button key={option.id} type="button" role="radio" aria-checked={value === option.id} variant={value === option.id ? "default" : "outline"} disabled={disabled}
            className="h-11 gap-2" onClick={() => onValue(value === option.id ? "" : option.id)}>
            <Icon name={option.icon} className="w-4 h-4" /> {option.name}
          </Button>
        ))}
      </div>
      <Textarea aria-label={`Observação: ${label}`} className="mt-2" rows={2} maxLength={500} value={note} disabled={disabled} placeholder={placeholder} onChange={(event) => onNote(event.target.value)} />
    </div>
  );
}

/** RDO de um dia de obra, pensado para o celular: uma coluna, campos grandes, botões fixos embaixo. */
function ReportPage() {
  const { orderId, reportId } = Route.useParams();
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  // funções do cadastro de quem foi incluído pela lista: [nome, id]
  const [extraRoles, setExtraRoles] = useState<Array<[string, number | null]>>([]);
  const isNew = reportId === "novo";
  const input = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [uploading, setUploading] = useState(false);
  const [noting, setNoting] = useState<"reopen" | "return" | null>(null);

  // quem pode entrar na equipe do dia: os funcionários, com a disponibilidade na data do RDO
  const pickDate = form?.date ?? "";
  const { data: teamOptions } = useQuery({
    queryKey: [TEAM_OPTIONS_KEY, Number(orderId), { from: pickDate, to: pickDate }], enabled: picking && !!pickDate, staleTime: 60 * 1000,
    queryFn: () => ordersApi.get<TeamOptions>(`${orderId}/team-options`, { from: pickDate, to: pickDate }),
  });
  const { data: report, isLoading, error } = useQuery({
    queryKey: [REPORT_KEY, orderId, reportId],
    queryFn: () => reportsApi.get<Report>(isNew ? `service-orders/${orderId}/reports/template` : `service-reports/${reportId}`),
    // o modelo em branco não é guardado: abrir de novo traz a equipe e o avanço atuais
    gcTime: isNew ? 0 : undefined,
  });
  // bots nas páginas: o bot sabe qual registro está aberto ("este", "esta")
  useBotContext({ entity: "rdo", id: Number(reportId) || undefined, label: "RDO", title: report ? `RDO de ${report.date.slice(0, 10).split("-").reverse().join("/")} · OS ${report.order?.number ?? orderId}` : undefined });
  useEffect(() => { if (report) setForm(formOf(report)); }, [report]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [DIARY_KEY, orderId] });
    queryClient.invalidateQueries({ queryKey: [RECENT_REPORTS_KEY] });
    queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    queryClient.invalidateQueries({ queryKey: [ORDER_KEY, orderId] });
  };
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  /** Salva (criando no primeiro salvamento) e, se pedido, fecha em seguida. */
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async ({ value, close }: { value: Form; close: boolean }) => {
      const saved = isNew ? await reportsApi.post<Report>(`service-orders/${orderId}/reports`, value) : await reportsApi.put<Report>(`service-reports/${reportId}`, value);
      return close ? reportsApi.patch<Report>(`service-reports/${saved.id}/close`) : saved;
    },
    onSuccess: (result, { close }) => {
      refreshAll();
      queryClient.setQueryData([REPORT_KEY, orderId, String(result.id)], result);
      toast({ title: close ? "RDO fechado" : "RDO salvo", variant: "success" });
      if (close) navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId } });
      else if (isNew) navigate({ to: "/servicos/ordens-de-servico/$orderId/rdo/$reportId", params: { orderId, reportId: String(result.id) }, replace: true });
      else setForm(formOf(result));
    },
    onError: fail("Não foi possível salvar o RDO"),
  });
  const { mutate: remove } = useMutation({
    mutationFn: () => reportsApi.delete(`service-reports/${reportId}`),
    onSuccess: () => { refreshAll(); toast({ title: "Rascunho apagado", variant: "success" }); navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId } }); },
    onError: fail("Não foi possível apagar"),
  });

  if (!can(`view_${ORDERS_ABILITY}`)) return null;
  const back = <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Voltar para a ordem de serviço</Link>;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p>{back}</div>;
  if (isLoading || !report || !form) return <div className="grid gap-3 max-w-2xl mx-auto"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;

  const editable = report.editable && can(RDO_PERMISSION);
  // devolver para quem preencheu é do coordenador (quem altera a OS)
  const canReturn = !isNew && can(`update_${ORDERS_ABILITY}`) && !report.returned;
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(formOf(report));
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => (current ? { ...current, [key]: value } : current));
  const hoursPerDay = report.hoursPerDay ?? 8;
  /** Horas de cada pessoa pela entrada e saída (a dela, ou a do dia); sem as duas horas, fica o que estava digitado. */
  const timed = (value: Form): Form => ({
    ...value,
    crew: value.crew.map((member) => {
      const worked = workedHours(member.in || value.startTime, member.out || value.endTime, value.breakMinutes, hoursPerDay, value.shift === "noite");
      return worked ? { ...member, ...worked } : member;
    }),
  });
  /** Mudou hora, intervalo ou turno: as horas da equipe são refeitas. */
  const setTimes = (patch: Partial<Form>) => setForm((current) => (current ? timed({ ...current, ...patch }) : current));
  const setCrew = (index: number, patch: Partial<CrewRow>) => set("crew", form.crew.map((member, i) => (i === index ? { ...member, ...patch } : member)));
  const setCrewTimes = (index: number, patch: Partial<CrewRow>) => setForm((current) => (current ? timed({ ...current, crew: current.crew.map((member, i) => (i === index ? { ...member, ...patch } : member)) }) : current));
  const overnight = form.shift === "noite";
  const leftEarly = (member: CrewRow) => isTime(member.out) && isTime(form.startTime) && isTime(form.endTime)
    && spanMinutes(form.startTime, member.out, overnight) < spanMinutes(form.startTime, form.endTime, overnight);
  const daySpan = isTime(form.startTime) && isTime(form.endTime) ? spanMinutes(form.startTime, form.endTime, overnight) : null;
  const setOccurrence = (index: number, patch: Partial<Occurrence>) => set("occurrences", form.occurrences.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  // funções: as vendidas na proposta e as que já estão na equipe do dia
  // funções orçadas na proposta, as do cadastro de quem foi incluído e as que já estão lançadas
  const roleIds = new Map<string, number | null>([...(report.roleOptions ?? []).map((role): [string, number | null] => [role.name, role.professionalId]), ...extraRoles]);
  const roles = [...new Set([...report.roles, ...roleIds.keys(), ...form.crew.map((member) => member.role).filter(Boolean)])];
  /** O id da função no cadastro: é por ele que o custo de mão de obra casa com o orçado. */
  const roleIdOf = (role: string) => roleIds.get(role) ?? null;
  const linkedIds = new Set(form.crew.map((member) => member.employeeId).filter((id): id is number => !!id));
  const totalHours = form.crew.reduce((sum, member) => sum + member.hours, 0);
  const totalOvertime = form.crew.reduce((sum, member) => sum + member.overtime, 0);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - form.photos.length;
    if (room <= 0) return toast({ title: `No máximo ${MAX_PHOTOS} fotos por RDO`, variant: "destructive" });
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) { toast({ title: `${file.name} não é uma imagem`, variant: "destructive" }); continue; }
        const response = await post<{ imageUrl: string }, { image: File }>("images", "s3", { image: file });
        if (!response?.imageUrl) throw new Error("sem endereço");
        const url = response.imageUrl;
        setForm((current) => (current ? { ...current, photos: [...current.photos, { url, caption: "" }] } : current));
      }
    } catch {
      toast({ title: "Não foi possível enviar a foto", description: "Tente de novo. Se continuar, confira o sinal e o tamanho do arquivo.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {back}
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <h1 className="text-xl font-bold">RDO de {dateBr(form.date)}</h1>
        {!isNew && <ReportStatusBadge status={report.status} returned={!!report.returned} />}
      </div>
      <p className="text-sm text-muted-foreground truncate">{report.order.customer?.name} · {report.order.number} · {report.order.title}</p>
      {report.returned && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <p className="font-medium flex items-center gap-1.5"><Icon name="undo-2" className="w-4 h-4" /> Devolvido para correção{report.returned.by ? ` por ${report.returned.by}` : ""} em {new Date(report.returned.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
          {report.returned.note && <p className="mt-1 whitespace-pre-line">{report.returned.note}</p>}
          <p className="mt-1 text-xs opacity-80">Corrija e feche o RDO de novo.</p>
        </div>
      )}
      {report.status === "fechado" && (
        <p className="mt-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          RDO fechado{report.closedBy ? ` por ${report.closedBy}` : ""}{report.closedAt ? ` em ${new Date(report.closedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}: somente leitura.
        </p>
      )}

      <div className="mt-4 grid gap-4">
        <Section title="O dia">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Data</Label>
              <CalendarPicker mode="single" name="reportDate" className="mt-1 w-full" value={form.date} disabled={!editable} fromYear={2024} toYear={2040}
                onValueChange={(_, value) => set("date", String(value ?? "") || form.date)} /></div>
            <div><Label className="text-xs">Turno</Label>
              <Select name="shift" state={form.shift} disabled={!editable} modal={false} options={SHIFT_OPTIONS} onChange={(_, value) => setTimes({ shift: String(value || "integral") })} /></div>
          </div>
        </Section>

        <Section title="Entrada na atividade" hint="A hora em que a equipe começou, o clima e como estava a frente de trabalho.">
          <div><Label htmlFor="startTime" className="text-xs">Hora de entrada</Label>
            <TimeField id="startTime" className="mt-1" value={form.startTime} disabled={!editable} onChange={(value) => setTimes({ startTime: value })} /></div>
          <div>
            <Label className="text-xs">Clima na entrada</Label>
            <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Clima na entrada">
              {WEATHER_OPTIONS.map((option) => (
                <Button key={option.id} type="button" role="radio" aria-checked={form.weather === option.id} variant={form.weather === option.id ? "default" : "outline"} disabled={!editable}
                  className="h-11 gap-2" onClick={() => set("weather", option.id)}>
                  <Icon name={option.icon} className="w-4 h-4" /> {option.name}
                </Button>
              ))}
            </div>
            {form.weather === "impraticavel" && <p className="mt-1 text-xs text-muted-foreground">Dia sem condição de trabalho: conta como dia parado.</p>}
          </div>
          <ConditionField label="Condição da frente de trabalho na entrada" value={form.startCondition} note={form.startNote} disabled={!editable}
            placeholder="Ex.: área liberada, PT emitida; piso molhado no lado norte" onValue={(value) => set("startCondition", value)} onNote={(value) => set("startNote", value)} />
        </Section>

        <Section title="Equipe do dia" hint={`Quem trabalhou e quantas horas. Total: ${hoursText(totalHours)}${totalOvertime > 0 ? ` + ${hoursText(totalOvertime)} extras` : ""}.`}>
          {form.crew.length === 0 && <p className="text-sm text-muted-foreground">Ninguém lançado. Inclua as pessoas que trabalharam hoje.</p>}
          {form.crew.map((member, index) => (
            <div key={index} className="rounded-md border p-3 grid gap-2">
              <div className="flex gap-2">
                {member.employeeId
                  ? <p className="flex h-9 min-w-0 flex-1 items-center gap-1.5 text-sm font-medium"><Icon name="id-card" className="w-4 h-4 shrink-0 text-muted-foreground" /> <span className="truncate">{member.name}</span></p>
                  : <ShadInput aria-label="Nome" placeholder="Nome" maxLength={120} value={member.name} disabled={!editable} onChange={(event) => setCrew(index, { name: event.target.value })} />}
                {editable && <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label={`Tirar ${member.name || "pessoa"} da equipe do dia`} onClick={() => set("crew", form.crew.filter((_, i) => i !== index))}><Icon name="x" className="w-4 h-4" /></Button>}
              </div>
              {/* quem entrou depois ou saiu antes tem a hora própria; os demais seguem a do dia */}
              {member.own ? (
                <div className="grid gap-2 rounded-md bg-muted/40 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label htmlFor={`in-${index}`} className="text-xs">Entrou às</Label>
                      <TimeField id={`in-${index}`} className="mt-1" now={false} value={member.in} disabled={!editable} onChange={(value) => setCrewTimes(index, { in: value })} /></div>
                    <div><Label htmlFor={`out-${index}`} className="text-xs">Saiu às</Label>
                      <TimeField id={`out-${index}`} className="mt-1" now={false} value={member.out} disabled={!editable} onChange={(value) => setCrewTimes(index, { out: value })} /></div>
                  </div>
                  <div><Label htmlFor={`reason-${index}`} className="text-xs">Motivo{leftEarly(member) ? " da saída antecipada *" : ""}</Label>
                    <ShadInput id={`reason-${index}`} className="mt-1" maxLength={200} value={member.leaveReason} disabled={!editable} placeholder="Ex.: consulta médica; chamado para outra obra"
                      onChange={(event) => setCrew(index, { leaveReason: event.target.value })} /></div>
                  {editable && <Button type="button" variant="ghost" size="sm" className="w-fit h-7 px-2 text-xs" onClick={() => setCrewTimes(index, { in: "", out: "", leaveReason: "", own: false })}>Voltar a seguir a hora do dia</Button>}
                </div>
              ) : editable && (
                <Button type="button" variant="ghost" size="sm" className="w-fit h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setCrew(index, { own: true })}>
                  <Icon name="clock" className="w-3 h-3 mr-1" /> Entrou depois ou saiu antes
                </Button>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2 items-end">
                <div><Label className="text-xs">Função</Label>
                  <Select name={`role-${index}`} state={member.role} clearable disabled={!editable} modal={false} placeholder="Escolha" options={roles.map((role) => ({ id: role, name: role }))}
                    onChange={(_, value) => { const role = String(value ?? ""); setCrew(index, { role, professionalId: roleIdOf(role) }); }} /></div>
                <div><Label htmlFor={`hours-${index}`} className="text-xs">Horas</Label>
                  <HoursInput id={`hours-${index}`} className="mt-1 text-center" value={member.hours} disabled={!editable}
                    onValue={(hours) => setCrew(index, { hours })} /></div>
                <div><Label htmlFor={`overtime-${index}`} className="text-xs">Extras</Label>
                  <HoursInput id={`overtime-${index}`} className="mt-1 text-center" value={member.overtime} disabled={!editable}
                    onValue={(overtime) => setCrew(index, { overtime })} /></div>
              </div>
            </div>
          ))}
          {editable && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setPicking(true)}>
                <Icon name="user-plus" className="w-4 h-4 mr-1" /> Incluir funcionário
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setForm((current) => (current ? timed({ ...current, crew: [...current.crew, { name: "", role: report.roles[0] ?? "", professionalId: roleIdOf(report.roles[0] ?? ""), hours: hoursPerDay, overtime: 0, in: "", out: "", leaveReason: "", own: false }] }) : current))}>
                <Icon name="plus" className="w-4 h-4 mr-1" /> Pessoa avulsa (diarista, terceiro)
              </Button>
            </div>
          )}
        </Section>

        <Section title="O que foi feito">
          <Textarea aria-label="O que foi feito" rows={4} maxLength={5000} value={form.activities} disabled={!editable} placeholder="Ex.: jateamento do costado, lado norte; primeira demão de primer"
            onChange={(event) => set("activities", event.target.value)} />
        </Section>

        {form.progress.length > 0 && (
          <Section title="Avanço das etapas" hint="Quanto de cada etapa do cronograma está pronto até hoje (acumulado).">
            {form.progress.map((step, index) => (
              <div key={step.step}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 break-words">{step.title}</span><b className="tabular-nums shrink-0">{step.percent}%</b></div>
                <Slider className="mt-2" min={0} max={100} step={5} value={[step.percent]} disabled={!editable} aria-label={`Avanço de ${step.title}`}
                  onValueChange={([value]) => set("progress", form.progress.map((item, i) => (i === index ? { ...item, percent: value } : item)))} />
              </div>
            ))}
          </Section>
        )}

        <Section title="Ocorrências" hint="Paralisação, pendência do cliente, acidente ou quase acidente.">
          {form.occurrences.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ocorrência no dia.</p>}
          {form.occurrences.map((item, index) => (
            <div key={index} className="rounded-md border p-3 grid gap-2">
              <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-2 items-end">
                <div><Label className="text-xs">Tipo</Label>
                  <Select name={`occurrence-${index}`} state={item.type} disabled={!editable} modal={false} options={OCCURRENCE_OPTIONS} onChange={(_, value) => setOccurrence(index, { type: String(value || "outro") })} /></div>
                <div><Label htmlFor={`lost-${index}`} className="text-xs">Horas paradas</Label>
                  <HoursInput id={`lost-${index}`} className="mt-1 text-center" value={item.hoursLost} disabled={!editable}
                    onValue={(hoursLost) => setOccurrence(index, { hoursLost })} /></div>
                {editable && <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Remover ocorrência" onClick={() => set("occurrences", form.occurrences.filter((_, i) => i !== index))}><Icon name="x" className="w-4 h-4" /></Button>}
              </div>
              <Textarea aria-label="O que aconteceu" rows={2} maxLength={1000} value={item.description} disabled={!editable} placeholder="O que aconteceu" onChange={(event) => setOccurrence(index, { description: event.target.value })} />
            </div>
          ))}
          {editable && (
            <Button type="button" variant="outline" className="h-11" onClick={() => set("occurrences", [...form.occurrences, { type: "paralisacao", description: "", hoursLost: 0 }])}>
              <Icon name="triangle-alert" className="w-4 h-4 mr-1" /> Registrar ocorrência
            </Button>
          )}
        </Section>

        <Section title="Saída" hint="Preencha no fim do dia: a hora em que a equipe saiu, o clima e como a frente de trabalho ficou.">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 items-end">
            <div><Label htmlFor="endTime" className="text-xs">Hora de saída</Label>
              <TimeField id="endTime" className="mt-1" value={form.endTime} disabled={!editable} onChange={(value) => setTimes({ endTime: value })} /></div>
            <div><Label htmlFor="breakMinutes" className="text-xs">Intervalo (min)</Label>
              <ShadInput id="breakMinutes" className="mt-1 text-center" inputMode="numeric" maxLength={3} value={String(form.breakMinutes)} disabled={!editable}
                onChange={(event) => setTimes({ breakMinutes: Math.min(240, Number(event.target.value.replace(/\D/g, "")) || 0) })} /></div>
          </div>
          {daySpan !== null && daySpan > 0 && (
            <p className="text-xs text-muted-foreground">Jornada de {hoursText(daySpan / 60)}{daySpan > 360 && form.breakMinutes > 0 ? `, com ${form.breakMinutes} min de intervalo` : ""}. As horas de cada pessoa foram calculadas por ela; ajuste na equipe se precisar.</p>
          )}
          {isTime(form.startTime) && isTime(form.endTime) && daySpan !== null && daySpan <= 0 && <p className="text-xs text-red-600 dark:text-red-400">A hora de saída precisa ser depois da entrada.</p>}
          <div>
            <Label className="text-xs">Clima na saída</Label>
            <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Clima na saída">
              {WEATHER_OPTIONS.map((option) => (
                <Button key={option.id} type="button" role="radio" aria-checked={form.weatherEnd === option.id} variant={form.weatherEnd === option.id ? "default" : "outline"} disabled={!editable}
                  className="h-11 gap-2" onClick={() => set("weatherEnd", form.weatherEnd === option.id ? "" : option.id)}>
                  <Icon name={option.icon} className="w-4 h-4" /> {option.name}
                </Button>
              ))}
            </div>
          </div>
          <ConditionField label="Condição da frente de trabalho na saída" value={form.endCondition} note={form.endNote} disabled={!editable}
            placeholder="Ex.: área limpa e isolada; andaime travado" onValue={(value) => set("endCondition", value)} onNote={(value) => set("endNote", value)} />
        </Section>

        <Section title="Equipamentos e observações">
          <div><Label htmlFor="reportEquipment" className="text-xs">Equipamentos usados</Label>
            <Textarea id="reportEquipment" className="mt-1" rows={2} maxLength={2000} value={form.equipment} disabled={!editable} onChange={(event) => set("equipment", event.target.value)} /></div>
          <div><Label htmlFor="reportNotes" className="text-xs">Observações</Label>
            <Textarea id="reportNotes" className="mt-1" rows={2} maxLength={5000} value={form.notes} disabled={!editable} onChange={(event) => set("notes", event.target.value)} /></div>
        </Section>

        <Section title="Fotos" hint={`Até ${MAX_PHOTOS} fotos. A legenda ajuda quem lê depois.`}>
          {form.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {form.photos.map((photo, index) => (
                <figure key={photo.url} className="grid gap-1">
                  <div className="relative">
                    <a href={photo.url} target="_blank" rel="noopener noreferrer"><img src={photo.url} alt={photo.caption || `Foto ${index + 1}`} className="aspect-square w-full rounded-md border object-cover" /></a>
                    {editable && <Button type="button" variant="secondary" size="sm" className="absolute top-1 right-1 h-7 w-7 p-0" aria-label="Remover foto" onClick={() => set("photos", form.photos.filter((_, i) => i !== index))}><Icon name="x" className="w-3.5 h-3.5" /></Button>}
                  </div>
                  <ShadInput aria-label={`Legenda da foto ${index + 1}`} placeholder="Legenda" maxLength={200} value={photo.caption} disabled={!editable}
                    onChange={(event) => set("photos", form.photos.map((item, i) => (i === index ? { ...item, caption: event.target.value } : item)))} />
                </figure>
              ))}
            </div>
          )}
          {editable && (
            <>
              <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(event) => upload(event.target.files)} />
              <Button type="button" variant="outline" className="h-11" disabled={uploading || form.photos.length >= MAX_PHOTOS} onClick={() => input.current?.click()}>
                <Icon name="camera" className="w-4 h-4 mr-1" /> {uploading ? "Enviando..." : "Adicionar fotos"}
              </Button>
            </>
          )}
          {!editable && form.photos.length === 0 && <p className="text-sm text-muted-foreground">Sem fotos.</p>}
        </Section>
      </div>

      {/* ações sempre à mão, no rodapé */}
      {(can(RDO_PERMISSION) || canReturn) && (
        <div className={cn("fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur px-4 py-3")}>
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-end gap-2">
            {editable && !isNew && (
              <ConfirmDialog title="Apagar este rascunho?" description="O RDO deste dia é apagado. Não dá para desfazer." onConfirm={() => remove()}>
                <Button type="button" variant="ghost" className="mr-auto text-destructive">Apagar</Button>
              </ConfirmDialog>
            )}
            {editable && <Button type="button" variant="outline" disabled={saving || uploading || !dirty} onClick={() => save({ value: form, close: false })}>{saving ? "Salvando..." : "Salvar rascunho"}</Button>}
            {editable && (
              <ConfirmDialog title="Fechar o RDO?" description="Depois de fechado ele não é mais editado. Para corrigir, é preciso reabrir informando o motivo." slideLabel="Deslize para fechar o RDO" onConfirm={() => save({ value: form, close: true })}>
                <Button type="button" disabled={saving || uploading}><Icon name="check" className="w-4 h-4 mr-1" /> Fechar o RDO</Button>
              </ConfirmDialog>
            )}
            {canReturn && <Button type="button" variant="outline" onClick={() => setNoting("return")}><Icon name="undo-2" className="w-4 h-4 mr-1" /> Devolver para correção</Button>}
            {report.status === "fechado" && can(RDO_PERMISSION) && <Button type="button" variant="outline" onClick={() => setNoting("reopen")}><Icon name="lock-open" className="w-4 h-4 mr-1" /> Reabrir para corrigir</Button>}
          </div>
        </div>
      )}

      {picking && teamOptions && (
        <TeamPicker options={teamOptions} taken={linkedIds} onClose={() => setPicking(false)}
          onPick={(chosen) => {
            setExtraRoles((current) => [...current, ...chosen.flatMap((option) => option.roles.map((role): [string, number | null] => [role.name, role.id]))]);
            setForm((current) => (current ? timed({ ...current, crew: [...current.crew, ...chosen.map((option): CrewRow => {
              // a função do dia: a orçada que a pessoa exerce, se houver; senão a principal dela
              const budgeted = option.roles.find((role) => (report.roleOptions ?? []).some((item) => item.professionalId === role.id));
              const role = budgeted ?? option.roles.find((item) => item.isPrimary) ?? option.roles[0];
              const budgetName = role ? (report.roleOptions ?? []).find((item) => item.professionalId === role.id)?.name : undefined;
              return { name: option.name, role: budgetName ?? role?.name ?? "", employeeId: option.id, professionalId: role?.id ?? null, hours: hoursPerDay, overtime: 0, in: "", out: "", leaveReason: "", own: false };
            })] }) : current));
          }} />
      )}
      {noting && <NoteDialog mode={noting} reportId={Number(reportId)} filledBy={report.createdBy} onClose={() => setNoting(null)} onDone={(result) => { refreshAll(); queryClient.setQueryData([REPORT_KEY, orderId, reportId], result); }} />}
    </div>
  );
}

/**
 * Reabrir (quem preencheu corrige o próprio RDO) ou devolver (o coordenador manda
 * de volta para quem preencheu): os dois pedem o motivo, que fica no histórico;
 * o da devolução aparece para quem preencheu até fechar de novo.
 */
function NoteDialog({ mode, reportId, filledBy, onClose, onDone }: { mode: "reopen" | "return"; reportId: number; filledBy: string | null; onClose: () => void; onDone: (report: Report) => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const returning = mode === "return";
  const { mutate, isPending } = useMutation({
    mutationFn: () => reportsApi.patch<Report>(`service-reports/${reportId}/${returning ? "return" : "reopen"}`, { note }),
    onSuccess: (result) => { onDone(result); toast({ title: returning ? "RDO devolvido para correção" : "RDO reaberto", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{returning ? "Devolver para correção" : "Reabrir o RDO"}</DialogTitle>
          <DialogDescription>{returning
            ? `O RDO volta a ser rascunho para ${filledBy ?? "quem preencheu"} corrigir. O motivo aparece na tela e na esteira da pessoa até ela fechar de novo.`
            : "O RDO volta a ser rascunho para você corrigir. O motivo fica guardado."}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return setError("Informe o motivo da correção."); setError(""); mutate(); }}>
          <div><Label htmlFor="reopenNote">{returning ? "O que corrigir" : "Motivo"} <span>*</span></Label>
            <Textarea id="reopenNote" className="mt-1" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={returning ? "Ex.: faltam as fotos do dia e a descrição do que foi jateado" : "Ex.: faltou lançar as horas extras do João"} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? (returning ? "Devolvendo..." : "Reabrindo...") : (returning ? "Devolver" : "Reabrir")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
