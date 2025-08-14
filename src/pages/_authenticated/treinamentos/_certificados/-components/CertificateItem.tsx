// Serviços
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Template Page
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import DuplicateCertificateModal from "./DuplicateCertificateModal";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados/VisualizadorCertificados";
// import { CertificateThumbnail } from "@/components/general-components/visualizadorCertificados";
import Dialog from "@/components/general-components/Dialog";
// Interfaces
import { ICertificate } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface Props {
  item: ICertificate;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: ICertificate) => void;
  setOpenForm: (open: boolean) => void;
}

const CertificateItem = ({ item, index, entity, setFormData, setOpenForm }: Props) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);

  // Mutation para inativar
  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando ${entity.name}...`);
      return patch<ICertificate>(entity.model, `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} ${item.name} inativado!`,
        description: `${entity.name} inativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list_${entity.pluralName}`] });
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
      return patch<ICertificate>(entity.model, `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} ${item.name} reativado!`,
        description: `O ${entity.name} foi reativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`list_${entity.pluralName}`] });
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

  // Criar thumbnail do certificado (primeira letra do nome)
  const getThumbnail = () => {
    return item.name ? item.name.charAt(0).toUpperCase() : 'C';
  };

  // Verificar se tem verso
  const hasBackPage = item.fabricJsonBack !== null;

  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          <div className="w-4/12">Certificado</div>
          <div className="w-3/12">Curso</div>
          <div className="w-2/12">Empresa</div>
          <div className="w-2/12">Status</div>
          <div className="w-1/12">Ações</div>
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Badges */}
        <div className="absolute -top-1 left-4 flex items-center gap-2">
          {hasBackPage && (
            <Badge variant="outline" className="text-2xs h-4 rounded-sm font-medium text-inverse-foreground bg-primary">
              <Icon name="file-text" className="w-3 h-3" />
              Frente e Verso
            </Badge>
          )}
        </div>

        {/* Thumbnail e Nome */}
        <div className="w-full h-full flex items-center space-x-4 md:pr-2 ">
          {/* {item.fabricJsonFront ? (
            <CertificateThumbnail 
              certificateData={item}
              className="border border-gray-200 dark:border-gray-700 shadow-sm"
              size={30}
            />
          ) : (
            <Avatar className="border rounded-md bg-primary/10">
              <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold">
                {getThumbnail()}
              </AvatarFallback>
            </Avatar>
          )} */}
          <Avatar className="border rounded-md bg-primary/10">
            <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold">
              {getThumbnail()}
            </AvatarFallback>
          </Avatar>
          <div className="break-words w-9/12 md:w-full">
            <h2 className="text-sm font-semibold">{item.name}</h2>
            <p className="text-xs text-muted-foreground">
              {item.canvasWidth} x {item.canvasHeight}px
            </p>
          </div>
        </div>

        {/* Curso */}
        <div className="lg:w-3/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Curso: </p>
          <div className="flex flex-wrap gap-0.5">
            <p className="text-xs text-muted-foreground dark:text-gray-100 rounded-sm">
              {item.course?.name || 'Sem curso vinculado'}
            </p>
          </div>
        </div>

        {/* Empresa */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Empresa: </p>
          <div className="flex flex-wrap gap-0.5">
            <p className="text-xs text-muted-foreground dark:text-gray-100 rounded-sm">
              {item.company?.name || 'Sem empresa'}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
          <Badge
            variant="outline"
            className={`${
              item.active
              ? "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200"
              : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
            } rounded-full px-2 py-1 text-xs`}
          >
            {item.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
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

              {/* Botão de Visualizar */}
              <Button 
                variant="ghost" 
                className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                onClick={() => setOpenViewModal(true)}
              >
                <Icon name="eye" className="w-3 h-3" /> 
                <p>Visualizar Certificado</p>
              </Button>

              { can(`update_${entity.ability}`) && (
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData(item);
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="edit-3" className="w-3 h-3" /> 
                    <p>Editar Template</p>
                  </Button>
                )
              }

              { can(`create_${entity.ability}`) && (
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                    onClick={() => setOpenDuplicateModal(true)}
                  >
                    <Icon name="copy" className="w-3 h-3" /> 
                    <p>Duplicar Certificado</p>
                  </Button>
                )
              }
              
              {
                item.active ? (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar o ${entity.name} ${item.name}?`}
                          description={`Ao prosseguir, o ${entity.name} ${item.name} será inativo e não poderá ser utilizado.`}
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
                        title={`Reativar o ${entity.name} ${item.name}?`}
                        description={`Ao prosseguir, o ${entity.name} ${item.name} será reativado e poderá ser utilizado novamente.`}
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

      {/* Modal de Duplicação */}
      <DuplicateCertificateModal
        certificate={item}
        open={openDuplicateModal}
        onOpenChange={setOpenDuplicateModal}
      />

      {/* Modal de Visualização */}
      {openViewModal && item.fabricJsonFront && (
        <Dialog
          open={openViewModal}
          onOpenChange={setOpenViewModal}
          title={`Visualizar Certificado: ${item.name}`}
          description="Pré-visualização do template do certificado"
          showBttn={false}
          showHeader={false}
        >
          <div className="h-[70vh] w-full">
            <VisualizadorCertificados
              certificateData={item}
              variableToReplace={{}}
              zoom={50}
            />
          </div>
        </Dialog>
      )}
    </>
  )
};

export default CertificateItem;