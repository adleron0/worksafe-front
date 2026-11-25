import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Select from "@/components/general-components/Select";
import { VscLoading } from "react-icons/vsc";

/** Pedidos de perfil e convidados externos (login com Google). */

export interface AccessRequestRow {
  id: number;
  status: "pending" | "approved" | "rejected";
  message?: string | null;
  reason?: string | null;
  createdAt: string;
  decidedAt?: string | null;
  profileName?: string | null;
  user: { id: number; name: string; email: string; imageUrl?: string | null; active: boolean };
  decidedBy?: { id: number; name: string } | null;
}

export interface InviteRow {
  id: number;
  email: string;
  profileId: number;
  profileName?: string | null;
  reason?: string | null;
  expiresAt: string;
  createdAt: string;
  firstLoginAt?: string | null;
  revokedAt?: string | null;
  linked: boolean;
  situation: "active" | "expired" | "revoked";
  invitedBy?: { id: number; name: string } | null;
  user?: { id: number; name: string; imageUrl?: string | null; active: boolean } | null;
}

export const ACCESS_KEY = "access-requests";
export const INVITES_KEY = "external-invites";

export const accessApi = {
  list: async (status: string) => (await api.get<AccessRequestRow[]>("/access-requests", { params: { status } })).data,
  count: async () => (await api.get<{ pending: number }>("/access-requests/count")).data.pending,
  approve: async (id: number, profileId: number) => (await api.post(`/access-requests/${id}/approve`, { profileId })).data,
  reject: async (id: number, reason: string) => (await api.post(`/access-requests/${id}/reject`, { reason })).data,
  invites: async () => (await api.get<InviteRow[]>("/external-invites")).data,
  invite: async (body: { email: string; profileId: number; days: number; reason: string }) =>
    (await api.post("/external-invites", body)).data,
  renew: async (id: number, days: number) => (await api.post(`/external-invites/${id}/renew`, { days })).data,
  revoke: async (id: number) => (await api.post(`/external-invites/${id}/revoke`)).data,
};

export const errorMessage = (e: any, fallback = "Tente de novo.") => e?.response?.data?.message ?? fallback;

/** Contador do menu (só busca com a permissão: o item só aparece com ela). */
export function usePendingAccessCount(enabled: boolean) {
  const { data } = useQuery({
    queryKey: [ACCESS_KEY, "count"],
    queryFn: accessApi.count,
    enabled,
    refetchInterval: 60_000,
    retry: false,
  });
  return data ?? 0;
}

/** Perfis que podem ser dados (o super nunca aparece; a API confere de novo). */
export function useProfileOptions() {
  const { data, isLoading } = useQuery({
    queryKey: ["access-profile-options"],
    queryFn: async () =>
      get<{ rows: Array<{ id: number; name: string; inactiveAt?: string | null }> }>("profiles", "", [
        { key: "limit", value: 200 },
        { key: "order-name", value: "asc" },
      ]),
  });
  const options = (data?.rows ?? [])
    .filter((p) => !p.inactiveAt && p.name !== "super")
    .map((p) => ({ id: String(p.id), name: p.name }));
  return { options, isLoading };
}

export const DAY_OPTIONS = [7, 15, 30, 60, 90, 180].map((d) => ({ id: String(d), name: `${d} dias` }));

