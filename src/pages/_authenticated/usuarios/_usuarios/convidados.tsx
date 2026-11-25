import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { toast } from "@/hooks/use-toast";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import DataTable, { DataColumn, EmptyState, RowActionsTrigger } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Avatar,
  INVITES_KEY,
  InviteDialog,
  InviteRow,
  RenewDialog,
  accessApi,
  errorMessage,
  fmtDate,
} from "../-shared/access";

export const Route = createFileRoute("/_authenticated/usuarios/_usuarios/convidados")({
  component: Convidados,
});

const SITUATION = {
  active: { tone: "success", label: "Ativo" },
  expired: { tone: "warning", label: "Vencido" },
  revoked: { tone: "neutral", label: "Revogado" },
} as const;

function daysLeft(v: string) {
  return Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);
}

function Convidados() {
  const { can } = useVerify();
  const qc = useQueryClient();
  const allowed = can("convidar_externo_user");
  const [inviting, setInviting] = useState(false);
  const [renew, setRenew] = useState<InviteRow | null>(null);
  const [revoke, setRevoke] = useState<InviteRow | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [INVITES_KEY],
    queryFn: accessApi.invites,
    enabled: allowed,
  });
  const revokeM = useMutation({
    mutationFn: (id: number) => accessApi.revoke(id),
    onSuccess: () => {
      toast({ title: "Acesso revogado", description: "As sessões abertas foram encerradas.", variant: "success" });
      qc.invalidateQueries({ queryKey: [INVITES_KEY] });
    },
    onError: (e) => toast({ title: "Não foi possível revogar", description: errorMessage(e), variant: "destructive" }),
  });
  if (!allowed) return null;

  const columns: DataColumn<InviteRow>[] = [
    {
      id: "email", header: "Convidado", className: "min-w-[240px]",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.user?.name ?? r.email} imageUrl={r.user?.imageUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.user?.name ?? r.email}</p>
            <p className="truncate text-xs text-muted-foreground">{r.user ? r.email : "Ainda não entrou"}</p>
          </div>
        </div>
      ),
    },
    { id: "profile", header: "Perfil", cell: (r) => <span className="text-sm">{r.profileName ?? "—"}</span> },
    {
      id: "expiresAt", header: "Acesso até", className: "whitespace-nowrap",
      cell: (r) => (
        <div>
          <span className="tabular-nums">{fmtDate(r.expiresAt)}</span>
          {r.situation === "active" && daysLeft(r.expiresAt) <= 5 && (
            <p className="text-xs text-amber-600">vence em {daysLeft(r.expiresAt)} dia{daysLeft(r.expiresAt) > 1 ? "s" : ""}</p>
          )}
        </div>
      ),
    },
    { id: "reason", header: "Motivo", className: "min-w-[180px]", cell: (r) => <span className="text-sm text-muted-foreground">{r.reason || "—"}</span> },
    { id: "by", header: "Convidado por", cell: (r) => <span className="text-sm text-muted-foreground">{r.invitedBy?.name ?? "—"}</span> },
    {
      id: "situation", header: "Situação",
      cell: (r) => <StatusBadge tone={SITUATION[r.situation].tone}>{SITUATION[r.situation].label}</StatusBadge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Convidados"
        description="Pessoas de fora do domínio (Gmail ou outra empresa) com acesso por prazo."
        actions={<Button onClick={() => setInviting(true)}><Icon name="user-plus" className="h-4 w-4" /> Convidar</Button>}
      />
      <ListCard>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(r) => r.id}
          ariaLabel="Convidados"
          minWidth={820}
          loading={isLoading || isFetching}
          error={isError ? errorMessage(error, "erro desconhecido") : null}
          onRetry={() => refetch()}
          rowClassName={(r) => (r.situation === "revoked" ? "opacity-60" : undefined)}
          actions={(r) =>
            r.situation === "revoked" ? null : (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do convite de ${r.email}`} /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => setRenew(r)}><Icon name="calendar-plus" className="h-3.5 w-3.5" /> Renovar</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive" onSelect={() => setRevoke(r)}><Icon name="user-x" className="h-3.5 w-3.5" /> Revogar acesso</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
          empty={
            <EmptyState
              icon="user-plus"
              title="Nenhum convidado."
              action={<Button size="sm" onClick={() => setInviting(true)}><Icon name="plus" className="h-4 w-4" /> Convidar</Button>}
            />
          }
        />
      </ListCard>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
      <RenewDialog row={renew} onClose={() => setRenew(null)} />
      {revoke && (
        <ConfirmDialog
          open
          onOpenChange={(o) => { if (!o) setRevoke(null); }}
          title={`Revogar o acesso de ${revoke.email}?`}
          description="A pessoa sai do sistema na hora e não entra mais com este convite. Para voltar, é preciso convidar de novo."
          slideLabel="Deslize para revogar"
          onConfirm={() => { revokeM.mutate(revoke.id); setRevoke(null); }}
        />
      )}
    </>
  );
}
