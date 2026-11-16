import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { NumField, Tip, dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { RecordFilesPanel } from "../../arquivos/-shared/record-files";
import { HOLDER_LABEL, HolderType, PERM_MOVE, stockApi } from "../-shared/stock";
import { MovementDetailDialog } from "../-shared/stock-movements";
import {
  DueStateBadge, EQUIP_ABILITY, EQUIP_KEYS, InspectionDialog, PERM_INSPECT, PrintLabelsDialog, RETIRE_REASONS, ServiceSendDialog, UnitDetail, UnitStatusBadge, useEquipmentRefresh,
} from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/$unitId")({
  component: UnitPage,
});

interface Draft { tag: string; serialNumber: string; manufacturedAt: string; firstUseAt: string; nextInspectionAt: string; nextCalibrationAt: string; length: number | null; notes: string }
const draftOf = (unit: UnitDetail): Draft => ({
  tag: unit.tag, serialNumber: unit.serialNumber ?? "", manufacturedAt: unit.manufacturedAt ?? "", firstUseAt: unit.firstUseAt ?? "",
  nextInspectionAt: unit.nextInspectionAt ?? "", nextCalibrationAt: unit.nextCalibrationAt ?? "", length: unit.length, notes: unit.notes ?? "",
});
type Dialogs = "inspect" | "service" | "cut" | "retire" | "labels" | "extra" | null;

