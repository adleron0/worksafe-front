import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import StatusChips from "@/components/general-components/StatusChips";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import ActionsMenu from "@/components/general-components/ActionsMenu";
import ListFooter from "@/components/general-components/ListFooter";
import MonthRangePicker from "@/components/general-components/MonthRangePicker";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { Button } from "@/components/ui/button";
import { errorMessage, money } from "../../comercial/-shared/commercial";
import { dateBr, FISCAL_KEYS, formatDoc, Invoice, InvoiceList, InvoiceStatus, STATUS_INFO, useFiscalSettings } from "./-shared/fiscal";

export const Route = createFileRoute("/_authenticated/financeiro/_notas/notas")({
  component: InvoicesPage,
});

type View = "todas" | InvoiceStatus;
const LIMITS = [20, 50, 100];
const lastDay = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };

/** Notas fiscais de serviço (NFS-e Nacional): emitidas pelo sistema e registradas de fora. */
function InvoicesPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("todas");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const canEmit = can("emitir_nfse");
  const { data: settings } = useFiscalSettings(can("view_nfse"));

  const params = { status: view === "todas" ? undefined : view, q: q || undefined, from: from ? `${from}-01` : undefined, to: to ? lastDay(to) : undefined, page, limit };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [FISCAL_KEYS.invoices, params],
    queryFn: async () => (await api.get<InvoiceList>("fiscal/invoices", { params })).data,
    placeholderData: (previous) => previous,
    enabled: can("view_nfse"),
  });

  if (!can("view_nfse")) return null;
  const by = data?.summary.byStatus ?? {};
  const all = Object.values(by).reduce((s, n) => s + (n ?? 0), 0);
  const chips: Array<{ value: View; label: string; count?: number; color?: string }> = [
    { value: "todas", label: "Todas", count: all },
    { value: "autorizada", label: "Autorizadas", count: by.autorizada ?? 0, color: "#16a34a" },
    { value: "rascunho", label: "Rascunhos", count: by.rascunho ?? 0, color: "hsl(var(--border))" },
    { value: "rejeitada", label: "Rejeitadas", count: by.rejeitada ?? 0, color: "#dc2626" },
    { value: "emitindo", label: "Enviando", count: by.emitindo ?? 0, color: "#0284c7" },
    { value: "cancelada", label: "Canceladas", count: by.cancelada ?? 0, color: "#94a3b8" },
  ];
  const open = (row: Invoice) => navigate({ to: "/financeiro/notas/$invoiceId", params: { invoiceId: String(row.id) } });

  const columns: DataColumn<Invoice>[] = [
    {
      id: "number", header: "Nota",
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{row.number ? `Nº ${row.number}` : row.status === "rascunho" ? "Rascunho" : `DPS ${row.dpsSeries ?? ""}/${row.dpsNumber ?? "—"}`}</p>
          <p className="text-xs text-muted-foreground">{row.issuedAt ? dateBr(row.issuedAt) : `criada ${dateBr(row.createdAt)}`}</p>
        </div>
      ),
    },
    {
      id: "taker", header: "Tomador", className: "min-w-[220px]",
      cell: (row) => (
        <div className="min-w-0 max-w-[22rem]">
          <p className="truncate font-medium">{row.taker?.name || "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{formatDoc(row.taker?.document)}</p>
        </div>
      ),
    },
    {
      id: "service", header: "Serviço", className: "min-w-[200px]",
      cell: (row) => <p className="text-xs truncate max-w-[20rem]">{row.service?.name ?? row.description}</p>,
    },
    { id: "competence", header: "Competência", cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{row.competence.slice(0, 7).split("-").reverse().join("/")}</span> },
    { id: "gross", header: "Valor", align: "right", cell: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.grossValue)}</span> },
    { id: "net", header: "Líquido", align: "right", cell: (row) => <span className="tabular-nums whitespace-nowrap font-semibold">{money(row.netValue)}</span> },
    {
      id: "status", header: "Situação",
      cell: (row) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <StatusBadge tone={STATUS_INFO[row.status].tone} pulse={STATUS_INFO[row.status].pulse}>{STATUS_INFO[row.status].label}</StatusBadge>
          {row.environment === "restrita" && row.provider === "sefin" && <TagBadge>teste</TagBadge>}
          {row.provider === "externa" && <TagBadge>emitida fora</TagBadge>}
        </div>
      ),
    },
  ];
  const filtered = !!q || !!from || view !== "todas";

  return (
    <>
      <PageHeader title="Notas fiscais" description="Notas fiscais de serviço (NFS-e Nacional): emita, acompanhe, cancele e envie ao cliente." className="mb-0" />

      {settings && !settings.ready && (
        <div className="my-3 rounded-card border border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 px-4 py-3 text-sm">
          <p className="font-semibold flex items-center gap-1.5"><Icon name="triangle-alert" className="w-4 h-4" /> Falta pouco para emitir notas pelo sistema</p>
          <ul className="list-disc pl-5 mt-1">{settings.pending.map((p) => <li key={p}>{p}</li>)}</ul>
          {can("config_fiscal") && <Link to="/financeiro/fiscal" className="underline font-medium mt-1 inline-block">Abrir a configuração fiscal</Link>}
        </div>
      )}

      {data && data.summary.authorized > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 my-3">
          <div className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">Autorizadas no recorte</p><p className="text-lg font-semibold tabular-nums">{data.summary.authorized}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">Valor das notas</p><p className="text-lg font-semibold tabular-nums">{money(data.summary.gross)}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">Retido pelos clientes</p><p className="text-lg font-semibold tabular-nums">{money(data.summary.retained)}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-xs text-muted-foreground">Líquido</p><p className="text-lg font-semibold tabular-nums">{money(data.summary.net)}</p></div>
        </div>
      )}

      <ListCard className="mt-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <StatusChips options={chips} value={view} onChange={(v) => { setView(v); setPage(1); }} className="flex-1" />
          <MonthRangePicker className="sm:w-auto sm:min-w-44" align="end" placeholder="Competência" from={from || undefined} to={to || undefined}
            onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
        </div>
        <ListToolbar search={{ value: q, onChange: (value) => { setQ(value); setPage(1); }, placeholder: "Buscar tomador, CPF/CNPJ, número, chave ou descrição" }}>
          <ActionsMenu groups={[
            {
              label: "Notas",
              items: [
                { id: "external", label: "Registrar nota emitida fora", icon: "file-input", hidden: !canEmit, onSelect: () => navigate({ to: "/financeiro/notas/nova", search: { externa: "1" } as never }) },
                { id: "config", label: "Configuração fiscal", icon: "settings", hidden: !can("config_fiscal"), onSelect: () => navigate({ to: "/financeiro/fiscal" }) },
              ],
            },
          ]} />
          {canEmit && <Button onClick={() => navigate({ to: "/financeiro/notas/nova" })}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova nota</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.data} columns={columns} getRowId={(row) => row.id} ariaLabel="Notas fiscais" minWidth={880}
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          onRowClick={open}
          rowClassName={(row) => (row.status === "cancelada" || row.status === "substituida" ? "opacity-60" : undefined)}
          empty={filtered
            ? <EmptyState icon="search-x" title="Nenhuma nota com esses filtros." action={<Button variant="outline" size="sm" onClick={() => { setQ(""); setFrom(""); setTo(""); setView("todas"); }}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhuma nota ainda." description="A primeira nota pode ser avulsa: escolha o cliente, o serviço e o valor." action={canEmit && <Button size="sm" onClick={() => navigate({ to: "/financeiro/notas/nova" })}><Icon name="plus" className="w-4 h-4" /> Nova nota</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={page} limit={limit} limits={LIMITS} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
      </ListCard>
    </>
  );
}
