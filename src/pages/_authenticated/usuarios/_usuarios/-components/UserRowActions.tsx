import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IEntity } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const errorMessage = (error: unknown, fallback: string) => error instanceof Error
  ? error.message
  : typeof error === "object" && error !== null && "response" in error
    ? ((error as ApiError).response?.data?.message || fallback)
    : fallback;

/** Menu ⋯ de um usuário: editar, mudar senha, permissões, inativar e reativar. */
export default function UserRowActions({ user, onEdit, onPassword }: { user: IEntity; onEdit: (user: IEntity) => void; onPassword: (user: IEntity) => void }) {
  const { can, is } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [confirm, setConfirm] = useState<null | "activate" | "deactivate">(null);

  const { mutate: deactivateUser } = useMutation({
    mutationFn: (userId: number) => {
      showLoader(`Inativando usuário ${user.name}...`);
      return patch<IEntity>("user", `inactive/${userId}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: `Usuário ${user.name} inativado!`, description: "Usuário inativado com sucesso", variant: "success", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["listCompanyUsers"] }); queryClient.invalidateQueries({ queryKey: ["listUsuários"] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: "Erro ao inativar o usuário!", description: errorMessage(error, "Erro ao inativar o usuário!"), variant: "destructive", duration: 5000 });
    },
  });

  const { mutate: activateUser } = useMutation({
    mutationFn: (userId: number) => {
      showLoader(`Ativando usuário ${user.name}...`);
      return patch<IEntity>("user", `active/${userId}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({ title: `Usuário ${user.name} reativado!`, description: "Usuário foi reativado com sucesso", variant: "success", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["listCompanyUsers"] }); queryClient.invalidateQueries({ queryKey: ["listUsuários"] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({ title: "Erro ao reativar o usuário!", description: errorMessage(error, "Erro ao reativar o usuário!"), variant: "destructive", duration: 5000 });
    },
  });

  // só o super mexe no usuário super
  const canEdit = user.profile?.name !== "super" ? true : is("super");
  if (!canEdit) return null;
  const canUpdate = can("update_user");
  const canPassword = can("update_user_password");
  const canPermissions = can("list_profile");
  const canToggle = user.active ? can("inactive_user") : can("activate_user");
  if (!canUpdate && !canPassword && !canPermissions && !canToggle) return null;

  const CONFIRMS = {
    deactivate: { title: `Inativar o usuário ${user.name}?`, description: `Ao prosseguir, o usuário ${user.name} será inativo e não poderá acessar a plataforma.` },
    activate: { title: `Reativar o usuário ${user.name}?`, description: `Ao prosseguir, o usuário ${user.name} será reativado e poderá acessar a plataforma.` },
  } as const;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${user.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(user)}><Icon name="edit-3" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canPassword && <DropdownMenuItem className="gap-2" onSelect={() => onPassword(user)}><Icon name="key-square" className="w-3.5 h-3.5" /> Mudar senha</DropdownMenuItem>}
          {canPermissions && (
            <DropdownMenuItem asChild className="gap-2">
              <Link to="/usuarios/$userId/permissoes" params={{ userId: String(user.id) }}><Icon name="lock-keyhole-open" className="w-3.5 h-3.5" /> Permissões</Link>
            </DropdownMenuItem>
          )}
          {canToggle && (canUpdate || canPassword || canPermissions) && <DropdownMenuSeparator />}
          {canToggle && (user.active
            ? <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("deactivate")}><Icon name="power-off" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>
            : <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { if (user.id) (confirm === "activate" ? activateUser : deactivateUser)(user.id); setConfirm(null); }} />
      )}
    </>
  );
}
