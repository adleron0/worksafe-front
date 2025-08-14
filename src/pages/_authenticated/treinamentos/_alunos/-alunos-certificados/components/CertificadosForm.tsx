import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { Badge } from "@/components/ui/badge";
import { ICertificate } from "../interfaces/entity.interface";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Dialog from "@/components/general-components/Dialog";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados";

interface FormProps {
  formData: ICertificate | null;
  setOpenForm: (open: boolean) => void;
  entity: {
    name: string;
    pluralName: string;
    model: string;
    ability: string;
  };
  traineeId: number;
}

const Form = ({ formData, setOpenForm }: FormProps) => {
  const [showViewer, setShowViewer] = useState(false);
  
  useEffect(() => {
    // Componente apenas para visualização, não precisa inicializar dados
  }, [formData]);

  const handleClose = () => {
    setOpenForm(false);
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatDateTime = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadge = () => {
    if (formData?.inactiveAt) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    
    if (formData?.expirationDate) {
      const expDate = new Date(formData.expirationDate);
      const today = new Date();
      if (expDate < today) {
        return <Badge variant="destructive">Expirado</Badge>;
      }
    }
    
    return <Badge variant="default">Válido</Badge>;
  };

  if (!formData) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Informações do Aluno */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="user" className="w-4 h-4" />
          Informações do Aluno
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Nome:</span>
            <span className="text-sm font-medium">{formData.trainee?.name || "Não informado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">CPF:</span>
            <span className="text-sm font-medium">{formData.trainee?.cpf || "Não informado"}</span>
          </div>
        </div>
      </Card>

      {/* Informações do Certificado */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="award" className="w-4 h-4" />
          Informações do Certificado
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Curso:</span>
            <span className="text-sm font-medium">{formData.course?.name || "Não informado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Turma:</span>
            <span className="text-sm font-medium">
              {formData.class?.name || "Não informado"}
              {formData.class?.classCode && ` (${formData.class.classCode})`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Validade:</span>
            <span className="text-sm font-medium">{formatDate(formData.expirationDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Emissão:</span>
            <span className="text-sm font-medium">{formatDateTime(formData.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getStatusBadge()}
          </div>
        </div>
      </Card>

      {/* Ações */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleClose}
        >
          Fechar
        </Button>
        
        {formData.variableToReplace && formData.fabricJsonFront && (
          <Button
            onClick={() => setShowViewer(true)}
            className="flex items-center gap-2"
          >
            <Icon name="eye" className="w-4 h-4" />
            Visualizar Certificado
          </Button>
        )}
        
        {formData.pdfUrl && (
          <Button
            variant="default"
            onClick={() => window.open(formData.pdfUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <Icon name="download" className="w-4 h-4" />
            Baixar PDF
          </Button>
        )}
      </div>

      {/* Visualizador de Certificado */}
      <Dialog
        open={showViewer}
        onOpenChange={setShowViewer}
        title={`Certificado - ${formData?.course?.name || 'Certificado'}`}
        description="Visualização do certificado"
        showBttn={false}
        showHeader={false}
      >
        <div className="h-[70vh] w-full">
          {formData && (
            <VisualizadorCertificados
              certificateData={{
                id: formData.id || 0,
                name: formData.course?.name || 'Certificado',
                fabricJsonFront: formData.fabricJsonFront,
                fabricJsonBack: formData.fabricJsonBack
              }}
              variableToReplace={formData.variableToReplace || {}}
              zoom={50}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default Form;