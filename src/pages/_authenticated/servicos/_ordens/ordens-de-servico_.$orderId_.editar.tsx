import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { ChecklistItem, ORDERS_ABILITY, ORDERS_KEY, ORDER_KEY, ORDER_SHEET_KEY, Order, OrderOptions, OrderSchedule, TeamMember, ordersApi } from "../-shared/orders";
import { TEAM_OPTIONS_KEY, TeamEditor } from "../-shared/team";
import { TIMELINE_KEY } from "../-shared/timeline";
import { TEAM_DOCUMENTS_KEY } from "../../rh/-shared/team-documents";
import { PointDialog } from "../../rh/-shared/places";

export const Route = createFileRoute("/_authenticated/servicos/_ordens/ordens-de-servico_/$orderId_/editar")({
  component: EditOrderPage,
});

interface Step { title: string; start: string; duration: string; details: string }
interface Form {
  plannedStart: string; plannedEnd: string; responsibleUserId: string; location: string; contactName: string; contactPhone: string;
  team: TeamMember[]; unit: OrderSchedule["unit"]; steps: Step[]; checklist: ChecklistItem[]; safety: string; notes: string;
}
const formOf = (order: Order): Form => ({
  plannedStart: order.plannedStart ?? "", plannedEnd: order.plannedEnd ?? "", responsibleUserId: order.responsible ? String(order.responsible.id) : "",
  location: order.location ?? "", contactName: order.contactName ?? "", contactPhone: order.contactPhone ?? "", team: order.team,
  unit: order.schedule?.unit ?? "dia",
  steps: (order.schedule?.steps ?? []).map((step) => ({ title: step.title, start: String(step.start), duration: String(step.duration), details: step.details ?? "" })),
  checklist: order.checklist, safety: order.safety ?? "", notes: order.notes ?? "",
});
const UNIT_OPTIONS = [{ id: "dia", name: "Dias" }, { id: "semana", name: "Semanas" }, { id: "mes", name: "Meses" }];
const SAFETY_HINT = "Ex.: Trabalho em altura (NR-35): cinto paraquedista com talabarte duplo, capacete com jugular, ancoragem certificada. PT emitida pelo cliente antes de subir.";

