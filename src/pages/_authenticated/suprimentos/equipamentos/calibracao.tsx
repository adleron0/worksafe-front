import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import RowActions from "../-shared/row-actions";
import { NumField, dateBr, errorMessage, money, todayIso } from "../../comercial/-shared/commercial";
import { PURCHASES_ABILITY } from "../-shared/purchases";
import { stockApi } from "../-shared/stock";
import { LocationField, useLocationValue } from "../-shared/stock-pickers";
import { uploadRecordFile } from "../../arquivos/-shared/record-files";
import { FILES_KEY } from "../../arquivos/-shared/files";
import {
  DueStateBadge, EQUIP_ABILITY, EQUIP_KEYS, SERVICE_RESULTS, ServiceRow, ServiceSendDialog, UnitRow, UnitStatusBadge, storeServiceDraft, useEquipmentRefresh,
} from "../-shared/equipment";

export const Route = createFileRoute("/_authenticated/suprimentos/equipamentos/calibracao")({
  component: ServicesPage,
});

interface Services { open: ServiceRow[]; history: ServiceRow[]; due: UnitRow[] }

/** Calibração e manutenção: o que está fora no fornecedor, o que vai vencer e o histórico. */
function ServicesPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const refresh = useEquipmentRefresh();
  const [returning, setReturning] = useState<ServiceRow | null>(null);
  const [cancelling, setCancelling] = useState<ServiceRow | null>(null);
  const [sending, setSending] = useState<UnitRow | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: [EQUIP_KEYS.services], queryFn: () => stockApi.get<Services>("services") });
  const { mutate: cancel } = useMutation({
    mutationFn: (id: number) => stockApi.post<ServiceRow>(`services/${id}/cancel`),
    onSuccess: (row) => { refresh(); toast({ title: `Envio de ${row.tag ?? "a peça"} cancelado`, variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível cancelar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${EQUIP_ABILITY}`)) return null;
  const canUpdate = can(`update_${EQUIP_ABILITY}`);
  const canOrder = can(`create_${PURCHASES_ABILITY}`);
  const orderService = (service: ServiceRow) => {
    if (!storeServiceDraft(service)) return toast({ title: "Não foi possível preparar o pedido neste navegador", variant: "destructive" });
    navigate({ to: "/suprimentos/pedidos-de-compra/$purchaseId", params: { purchaseId: "novo" }, search: { servico: "1" } });
  };

  const openUnit = (unitId: number) => navigate({ to: "/suprimentos/equipamentos/$unitId", params: { unitId: String(unitId) } });
  const openColumns: DataColumn<ServiceRow>[] = [
    {
      id: "unit", header: "Peça", cell: (service) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate"><Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(service.unitId) }} className="font-semibold tabular-nums hover:underline">{service.tag}</Link><span className="text-muted-foreground"> · {service.item}</span></p>
          <p className="text-xs text-muted-foreground truncate">{service.kindLabel} · {service.supplier ?? "—"}</p>
        </div>
      ),
    },
    { id: "sent", header: "Enviada", className: "text-xs text-muted-foreground whitespace-nowrap", cell: (service) => `${dateBr(service.sentAt)} · há ${service.daysOut ?? 0} dia(s)` },
    { id: "order", header: "Pedido de compra", className: "text-xs whitespace-nowrap", cell: (service) => (service.purchaseOrderId ? <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: String(service.purchaseOrderId) }} className="text-primary underline">ver o pedido de compra</Link> : <span className="text-muted-foreground">sem pedido de compra</span>) },
    ...(canUpdate ? [{ id: "return", header: "", align: "right" as const, className: "w-44", cell: (service: ServiceRow) => <Button type="button" size="sm" onClick={() => setReturning(service)}><Icon name="package-check" className="w-3 h-3" /> Receber de volta</Button> }] : []),
  ];
  const dueColumns: DataColumn<UnitRow>[] = [
    {
      id: "unit", header: "Peça", cell: (unit) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate"><Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(unit.id) }} className="font-semibold tabular-nums hover:underline">{unit.tag}</Link><span className="text-muted-foreground"> · {unit.item}</span></p>
          <p className="text-xs text-muted-foreground truncate">{unit.holder}</p>
        </div>
      ),
    },
    { id: "status", header: "Situação", className: "w-44", cell: (unit) => <UnitStatusBadge status={unit.status} /> },
    { id: "due", header: "Calibração", className: "whitespace-nowrap", cell: (unit) => <span className="inline-flex items-center gap-2"><DueStateBadge state={unit.dues.calibration} /> <span className="text-xs text-muted-foreground">{unit.nextCalibrationAt ? dateBr(unit.nextCalibrationAt) : "sem registro"}</span></span> },
    ...(canUpdate ? [{ id: "send", header: "", align: "right" as const, className: "w-28", cell: (unit: UnitRow) => (unit.holderType === "local" ? <Button type="button" size="sm" variant="outline" onClick={() => setSending(unit)}><Icon name="send" className="w-3 h-3" /> Enviar</Button> : null) }] : []),
  ];
  const historyColumns: DataColumn<ServiceRow>[] = [
    { id: "date", header: "Data", className: "w-24 tabular-nums", cell: (service) => dateBr(service.returnedAt ?? service.sentAt) },
    { id: "unit", header: "Peça", cell: (service) => <span className="truncate block max-w-md"><Link to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(service.unitId) }} className="font-medium hover:underline">{service.tag}</Link><span className="text-muted-foreground"> · {service.item} · {service.kindLabel}</span></span> },
    { id: "supplier", header: "Fornecedor", className: "text-muted-foreground", cell: (service) => <span className="truncate block max-w-[12rem]">{service.supplier ?? "—"}</span> },
    { id: "result", header: "Resultado", className: "text-xs whitespace-nowrap", cell: (service) => (service.status === "cancelado" ? "Envio cancelado" : [SERVICE_RESULTS.find((r) => r.id === service.result)?.name, service.certificateNumber && `cert. ${service.certificateNumber}`].filter(Boolean).join(" · ")) },
    { id: "cost", header: "Custo", align: "right", className: "w-28 tabular-nums", cell: (service) => (service.cost !== null ? money(service.cost) : "—") },
  ];
  const tableState = { loading: isLoading, error: error ? errorMessage(error) : null, onRetry: () => { refetch(); } };

  return (
    <>
      <Link to="/suprimentos/equipamentos/inspecoes" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Inspeções e calibrações</Link>
      <PageHeader className="mt-1" title="Calibração e manutenção" description="Peças no laboratório ou na assistência, as calibrações que vencem e o histórico." />
      <div className="grid gap-4">
        <ListCard>
          <h2 className="font-semibold text-sm">Fora agora ({data?.open.length ?? 0})</h2>
          <DataTable rows={data?.open} columns={openColumns} getRowId={(service) => service.id} ariaLabel="Peças fora para serviço" skeletonRows={3} {...tableState}
            onRowClick={(service) => openUnit(service.unitId)}
            actions={(service) => (
              <RowActions label={`Mais ações de ${service.tag}`} actions={[
                { id: "order", label: "Pedir compra do serviço", icon: "shopping-cart", hidden: !(canOrder && !service.purchaseOrderId), onSelect: () => orderService(service) },
                { id: "cancel", label: "Cancelar envio", icon: "undo-2", hidden: !canUpdate, onSelect: () => setCancelling(service) },
              ]} />
            )}
            empty={<EmptyState title="Nenhuma peça fora para serviço." />} />
        </ListCard>

        <ListCard>
          <h2 className="font-semibold text-sm">Calibração vencida ou a vencer ({data?.due.length ?? 0})</h2>
          <DataTable rows={data?.due} columns={dueColumns} getRowId={(unit) => unit.id} ariaLabel="Calibrações vencidas ou a vencer" skeletonRows={3} {...tableState}
            onRowClick={(unit) => openUnit(unit.id)}
            empty={<EmptyState icon="circle-check" title="Nenhuma calibração vencendo nos próximos 60 dias." />} />
        </ListCard>

        <ListCard>
          <h2 className="font-semibold text-sm">Histórico</h2>
          <DataTable rows={data?.history} columns={historyColumns} getRowId={(service) => service.id} ariaLabel="Histórico de serviços" skeletonRows={3} {...tableState}
            onRowClick={(service) => openUnit(service.unitId)}
            empty={<EmptyState title="Nada ainda." />} />
        </ListCard>
      </div>

      {returning && <ReturnDialog service={returning} onClose={() => setReturning(null)} onDone={refresh} />}
      {sending && <ServiceSendDialog unit={sending} onClose={() => setSending(null)} />}
      <ConfirmDialog open={!!cancelling} onOpenChange={(open) => { if (!open) setCancelling(null); }} title={`Cancelar o envio de ${cancelling?.tag ?? ""}?`}
        description="Use quando a peça não chegou a sair: ela volta ao local de onde saiu, disponível." onConfirm={() => { if (cancelling) cancel(cancelling.id); setCancelling(null); }} />
    </>
  );
}

function ReturnDialog({ service, onClose, onDone }: { service: ServiceRow; onClose: () => void; onDone: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [result, setResult] = useState("aprovado");
  const [returnedAt, setReturnedAt] = useState(todayIso());
  const [certificateNumber, setCertificateNumber] = useState("");
  const [cost, setCost] = useState<number | null>(service.cost);
  const [nextDueAt, setNextDueAt] = useState("");
  const [locationId, setLocationId] = useState("");
  const location = useLocationValue(locationId);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const calibration = service.kind === "calibracao";
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<ServiceRow>(`services/${service.id}/return`, {
      result, returnedAt, certificateNumber: certificateNumber.trim(), cost, nextDueAt: nextDueAt || null, notes: notes.trim() || null,
      ...(location ? { locationId: Number(location) } : {}),
    }),
    onSuccess: async () => {
      onDone();
      // o certificado vai para os arquivos da peça
      if (certificate) {
        try {
          await uploadRecordFile("stock_unit", service.unitId, certificate);
          queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
        } catch (err) {
          toast({ title: "A volta foi registrada, mas o certificado não subiu", description: `${errorMessage(err)} Envie pela aba Arquivos da peça.`, variant: "destructive" });
        }
      }
      toast({ title: `${service.tag} recebida de volta`, variant: "success" }); onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receber {service.tag} de volta</DialogTitle>
          <DialogDescription>{service.kindLabel} em {service.supplier ?? "fornecedor"}. Reprovada, a peça volta bloqueada.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); setError(""); mutate(); }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Resultado</Label>
              <Select name="serviceResult" options={SERVICE_RESULTS} state={result} modal onChange={(_, value) => setResult(String(value || "aprovado"))} /></div>
            <div><Label>Voltou em</Label>
              <CalendarPicker mode="single" name="returnedAt" className="mt-1 w-full" value={returnedAt} fromYear={2020} toYear={2040} onValueChange={(_, value) => setReturnedAt(String(value ?? "") || todayIso())} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="certificateNumber">Nº do certificado</Label>
              <Input id="certificateNumber" name="certificateNumber" value={certificateNumber} maxLength={80} onValueChange={(_, value) => setCertificateNumber(String(value))} className="mt-1" /></div>
            <div><Label className="text-sm">Custo</Label>
              <NumField value={cost} kind="money" className="mt-1" placeholder="Opcional" ariaLabel="Custo do serviço" onChange={setCost} onEmpty={() => setCost(null)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {calibration && result !== "reprovado" && (
              <div><Label>Próxima calibração</Label>
                <CalendarPicker mode="single" name="nextDueAt" className="mt-1 w-full" value={nextDueAt} placeholder="Pelo intervalo do item" fromYear={2024} toYear={2050} onValueChange={(_, value) => setNextDueAt(String(value ?? ""))} /></div>
            )}
            <LocationField label="Volta para" value={locationId} onChange={setLocationId} name="returnLocation" />
          </div>
          <div><Label htmlFor="returnNotes">Observação</Label>
            <Textarea id="returnNotes" className="mt-1" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => { setCertificate(event.target.files?.[0] ?? null); event.target.value = ""; }} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Icon name="paperclip" className="w-3 h-3 mr-1" /> {certificate ? "Trocar o certificado" : "Anexar o certificado"}</Button>
            {certificate ? <span className="text-xs truncate max-w-[16rem]">{certificate.name}</span> : <span className="text-xs text-muted-foreground">PDF ou foto; fica nos arquivos da peça.</span>}
            {certificate && <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCertificate(null)}>Tirar</Button>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar a volta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
