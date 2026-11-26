import { EntityBadge, EntityFilter, useEntities } from "@/components/general-components/EntitySelect";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import CalendarPicker from "@/components/general-components/Calendar";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import ActionsMenu from "@/components/general-components/ActionsMenu";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { dateBr, dateTimeBr, FEDERAL_TAXES, formatDoc, openFile, RECEIVED_STATUS, ReceivedInvoice, ReceivedList, ReceivedStatus, todayIso } from "./-shared/fiscal";
import AccountantExport from "./-components/AccountantExport";

export const Route = createFileRoute("/_authenticated/financeiro/_notas/notas_/recebidas")({
  component: ReceivedPage,
});

type View = "todas" | ReceivedStatus;
const KEY = "fiscalReceived";
const in15 = () => new Date(Date.now() - 3 * 3600 * 1000 + 15 * 86400000).toISOString().slice(0, 10);

/**
 * Notas recebidas: as NFS-e que fornecedores emitiram para a empresa, buscadas
 * no ambiente nacional. Cada uma vira conta a pagar com um clique (o líquido,
 * depois das retenções) ou é ignorada.
 */
function ReceivedPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("nova");
  const [q, setQ] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [target, setTarget] = useState<ReceivedInvoice | null>(null);
  const [form, setForm] = useState({ dueDate: in15(), value: 0, description: "" });

  const [entityId, setEntityId] = useState<number | null>(null);
  const { multi } = useEntities();
  const params = { entityId: entityId ?? undefined, status: view === "todas" ? undefined : view, q: q || undefined };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [KEY, params],
    queryFn: async () => (await api.get<ReceivedList>("fiscal/received", { params })).data,
    placeholderData: (previous) => previous,
    enabled: can("view_nfse"),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [KEY] });

  const sync = useMutation({
    mutationFn: async () => (await api.post<{ created: number; seen: number }>("fiscal/received/sync")).data,
    onSuccess: (r) => { toast({ title: r.created ? `${r.created} nota(s) nova(s) recebida(s)` : "Nenhuma nota nova", variant: "success" }); refresh(); },
    onError: (e) => toast({ title: "Não consegui buscar as notas", description: errorMessage(e), variant: "destructive" }),
  });
  const payable = useMutation({
    mutationFn: async () => (await api.post<{ payableId: number }>(`fiscal/received/${target!.id}/payable`, form)).data,
    onSuccess: () => { toast({ title: "Conta a pagar lançada", variant: "success" }); setTarget(null); refresh(); },
    onError: (e) => toast({ title: "Não consegui lançar", description: errorMessage(e), variant: "destructive" }),
  });
  const ignore = useMutation({
    mutationFn: async ({ row, undo }: { row: ReceivedInvoice; undo?: boolean }) => (await api.post(`fiscal/received/${row.id}/ignore`, { undo })).data,
    onSuccess: refresh,
    onError: (e) => toast({ title: "Não consegui alterar", description: errorMessage(e), variant: "destructive" }),
  });

  if (!can("view_nfse")) return null;
  const canLaunch = can("create_financeiro");
  const by = data?.byStatus ?? {};
  const chips: Array<{ value: View; label: string; count?: number; color?: string }> = [
    { value: "nova", label: "A lançar", count: by.nova ?? 0, color: "#d97706" },
    { value: "lancada", label: "Lançadas", count: by.lancada ?? 0, color: "#16a34a" },
    { value: "ignorada", label: "Ignoradas", count: by.ignorada ?? 0, color: "#94a3b8" },
    { value: "todas", label: "Todas", count: Object.values(by).reduce((s, n) => s + (n ?? 0), 0) },
  ];
  const openLaunch = (row: ReceivedInvoice) => { setForm({ dueDate: in15(), value: row.netValue, description: "" }); setTarget(row); };
  const retained = (row: ReceivedInvoice) => FEDERAL_TAXES.filter((t) => (row.retentions?.[t.id] ?? 0) > 0);

  const columns: DataColumn<ReceivedInvoice>[] = [
    // o CNPJ do grupo que tomou o serviço (a conta a pagar sai nele)
    ...(multi ? [{ id: "entity", header: "Tomador", cell: (r: ReceivedInvoice) => <EntityBadge entity={r.entity ?? null} id={r.entityId} /> }] : []),
    {
      id: "number", header: "Nota",
      cell: (r) => <div className="whitespace-nowrap"><p className="font-semibold">Nº {r.number ?? "—"}</p><p className="text-xs text-muted-foreground">{dateBr(r.issuedAt)}</p></div>,
    },
    {
      id: "issuer", header: "Fornecedor", className: "min-w-[220px]",
      cell: (r) => (
        <div className="min-w-0 max-w-[22rem]">
          <p className="truncate font-medium">{r.issuerName}</p>
          <p className="text-xs text-muted-foreground truncate">{formatDoc(r.issuerDocument)}{!r.supplierId && r.status === "nova" ? " · fornecedor novo" : ""}</p>
        </div>
      ),
    },
    { id: "description", header: "Serviço", className: "min-w-[200px]", cell: (r) => <p className="text-xs truncate max-w-[20rem]">{r.description ?? "—"}</p> },
    { id: "competence", header: "Competência", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.competence ? r.competence.slice(0, 7).split("-").reverse().join("/") : "—"}</span> },
    { id: "gross", header: "Valor", align: "right", cell: (r) => <span className="tabular-nums whitespace-nowrap">{money(r.grossValue)}</span> },
    {
      id: "net", header: "A pagar", align: "right",
      cell: (r) => (
        <div className="text-right whitespace-nowrap">
          <p className="tabular-nums font-semibold">{money(r.netValue)}</p>
          {(r.issWithheld || retained(r).length > 0) && <p className="text-[11px] text-muted-foreground">retém {[r.issWithheld ? "ISS" : null, ...retained(r).map((t) => t.name)].filter(Boolean).join(", ")}</p>}
        </div>
      ),
    },
    { id: "status", header: "Situação", cell: (r) => <StatusBadge tone={RECEIVED_STATUS[r.status].tone} pulse={false}>{RECEIVED_STATUS[r.status].label}</StatusBadge> },
  ];

  return (
    <>
      <FormPageHeader backTo="/financeiro/notas" backLabel="Notas fiscais" title="Notas recebidas"
        description="Notas fiscais de serviço que fornecedores emitiram para a empresa, buscadas no ambiente nacional." />

      <ListCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <StatusChips options={chips} value={view} onChange={setView} className="flex-1" />
          <EntityFilter value={entityId} onChange={setEntityId} />
        </div>
        <ListToolbar search={{ value: q, onChange: setQ, placeholder: "Buscar fornecedor, CNPJ ou número" }}>
          <ActionsMenu groups={[{ label: "Notas recebidas", items: [
            { id: "export", label: "Pacote do contador", icon: "folder-archive", onSelect: () => setExportOpen(true) },
          ] }]} />
          <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
            <Icon name={sync.isPending ? "loader-circle" : "refresh-cw"} className={sync.isPending ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> <span className="hidden sm:inline">Buscar agora</span>
          </Button>
        </ListToolbar>
        <p className="text-xs text-muted-foreground">{data?.syncedAt ? `Última busca: ${dateTimeBr(data.syncedAt)}. O sistema busca sozinho a cada 6 horas.` : "Ainda não buscamos: clique em Buscar agora (precisa do certificado digital)."}</p>

        <DataTable rows={data?.data} columns={columns} getRowId={(r) => r.id} ariaLabel="Notas recebidas" minWidth={900}
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          rowClassName={(r) => (r.status === "ignorada" ? "opacity-60" : undefined)}
          actions={(r) => (
            <div className="flex items-center justify-end gap-1">
              {r.status === "nova" && canLaunch && <Button size="sm" variant="ghost" className="h-7" onClick={() => openLaunch(r)}>Lançar</Button>}
              {r.status === "lancada" && r.payableId && <Button size="sm" variant="ghost" className="h-7" onClick={() => navigate({ to: "/financeiro/pagar/$payableId", params: { payableId: String(r.payableId) } })}>Ver conta</Button>}
              <ActionsMenu groups={[{ label: `NFS-e ${r.number ?? ""}`, items: [
                { id: "xml", label: "Baixar XML", icon: "file-code", onSelect: () => openFile(`fiscal/received/${r.id}/xml`, `NFS-e ${r.number ?? r.id} ${r.issuerName}.xml`, true) },
                { id: "ignore", label: "Ignorar (não vou lançar)", icon: "eye-off", hidden: r.status !== "nova", onSelect: () => ignore.mutate({ row: r }) },
                { id: "undo", label: "Voltar para a lançar", icon: "undo-2", hidden: r.status !== "ignorada", onSelect: () => ignore.mutate({ row: r, undo: true }) },
              ] }]} />
            </div>
          )}
          empty={view === "nova"
            ? <EmptyState icon="circle-check" title="Nenhuma nota recebida a lançar." description="Quando um fornecedor emitir uma nota para a empresa, ela aparece aqui." />
            : <EmptyState icon="inbox" title="Nenhuma nota aqui." />} />
      </ListCard>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          {target && (
            <>
              <DialogHeader>
                <DialogTitle>Lançar conta a pagar</DialogTitle>
                <DialogDescription>NFS-e {target.number} de {target.issuerName}: {money(target.grossValue)}{target.netValue !== target.grossValue ? `, ${money(target.netValue)} depois das retenções (as retenções você recolhe na guia)` : ""}.</DialogDescription>
              </DialogHeader>
              {!target.supplierId && <p className="text-xs flex items-center gap-1.5"><TagBadge>novo</TagBadge> O fornecedor será cadastrado com o CNPJ {formatDoc(target.issuerDocument)}.</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Vencimento <span>*</span></Label><CalendarPicker mode="natural" name="dueDate" value={form.dueDate} onValueChange={(_, v) => setForm((f) => ({ ...f, dueDate: v ?? todayIso() }))} className="mt-1" /></div>
                <div><Label>Valor a pagar</Label><Input name="value" format="currency" value={form.value} onValueChange={(_, v) => setForm((f) => ({ ...f, value: Number(v) || 0 }))} className="mt-1" /></div>
              </div>
              <div><Label>Descrição</Label><Input name="description" value={form.description} placeholder={`NFS-e ${target.number ?? ""} · ${target.issuerName}`} onValueChange={(_, v) => setForm((f) => ({ ...f, description: String(v) }))} className="mt-1" /></div>
              <p className="text-xs text-muted-foreground">Plano de contas e centro de custo você completa depois, na conta a pagar.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button>
                <Button onClick={() => payable.mutate()} disabled={payable.isPending || !form.dueDate || !(form.value > 0)}><Icon name="check" className="w-4 h-4" /> Lançar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AccountantExport open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