/** Ficha da peça: dados, situação, vencimentos, linha do tempo, inspeções, serviços e arquivos. */
function UnitPage() {
  const { unitId } = Route.useParams();
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const refresh = useEquipmentRefresh();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [blocking, setBlocking] = useState(false);
  const [opened, setOpened] = useState<number | null>(null);
  const [error, setError] = useState("");
  const allowed = can(`view_${EQUIP_ABILITY}`) || can(PERM_INSPECT) || can(PERM_MOVE);
  const { data: unit, isLoading, error: loadError } = useQuery({
    queryKey: [EQUIP_KEYS.unit, unitId], queryFn: () => stockApi.get<UnitDetail>(`units/${unitId}`), enabled: allowed,
  });
  useEffect(() => { if (unit) setDraft(draftOf(unit)); }, [unit]);
  const apply = (result: UnitDetail) => { queryClient.setQueryData([EQUIP_KEYS.unit, String(result.id)], result); refresh(); };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (value: Draft) => stockApi.put<UnitDetail>(`units/${unitId}`, {
      tag: value.tag.trim(), serialNumber: value.serialNumber, manufacturedAt: value.manufacturedAt || null, firstUseAt: value.firstUseAt || null,
      nextInspectionAt: value.nextInspectionAt || null, nextCalibrationAt: value.nextCalibrationAt || null, length: value.length, notes: value.notes,
    }),
    onSuccess: (result) => { apply(result); toast({ title: "Peça salva", variant: "success" }); },
    onError: (err) => setError(errorMessage(err)),
  });
  const { mutate: setState } = useMutation({
    mutationFn: (body: { action: "bloquear" | "liberar" | "extraordinaria"; note?: string }) => stockApi.patch<UnitDetail>(`units/${unitId}/state`, body),
    onSuccess: (result, body) => { apply(result); toast({ title: body.action === "bloquear" ? "Peça bloqueada" : body.action === "liberar" ? "Peça liberada" : "Inspeção extraordinária pedida", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível mudar a situação", description: errorMessage(err), variant: "destructive" }),
  });

  if (!allowed) return null;
  if (loadError) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(loadError)}</p><Link to="/suprimentos/equipamentos" className="underline text-sm">Voltar para os equipamentos</Link></div>;
  if (isLoading || !unit || !draft) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const retired = unit.status === "baixado";
  const canUpdate = can(`update_${EQUIP_ABILITY}`) && !retired;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(unit));
  const inStock = unit.holderType === "local";
  const actions = [
    canUpdate && inStock && { key: "service", icon: "send", label: "Enviar para calibração/manutenção", run: () => setDialog("service") },
    !retired && !unit.needsInspection && (canUpdate || can(PERM_INSPECT) || can(PERM_MOVE)) && { key: "extra", icon: "triangle-alert", label: "Pedir inspeção extraordinária", run: () => setDialog("extra") },
    canUpdate && unit.status !== "bloqueado" && { key: "block", icon: "lock", label: "Bloquear", run: () => setBlocking(true) },
    canUpdate && unit.status === "bloqueado" && !unit.itemRules.requiresInspection && { key: "free", icon: "lock-open", label: "Liberar", run: () => setState({ action: "liberar" }) },
    canUpdate && inStock && unit.length !== null && { key: "cut", icon: "scissors", label: "Cortar em pedaços", run: () => setDialog("cut") },
    !retired && can(`inactive_${EQUIP_ABILITY}`) && { key: "retire", icon: "archive-x", label: "Baixar", run: () => setDialog("retire") },
    { key: "labels", icon: "qr-code", label: "Imprimir etiqueta", run: () => setDialog("labels") },
  ].filter(Boolean) as Array<{ key: string; icon: string; label: string; run: () => void }>;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.tag.trim().length < 2) return setError("Informe a etiqueta.");
    setError(""); save(draft);
  };

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/suprimentos/equipamentos" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Equipamentos</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold tabular-nums">{unit.tag}</h1>
            <UnitStatusBadge status={unit.status} needsInspection={unit.needsInspection} />
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {can("view_itens_estoque") ? <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(unit.itemId) }} className="hover:underline">{unit.code} — {unit.item}</Link> : `${unit.code} — ${unit.item}`}
            {unit.serialNumber ? ` · série ${unit.serialNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!retired && can(PERM_INSPECT) && <Button type="button" onClick={() => setDialog("inspect")}><Icon name="list-checks" className="w-4 h-4 mr-1" /> Registrar inspeção</Button>}
          {actions.length > 0 && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><Button type="button" variant="outline" className="gap-1">Mais ações <Icon name="chevron-down" className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => <DropdownMenuItem key={action.key} className="gap-2" onSelect={action.run}><Icon name={action.icon} className="w-3 h-3" /> {action.label}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-4 grid xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 grid gap-4">
          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="historico">Linha do tempo</TabsTrigger>
              <TabsTrigger value="inspecoes">Inspeções ({unit.inspections.length})</TabsTrigger>
              <TabsTrigger value="servicos">Serviços ({unit.services.length})</TabsTrigger>
              <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            </TabsList>
            <TabsContent value="dados" className="mt-4">
              <form onSubmit={submit} className="rounded-lg border p-4 grid gap-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div><Label htmlFor="tag">Etiqueta <span>*</span></Label>
                    <Input id="tag" name="tag" value={draft.tag} maxLength={40} disabled={!canUpdate} onValueChange={(_, value) => set("tag", String(value).toUpperCase())} className="mt-1" /></div>
                  <div><Label htmlFor="serialNumber">Nº de série</Label>
                    <Input id="serialNumber" name="serialNumber" value={draft.serialNumber} maxLength={80} disabled={!canUpdate} onValueChange={(_, value) => set("serialNumber", String(value))} className="mt-1" /></div>
                  <div><Label className="text-sm">Comprimento (m)</Label>
                    <NumField value={draft.length} digits={2} className="mt-1" disabled={!canUpdate} placeholder="Não se aplica" ariaLabel="Comprimento" onChange={(value) => set("length", value)} onEmpty={() => set("length", null)} /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {([["manufacturedAt", "Fabricação"], ["firstUseAt", "Primeiro uso"], ["nextInspectionAt", "Próxima inspeção"], ["nextCalibrationAt", "Próxima calibração"]] as const).map(([key, label]) => (
                    <div key={key}><Label>{label}</Label>
                      <CalendarPicker mode="single" name={key} className="mt-1 w-full" value={draft[key]} placeholder="Não informada" fromYear={1990} toYear={2050} disabled={!canUpdate}
                        onValueChange={(_, value) => set(key, String(value ?? ""))} /></div>
                  ))}
                </div>
                <div><Label htmlFor="unitNotes">Observações</Label>
                  <Textarea id="unitNotes" className="mt-1" rows={2} maxLength={1000} disabled={!canUpdate} value={draft.notes} onChange={(event) => set("notes", event.target.value)} /></div>
                <p className="text-xs text-muted-foreground">Fabricação e primeiro uso recalculam o fim da vida útil. As próximas datas mudam sozinhas com inspeções e calibrações; ajuste aqui só para corrigir.</p>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {canUpdate && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving || !dirty}>{saving ? "Salvando..." : "Salvar"}</Button>
                    {dirty && <Button type="button" variant="outline" onClick={() => setDraft(draftOf(unit))}>Desfazer alterações</Button>}
                  </div>
                )}
              </form>
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              <section className="rounded-lg border p-4">
                {unit.timeline.length === 0 ? <p className="text-sm text-muted-foreground">Nada registrado ainda.</p> : (
                  <ol className="grid gap-3">
                    {unit.timeline.map((entry) => (
                      <li key={`${entry.kind}-${entry.id}`} className="flex gap-3 text-sm">
                        <Icon name={entry.kind === "movimento" ? "arrow-left-right" : entry.kind === "inspecao" ? "list-checks" : "gauge"} className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p>
                            {entry.kind === "movimento"
                              ? <button type="button" className="font-medium hover:underline text-left" onClick={() => setOpened(entry.id)}>{entry.title}{entry.number ? ` · ${entry.number}` : ""}</button>
                              : <span className="font-medium">{entry.title}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{[dateBr(entry.at), entry.detail, entry.by].filter(Boolean).join(" · ")}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </TabsContent>
            <TabsContent value="inspecoes" className="mt-4">
              <section className="rounded-lg border p-4">
                {unit.inspections.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma inspeção registrada.</p> : (
                  <ul className="divide-y text-sm">
                    {unit.inspections.map((inspection) => (
                      <li key={inspection.id} className="py-2">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="tabular-nums">{dateBr(inspection.date)}</span>
                          <span className="font-medium">{inspection.kindLabel}</span>
                          <span className={inspection.result === "reprovado" ? "text-red-600 dark:text-red-400 font-medium" : inspection.result === "aprovado" ? "text-green-700 dark:text-green-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>{inspection.resultLabel}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{[inspection.inspector && `por ${inspection.inspector}`, inspection.nextDueAt && `próxima ${dateBr(inspection.nextDueAt)}`, inspection.notes].filter(Boolean).join(" · ")}</p>
                        {inspection.answers && Object.values(inspection.answers).some((value) => value === "nok") && (
                          <p className="text-xs text-red-600 dark:text-red-400">{Object.values(inspection.answers).filter((value) => value === "nok").length} item(ns) "não OK"</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>
            <TabsContent value="servicos" className="mt-4">
              <section className="rounded-lg border p-4">
                {unit.services.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma calibração ou manutenção registrada.</p> : (
                  <ul className="divide-y text-sm">
                    {unit.services.map((service) => (
                      <li key={service.id} className="py-2">
                        <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{service.kindLabel}</span><span className="text-muted-foreground">{service.supplier ?? ""}</span><span>{service.status === "enviado" ? `fora há ${service.daysOut ?? 0} dia(s)` : service.status === "cancelado" ? "cancelado" : service.result ?? "concluído"}</span></p>
                        <p className="text-xs text-muted-foreground">{[service.sentAt && `enviado ${dateBr(service.sentAt)}`, service.returnedAt && `voltou ${dateBr(service.returnedAt)}`, service.certificateNumber && `certificado ${service.certificateNumber}`, service.cost !== null && money(service.cost), service.nextDueAt && `próxima ${dateBr(service.nextDueAt)}`].filter(Boolean).join(" · ")}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {unit.services.some((s) => s.status === "enviado") && <p className="mt-2 text-xs text-muted-foreground">Receba de volta em <Link to="/suprimentos/equipamentos/calibracao" className="underline">Calibração e manutenção</Link>.</p>}
              </section>
            </TabsContent>
            <TabsContent value="arquivos" className="mt-4">
              <RecordFilesPanel entity="stock_unit" entityId={unit.id} title="Arquivos da peça" hint="Certificados de calibração, laudos, fotos e notas desta peça." />
            </TabsContent>
          </Tabs>
        </div>

        <div className="grid gap-4">
          <section className="rounded-lg border p-4 text-sm grid gap-2">
            <h2 className="font-semibold">Situação</h2>
            <p><span className="text-muted-foreground">Onde está:</span> {unit.holder}{unit.holderType !== "local" && unit.holderType !== "externo" ? ` (${HOLDER_LABEL[unit.holderType as HolderType] ?? unit.holderType})` : ""}</p>
            {unit.itemRules.requiresInspection && <p className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">Inspeção:</span> {unit.nextInspectionAt ? dateBr(unit.nextInspectionAt) : "sem registro"} <DueStateBadge state={unit.dues.inspection} /></p>}
            {unit.itemRules.requiresCalibration && <p className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">Calibração:</span> {unit.nextCalibrationAt ? dateBr(unit.nextCalibrationAt) : "sem registro"} <DueStateBadge state={unit.dues.calibration} /></p>}
            {unit.lifeEndsAt && <p className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">Vida útil até:</span> {dateBr(unit.lifeEndsAt)} <DueStateBadge state={unit.dues.life} /></p>}
            {unit.itemRules.inspectionBeforeUse && <p className="text-xs text-muted-foreground">Exige inspeção antes de cada uso.</p>}
            {retired && <p className="rounded border border-red-300 dark:border-red-800 p-2">Baixada em {dateBr(unit.retiredAt)}: {unit.retiredReasonLabel}{unit.retiredNote ? ` — ${unit.retiredNote}` : ""}</p>}
          </section>
          <section className="rounded-lg border p-4 text-sm grid gap-1">
            <h2 className="font-semibold">Origem</h2>
            <p><span className="text-muted-foreground">Adquirida em</span> {dateBr(unit.acquiredAt)}{unit.acquisitionCost !== null ? ` · ${money(unit.acquisitionCost)}` : ""}</p>
            {unit.lot && <p><span className="text-muted-foreground">Lote</span> {unit.lot.number}</p>}
            {unit.origin && <p><span className="text-muted-foreground">Cortada de</span> <Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(unit.origin.id) }} className="text-primary underline">{unit.origin.tag}</Link></p>}
            {unit.children.length > 0 && (
              <p><span className="text-muted-foreground">Pedaços:</span> {unit.children.map((child, index) => (
                <span key={child.id}>{index > 0 && ", "}<Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(child.id) }} className="text-primary underline">{child.tag}</Link></span>
              ))}</p>
            )}
          </section>
        </div>
      </div>

      {dialog === "inspect" && <InspectionDialog target={{ unitId: unit.id, label: `${unit.tag} · ${unit.item}`, templateId: unit.itemRules.templateId, kind: unit.needsInspection ? "extraordinaria" : unit.status === "em_inspecao" ? "recebimento" : "periodica" }} onClose={() => setDialog(null)} />}
      {dialog === "service" && <ServiceSendDialog unit={unit} onClose={() => setDialog(null)} />}
      {dialog === "cut" && <CutDialog unit={unit} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "retire" && <RetireDialog unit={unit} onClose={() => setDialog(null)} onDone={apply} />}
      {dialog === "labels" && <PrintLabelsDialog units={[{ tag: unit.tag, item: unit.item }]} onClose={() => setDialog(null)} />}
      {dialog === "extra" && <ExtraDialog onClose={() => setDialog(null)} onConfirm={(note) => setState({ action: "extraordinaria", note })} />}
      <ConfirmDialog open={blocking} onOpenChange={setBlocking} title={`Bloquear ${unit.tag}?`}
        description={unit.itemRules.requiresInspection ? "A peça não pode sair até ser liberada por uma inspeção aprovada." : "A peça não pode sair até ser liberada."} onConfirm={() => setState({ action: "bloquear" })} />
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </>
  );
}

function ExtraDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pedir inspeção extraordinária</DialogTitle>
          <DialogDescription>Depois de uma queda, impacto ou suspeita: a peça só volta a sair depois de inspecionada.</DialogDescription>
        </DialogHeader>
        <div><Label htmlFor="extraNote">O que aconteceu</Label>
          <Textarea id="extraNote" className="mt-1" rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" onClick={() => { onConfirm(note.trim()); onClose(); }}>Pedir inspeção</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CutDialog({ unit, onClose, onDone }: { unit: UnitDetail; onClose: () => void; onDone: () => void }) {
  const [lengths, setLengths] = useState<number[]>([0, 0]);
  const [error, setError] = useState("");
  const total = lengths.reduce((sum, value) => sum + (value || 0), 0);
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<{ pieces: Array<{ id: number; tag: string; length: number }> }>(`units/${unit.id}/cut`, { lengths }),
    onSuccess: (result) => { onDone(); toast({ title: `${unit.tag} cortada em ${result.pieces.length} pedaço(s)`, description: result.pieces.map((p) => `${p.tag} (${p.length} m)`).join(", "), variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (lengths.some((value) => !(value > 0))) return setError("Informe o comprimento de cada pedaço.");
    if (unit.length !== null && total > unit.length + 0.01) return setError(`Os pedaços passam do comprimento da peça (${unit.length} m).`);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cortar {unit.tag}</DialogTitle>
          <DialogDescription>A peça original é baixada (motivo "corte") e nascem os pedaços no mesmo local, com etiquetas {unit.tag}-A, -B... e o histórico de origem.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          {lengths.map((value, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1"><Label className="text-xs">Pedaço {index + 1}</Label>
                <NumField value={value} digits={2} suffix="m" ariaLabel={`Comprimento do pedaço ${index + 1}`} onChange={(v) => setLengths(lengths.map((l, i) => (i === index ? v : l)))} /></div>
              {lengths.length > 1 && <Tip text="Remover o pedaço"><Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Remover o pedaço ${index + 1}`} onClick={() => setLengths(lengths.filter((_, i) => i !== index))}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setLengths([...lengths, 0])}><Icon name="plus" className="w-3 h-3 mr-1" /> Mais um pedaço</Button>
          <p className="text-sm text-muted-foreground">Total: {total.toLocaleString("pt-BR")} m{unit.length !== null ? ` de ${unit.length.toLocaleString("pt-BR")} m` : ""}</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Cortando..." : "Cortar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RetireDialog({ unit, onClose, onDone }: { unit: UnitDetail; onClose: () => void; onDone: (unit: UnitDetail) => void }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const needsNote = ["perda", "extravio", "avaria", "outro"].includes(reason);
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<UnitDetail>(`units/${unit.id}/retire`, { reason, note: note.trim() || null }),
    onSuccess: (result) => { onDone(result); toast({ title: `${unit.tag} baixada`, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const confirm = () => {
    if (!reason) { setError("Escolha o motivo da baixa."); return false; }
    if (needsNote && !note.trim()) { setError("Conte o que aconteceu."); return false; }
    setError(""); mutate(); return true;
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Baixar {unit.tag}</DialogTitle>
          <DialogDescription>A peça sai do estoque de vez.{unit.holderType === "os" ? " Ela está numa obra: o custo dela conta no resultado da OS (menos em venda)." : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div><Label>Motivo <span>*</span></Label>
            <Select name="retireReason" options={RETIRE_REASONS} state={reason} modal onChange={(_, value) => setReason(String(value ?? ""))} placeholder="Escolha o motivo" /></div>
          <div><Label htmlFor="retireNote">O que aconteceu{needsNote && <span> *</span>}</Label>
            <Textarea id="retireNote" className="mt-1" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <SlideConfirm label="Deslize para baixar a peça" pending={isPending} onConfirm={confirm} />
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={onClose}>Desistir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
