import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import Icon from "@/components/general-components/Icon";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import NavBar from "../-components/NavBar";
import Footer from "../-components/Footer";
import { decodeBase64Variables } from "@/utils/decodeBase64Variables";
import CertificateThumbnail from "@/components/general-components/visualizadorCertificados/CertificateThumbnail";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_index/certificados/$nome/$id")({
  component: TraineeCertificatesPage,
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
  id: number;
  name: string;
  imageUrl?: string | null;
  email?: string;
  cpf?: string;
}

// Interface para a empresa/emissor
interface ICompany {
  id: number;
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
  variableToReplace: Record<string, { value?: string; type?: string }>;
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

function TraineeCertificatesPage() {
  const { id, nome } = Route.useParams();
  const [cart, setCart] = useState<CartItem[]>([]);
  const navigate = useNavigate();

  const handleWhatsApp = (message?: string) => {
    const phone = "5581989479259";
    const defaultMessage = message || "Olá, gostaria de mais informações.";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(url, "_blank");
  };

  const { 
    data: certificatesData, 
    isLoading,
    isError,
    error
  } = useQuery<ICertificateResponse | undefined>({
    queryKey: [`certificates-trainee`, id],
    queryFn: async () => {
      const params = [
        { key: 'active', value: 'true' },
        { key: 'order-createdAt', value: 'desc' },
        { key: 'page', value: 0 },
        { key: 'limit', value: 'all' },
        { key: 'show', value: ['trainee', 'class', 'company'] },
        { key: 'traineeId', value: id },
        { key: 'showOnWebsiteConsent', value: true },
      ];
      
      const response = await get('trainee-certificate', '', params);
      return response as ICertificateResponse;
    },
    enabled: !!id,
    retry: 1
  });

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Indefinido";
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return "Não informado";
      }
      
      return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "Não informado";
    }
  };

  const handleCertificateClick = (certificateKey: string) => {
    navigate({ to: `/certificados/${certificateKey}` });
  };

  // Obter dados do primeiro certificado para informações do aluno
  const firstCertificate = certificatesData?.rows?.[0];
  const traineeData = firstCertificate?.trainee;
  const traineeName = traineeData?.name || nome.replace(/-/g, ' ');

  // Agrupar certificados por emissor
  const certificatesByCompany = certificatesData?.rows?.reduce((acc, cert) => {
    const companyId = cert.company?.id || 0;
    if (!acc[companyId]) {
      acc[companyId] = {
        company: cert.company,
        certificates: []
      };
    }
    acc[companyId].certificates.push(cert);
    return acc;
  }, {} as Record<number, { company?: ICompany, certificates: ICertificate[] }>);

  const companiesCount = Object.keys(certificatesByCompany || {}).length;

  if (isLoading) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
          <div className="text-center">
            <Icon name="loader-2" className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-gray-600">Carregando certificados...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (isError || !certificatesData || certificatesData.rows.length === 0) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
          <Card className="max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <Icon name="folder-x" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Nenhum certificado encontrado
              </h2>
              <p className="text-gray-600">
                Este aluno ainda não possui certificados publicados.
              </p>
              {error && (
                <p className="text-sm text-red-500 mt-2">
                  {error instanceof Error ? error.message : "Erro ao carregar certificados"}
                </p>
              )}
            </div>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header com informações do aluno */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                {traineeData?.imageUrl ? (
                  <AvatarImage 
                    src={traineeData.imageUrl} 
                    alt={traineeName} 
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(() => {
                    const nomes = traineeName.trim().split(" ");
                    if (nomes.length >= 2) {
                      return `${nomes[0].charAt(0).toUpperCase()}${nomes[1].charAt(0).toUpperCase()}`;
                    }
                    return traineeName.charAt(0).toUpperCase() + traineeName.charAt(1).toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{traineeName}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-gray-600">
                    {certificatesData.total} {certificatesData.total === 1 ? 'Credencial' : 'Credenciais'}
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {companiesCount} {companiesCount === 1 ? 'emissor' : 'emissores'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de certificados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {certificatesData.rows.map((certificate) => {
              const variables = decodeBase64Variables(certificate.variableToReplace) || {};
              const courseName = variables.curso_nome?.value || "Curso não informado";
              const company = certificate.company || {
                comercial_name: "Emissor não informado",
                logoUrl: null,
                faviconUrl: null
              };
              
              return (
                <Card 
                  key={certificate.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-white"
                  onClick={() => handleCertificateClick(certificate.key)}
                >
                  {/* Thumbnail do certificado */}
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <CertificateThumbnail
                      certificateData={{
                        id: certificate.id,
                        name: courseName,
                        fabricJsonFront: certificate.fabricJsonFront,
                        fabricJsonBack: certificate.fabricJsonBack,
                        certificateId: String(certificate.key),
                        canvasWidth: certificate.canvasWidth,
                        canvasHeight: certificate.canvasHeight
                      }}
                      variableToReplace={variables}
                      zoom={100}
                      showLoader={true}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Informações do certificado */}
                  <div className="p-4">
                    <h3 className="text-gray-900 text-base mb-1 line-clamp-2">
                      {courseName}
                    </h3>
                    <p className="text-sm font-light text-gray-600 mb-3">
                      {formatDate(certificate.createdAt)}
                    </p>
                    {/* Nome da empresa com avatar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <Avatar className="h-6 w-6 border border-gray-200 p-1">
                          <AvatarImage 
                            src={company.faviconUrl || company.logoUrl || ''} 
                            alt={company.comercial_name}
                          />
                          <AvatarFallback className="bg-gray-100 text-xs font-semibold text-gray-600">
                            {company.comercial_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Icon 
                          name="circle-check" 
                          className="absolute -top-0.5 -right-1 w-2.5 h-2.5 text-white bg-primary rounded-full"
                        />
                      </div>
                      <p className="text-base font-light text-gray-900">
                        {company.comercial_name}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default TraineeCertificatesPage;