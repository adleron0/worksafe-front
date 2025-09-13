import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import Icon from "@/components/general-components/Icon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import VisualizadorCertificados from "@/components/general-components/visualizadorCertificados";
import NavBar from "../-components/NavBar";
import Footer from "../-components/Footer";
import { decodeBase64Variables } from "@/utils/decodeBase64Variables";
import CertificatePDFService from "@/components/general-components/visualizadorCertificados/services/CertificatePDFService";
import CertificateImageService from "@/components/general-components/visualizadorCertificados/services/CertificateImageService";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_index/certificados/$id")({
  component: CertificadoPublico,
  // Loader para buscar dados do certificado antes de renderizar
  loader: async ({ params }) => {
    try {
      const response = await get('trainee-certificate', `get-trainee-certificate/${params.id}`) as { data: { rows: any[] } };
      return response.data.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar certificado:', error);
      return null;
    }
  },
  // Configurar meta tags dinâmicas com TanStack Router
  head: ({ params, loaderData }) => {
    const certificate = loaderData as any;
    const certificateId = params.id;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sistema.worksafebrasil.com.br';
    const metaUrl = `${baseUrl}/certificados/${certificateId}`;

    // Decodificar variáveis se disponível
    let variables: any = {};
    if (certificate?.variableToReplace) {
      try {
        variables = typeof certificate.variableToReplace === 'string'
          ? decodeBase64Variables(certificate.variableToReplace)
          : certificate.variableToReplace;
      } catch (e) {
        variables = certificate.variableToReplace;
      }
    }

    // Extrair informações dinâmicas
    const studentName = variables['aluno_nome']?.value || 'Aluno';
    const courseName = variables['curso_nome']?.value || 'Certificado';
    const companyName = certificate?.company?.comercial_name || 'WorkSafe Brasil';

    // Meta tags dinâmicas
    const metaTitle = `Certificado de ${studentName} - ${courseName}`;
    const metaDescription = `Certificado válido emitido por ${companyName} para o curso de ${courseName}. Verifique a autenticidade deste certificado no sistema oficial.`;

    // Usar thumbnail se disponível, senão usar imagem padrão
    let metaImage = `${baseUrl}/og-image.jpg`;
    if (certificate?.pdfUrl) {
      metaImage = certificate.pdfUrl;
      // LinkedIn requer HTTPS
      if (metaImage.startsWith('http://')) {
        metaImage = metaImage.replace('http://', 'https://');
      }
    } else if (certificate?.company?.logoUrl) {
      metaImage = certificate.company.logoUrl;
      if (metaImage.startsWith('http://')) {
        metaImage = metaImage.replace('http://', 'https://');
      }
    }

    return {
      meta: [
        {
          title: metaTitle,
        },
        {
          name: 'description',
          content: metaDescription,
        },
        // Open Graph Tags - ORDEM IMPORTA PARA LINKEDIN!
        {
          property: 'og:title',
          content: metaTitle,
        },
        {
          property: 'og:image',
          content: metaImage,
        },
        {
          property: 'og:description',
          content: metaDescription,
        },
        {
          property: 'og:url',
          content: metaUrl,
        },
        {
          property: 'og:type',
          content: 'article',
        },
        {
          property: 'og:image:secure_url',
          content: metaImage,
        },
        {
          property: 'og:image:type',
          content: 'image/png',
        },
        {
          property: 'og:image:width',
          content: '1200',
        },
        {
          property: 'og:image:height',
          content: '630',
        },
        {
          property: 'og:image:alt',
          content: metaTitle,
        },
        {
          property: 'og:site_name',
          content: 'WorkSafe Brasil',
        },
        {
          property: 'og:locale',
          content: 'pt_BR',
        },
        // Meta tags adicionais para LinkedIn
        {
          name: 'image',
          property: 'og:image',
          content: metaImage,
        },
        {
          name: 'title',
          property: 'og:title',
          content: metaTitle,
        },
        // Twitter Card Tags
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: metaTitle,
        },
        {
          name: 'twitter:description',
          content: metaDescription,
        },
        {
          name: 'twitter:image',
          content: metaImage,
        },
        // Author
        {
          name: 'author',
          content: companyName,
        },
        {
          property: 'article:author',
          content: companyName,
        },
      ],
    };
  },
});

