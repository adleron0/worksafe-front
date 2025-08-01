import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/general-interfaces/api.interface";
import { IEntity } from "@/pages/_authenticated/site/_servicos/-interfaces/entity.interface";
import { get } from "@/services/api";

// Imagens Serviços
// import Altura from "../../assets/images/altura.jpg";
// import Confinado from "../../../assets/images/confinado.jpg";
// import Resgate from "../../../assets/images/resgate.jpg";
// import LinhaDeVida from "../../../assets/images/linha-de-vida.jpg";
// import Eolica from "../../../assets/images/eolica.webp";

// Imagens Hero Slides
// comenta algo
// import Altura2 from "../../../assets/images/altura-2.jpg";
// import Equipamentos from "../../assets/images/equipamentos.jpg";
// import Treinamento from "../../assets/images/treinamento.jpg";
// import Resgate2 from "../../assets/images/resgate-2.jpg";

// Imagens do About
// import AboutImage1 from "../../../assets/images/fundador-1.webp";

// Serviços
// const services = [
//   {
//     name: "Serviços em Altura",
//     image: Altura2,
//     features: [
//       "Alpinismo Industrial",
//       "Limpeza de fachadas e telhados",
//       "Serviços de impermeabilização",
//       "Manutenção de estruturas",
//       "Pintura industrial",
//       "Instalação de equipamentos",
//       "Montagem de Pontos de Ancoragem",
//     ],
//   },
//   {
//     name: "Espaços Confinados",
//     image: Confinado,
//     features: [
//       "Inspeção de tanques",
//       "Limpeza de silos e tanques",
//       "Manutenção de caldeiras",
//       "Resgate em confinados",
//     ],
//   },
//   {
//     name: "Resgate de Prontidão",
//     image: Resgate,
//     features: [
//       "Equipe 24/7",
//       "Profissionais certificados",
//       "Equipamentos especializados",
//       "Plano de resgate",
//     ],
//   },
//   {
//     name: "Linha de Vida Temporária",
//     image: LinhaDeVida,
//     features: [
//       "Instalação rápida e segura",
//       "Sistemas moduláveis conforme necessidade",
//       "Monitoramento contínuo",
//       "Suporte técnico especializado",
//     ],
//   },
//   {
//     name: "Manutenção de Torre Eólica",
//     image: Eolica,
//     features: [
//       "Monitoramento contínuo com foco em segurança",
//       "Equipe certificada GWO para alpinismo em torres eólicas",
//       "Procedimentos rigorosos de segurança em parques eólicos",
//       "Sistemas moduláveis com inspeção especializada",
//     ],
//   },
//   {
//     name: "Supervisão Remota",
//     image: AboutImage1,
//     features: [
//       "Acompanhamento remoto por Profissional N3",
//       "Elaboração de planos de segurança",
//       "Plano de execusão para atividades em altura",
//       "Procedimentos de emergencia",
//       "Plano de resgate e sistema de proteção contra quedas",
//     ],
//   },
// ];

interface ServicesProps {
  handleWhatsApp: (message?: string) => void;
}

const Services: React.FC<ServicesProps> = ({ handleWhatsApp }) => {
  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { 
    data, 
    isLoading, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: ["listSiteServices"],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ]
      return get('site-services', '', params);
    },
  });

  return (
    <section className="py-15 md:py-20 bg-gray-50" id="servicos">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="section-title text-gray-800 text-3xl md:text-5xl font-bold md:pb-4">
            Nossos Serviços
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Soluções especializadas para trabalhos em altura, espaços confinados e resgate.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-8">
          {isLoading ? (
            // Render skeleton cards
            Array(3).fill(0).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg"
              >
                <div className="aspect-[4/3] relative">
                  <Skeleton className="absolute inset-0 h-full w-full" />
                </div>
                <div className="p-2 md:p-6 flex flex-col flex-grow">
                  <ul className="space-y-3">
                    {Array(4).fill(0).map((_, idx) => (
                      <li key={`skeleton-feature-${idx}`} className="flex items-center">
                        <Skeleton className="w-5 h-5 mr-2 flex-shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-full" />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Skeleton className="w-full h-10 mt-6" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            data?.rows?.map((service, index) => (
            <div
              key={`service-${index}`}
              className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg group hover:-translate-y-2 transition-all duration-300"
            >
              <div className="aspect-[4/3] relative">
                <div className="absolute inset-0 bg-cover bg-center">
                  <img
                    src={service.imageUrl || ""}
                    alt={service.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform ease-in-out duration-500 grayscale group-hover:grayscale-0 group-hover:scale-110"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent duration-500 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-6 text-white">
                  <h3 className="text-sm md:text-2xl font-bold mb-2">{service.name}</h3>
                </div>
              </div>
              <div className="p-2 md:p-6 flex flex-col flex-grow">
                <ul className="space-y-1 md:space-y-2">
                  {service.features?.split('#').map((feature: string, idx: number) => (
                    <li key={`services-features-${idx}`} className="flex text-xs md:text-sm items-start md:items-center text-gray-700">
                      <CheckCircle className="w-2.5 md:w-4 h-2.5 md:h-4 text-primary-light mr-2 mt-1 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button
                    className="w-full text-xs md:text-base mt-6 bg-black hover:bg-primary-light text-white transition-colors"
                    onClick={() => handleWhatsApp()}
                  >
                    Solicitar Orçamento
                  </Button>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
