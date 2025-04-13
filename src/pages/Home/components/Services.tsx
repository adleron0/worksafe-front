import { Button } from "@/components/ui/button";
import {
  CheckCircle,
} from "lucide-react";

// Imagens Serviços
// import Altura from "../../assets/images/altura.jpg";
import Confinado from "../../../assets/images/confinado.jpg";
import Resgate from "../../../assets/images/resgate.jpg";
import LinhaDeVida from "../../../assets/images/linha-de-vida.jpg";
import Eolica from "../../../assets/images/eolica.webp";

// Imagens Hero Slides
// comenta algo
import Altura2 from "../../../assets/images/altura-2.jpg";
// import Equipamentos from "../../assets/images/equipamentos.jpg";
// import Treinamento from "../../assets/images/treinamento.jpg";
// import Resgate2 from "../../assets/images/resgate-2.jpg";

// Imagens do About
import AboutImage1 from "../../../assets/images/fundador-1.webp";

// Serviços
const services = [
  {
    name: "Serviços em Altura",
    image: Altura2,
    features: [
      "Alpinismo Industrial",
      "Limpeza de fachadas e telhados",
      "Serviços de impermeabilização",
      "Manutenção de estruturas",
      "Pintura industrial",
      "Instalação de equipamentos",
      "Montagem de Pontos de Ancoragem",
    ],
  },
  {
    name: "Espaços Confinados",
    image: Confinado,
    features: [
      "Inspeção de tanques",
      "Limpeza de silos e tanques",
      "Manutenção de caldeiras",
      "Resgate em confinados",
    ],
  },
  {
    name: "Resgate de Prontidão",
    image: Resgate,
    features: [
      "Equipe 24/7",
      "Profissionais certificados",
      "Equipamentos especializados",
      "Plano de resgate",
    ],
  },
  {
    name: "Linha de Vida Temporária",
    image: LinhaDeVida,
    features: [
      "Instalação rápida e segura",
      "Sistemas moduláveis conforme necessidade",
      "Monitoramento contínuo",
      "Suporte técnico especializado",
    ],
  },
  {
    name: "Manutenção de Torre Eólica",
    image: Eolica,
    features: [
      "Monitoramento contínuo com foco em segurança",
      "Equipe certificada GWO para alpinismo em torres eólicas",
      "Procedimentos rigorosos de segurança em parques eólicos",
      "Sistemas moduláveis com inspeção especializada",
    ],
  },
  {
    name: "Supervisão Remota",
    image: AboutImage1,
    features: [
      "Acompanhamento remoto por Profissional N3",
      "Elaboração de planos de segurança",
      "Plano de execusão para atividades em altura",
      "Procedimentos de emergencia",
      "Plano de resgate e sistema de proteção contra quedas",
    ],
  },
];

interface ServicesProps {
  handleWhatsApp: (message?: string) => void;
}

const Services: React.FC<ServicesProps> = ({ handleWhatsApp }) => {
  return (
    <section className="py-20 bg-gray-50" id="servicos">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
        <div className="text-center mb-16">
          <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
            Nossos Serviços
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Soluções especializadas para trabalhos em altura, espaços confinados e resgate.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={`service-${index}`}
              className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg group hover:-translate-y-2 transition-all duration-300"
            >
              <div className="aspect-[4/3] relative">
                <div className="absolute inset-0 bg-cover bg-center">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent duration-500 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">{service.name}</h3>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <ul className="space-y-3">
                  {service.features.map((feature, idx) => (
                    <li key={`services-features-${idx}`} className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-primary-light mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button
                    className="w-full mt-6 bg-black hover:bg-primary-light text-white transition-colors"
                    onClick={() => handleWhatsApp()}
                  >
                    Solicitar Orçamento
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