export function Avatar({ name, imageUrl }: { name?: string; imageUrl?: string | null }) {
  return imageUrl ? (
    <img src={imageUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

// ------------------------------------------------------------------ pedidos

export function ApproveDialog({ row, onClose }: { row: AccessRequestRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { options, isLoading } = useProfileOptions();
  const [profileId, setProfileId] = useState("");
  const m = useMutation({
    mutationFn: () => accessApi.approve(row!.id, Number(profileId)),
    onSuccess: () => {
      toast({ title: "Acesso liberado", description: `${row!.user.name} já pode entrar.`, variant: "success" });
      qc.invalidateQueries({ queryKey: [ACCESS_KEY] });
      setProfileId("");
      onClose();
    },
    onError: (e) => toast({ title: "Não foi possível aprovar", description: errorMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Liberar acesso</DialogTitle>
          <DialogDescription>
            {row?.user.name} ({row?.user.email}). Escolha o perfil: ele define o que a pessoa vê e faz.
          </DialogDescription>
        </DialogHeader>
        {row?.message && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">“{row.message}”</p>}
        <div className="space-y-1.5">
          <Label>Perfil</Label>
          <Select name="profileId" options={options} state={profileId} isLoading={isLoading} placeholder="Escolha o perfil" searchable modal
            onChange={(_n, v) => setProfileId(String(v))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!profileId || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <VscLoading className="animate-spin" /> : "Liberar acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectDialog({ row, onClose }: { row: AccessRequestRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => accessApi.reject(row!.id, reason.trim()),
    onSuccess: () => {
      toast({ title: "Pedido recusado", variant: "success" });
      qc.invalidateQueries({ queryKey: [ACCESS_KEY] });
      setReason("");
      onClose();
    },
    onError: (e) => toast({ title: "Não foi possível recusar", description: errorMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recusar pedido</DialogTitle>
          <DialogDescription>{row?.user.name} continua sem acesso. O motivo aparece para a pessoa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Motivo (opcional)</Label>
          <Textarea id="reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: use o e-mail da sua equipe" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <VscLoading className="animate-spin" /> : "Recusar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- convites

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { options, isLoading } = useProfileOptions();
  const [form, setForm] = useState({ email: "", profileId: "", days: "30", reason: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const m = useMutation({
    mutationFn: () =>
      accessApi.invite({ email: form.email.trim(), profileId: Number(form.profileId), days: Number(form.days), reason: form.reason.trim() }),
    onSuccess: () => {
      toast({ title: "Convite criado", description: `${form.email.trim()} já pode entrar com o Google.`, variant: "success" });
      qc.invalidateQueries({ queryKey: [INVITES_KEY] });
      setForm({ email: "", profileId: "", days: "30", reason: "" });
      onClose();
    },
    onError: (e) => toast({ title: "Não foi possível convidar", description: errorMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar pessoa de fora</DialogTitle>
          <DialogDescription>
            Só entra a conta Google deste e-mail exato, até a data de fim. Funciona com Gmail ou e-mail de outra empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">E-mail</Label>
            <Input id="inv-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="pessoa@gmail.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select name="profileId" options={options} state={form.profileId} isLoading={isLoading} placeholder="Escolha" searchable modal
                onChange={(_n, v) => set("profileId", String(v))} />
            </div>
            <div className="space-y-1.5">
              <Label>Acesso por</Label>
              <Select name="days" options={DAY_OPTIONS} state={form.days} modal onChange={(_n, v) => set("days", String(v))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-reason">Motivo (opcional)</Label>
            <Textarea id="inv-reason" value={form.reason} maxLength={500} onChange={(e) => set("reason", e.target.value)} placeholder="Ex.: consultor da auditoria de NR-35" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.email.trim() || !form.profileId || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <VscLoading className="animate-spin" /> : "Convidar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenewDialog({ row, onClose }: { row: InviteRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [days, setDays] = useState("30");
  const m = useMutation({
    mutationFn: () => accessApi.renew(row!.id, Number(days)),
    onSuccess: () => {
      toast({ title: "Acesso renovado", variant: "success" });
      qc.invalidateQueries({ queryKey: [INVITES_KEY] });
      onClose();
    },
    onError: (e) => toast({ title: "Não foi possível renovar", description: errorMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renovar acesso</DialogTitle>
          <DialogDescription>{row?.email}: o novo prazo conta a partir de hoje.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Acesso por</Label>
          <Select name="days" options={DAY_OPTIONS} state={days} modal onChange={(_n, v) => setDays(String(v))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <VscLoading className="animate-spin" /> : "Renovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
