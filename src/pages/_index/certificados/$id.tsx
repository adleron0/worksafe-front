import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Loader2, Shield, CheckCircle, XCircle, Calendar, User, Building, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados";
import NavBar from "../-components/NavBar";
import Footer from "../-components/Footer";
import { decodeBase64Variables } from "@/utils/decodeBase64Variables";

export const Route = createFileRoute("/_index/certificados/$id")({
  component: CertificadoPublico,
});

// Interface para o certificado
interface ICertificate {
  id: number;
  key: string;
  courseId: number;
  traineeId: number;
  classId: number;
  companyId: number;
  expirationDate: string;
  fabricJsonFront: string;
  fabricJsonBack?: string;
  variableToReplace: any;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  inactiveAt?: string;
}

// Interface para a resposta da API
interface ICertificateResponse {
  total: number;
  rows: ICertificate[];
}

// Tipo para itens do carrinho
type CartItem = {
  id: number;
  name: string;
  quantity: number;
  imageUrl?: string;
};

function CertificadoPublico() {
  const { id } = Route.useParams();
  const [cart, setCart] = useState<CartItem[]>([]);

  const handleWhatsApp = (message?: string) => {
    const phone = "5581989479259";
    const defaultMessage = message || "Olá, gostaria de mais informações.";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(url, "_blank");
  };

  const { 
    data: certificateData, 
    isLoading,
    isError,
    error
  } = useQuery<ICertificateResponse | undefined>({
    queryKey: [`certificate-${id}`],
    queryFn: async () => {
      if (!id) throw new Error("ID do certificado não fornecido");
      
      // Fazendo a requisição para buscar o certificado pelo ID com query params
      const params = [
        { key: 'key', value: id }
      ];
      
      const response = await get('trainee-certificate', '', params);
      return response as ICertificateResponse;
    },
    enabled: !!id,
    retry: 1
  });

  // Extrair o certificado do array de rows
  const certificate = certificateData?.rows?.[0];

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Indefinido";
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Verifica se a data é válida
      if (isNaN(dateObj.getTime())) {
        return "Não informado";
      }
      
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", date, error);
      return "Não informado";
    }
  };

  const getValidationStatus = () => {
    if (!certificate) return null;
    
    if (certificate.inactiveAt) {
      return {
        status: "invalid",
        message: "Certificado inativo",
        icon: XCircle,
        color: "text-red-500"
      };
    }
    
    const expDate = new Date(certificate.expirationDate);
    const today = new Date();

    if (!certificate.expirationDate) {
      return {
        status: "valid",
        message: "Sem Expiração",
        icon: CheckCircle,
        color: "text-green-500"
      };
    }
    
    if (expDate < today) {
      return {
        status: "expired",
        message: "Certificado vencido",
        icon: XCircle,
        color: "text-orange-500"
      };
    }
    
    return {
      status: "valid",
      message: "Certificado válido",
      icon: CheckCircle,
      color: "text-green-500"
    };
  };

  if (isLoading) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-gray-600">Carregando certificado...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (isError || !certificate) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Certificado não encontrado
                </h2>
                <p className="text-gray-600">
                  O certificado solicitado não foi encontrado ou não está disponível.
                </p>
                {error && (
                  <p className="text-sm text-red-500 mt-2">
                    {error instanceof Error ? error.message : "Erro ao carregar certificado"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  const validationStatus = getValidationStatus();

  // Extrair informações do variableToReplace e decodificar se necessário
  const variables = decodeBase64Variables(certificate?.variableToReplace) || {};

  return (
    <>
      <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header moderno e limpo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            {/* Topo com status */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 bg-primary-light/10 rounded-lg flex-shrink-0">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-light" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900">Validação de Certificado</h1>
                    <p className="text-xs sm:text-sm text-gray-500">Sistema oficial de verificação</p>
                  </div>
                </div>
                {validationStatus && (
                  <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full self-start sm:self-auto ${
                    validationStatus.status === "valid" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : validationStatus.status === "expired"
                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    <validationStatus.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{validationStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Informações principais */}
            <div className="px-6 py-5">
              {/* Nome do aluno em destaque */}
              <div className="mb-5">
                <p className="text-sm text-gray-500 mb-1">Certificamos que</p>
                <h2 className="text-2xl font-bold text-gray-900">{variables.aluno_nome?.value || "—"}</h2>
              </div>

              {/* Grid de informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {/* Curso */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 pl-6">{variables.curso_nome?.value || "—"}</p>
                </div>

                {/* Turma */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 pl-6">{variables.turma_nome?.value || "—"}</p>
                </div>

                {/* Carga Horária */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Carga Horária</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 pl-6">{variables.turma_carga_horaria?.value || "—"}</p>
                </div>

                {/* Instrutor */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Instrutor(es)</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 pl-6">{variables.instrutores_nomes?.value || "—"}</p>
                </div>

                {/* Período */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Período</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 pl-6">{variables.turma_periodo?.value || "—"}</p>
                </div>

                {/* Validade */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Válido até</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 pl-6">{formatDate(certificate?.expirationDate)}</p>
                </div>
              </div>
            </div>

            {/* Footer com metadados */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Código:</span>
                    <span className="font-mono font-medium text-gray-700 break-all">{variables.certificado_codigo?.value || `CERT-${certificate?.id}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Emissão:</span>
                    <span className="font-medium text-gray-700">{variables.certificado_emissao?.value || formatDate(certificate?.createdAt)}</span>
                  </div>
                </div>
                {certificate?.pdfUrl && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(certificate.pdfUrl, '_blank')}
                    className="text-xs hover:bg-white w-full sm:w-auto justify-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Baixar PDF
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Visualizador de Certificados */}
          {certificate?.variableToReplace && certificate?.fabricJsonFront && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-[75vh] w-full">
                <VisualizadorCertificados
                  certificateData={{
                    id: certificate.id,
                    name: variables.curso_nome?.value || 'Certificado',
                    fabricJsonFront: certificate.fabricJsonFront,
                    fabricJsonBack: certificate.fabricJsonBack,
                    certificateId: String(certificate.key)
                  }}
                  variableToReplace={variables}
                  zoom={50}
                />
              </div>
            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}

export default CertificadoPublico;