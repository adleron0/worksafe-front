// Serviços
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { formatCPF } from "@/utils/cpf-mask";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
// Template Page
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import ListHeader from "@/components/general-components/ListHeader";
// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
// Dialog para exames e certificados
import { useState } from "react";
import Dialog from "@/components/general-components/Dialog";
import AlunosExames from "../-alunos-exames";
import AlunosCertificados from "../../_certificados/certificados";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
}

const AlunosItem = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [openExames, setOpenExames] = useState(false);
  const [openCertificados, setOpenCertificados] = useState(false);

  // Mutation para inativar
  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<IEntity>('trainee', `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} ${item.name} inativado!`,
        description: `${entity.name} inativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao inativar ${entity.name}`,
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || `Erro ao inativar ${entity.name}`)
            : `Erro ao inativar ${entity.name}`,
        variant: "destructive",
      })
    }
  });

  // Mutation para ativar
  const { mutate: activate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Ativando ${entity.name}...`);
      return patch<IEntity>('trainee', `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} ${item.name} reativado!`,
        description: `${entity.name} foi reativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao reativar ${entity.name}`,
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || `Erro ao reativar ${entity.name}`)
            : `Erro ao reativar ${entity.name}`,
        variant: "destructive",
      })
    }
  });

  const handleConfirmAction = (actionType: "activate" | "deactivate") => {
    if (!item.id) return;

    if (actionType === "activate") {
      activate(item.id);
    } else {
      deactivate(item.id);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getAge = (birthDate: string | Date | undefined) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      <ListHeader show={index === 0}>
        <div className="w-3/12">Aluno</div>
        <div className="w-3/12">Contatos</div>
        <div className="w-2/12">Empresa</div>
        <div className="w-2/12">Nascimento</div>
        <div className="w-1/12">Status</div>
        <div className="w-1/12">Ações</div>
      </ListHeader>

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        
        {/* Avatar e Nome com CPF */}
        <div className="w-full lg:w-3/12 flex items-center space-x-4 md:pr-2">
          <Avatar className="border rounded-full">
            <AvatarImage src={item.imageUrl || undefined} alt={item.name} />
            <AvatarFallback className="rounded-full">{item.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="break-words w-9/12 md:w-full">
            <h2 className="text-sm font-semibold">{item.name}</h2>
            <p className="text-xs text-muted-foreground">
              {item.cpf ? formatCPF(item.cpf) : "CPF não informado"}
            </p>
          </div>
        </div>

        {/* Contatos (Telefone e E-mail) */}
        <div className="w-full lg:w-3/12 flex flex-col gap-1 md:pr-2">
          {item.phone && (
            <div className="flex items-center gap-2">
              <Icon name="phone" className="w-3 h-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {item.phone}
              </p>
            </div>
          )}
          {item.email && (
            <div className="flex items-center gap-2">
              <Icon name="mail" className="w-3 h-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground truncate">
                {item.email}
              </p>
            </div>
          )}
          {!item.phone && !item.email && (
            <p className="text-sm text-muted-foreground">Sem contatos</p>
          )}
        </div>

        {/* Empresa */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Empresa: </p>
          <p className="text-sm text-muted-foreground">
            {item.customer?.name || "Não informado"}
          </p>
        </div>

        {/* Data de Nascimento e Idade */}
        <div className="lg:w-2/12 flex flex-col gap-0 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Nascimento: </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(item.birthDate)}
          </p>
          {getAge(item.birthDate) && (
            <p className="text-xs text-muted-foreground">
              {getAge(item.birthDate)} anos
            </p>
          )}
        </div>

        {/* Status */}
        <div className="lg:w-1/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
          <Badge variant={item.inactiveAt ? "destructive" : "default"}>
            {item.inactiveAt ? "Inativo" : "Ativo"}
          </Badge>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 rounded-full p-0 text-gray-700"
                variant="outline"
                size="sm">
                  <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>

              { can(`update_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData(item);
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="edit-3" className="w-3 h-3" /> 
                    <p>Editar</p>
                  </Button>
                </DropdownMenuItem>
              )}
              
              {/* Botão Ver Provas */}
              { can(`view_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => setOpenExames(true)}
                  >
                    <Icon name="file-text" className="w-3 h-3" /> 
                    <p>Ver Provas</p>
                  </Button>
                </DropdownMenuItem>
              )}
              
              {/* Botão Ver Certificados */}
              { can(`view_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => setOpenCertificados(true)}
                  >
                    <Icon name="award" className="w-3 h-3" /> 
                    <p>Ver Certificados</p>
                  </Button>
                </DropdownMenuItem>
              )}
              
              {
                !item.inactiveAt ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar ${entity.name} ${item.name}?`}
                          description={`Ao prosseguir, ${entity.name} ${item.name} será inativado.`}
                          onConfirm={() => handleConfirmAction("deactivate")}
                          titleBttn="Inativar"
                          iconBttn="power-off"
                        />
                      </DropdownMenuItem>
                  )
                ) : (
                  can(`activate_${entity.ability}`) && (	
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Reativar ${entity.name} ${item.name}?`}
                        description={`Ao prosseguir, ${entity.name} ${item.name} será reativado.`}
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
        </div>
      </div>
      
      {/* Dialog para exibir exames do aluno */}
      <Dialog 
        open={openExames} 
        onOpenChange={setOpenExames}
        title="Exames do Aluno"
        description={`Lista de exames realizados pelo aluno ${item.name}`}
        showBttn={false}
        showHeader={true}
      >
        <AlunosExames 
          traineeId={item.id || 0}
        />
      </Dialog>
      
      {/* Dialog para exibir certificados do aluno */}
      <Dialog 
        open={openCertificados} 
        onOpenChange={setOpenCertificados}
        title="Certificados do Aluno"
        description={`Lista de certificados do aluno ${item.name}`}
        showBttn={false}
        showHeader={false}
      >
        <AlunosCertificados traineeId={item.id || 0} modalPopover={true} />
      </Dialog>
    </>
  )
};

export default AlunosItem;