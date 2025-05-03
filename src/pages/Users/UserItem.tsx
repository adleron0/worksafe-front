import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User } from "./interfaces/user.interface";
import useVerify from "@/hooks/use-verify";
import { patch } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import PermissionsForm from "./UserFormPermissions";
import { formatCPF } from "@/utils/cpf-mask";

interface UserItemProps {
  user: User;
  index: number;
  setFormData: (data: any) => void;
  setFormType: (type: string) => void;
  setOpenForm: (open: boolean) => void;
}

const UserItem = ({ user, index, setFormData, setFormType, setOpenForm }: UserItemProps) => {
  const { can, is } = useVerify();
  const queryClient = useQueryClient();

   // Mutation para inativar o usuário
  const { mutate: deactivateUser, isPending: isInactivating } = useMutation({
    mutationFn: (userId: number) => patch<User>('user', `inactive/${userId}`),
    onSuccess: () => {
      toast({
        title: `Usuário ${user.name} inativado!`,
        description: "Usuário inativado com sucesso",
        variant: "success",
        duration: 5000
      })
      queryClient.invalidateQueries({ queryKey: ['listCompanyUsers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao inativar o usuário!",
        description: `${error.response.data.message}`,
        variant: "destructive",
        duration: 5000
      })
    }
  });

  // Mutation para ativar o usuário
  const { mutate: activateUser, isPending: isActivating } = useMutation({
    mutationFn: (userId: number) => patch<User>('user', `active/${userId}`),
    onSuccess: () => {
      toast({
        title: `Usuário ${user.name} reativado!`,
        description: "Usuário foi reativado com sucesso",
        variant: "success",
        duration: 5000
      })
      queryClient.invalidateQueries({ queryKey: ['listCompanyUsers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reativar o usuário!",
        description: `${error.response.data.message}`,
        variant: "destructive",
        duration: 5000
      })
    }
  });

  const handleConfirmAction = (actionType: "activate" | "deactivate") => {
    if (!user.id) return;

    if (actionType === "activate") {
      activateUser(user.id);
    } else {
      deactivateUser(user.id);
    }
  };

  // validar se é super e se o usuário é o super
  const canEdit = user.profile?.name !== 'super' ? true : is('super');

  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-3/12">Usuário</div>
          <div className="w-2/12">Perfil</div>
          <div className="w-3/12">Contatos</div>
          <div className="w-2/12">Criado em</div>
          <div className="w-1/12">Status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Avatar e Nome */}
        <div className="w-full lg:w-3/12 flex items-center space-x-4">
          <Avatar className="border">
            <AvatarImage src={user.imageUrl || undefined} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="break-all">
            <h2 className="text-sm font-semibold">{user.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-100">{formatCPF(user.cpf)}</p>
          </div>
        </div>

        {/* Cargo */}
        <div className="lg:w-2/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Perfil: </p>
          <Badge
            variant="outline"
            className="rounded dark:border-primary"
          >
            {user.profile?.name}
          </Badge>
        </div>

        {/* Contatos */}
        <div className="lg:w-3/12 flex flex-col">
          <div className="flex gap-2">
            <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Telefone: </p>
            <p className="text-sm text-gray-600 dark:text-gray-100">{user.phone}</p>
          </div>
          <div className="flex gap-2 break-all">
            <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Email: </p>
            <p className="text-xs text-gray-600 dark:text-gray-100">{user.email}</p>
          </div>
        </div>

        {/* Data de Criação */}
        <div className="lg:w-2/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Cadastro: </p>
          <p className="text-sm text-gray-600 dark:text-gray-100">
            {new Date(user.createdAt || '2024-01-01').toLocaleDateString()}
          </p>
        </div>

        {/* Status */}
        <div className="lg:w-1/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
          <Badge
            variant="outline"
            className={`${
              user.active
              ? "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200"
              : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
            } rounded-full px-2 py-1 text-xs`}
          >
            {user.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
        {
          canEdit && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-8 w-8 rounded-full p-0 text-gray-700"
                  variant="outline"
                  size="sm">
                    <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>

                { can('update_user') && (
                    <Button 
                      variant="ghost" 
                      className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                      onClick={() => {
                        setFormData(user);
                        setFormType("");
                        setOpenForm(true);
                      }}
                    >
                      <Icon name="edit-3" className="w-3 h-3" /> 
                      <p>Editar</p>
                    </Button>
                  )
                }

                { can('update_user_password') && (
                    <Button 
                      variant="ghost" 
                      className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                      onClick={() => {
                        setFormData(user);
                        setFormType("only");
                        setOpenForm(true);
                      }}
                    >
                      <Icon name="key-square" className="w-3 h-3" /> 
                      <p>Mudar Senha</p>
                    </Button>
                  )
                }

                { can('update_profile') && (
                    <PermissionsForm user={user} />
                  )
                }
                
                {
                  user.active ? (
                    can('inactive_user') && (
                        <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                          <ConfirmDialog
                            title={`Inativar o usuário ${user.name}?`}
                            description={`Ao prosseguir, o usuário ${user.name} será inativo e não poderá acessar a plataforma.`}
                            onConfirm={() => handleConfirmAction("deactivate")}
                            titleBttn="Inativar"
                            iconBttn="power-off"
                          />
                        </DropdownMenuItem>
                    )
                  ) : (
                    can('activate_user') && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Reativar o usuário ${user.name}?`}
                          description={`Ao prosseguir, o usuário ${user.name} será reativado e poderá acessar a plataforma.`}
                          onConfirm={() => handleConfirmAction("activate")}
                          titleBttn="Reativar"
                          iconBttn="power"
                        />
                      </DropdownMenuItem>
                    )
                  )
                }
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
        </div>
      </div>
      {isInactivating && <Loader title={"Inativando..."} />}
      {isActivating && <Loader title={"Ativando..."} />}
    </>
  )
};

export default UserItem;
