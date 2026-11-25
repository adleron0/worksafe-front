import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import DataTable, { DataColumn, EmptyState, RowActionsTrigger } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ACCESS_KEY,
  AccessRequestRow,
  ApproveDialog,
  Avatar,
  RejectDialog,
  accessApi,
  errorMessage,
  fmtDate,
} from "../-shared/access";

export const Route = createFileRoute("/_authenticated/usuarios/_usuarios/pedidos-acesso")({
  component: PedidosAcesso,
});

const STATUS = [
  { id: "pending", name: "Aguardando" },
  { id: "approved", name: "Aprovados" },
  { id: "rejected", name: "Recusados" },
] as const;

const TONE = { pending: "warning", approved: "success", rejected: "neutral" } as const;
const LABEL = { pending: "Aguardando", approved: "Aprovado", rejected: "Recusado" } as const;

function PedidosAcesso() {
  const { can } = useVerify();
  const [status, setStatus] = useState<string>("pending");
  const [approve, setApprove] = useState<AccessRequestRow | null>(null);
  const [reject, setReject] = useState<AccessRequestRow | null>(null);
  const allowed = can("aprovar_acesso_user");

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [ACCESS_KEY, status],
    queryFn: () => accessApi.list(status),
    enabled: allowed,
  });
  if (!allowed) return null;

  const columns: DataColumn<AccessRequestRow>[] = [
    {
      id: "user", header: "Pessoa", className: "min-w-[240px]",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.user.name} imageUrl={r.user.imageUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.user.email}</p>
          </div>
        </div>
      ),
    },
    { id: "message", header: "Setor ou função", className: "min-w-[200px]", cell: (r) => <span className="text-sm text-muted-foreground">{r.message || "—"}</span> },
    { id: "createdAt", header: "Pedido em", className: "whitespace-nowrap", cell: (r) => <span className="tabular-nums text-muted-foreground">{fmtDate(r.createdAt)}</span> },
    {
      id: "status", header: "Situação",
      cell: (r) => (
        <div className="space-y-0.5">
          <StatusBadge tone={TONE[r.status]}>{LABEL[r.status]}</StatusBadge>
          {r.status !== "pending" && (
            <p className="text-xs text-muted-foreground">
              {r.status === "approved" && r.profileName ? `${r.profileName} · ` : ""}{r.decidedBy?.name ?? ""} {fmtDate(r.decidedAt)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Pedidos de acesso" description="Quem entrou com o Google da empresa e ainda não tem perfil." />
      <ListCard>
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {STATUS.map((s) => (
              <Button key={s.id} size="sm" variant={status === s.id ? "default" : "ghost"} onClick={() => setStatus(s.id)}>
                {s.name}
              </Button>
            ))}
          </div>
        </div>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(r) => r.id}
          ariaLabel="Pedidos de acesso"
          minWidth={640}
          loading={isLoading || isFetching}
          error={isError ? errorMessage(error, "erro desconhecido") : null}
          onRetry={() => refetch()}
          actions={(r) =>
            r.status === "pending" ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do pedido de ${r.user.name}`} /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => setApprove(r)}><Icon name="check" className="h-3.5 w-3.5" /> Liberar acesso</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onSelect={() => setReject(r)}><Icon name="x" className="h-3.5 w-3.5" /> Recusar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null
          }
          empty={<EmptyState icon="inbox" title={status === "pending" ? "Nenhum pedido aguardando." : "Nada por aqui."} />}
        />
      </ListCard>
      <ApproveDialog row={approve} onClose={() => setApprove(null)} />
      <RejectDialog row={reject} onClose={() => setReject(null)} />
    </>
  );
}
