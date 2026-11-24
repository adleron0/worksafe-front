import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { post } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import CertificatePDFService from "@/components/general-components/visualizadorCertificados/services/CertificatePDFService";
import { certificateImageUrl, certificatePdfUrl, fetchCertificateUnlock, isIssuedCertificateKey, openAfter } from "@/components/general-components/visualizadorCertificados/server/certificateRenderUrls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { renderVersion } from "@/components/general-components/visualizadorCertificados/highlight";
import IssuedCertificateView from "@/components/general-components/visualizadorCertificados/server/IssuedCertificateView";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ICertificate } from "../-interfaces/entity.interface";
import { ActiveAction, useActiveToggle } from "../../-shared/useActiveToggle";
import DestaqueCertificadoDialog from "./DestaqueCertificadoDialog";
import CancelarCertificadoDialog from "./CancelarCertificadoDialog";

/**
 * Menu ⋯ do certificado: visualizar, editar, destaque, detalhes, PDF, imagem,
 * enviar por e-mail, cancelar e reativar (com os diálogos de cada um).
 */
export default function CertificadosRowActions({ item, entity, onView, onEdit, modalPopover = false }: {
  item: ICertificate;
  entity: IDefaultEntity;
  onView: (item: ICertificate) => void;
  onEdit: (item: ICertificate) => void;
  modalPopover?: boolean;
}) {
  const { can } = useVerify();
  const { showLoader, hideLoader } = useLoader();
  const [showViewer, setShowViewer] = useState(false);
  const [stageFailed, setStageFailed] = useState(false);
  // emitido → mesmo visualizador da página pública (palco + brilho + Baixar)
  const issuedView = isIssuedCertificateKey(item.key?.toString()) && !stageFailed;
  // Selo que libera os CPFs (LGPD) no visualizador: só quando ele abre.
  // Sem permissão ou com erro, o certificado aparece mascarado mesmo.
  const issuedKey = isIssuedCertificateKey(item.key?.toString()) ? String(item.key) : null;
  const { data: viewerUnlock, isSuccess: unlockSettled } = useQuery({
    queryKey: ['certificate-unlock', issuedKey],
    queryFn: async () => (await fetchCertificateUnlock(issuedKey!)) ?? null,
    enabled: showViewer && !!issuedKey,
    staleTime: Infinity,
    retry: false,
  });
  const [openDestaque, setOpenDestaque] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [confirm, setConfirm] = useState<null | "email" | ActiveAction>(null);
  // a lista de certificados usa a chave "listCertificados" (pluralName com acento não serve aqui)
  const toggle = useActiveToggle({ ...entity, name: "certificado", pluralName: "Certificados" }, {
    deactivate: { title: `Certificado inativado!`, description: `Certificado inativado com sucesso.` },
    activate: { title: `Certificado reativado!`, description: `Certificado foi reativado com sucesso.` },
  }, 'trainee-certificate');

  // Função para enviar certificado por email
  // Função para gerar e abrir PDF em nova guia
  const handleGeneratePDF = async () => {
    if (!item.fabricJsonFront || !item.variableToReplace) {
      toast({
        title: "Erro ao gerar PDF",
        description: "Dados incompletos para gerar o certificado",
        variant: "destructive",
      });
      return;
    }

    // Certificado emitido: PDF pronto da API (renderizado no servidor)
    const key = item.key?.toString();
    if (isIssuedCertificateKey(key)) {
      await openAfter(async () =>
        certificatePdfUrl(key, { download: false, version: item.updatedAt, unlock: await fetchCertificateUnlock(key) }),
      );
      return;
    }

    showLoader("Gerando PDF do certificado...");

    try {
      const certificateData = {
        id: item.id || 0,
        name: item.course?.name || 'Certificado',
        fabricJsonFront: item.fabricJsonFront,
        fabricJsonBack: item.fabricJsonBack || null,
        canvasWidth: item.canvasWidth,
        canvasHeight: item.canvasHeight,
        certificateId: item.key?.toString() || 'CERT-001'
      };

      const result = await CertificatePDFService.generatePDF(
        certificateData,
        item.variableToReplace,
        { 
          returnBlob: true,
          quality: 'high'
        }
      );

      if (result.success && result.data instanceof Blob) {
        // Criar URL do blob
        const pdfUrl = URL.createObjectURL(result.data);
        
        // Abrir em nova guia
        const newWindow = window.open(pdfUrl, '_blank');
        
        // Limpar URL após um tempo
        if (newWindow) {
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 10000);
        }
        
        hideLoader();
        toast({
          title: "PDF gerado com sucesso!",
          description: "O certificado foi aberto em uma nova guia",
          variant: "success",
        });
      } else {
        throw new Error(result.error || "Erro ao gerar PDF");
      }
    } catch (error) {
      hideLoader();
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Erro desconhecido ao gerar o certificado",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!item.traineeId || !item.key) {
      toast({
        title: "Erro ao enviar certificado",
        description: "Dados incompletos para enviar o certificado",
        variant: "destructive",
      });
      return;
    }

    showLoader("Enviando certificado por email...");

    try {
      // Enviar apenas traineeId e key do certificado
      const dataToSend = {
        traineeId: item.traineeId,
        certificateKey: item.key,
      };
      
      // Enviar dados simplificados
      await post('trainee-certificate', 'send-email', dataToSend);

      hideLoader();
      toast({
        title: "Certificado enviado!",
        description: `Certificado enviado com sucesso para ${item?.trainee?.name || 'o email cadastrado'}`,
        variant: "success",
      });

    } catch (error: unknown) {
      hideLoader();
      console.error('Erro ao enviar certificado:', error);
      
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      
      // Tratamento específico para erro 403
      if (axiosError?.response?.status === 403) {
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para enviar certificados por email. Verifique com o administrador.",
          variant: "destructive",
        });
      } else if (axiosError?.response?.data?.message) {
        toast({
          title: "Erro ao enviar certificado",
          description: axiosError.response.data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar certificado",
          description: error instanceof Error 
            ? error.message 
            : "Erro ao enviar o certificado",
          variant: "destructive",
        });
      }
    }
  };

  const canUpdate = can(`update_${entity.ability}`);
  const hasCanvas = !!(item.variableToReplace && item.fabricJsonFront);
  const canEmail = !!(item.traineeId && item.key);
  const canActivate = !!item.inactiveAt && can(`activate_${entity.ability}`);
  const canCancel = !item.inactiveAt && can(`inactive_${entity.ability}`);

  return (
    <>
      <DropdownMenu modal={modalPopover}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do certificado de ${item.trainee?.name ?? item.id}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasCanvas && <DropdownMenuItem className="gap-2" onSelect={() => setShowViewer(true)}><Icon name="eye" className="w-3.5 h-3.5" /> Visualizar certificado</DropdownMenuItem>}
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canUpdate && item.id && (
            <DropdownMenuItem className="gap-2" onSelect={() => setOpenDestaque(true)}>
              <Icon name="sparkles" className="w-3.5 h-3.5" /> {item.highlightStudent ? "Destaque (marcado)" : "Marcar como destaque"}
            </DropdownMenuItem>
          )}
          {can(`view_${entity.ability}`) && <DropdownMenuItem className="gap-2" onSelect={() => onView(item)}><Icon name="info" className="w-3.5 h-3.5" /> Ver detalhes</DropdownMenuItem>}
          {hasCanvas && <DropdownMenuItem className="gap-2" onSelect={() => { handleGeneratePDF(); }}><Icon name="download" className="w-3.5 h-3.5" /> Gerar PDF</DropdownMenuItem>}
          {isIssuedCertificateKey(item.key?.toString()) && (
            <DropdownMenuItem className="gap-2" onSelect={() => {
              openAfter(async () => certificateImageUrl(String(item.key), 'front', renderVersion(item), undefined, await fetchCertificateUnlock(String(item.key))));
            }}>
              <Icon name="image" className="w-3.5 h-3.5" /> Imagem preview
            </DropdownMenuItem>
          )}
          {canEmail && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("email")}><Icon name="mail" className="w-3.5 h-3.5" /> Enviar por e-mail</DropdownMenuItem>}
          {(canActivate || canCancel) && <DropdownMenuSeparator />}
          {canActivate && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("activate")}><Icon name="power" className="w-3.5 h-3.5" /> Reativar</DropdownMenuItem>}
          {/* fecha o menu antes de abrir o diálogo (menu aberto bloqueia cliques) */}
          {canCancel && <DropdownMenuItem className="gap-2" onSelect={() => setTimeout(() => setOpenCancel(true))}><Icon name="circle-x" className="w-3.5 h-3.5" /> Cancelar certificado</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm === "email" && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title="Enviar certificado por email?" description={`Deseja enviar o certificado para ${item.trainee?.name || 'o aluno'}?`}
          onConfirm={() => { handleSendEmail(); setConfirm(null); }} />
      )}
      {confirm === "activate" && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }}
          title="Reativar certificado?" description="Ao prosseguir, o certificado será reativado."
          onConfirm={() => { toggle(item.id, "activate"); setConfirm(null); }} />
      )}

      {/* Modal de Visualização do Certificado */}
      <Dialog
        open={showViewer}
        onOpenChange={setShowViewer}
        title={`${item.trainee?.name || ''}`}
        description={`Certificado - ${item.course?.name || 'Certificado'}`}
        showBttn={false}
        showHeader={true}
        className={issuedView ? "w-[min(94vw,1100px)] sm:max-w-[94vw]" : "md:w-fit"}
        classNameContent={issuedView ? "h-auto max-h-[75vh] pb-2" : "h-fit md:h-[80vh]"}
      >
        {issuedView && !unlockSettled ? (
          // espera o selo para não baixar a imagem duas vezes (mascarada e completa)
          <div className="flex h-60 w-full items-center justify-center">
            <Icon name="loader-2" className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : issuedView ? (
          <div className="w-full">
            <IssuedCertificateView
              reservedHeight={typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.25) + 110 : 300}
              certificate={{ ...item, key: String(item.key) }}
              name={item.course?.name || 'Certificado'}
              fileNameParts={[item.trainee?.name, item.course?.name]}
              unlock={viewerUnlock}
              onError={() => setStageFailed(true)}
            />
          </div>
        ) : (
        <div className="h-fit md:h-full w-full">
          <VisualizadorCertificados
            certificateData={{
              id: item.id || 0,
              name: item.course?.name || 'Certificado',
              fabricJsonFront: item.fabricJsonFront,
              fabricJsonBack: item.fabricJsonBack,
              canvasWidth: item.canvasWidth,
              canvasHeight: item.canvasHeight,
              certificateId: item.key?.toString() || 'CERT-001',
              updatedAt: renderVersion(item) ?? undefined
            }}
            variableToReplace={item.variableToReplace || {}}
            unlock={viewerUnlock}
            zoom={50}
          />
        </div>
        )}
      </Dialog>
      {openCancel && (
        <CancelarCertificadoDialog item={item} open={openCancel} onOpenChange={setOpenCancel} />
      )}
      {openDestaque && (
        <DestaqueCertificadoDialog item={item} open={openDestaque} onOpenChange={setOpenDestaque} />
      )}
    </>
  );
}