// Interface para o instrutor
interface IInstructor {
  id: number;
  name: string;
  registryCode?: string;
  specialty?: string;
}

// Interface para a turma
interface IClass {
  id: number;
  name: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  workload?: number;
  modality?: 'presential' | 'online' | 'hybrid' | string;
  instructors?: IInstructor[];
}

// Interface para o trainee/aluno
interface ITrainee {
  id?: number;
  name: string;
  imageUrl?: string | null;
}

// Interface para a empresa/emissor
interface ICompany {
  cnpj: string;
  comercial_name: string;
  logoUrl?: string;
  faviconUrl?: string;
  websiteUrl?: string;
}

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
  variableToReplace: Record<string, any>;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  inactiveAt?: string;
  class?: IClass;
  trainee?: ITrainee;
  company?: ICompany;
  canvasWidth?: number;
  canvasHeight?: number;
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const navigate = useNavigate();

  const handleWhatsApp = (message?: string) => {
    const phone = "5581989479259";
    const defaultMessage = message || "Olá, gostaria de mais informações.";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(url, "_blank");
  };

  const handleGeneratePDF = async () => {
    if (!certificate || !certificate.fabricJsonFront || isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    try {
      // Preparar dados do certificado para o serviço de PDF
      const certificateDataForPDF = {
        id: certificate.id,
        name: variables.curso_nome?.value || 'Certificado',
        fabricJsonFront: certificate.fabricJsonFront,
        fabricJsonBack: certificate.fabricJsonBack,
        canvasWidth: certificate.canvasWidth || 842,
        canvasHeight: certificate.canvasHeight || 595,
        certificateId: certificate.key || String(certificate.id)
      };

      // Gerar PDF como Blob
      const result = await CertificatePDFService.generatePDF(
        certificateDataForPDF,
        variables,
        {
          returnBlob: true,
          quality: 'high'
        }
      );

      if (result.success && result.data instanceof Blob) {
        // Criar URL do Blob e abrir em nova aba
        const blobUrl = URL.createObjectURL(result.data);
        const newWindow = window.open(blobUrl, '_blank');

        // Limpar URL após um tempo
        if (newWindow) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 10000);
        } else {
          // Se não conseguir abrir nova aba, fazer download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = result.fileName || 'certificado.pdf';
          link.click();
          URL.revokeObjectURL(blobUrl);
        }
      } else {
        toast.error('Erro ao gerar PDF do certificado');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do certificado');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGeneratePNG = async () => {
    if (!certificate || !certificate.fabricJsonFront || isGeneratingPNG) return;

    setIsGeneratingPNG(true);
    try {
      // Preparar dados do certificado para o serviço de imagem
      const certificateDataForImage = {
        id: certificate.id,
        name: variables.curso_nome?.value || 'Certificado',
        fabricJsonFront: certificate.fabricJsonFront,
        fabricJsonBack: certificate.fabricJsonBack,
        canvasWidth: certificate.canvasWidth || 842,
        canvasHeight: certificate.canvasHeight || 595,
        certificateId: certificate.key || String(certificate.id)
      };

      // Gerar PNG como Blob com máxima qualidade
      const result = await CertificateImageService.generateImage(
        certificateDataForImage,
        variables,
        {
          format: 'png',
          scale: 4, // Resolução 4x (3368x2380 pixels para A4)
          quality: 1.0, // Máxima qualidade
          returnBlob: true
        }
      );

      if (result.success && result.data instanceof Blob) {
        // Criar URL do Blob e abrir em nova aba
        const blobUrl = URL.createObjectURL(result.data);
        const newWindow = window.open(blobUrl, '_blank');

        // Limpar URL após um tempo
        if (newWindow) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 10000);
        } else {
          // Se não conseguir abrir nova aba, fazer download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = result.fileName || 'certificado.png';
          link.click();
          URL.revokeObjectURL(blobUrl);
        }
        toast.success('Imagem gerada com sucesso!');
      } else {
        toast.error('Erro ao gerar imagem do certificado');
      }
    } catch (error) {
      console.error('Erro ao gerar PNG:', error);
      toast.error('Erro ao gerar imagem do certificado');
    } finally {
      setIsGeneratingPNG(false);
    }
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
        { key: 'key', value: id },
        { key: 'show', value: ['class', 'trainee', 'company'] }
      ];
      
      const response = await get('trainee-certificate', '', params);
      return response as ICertificateResponse;
    },
    enabled: !!id,
    retry: 1
  });

  // Extrair o certificado do array de rows
  const certificate = certificateData?.rows?.[0];
  
  // Extrair dados da turma e instrutores
  const classData = certificate?.class;
  const instructors = classData?.instructors || [];

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Indefinido";
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Verifica se a data é válida
      if (isNaN(dateObj.getTime())) {
        return "Não informado";
      }
      
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Não informado";
    }
  };

  const formatDateTime = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return "Não informado";
      }
      
      return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "Não informado";
    }
  };

  const getValidationStatus = () => {
    if (!certificate) return null;
    
    if (certificate.inactiveAt) {
      return {
        status: "invalid",
        message: "Certificado inativo",
        icon: "x-circle",
        color: "text-red-500"
      };
    }
    
    const expDate = new Date(certificate.expirationDate);
    const today = new Date();

    if (!certificate.expirationDate) {
      return {
        status: "valid",
        message: "Sem Expiração",
        icon: "check-circle",
        color: "text-green-500"
      };
    }
    
    if (expDate < today) {
      return {
        status: "expired",
        message: "Certificado vencido",
        icon: "x-circle",
        color: "text-orange-500"
      };
    }
    
    return {
      status: "valid",
      message: "Certificado válido",
      icon: "check-circle",
      color: "text-green-500"
    };
  };

  if (isLoading) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-background pt-20">
          <div className="text-center">
            <Icon name="loader-2" className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Carregando certificado...</p>
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
        <div className="min-h-screen flex items-center justify-center bg-background pt-20">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <Icon name="x-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Certificado não encontrado
                </h2>
                <p className="text-muted-foreground">
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
      <div className="min-h-screen bg-background pt-24 md:pt-18 lg:pt-10 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Visualizador de Certificados */}
          {certificate?.variableToReplace && certificate?.fabricJsonFront && (
            <div className="bg-card overflow-hidden mb-6">
              <div className="h-[75vh] w-full">
                <VisualizadorCertificados
                  certificateData={{
                    id: certificate.id,
                    name: variables.curso_nome?.value || 'Certificado',
                    fabricJsonFront: certificate.fabricJsonFront,
                    fabricJsonBack: certificate.fabricJsonBack,
                    certificateId: String(certificate.key),
                    pdfUrl: certificate.pdfUrl // Passando o pdfUrl para o visualizador
                  }}
                  variableToReplace={variables}
                  zoom={50}
                />
              </div>
            </div>
          )}
          
          {/* Grid com cards principais e coluna lateral */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna principal - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
            {/* Card Principal - Status e Informações do Certificado */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              {/* Header com Status */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-card rounded-lg shadow-sm">
                      <Icon name="badge-check" className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">Certificado Validado</h1>
                      <p className="text-sm text-muted-foreground">Sistema oficial de verificação</p>
                    </div>
                  </div>
                  {validationStatus && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                      validationStatus.status === "valid" 
                        ? "bg-green-100 text-green-700 border border-green-200" 
                        : validationStatus.status === "expired"
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-red-100 text-red-700 border border-red-200"
                    }`}>
                      <Icon name={validationStatus.icon} className="w-4 h-4" />
                      <span className="text-sm font-semibold">{validationStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Informações do Aluno e Curso */}
              <div className="p-6">
                {/* Layout alinhado à esquerda */}
                <div className="space-y-4">
                  {/* Nome do Curso */}
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{variables.curso_nome?.value || "Curso não informado"}</h2>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingPDF || !certificate?.fabricJsonFront}
                    >
                      <Icon
                        name={isGeneratingPDF ? "loader-2" : "file-text"}
                        className={`w-4 h-4 mr-2 ${isGeneratingPDF ? "animate-spin" : ""}`}
                      />
                      PDF
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGeneratePNG}
                      disabled={isGeneratingPNG || !certificate?.fabricJsonFront}
                    >
                      <Icon
                        name={isGeneratingPNG ? "loader-2" : "image"}
                        className={`w-4 h-4 mr-2 ${isGeneratingPNG ? "animate-spin" : ""}`}
                      />
                      PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* Mock - adicionar funcionalidade depois */}}
                    >
                      <Icon name="info" className="w-4 h-4 mr-2" />
                      Informações
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* Mock - adicionar funcionalidade depois */}}
                    >
                      <Icon name="help-circle" className="w-4 h-4 mr-2" />
                      Ajuda
                    </Button>
                  </div>

                  {/* Nome do Aluno e Link de Credenciais */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {/* Avatar do Aluno */}
                      <Avatar className="h-12 w-12 border-2 border-border">
                        {certificate?.trainee?.imageUrl ? (
                          <AvatarImage 
                            src={certificate.trainee.imageUrl} 
                            alt={variables.aluno_nome?.value || "Aluno"} 
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {(() => {
                            const nome = variables.aluno_nome?.value || "Aluno";
                            const nomes = nome.trim().split(" ");
                            if (nomes.length >= 2) {
                              // Pega a inicial do primeiro e segundo nome
                              return `${nomes[0].charAt(0).toUpperCase()}${nomes[1].charAt(0).toUpperCase()}`;
                            }
                            // Se tiver apenas um nome, usa só a inicial dele
                            return nome.charAt(0).toUpperCase();
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{variables.aluno_nome?.value || "Aluno não informado"}</p>
                        <a 
                          href="#" 
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            if (certificate?.traineeId) {
                              const traineeName = (variables.aluno_nome?.value || "aluno")
                                .toLowerCase()
                                .replace(/\s+/g, '-')
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "");
                              navigate({ to: `/certificados/${traineeName}/${certificate.traineeId}` });
                            }
                          }}
                        >
                          <Icon name="shield-check" className="w-4 h-4" />
                          Ver credenciais do aluno
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border py-4">
                    {/* Descrição da Turma */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sobre a Turma</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {classData?.description || 
                         `Turma ${variables.turma_nome?.value || ""} do curso de ${variables.curso_nome?.value || ""}, 
                         com carga horária de ${variables.turma_carga_horaria?.value || "não informada"}.
                         ${variables.turma_periodo?.value ? `Período: ${variables.turma_periodo.value}.` : ""}
                         ${instructors.length > 0 ? `Ministrado por ${instructors.map(i => i.name).join(", ")}.` : ""}`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid de Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-background rounded-lg">
                    <Icon name="clock" className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Carga Horária</p>
                      <p className="text-sm font-semibold text-foreground">{variables.turma_carga_horaria?.value || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-background rounded-lg">
                    <Icon name="calendar-check" className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Válido até</p>
                      <p className="text-sm font-semibold text-foreground">{formatDate(certificate?.expirationDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-background rounded-lg">
                    <Icon name="hash" className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Código</p>
                      <p className="text-sm font-mono font-semibold text-foreground">{variables.certificado_codigo?.value || `CERT-${certificate?.id}`}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-background rounded-lg">
                    <Icon name="calendar" className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Data de Emissão</p>
                      <p className="text-sm font-semibold text-foreground">{formatDate(certificate?.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card da Turma */}
            {classData && (
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="bg-background border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Icon name="users" className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">Informações da Turma</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Nome da Turma</p>
                      <p className="text-sm font-medium text-foreground">{classData.name || variables.turma_nome?.value || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Período</p>
                      <p className="text-sm font-medium text-foreground">{variables.turma_periodo?.value || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Modalidade</p>
                      <p className="text-sm font-medium text-foreground">
                        {classData.modality === 'presential' ? 'Presencial' : 
                         classData.modality === 'online' ? 'Online' : 
                         classData.modality === 'hybrid' ? 'Híbrido' : classData.modality || "—"}
                      </p>
                    </div>
                    {classData.startAt && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Início</p>
                        <p className="text-sm font-medium text-foreground">{formatDateTime(classData.startAt)}</p>
                      </div>
                    )}
                    {classData.endAt && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Término</p>
                        <p className="text-sm font-medium text-foreground">{formatDateTime(classData.endAt)}</p>
                      </div>
                    )}
                    {classData.workload && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Carga Horária Total</p>
                        <p className="text-sm font-medium text-foreground">{classData.workload} horas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Card dos Instrutores */}
            {instructors.length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="bg-background border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Icon name="graduation-cap" className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">Instrutores</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instructors.map((instructor, index) => (
                      <div key={instructor.id || index} className="flex items-center gap-4 p-4 bg-background rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon name="user" className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{instructor.name}</p>
                          {instructor.registryCode && (
                            <p className="text-xs text-muted-foreground">Registro: {instructor.registryCode}</p>
                          )}
                          {instructor.specialty && (
                            <p className="text-xs text-muted-foreground mt-1">{instructor.specialty}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Coluna lateral - 1/3 */}
            <div className="space-y-6">
              {/* Card do Emissor */}
              {certificate?.company && (
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                  <div className="bg-background border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon name="building-2" className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-base font-semibold text-foreground">Emissor do Certificado</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    {/* Nome da empresa com avatar */}
                    <div className="flex items-center gap-3 mb-4 py-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-border p-1 bg-muted">
                          <AvatarImage 
                            src={certificate.company.faviconUrl || certificate.company.logoUrl} 
                            alt={certificate.company.comercial_name}
                          />
                          <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                            {certificate.company.comercial_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Icon 
                          name="circle-check" 
                          className="absolute -top-1 -right-1 w-4 h-4 text-white bg-primary rounded-full"
                        />
                      </div>
                      <p className="text-base font-light text-foreground">
                        {certificate.company.comercial_name}
                      </p>
                    </div>

                    {/* CNPJ */}
                    <div className="flex items-center gap-2 p-3 bg-background rounded-lg mb-3">
                      <Icon name="file-text" className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ</p>
                        <p className="text-sm font-mono text-foreground">
                          {certificate.company.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                        </p>
                      </div>
                    </div>

                    {/* Link para o site */}
                    {certificate.company.websiteUrl && (
                      <a 
                        href={certificate.company.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-inverse-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Icon name="globe" className="w-4 h-4" />
                        <span className="text-sm font-medium">Visitar Site</span>
                        <Icon name="external-link" className="w-3 h-3" />
                      </a>
                    )}

                    {/* Badge de verificação */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-green-600">
                        <Icon name="shield-check" className="w-5 h-5" />
                        <p className="text-xs font-medium">Emissor Verificado</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Compartilhamento */}
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="bg-background border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name="share-2" className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Compartilhar Certificado</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Compartilhe sua conquista nas redes sociais
                    {certificate?.pdfUrl && (
                      <span className="block mt-1 text-xs text-green-600">
                        <Icon name="image" className="inline w-3 h-3 mr-1" />
                        Preview do certificado disponível
                      </span>
                    )}
                  </p>
                  <div className="space-y-2">
                    {/* LinkedIn */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 hover:bg-[#0077B5]/10 hover:border-[#0077B5] dark:hover:bg-[#0077B5]/20 dark:hover:text-white transition-colors"
                      onClick={() => {
                        const certificateUrl = `${window.location.origin}/certificados/${certificate?.key || certificate?.id}`;

                        // Adicionar cache buster se não tiver thumbnail
                        const urlToShare = !certificate?.pdfUrl
                          ? `${certificateUrl}?t=${Date.now()}` // Força re-fetch se não tem thumbnail
                          : certificateUrl;

                        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlToShare)}`;

                        // Log detalhado para debug
                        console.group('[LinkedIn Share Debug]');
                        console.log('Certificate URL:', certificateUrl);
                        console.log('URL to Share:', urlToShare);
                        console.log('Has pdfUrl:', !!certificate?.pdfUrl);
                        console.log('LinkedIn URL:', linkedinUrl);
                        console.groupEnd();

                        window.open(linkedinUrl, '_blank');
                      }}
                    >
                      <svg className="w-5 h-5 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </Button>

                    {/* X (Twitter) */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 hover:bg-muted hover:border-gray-400"
                      onClick={() => {
                        const certificateUrl = `${window.location.origin}/certificados/${certificate?.key || certificate?.id}`;
                        const xUrl = `https://x.com/intent/post?url=${encodeURIComponent(certificateUrl + '?utm_source=twitter&utm_medium=social')}`;
                        window.open(xUrl, '_blank');
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </Button>

                    {/* Facebook */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 hover:bg-[#1877F2]/10 hover:border-[#1877F2] dark:hover:bg-[#1877F2]/20 dark:hover:text-white transition-colors"
                      onClick={() => {
                        const certificateUrl = `${window.location.origin}/certificados/${certificate?.key || certificate?.id}`;
                        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certificateUrl + '?utm_source=facebook&utm_medium=social')}`;
                        window.open(facebookUrl, '_blank');
                      }}
                    >
                      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>

                    {/* WhatsApp */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 hover:bg-[#25D366]/10 hover:border-[#25D366] dark:hover:bg-[#25D366]/20 dark:hover:text-white transition-colors"
                      onClick={() => {
                        const certificateUrl = `${window.location.origin}/certificados/${certificate?.key || certificate?.id}`;
                        const whatsappUrl = `https://api.whatsapp.com/send/?text=${encodeURIComponent(certificateUrl + '?utm_source=whatsapp&utm_medium=social')}&type=custom_url&app_absent=0`;
                        window.open(whatsappUrl, '_blank');
                      }}
                    >
                      <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </Button>

                    {/* Copiar Link */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 hover:bg-muted hover:border-muted-foreground/20 dark:hover:bg-muted dark:hover:text-white transition-colors"
                      onClick={() => {
                        const certificateUrl = `${window.location.origin}/certificados/${certificate?.key || certificate?.id}`;
                        navigator.clipboard.writeText(certificateUrl).then(() => {
                          toast.success('Link copiado para a área de transferência!');
                        }).catch(() => {
                          toast.error('Erro ao copiar link');
                        });
                      }}
                    >
                      <Icon name="link" className="w-5 h-5 text-muted-foreground" />
                      Copiar Link
                    </Button>

                    {/* LinkedIn Inspector (Debug) */}
                    {process.env.NODE_ENV === 'development' && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 hover:bg-yellow-50 hover:border-yellow-300"
                        onClick={() => {
                          const certificateUrl = `${window.location.origin}/certificados/${certificate?.key || certificate?.id}`;
                          const inspectorUrl = `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(certificateUrl)}`;
                          window.open(inspectorUrl, '_blank');
                        }}
                      >
                        <Icon name="bug" className="w-5 h-5 text-yellow-600" />
                        LinkedIn Inspector
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </>
  );
}

export default CertificadoPublico;