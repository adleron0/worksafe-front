import InfoHint from "@/components/general-components/InfoHint";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { formatCPF } from "@/utils/cpf-mask";
import { IEntity } from "../-interfaces/entity.interface";

const muted = "text-xs text-muted-foreground";
const tag = "inline-flex items-center gap-1 rounded-chip border bg-muted/50 px-1.5 py-px text-[11px] font-medium text-muted-foreground whitespace-nowrap";

const SELLER_STATUS: Record<NonNullable<IEntity["sellerStatus"]>, { label: string; icon: string; tone: string }> = {
  PENDING: { label: "Vendedor pendente", icon: "clock", tone: "text-amber-700 dark:text-amber-400" },
  ACTIVE: { label: "Vendedor integrado", icon: "check-circle", tone: "text-green-700 dark:text-green-400" },
  SUSPENDED: { label: "Vendedor suspenso", icon: "ban", tone: "text-orange-700 dark:text-orange-400" },
  BLOCKED: { label: "Vendedor bloqueado", icon: "x-circle", tone: "text-red-700 dark:text-red-400" },
};

/** Selo "vendedor" ao lado do nome; a situação do vendedor fica no balão. */
function SellerTag({ user }: { user: IEntity }) {
  if (!user.isSeller) return null;
  const status = user.sellerStatus ? SELLER_STATUS[user.sellerStatus] : undefined;
  const chip = (
    <span className={`${tag} ml-1.5 ${status?.tone ?? ""}`}>
      <Icon name={status?.icon ?? "user-round-check"} className="w-3 h-3" />vendedor
    </span>
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
    cell: (user) => (user.profile?.name ? <span className={tag}>{user.profile.name}</span> : <span className="text-muted-foreground">—</span>),
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
    cell: (user) => <StatusBadge tone={user.active ? "success" : "danger"}>{user.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
