import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublic } from "@/services/publicApi";
import { Loader2, Award, Calendar, User, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import NavBar from "../-components/NavBar";
import Footer from "../-components/Footer";
import Pagination from "@/components/general-components/Pagination";

export const Route = createFileRoute("/_index/certificados/")({
  component: CertificadosPublicos,
});

// Interface para o certificado
interface ICertificate {
  id: number;
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

function CertificadosPublicos() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [page, setPage] = useState(0);
  const limit = 12;

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
    queryKey: [`certificates-list-${page}`],
    queryFn: async () => {
      const params = [
        { key: 'active', value: 'true' },
        { key: 'order-createdAt', value: 'desc' },
        { key: 'page', value: page.toString() },
        { key: 'limit', value: limit.toString() }
      ];
      
      const response = await getPublic('trainee-certificate', '', params);
      return response as ICertificateResponse;
    },
    retry: 1
  });

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    
    try {
      // Se já está no formato dd/MM/yyyy, retorna como está
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        return date;
      }
      
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Verifica se a data é válida
      if (isNaN(dateObj.getTime())) {
        return "—";
      }
      
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", date, error);
      return "—";
    }
  };

  if (isLoading) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-white pt-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary-light mb-4" />
            <p className="text-gray-600">Carregando certificados...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
        <div className="min-h-screen flex items-center justify-center bg-white pt-20">
          <div className="bg-white rounded-lg border border-gray-200 max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <p className="text-gray-600">
                Erro ao carregar certificados. Tente novamente mais tarde.
              </p>
              {error && (
                <p className="text-sm text-red-500 mt-2">
                  {error instanceof Error ? error.message : "Erro desconhecido"}
                </p>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const certificates = certificatesData?.rows || [];

  return (
    <>
      <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />
      <div className="min-h-screen bg-white pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary-light/10 rounded-full">
                <GraduationCap className="w-8 h-8 text-primary-light" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Certificados Emitidos
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Consulte os certificados emitidos pela nossa instituição. 
              Clique em qualquer certificado para verificar sua autenticidade e visualizar os detalhes completos.
            </p>
            {certificatesData?.total && (
              <p className="text-sm text-gray-500 mt-2">
                Total de {certificatesData.total} certificados emitidos
              </p>
            )}
          </div>

          {/* Lista de Certificados */}
          {certificates.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-center">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum certificado encontrado</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header da tabela - Desktop */}
                <div className="hidden md:block bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div className="col-span-1">Código</div>
                    <div className="col-span-3">Aluno</div>
                    <div className="col-span-3">Curso</div>
                    <div className="col-span-2">Turma</div>
                    <div className="col-span-2">Conclusão</div>
                    <div className="col-span-1"></div>
                  </div>
                </div>

                {/* Lista de itens */}
                <div className="divide-y divide-gray-200">
                  {certificates.map((certificate) => {
                    const variables = certificate.variableToReplace || {};
                    
                    return (
                      <div 
                        key={certificate.id}
                        className="px-4 md:px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => navigate({ to: `/certificados/${certificate.id}` })}
                      >
                        {/* Desktop View */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                          {/* Código */}
                          <div className="col-span-1">
                            <span className="text-xs font-mono text-gray-600">
                              #{variables.certificado_codigo?.value?.slice(-6) || certificate.id}
                            </span>
                          </div>

                          {/* Nome do Aluno */}
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {variables.aluno_nome?.value || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Curso */}
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <p className="text-sm text-gray-700 truncate">
                                {variables.curso_nome?.value || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Turma */}
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600 truncate">
                              {variables.turma_nome?.value || "—"}
                            </p>
                          </div>

                          {/* Data de Conclusão */}
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <p className="text-sm text-gray-600">
                                {formatDate(variables.certificado_emissao?.value || certificate.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Ação */}
                          <div className="col-span-1 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-primary-light hover:text-primary-light hover:bg-primary-light/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate({ to: `/certificados/${certificate.id}` });
                              }}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-gray-500">
                              #{variables.certificado_codigo?.value?.slice(-6) || certificate.id}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(variables.certificado_emissao?.value || certificate.createdAt)}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 text-sm mb-1">
                            {variables.aluno_nome?.value || "—"}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            {variables.curso_nome?.value || "—"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Turma: {variables.turma_nome?.value || "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Paginação */}
              {certificatesData?.total && certificatesData.total > 0 && (
                <div className="mt-8 w-full">
                  <div className="flex flex-col items-center gap-2
                    [&_*]:text-gray-600 
                    [&_button]:text-gray-600 
                    [&_button]:bg-white 
                    [&_button]:border-gray-300 
                    [&_button:hover]:text-gray-900 
                    [&_button:hover]:bg-gray-50 
                    [&_button:disabled]:text-gray-400 
                    [&_.text-muted-foreground]:text-gray-500 
                    [&_a[aria-current='page']]:!bg-primary-light 
                    [&_a[aria-current='page']]:!text-white 
                    [&_a[aria-current='page']]:!border-primary-light
                    [&_button[aria-current='page']]:!bg-primary-light 
                    [&_button[aria-current='page']]:!text-white 
                    [&_button[aria-current='page']]:!border-primary-light
                    [&_a[data-state='active']]:!bg-primary-light 
                    [&_a[data-state='active']]:!text-white 
                    [&_a[data-state='active']]:!border-primary-light
                    [&_.bg-foreground]:!bg-primary-light
                    [&_.bg-foreground]:!text-white
                    [&_.bg-primary]:!bg-primary-light
                    [&_.bg-primary]:!text-white
                    [&_.dark\\:bg-primary]:!bg-primary-light
                    [&_.dark\\:bg-primary]:!text-white
                  ">
                    <Pagination
                      totalItems={certificatesData.total}
                      itemsPerPage={limit}
                      currentPage={page}
                      onPageChange={setPage}
                      maxVisiblePages={5}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default CertificadosPublicos;