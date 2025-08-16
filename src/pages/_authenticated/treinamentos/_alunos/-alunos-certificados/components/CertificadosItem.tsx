// Serviços
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

// Template Page
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados";
import ListHeader from "@/components/general-components/ListHeader";

// Interfaces
import { ICertificate } from "../interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface ItemsProps {
  item: ICertificate;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: ICertificate) => void;
  setOpenForm: (open: boolean) => void;
  setEditData?: (data: ICertificate) => void;
  setOpenEditForm?: (open: boolean) => void;
}

const CertificadosItem = ({ item, index, entity, setFormData, setOpenForm, setEditData, setOpenEditForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [showViewer, setShowViewer] = useState(false);

  // Mutation para inativar
  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Inativando certificado...`);
      return patch<ICertificate>('trainee-certificate', `inactive/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `Certificado inativado!`,
        description: `Certificado inativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`listCertificados`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao inativar certificado`,
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || `Erro ao inativar certificado`)
            : `Erro ao inativar certificado`,
        variant: "destructive",
      })
    }
  });

  // Mutation para ativar
  const { mutate: activate } = useMutation({
    mutationFn: (id: number) => {
      showLoader(`Ativando certificado...`);
      return patch<ICertificate>('trainee-certificate', `active/${id}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `Certificado reativado!`,
        description: `Certificado foi reativado com sucesso.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: [`listCertificados`] });
    },
    onError: (error: unknown) => {
      hideLoader();
      toast({
        title: `Erro ao reativar certificado`,
        description: error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error 
            ? ((error as ApiError).response?.data?.message || `Erro ao reativar certificado`)
            : `Erro ao reativar certificado`,
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

  const getStatusBadge = () => {
    if (item.inactiveAt) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    
    if (item.expirationDate) {
      const expDate = new Date(item.expirationDate);
      const today = new Date();
      if (expDate < today) {
        return <Badge variant="destructive">Expirado</Badge>;
      }
    }
    
    return <Badge variant="default">Válido</Badge>;
  };

  return (
    <>
      {/* Renderiza o Header apenas no primeiro item */}
      <ListHeader show={index === 0}>
        <div className="w-3/12">Curso</div>
        <div className="w-2/12">Turma</div>
        <div className="w-2/12">Emissão</div>
        <div className="w-2/12">Validade</div>
        <div className="w-2/12">Status</div>
        <div className="w-1/12">Ações</div>
      </ListHeader>

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        
        {/* Curso */}
        <div className="w-full lg:w-3/12 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Curso: </p>
          <p className="text-sm font-medium">{item.course?.name || "Não informado"}</p>
        </div>

        {/* Turma */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Turma: </p>
          <p className="text-sm text-muted-foreground">
            {item.class?.name || "Não informado"}
            {item.class?.classCode && (
              <span className="text-xs ml-1">({item.class.classCode})</span>
            )}
          </p>
        </div>

        {/* Emissão */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Emissão: </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(item.createdAt)}
          </p>
        </div>

        {/* Validade */}
        <div className="w-full lg:w-2/12 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Validade: </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(item.expirationDate)}
          </p>
        </div>

        {/* Status */}
        <div className="lg:w-2/12 flex items-baseline gap-2 md:pr-2">
          <p className="lg:hidden text-sm font-medium text-gray-800 dark:text-gray-300">Status: </p>
          {getStatusBadge()}
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

              {/* Visualizar Detalhes */}
              {can(`view_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => {
                      setFormData(item);
                      setOpenForm(true);
                    }}
                  >
                    <Icon name="info" className="w-3 h-3" /> 
                    <p>Ver Detalhes</p>
                  </Button>
                </DropdownMenuItem>
              )}

              {/* Editar Certificado */}
              {can(`update_${entity.ability}`) && setEditData && setOpenEditForm && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => {
                      setEditData(item);
                      setOpenEditForm(true);
                    }}
                  >
                    <Icon name="edit" className="w-3 h-3" /> 
                    <p>Editar</p>
                  </Button>
                </DropdownMenuItem>
              )}

              {/* Visualizar Certificado */}
              {item.variableToReplace && item.fabricJsonFront && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => setShowViewer(true)}
                  >
                    <Icon name="eye" className="w-3 h-3" /> 
                    <p>Visualizar Certificado</p>
                  </Button>
                </DropdownMenuItem>
              )}

              {/* Baixar PDF */}
              {item.pdfUrl && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
                    onClick={() => window.open(item.pdfUrl, '_blank')}
                  >
                    <Icon name="download" className="w-3 h-3" /> 
                    <p>Baixar PDF</p>
                  </Button>
                </DropdownMenuItem>
              )}
              
              {/* Inativar/Ativar */}
              {
                item.inactiveAt ? (
                  can(`activate_${entity.ability}`) && (	
                    <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                      <ConfirmDialog
                        title={`Reativar certificado?`}
                        description={`Ao prosseguir, o certificado será reativado.`}
                        onConfirm={() => handleConfirmAction("activate")}
                        titleBttn="Reativar"
                        iconBttn="power"
                      />
                    </DropdownMenuItem>
                  )
                ) : (
                  can(`inactive_${entity.ability}`) && (
                      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                        <ConfirmDialog
                          title={`Inativar certificado?`}
                          description={`Ao prosseguir, o certificado será inativado.`}
                          onConfirm={() => handleConfirmAction("deactivate")}
                          titleBttn="Inativar"
                          iconBttn="power-off"
                        />
                      </DropdownMenuItem>
                  )
                )
              }
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modal de Visualização do Certificado */}
      <Dialog
        open={showViewer}
        onOpenChange={setShowViewer}
        title={`Certificado - ${item.course?.name || 'Certificado'}`}
        description="Visualização do certificado do aluno"
        showBttn={false}
        showHeader={false}
      >
        <div className="h-[70vh] w-full">
          <VisualizadorCertificados
            certificateData={{
              id: item.id || 0,
              name: item.course?.name || 'Certificado',
              fabricJsonFront: item.fabricJsonFront,
              fabricJsonBack: item.fabricJsonBack,
              certificateId: item.id?.toString() || 'CERT-001'
            }}
            variableToReplace={item.variableToReplace || {}}
            zoom={50}
          />
        </div>
      </Dialog>
    </>
  )
};

export default CertificadosItem;