function Section({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-card border bg-card p-4 scroll-mt-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

/** Editar a OS em tela própria: o que sai na folha (agenda, equipe, o que fazer, mobilização, segurança). */
function EditOrderPage() {
  const { orderId } = Route.useParams();
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [newCheck, setNewCheck] = useState("");
  const [pickingPoint, setPickingPoint] = useState(false);
  const { data: order, isLoading, error } = useQuery({ queryKey: [ORDER_KEY, orderId], queryFn: () => ordersApi.get<Order>(orderId) });
  const { data: options } = useQuery({ queryKey: ["serviceOrderOptions"], staleTime: 5 * 60 * 1000, queryFn: () => ordersApi.get<OrderOptions>("options") });
  useEffect(() => { if (order && !form) setForm(formOf(order)); }, [order, form]);
  // chegou por um atalho (#equipe, #cronograma): rola até a parte
  useEffect(() => {
    if (!form || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [!!form]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = (result: Order) => {
    queryClient.setQueryData([ORDER_KEY, orderId], result);
    for (const key of [ORDERS_KEY, TEAM_OPTIONS_KEY, TEAM_DOCUMENTS_KEY, ORDER_SHEET_KEY, TIMELINE_KEY]) queryClient.invalidateQueries({ queryKey: [key] });
  };
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (value: Form) => ordersApi.put<Order>(orderId, {
      plannedStart: value.plannedStart || null, plannedEnd: value.plannedEnd || null, responsibleUserId: value.responsibleUserId || null,
      location: value.location, contactName: value.contactName, contactPhone: value.contactPhone, team: value.team, checklist: value.checklist,
      safety: value.safety, notes: value.notes,
      ...(value.steps.length || order?.schedule ? { schedule: { unit: value.unit, steps: value.steps.map((step) => ({ title: step.title, start: Number(step.start), duration: Number(step.duration), details: step.details })) } } : {}),
    }),
    onSuccess: (result) => { refresh(result); toast({ title: "Ordem de serviço salva", variant: "success" }); navigate({ to: "/servicos/ordens-de-servico/$orderId", params: { orderId } }); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: savePoint, isPending: savingPoint } = useMutation({
    mutationFn: (point: { latitude: number; longitude: number } | null) => ordersApi.put<Order>(orderId, { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null }),
    onSuccess: (result) => { refresh(result); setPickingPoint(false); toast({ title: "Ponto da obra salvo", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível salvar o ponto", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`update_${ORDERS_ABILITY}`)) return <p className="p-4 text-sm text-muted-foreground">Você não tem permissão para alterar ordens de serviço.</p>;
  if (error) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(error)}</p></div>;
  if (isLoading || !order || !form) return <div className="grid gap-3 max-w-3xl mx-auto"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (order.status === "cancelada" || order.status === "encerrada") return (
    <div className="max-w-xl mx-auto p-6 text-center text-sm">
      <p>A OS está {order.status}. Reabra para alterar.</p>
      <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="underline">Voltar para a OS</Link>
    </div>
  );

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => (current ? { ...current, [key]: value } : current));
  const setStep = (index: number, patch: Partial<Step>) => set("steps", form.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  const dirty = JSON.stringify(form) !== JSON.stringify(formOf(order));
  const lastEnd = form.steps.reduce((max, step) => Math.max(max, (Number(step.start) || 1) + (Number(step.duration) || 1) - 1), 0);
  const unitLabel = UNIT_OPTIONS.find((option) => option.id === form.unit)?.name.toLowerCase() ?? "dias";
  const stepError = form.steps.map((step) => (!step.title.trim() ? "Informe o nome" : !(Number(step.start) >= 1) || !Number.isInteger(Number(step.start)) ? "Início a partir de 1" : !(Number(step.duration) >= 1) || !Number.isInteger(Number(step.duration)) ? "Duração a partir de 1" : null));
  const invalid = stepError.some(Boolean) || (!!form.plannedStart && !!form.plannedEnd && form.plannedEnd < form.plannedStart);

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Voltar para a OS sem salvar</Link>
      <h1 className="text-xl font-bold mt-1">Editar a {order.number}</h1>
      <p className="text-sm text-muted-foreground truncate">{order.customer?.name} · {order.title}</p>

      <div className="mt-4 grid gap-4">
        <Section title="Quando, onde e com quem falar">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Início previsto</Label>
              <CalendarPicker mode="single" name="plannedStart" className="mt-1 w-full" value={form.plannedStart} placeholder="A definir" fromYear={2024} toYear={2040} onValueChange={(_, value) => set("plannedStart", String(value ?? ""))} /></div>
            <div><Label className="text-xs">Término previsto</Label>
              <CalendarPicker mode="single" name="plannedEnd" className="mt-1 w-full" value={form.plannedEnd} placeholder="A definir" fromYear={2024} toYear={2040} onValueChange={(_, value) => set("plannedEnd", String(value ?? ""))} /></div>
          </div>
          {form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart && <p className="text-xs text-red-600">O término não pode ser antes do início.</p>}
          {order.startedAt && <p className="text-xs text-muted-foreground">Começou de fato em {dateBr(order.startedAt)}{order.finishedAt ? ` e terminou em ${dateBr(order.finishedAt)}` : ""}. O cronograma conta a partir do início real.</p>}
          <div><Label className="text-xs">Responsável</Label>
            <Select name="responsibleUserId" state={form.responsibleUserId} clearable placeholder="Ninguém definido" modal={false}
              options={(options?.users ?? []).map((user) => ({ id: String(user.id), name: user.name }))} onChange={(_, value) => set("responsibleUserId", String(value ?? ""))} /></div>
          <div><Label htmlFor="location" className="text-xs">Local do serviço</Label>
            <ShadInput id="location" className="mt-1" maxLength={300} value={form.location} onChange={(event) => set("location", event.target.value)} /></div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Icon name="map-pin" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">{order.point?.source === "obra" ? "Ponto próprio da obra no mapa" : order.point?.source === "local" ? `No mapa: ${order.point.place?.name}` : order.point?.source === "cliente" ? "No mapa: o ponto do cliente" : "Sem ponto no mapa"}</span>
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPickingPoint(true)}>{order.point?.own ? "Ajustar o ponto" : "Marcar o ponto da obra"}</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="contactName" className="text-xs">Contato no cliente</Label>
              <ShadInput id="contactName" className="mt-1" maxLength={160} value={form.contactName} onChange={(event) => set("contactName", event.target.value)} /></div>
            <div><Label htmlFor="contactPhone" className="text-xs">Telefone</Label>
              <ShadInput id="contactPhone" className="mt-1" maxLength={60} inputMode="tel" value={form.contactPhone} onChange={(event) => set("contactPhone", event.target.value)} /></div>
          </div>
        </Section>

        <Section id="equipe" title="Equipe" hint="Quem vai para a obra. Sai na folha com nome e função.">
          <TeamEditor orderId={order.id} team={form.team} onChange={(team) => set("team", team)} editable from={form.plannedStart || order.startedAt || ""} to={form.plannedEnd || order.finishedAt || ""} users={options?.users ?? []} />
        </Section>

        <Section id="cronograma" title="O que fazer — etapas do cronograma"
          hint={order.baseline ? "Cronograma replanejado. O da proposta continua guardado e aparece tracejado no diário." : "Veio da proposta. Mudar aqui replaneja a obra; o original fica guardado para comparar."}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Contado em</span>
            <div className="w-36"><Select name="unit" state={form.unit} modal={false} options={UNIT_OPTIONS} onChange={(_, value) => set("unit", (String(value || "dia") as OrderSchedule["unit"]))} /></div>
            {lastEnd > 0 && <span className="text-muted-foreground">· {lastEnd} {unitLabel} no total</span>}
          </div>
          {form.steps.length === 0 && <p className="text-sm text-muted-foreground">Sem etapas. Inclua as etapas da obra para a equipe saber o que fazer e o RDO medir o avanço.</p>}
          {form.steps.map((step, index) => (
            <div key={index} className="rounded-md border p-3 grid gap-2">
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_5rem_5rem_2.25rem] gap-2 items-end">
                <span className="pb-2 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                <div><Label htmlFor={`step-${index}`} className="text-xs">Etapa</Label>
                  <ShadInput id={`step-${index}`} className="mt-1" maxLength={160} value={step.title} onChange={(event) => setStep(index, { title: event.target.value })} /></div>
                <div><Label htmlFor={`start-${index}`} className="text-xs">Começa no</Label>
                  <ShadInput id={`start-${index}`} className="mt-1 text-center" inputMode="numeric" value={step.start} onChange={(event) => setStep(index, { start: event.target.value.replace(/\D/g, "") })} /></div>
                <div><Label htmlFor={`duration-${index}`} className="text-xs">Duração</Label>
                  <ShadInput id={`duration-${index}`} className="mt-1 text-center" inputMode="numeric" value={step.duration} onChange={(event) => setStep(index, { duration: event.target.value.replace(/\D/g, "") })} /></div>
                {/* só a última sai: o RDO guarda o avanço pelo número da etapa */}
                {index === form.steps.length - 1 ? (
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Tirar a etapa ${step.title || index + 1}`} onClick={() => set("steps", form.steps.slice(0, -1))}><Icon name="x" className="w-4 h-4" /></Button>
                ) : <span />}
              </div>
              <Textarea aria-label={`O que fazer na etapa ${step.title || index + 1}`} rows={2} maxLength={2000} value={step.details} placeholder="O que a equipe faz nesta etapa (sai na folha). Ex.: instalar 12 pontos de ancoragem na cobertura do galpão 2"
                onChange={(event) => setStep(index, { details: event.target.value })} />
              {stepError[index] && <p className="text-xs text-red-600">{stepError[index]}</p>}
            </div>
          ))}
          <Button type="button" variant="outline" className="w-fit" onClick={() => set("steps", [...form.steps, { title: "", start: String(lastEnd + 1 || 1), duration: "1", details: "" }])}><Icon name="plus" className="w-4 h-4 mr-1" /> Incluir etapa</Button>
          {form.steps.length > 0 && <p className="text-xs text-muted-foreground">Para tirar uma etapa do meio, mude o nome e o período dela: o avanço já lançado no RDO fica preso ao número da etapa.</p>}
        </Section>

        <Section title="Mobilização" hint="O que conferir antes de a equipe sair. Sai na folha com caixas para marcar.">
          <ul className="grid gap-2">
            {form.checklist.map((item, index) => (
              <li key={item.id ?? index} className="flex gap-2 items-center">
                <ShadInput aria-label={`Item ${index + 1} da mobilização`} maxLength={160} value={item.title} onChange={(event) => set("checklist", form.checklist.map((current, i) => (i === index ? { ...current, title: event.target.value } : current)))} />
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label={`Tirar ${item.title}`} onClick={() => set("checklist", form.checklist.filter((_, i) => i !== index))}><Icon name="x" className="w-4 h-4" /></Button>
              </li>
            ))}
          </ul>
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!newCheck.trim()) return; set("checklist", [...form.checklist, { title: newCheck.trim(), done: false }]); setNewCheck(""); }}>
            <ShadInput value={newCheck} maxLength={160} placeholder="Ex.: PT emitida pelo cliente; andaime inspecionado" onChange={(event) => setNewCheck(event.target.value)} />
            <Button type="submit" variant="outline" disabled={!newCheck.trim()}><Icon name="plus" className="w-4 h-4 mr-1" /> Incluir</Button>
          </form>
        </Section>

        <Section title="Segurança — riscos e EPIs obrigatórios" hint="Sai em destaque na folha. Escreva como a equipe vai ler: o risco e o que usar.">
          <Textarea aria-label="Riscos e EPIs obrigatórios" rows={4} maxLength={5000} value={form.safety} placeholder={SAFETY_HINT} onChange={(event) => set("safety", event.target.value)} />
        </Section>

        <Section title="Observações" hint="Sai na folha da equipe. Não aparece para o cliente.">
          <Textarea aria-label="Observações da operação" rows={3} maxLength={5000} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-2">
          {dirty && <span className="mr-auto text-xs text-muted-foreground">Alterações não salvas</span>}
          <Button asChild variant="outline"><Link to="/servicos/ordens-de-servico/$orderId" params={{ orderId }}>Cancelar</Link></Button>
          <Button type="button" disabled={!dirty || saving || invalid} onClick={() => save(form)}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </div>

      {pickingPoint && (
        <PointDialog title={`Ponto da obra ${order.number}`} description="Marque onde a obra acontece, se não for no endereço do cliente. Clique no mapa ou arraste o alfinete."
          point={order.point?.own ?? null} hint={order.point?.customer ?? null} clearLabel="Usar o ponto do cliente" saving={savingPoint} onSave={(point) => savePoint(point)} onClose={() => setPickingPoint(false)} />
      )}
    </div>
  );
}
