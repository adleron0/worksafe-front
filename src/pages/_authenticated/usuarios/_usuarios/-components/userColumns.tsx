import InfoHint from "@/components/general-components/InfoHint";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TagBadge from "@/components/general-components/TagBadge";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { formatCPF } from "@/utils/cpf-mask";
import { IEntity } from "../-interfaces/entity.interface";

const muted = "text-xs text-muted-foreground";

const SELLER_STATUS: Record<NonNullable<IEntity["sellerStatus"]>, { label: string; icon: string; color: string }> = {
  PENDING: { label: "Vendedor pendente", icon: "clock", color: "#d97706" },
  ACTIVE: { label: "Vendedor integrado", icon: "check-circle", color: "#16a34a" },
  SUSPENDED: { label: "Vendedor suspenso", icon: "ban", color: "#ea580c" },
  BLOCKED: { label: "Vendedor bloqueado", icon: "x-circle", color: "#dc2626" },
};

/** Selo "vendedor" ao lado do nome; a situação do vendedor fica no balão. */
function SellerTag({ user }: { user: IEntity }) {
  if (!user.isSeller) return null;
  const status = user.sellerStatus ? SELLER_STATUS[user.sellerStatus] : undefined;
  const chip = (
    <TagBadge icon={status?.icon ?? "user-round-check"} color={status?.color} className="ml-1.5">vendedor</TagBadge>
  );
  if (!status) return chip;
  return <span className="inline-flex items-center gap-1">{chip}<InfoHint lines={[status.label]} label="Situação do vendedor" /></span>;
}

export const userColumns: DataColumn<IEntity>[] = [
  {
    id: "user", header: "Usuário", className: "min-w-[240px]",
    cell: (user) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 border">
          <AvatarImage src={user.imageUrl || undefined} alt={user.name} />
          <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 max-w-[18rem]">
          <p className="truncate"><span className="font-medium">{user.name}</span><SellerTag user={user} /></p>
          {user.cpf && <p className={`${muted} truncate`}>{formatCPF(user.cpf)}</p>}
        </div>
      </div>
    ),
  },
  {
    id: "profile", header: "Perfil",
    cell: (user) => (user.profile?.name ? <TagBadge>{user.profile.name}</TagBadge> : <span className="text-muted-foreground">—</span>),
  },
  {
    id: "contacts", header: "Contatos", className: "min-w-[200px]",
    cell: (user) => (
      <div className="min-w-0 max-w-[16rem]">
        <p className="truncate">{user.phone || <span className="text-muted-foreground">—</span>}</p>
        {user.email && <p className={`${muted} truncate`}>{user.email}</p>}
      </div>
    ),
  },
  {
    id: "createdAt", header: "Criado em", className: "whitespace-nowrap",
    cell: (user) => <span className="tabular-nums">{new Date(user.createdAt || "2024-01-01").toLocaleDateString()}</span>,
  },
  {
    id: "status", header: "Situação",
    cell: (user) => <StatusBadge tone={user.active ? "success" : "neutral"}>{user.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
