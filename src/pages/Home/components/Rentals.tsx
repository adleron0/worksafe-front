import { Button } from "@/components/ui/button";
import {
  CheckCircle,
} from "lucide-react";

// Imagens Produtos Locação
import ConjuntoAutonomo from "../../../assets/images/locacao/conjunto-autonomo.webp";
import Detector from "../../../assets/images/locacao/detector.webp";
import Exaustor from "../../../assets/images/locacao/exaustor.webp";
import KitResgate from "../../../assets/images/locacao/kit-resgate.webp";
import MacaSked from "../../../assets/images/locacao/maca-sked.webp";
import Tripe from "../../../assets/images/locacao/tripe.webp";

interface RentalsProps {
  handleWhatsApp: (message?: string) => void;
  formatCurrency: (value: number) => string | undefined;
}

// Aluguel de Equipamentos
const rentals = [
  {
    name: "Conjunto Autônomo",
    image: ConjuntoAutonomo,
    period: "Diária/Mensal",
    features: [
      "EPR autônomo",
      "Cilindro de aço de 200 bar",
      "Capacidade de 7 litros de ar comprimido",
      "Circuito aberto com pressão positiva",
    ],
    price: 500,
    periodPrice: "dia",
  },
  {
    name: "Detector de Gases",
    image: Detector,
    period: "Diária/Semanal",
    features: [
      "Intrinsecamente seguro",
      "Fácil operação",
      "Certificado pelo INMETRO",
      "Ideal para monitorar o ar em espaços confinados",
    ],
    price: 350,
    periodPrice: "dia",
  },
  {
    name: "Exaustor para Espaços Confinados",
    image: Exaustor,
    period: "Diária/Mensal",
    features: [
      "Projetado para dispersar gases tóxicos",
      "Purifica a atmosfera em espaços confinados",
      "Alta eficiência e baixo consumo",
      "Certificação de segurança",
    ],
    price: 400,
    periodPrice: "dia",
  },
  {
    name: "Kit de Movimentação para Resgate",
    image: KitResgate,
    period: "Diária/Semanal",
    features: [
      "2 unid Polias Duplas",
      "1 unid Trava Quedas",
      "1 fita de encoragem",
      "10 unid Mosquetões Ovais",
      "1 Rolo 100mt Corda",
      "1 unid Saco Corda",
    ],
    price: 300,
    periodPrice: "semana",
  },
  {
    name: "Maca Sked para Resgate",
    image: MacaSked,
    period: "Diária/Mensal",
    features: [
      "Leve e resistente",
      "Fácil transporte",
      "Ideal para resgate",
      "Design ergonômico",
    ],
    price: 250,
    periodPrice: "dia",
  },
  {
    name: "Tripé de Movimentação",
    image: Tripe,
    period: "Diária/Semanal",
    features: [
      "Altura ajustável",
      "Capacidade: 500kg",
      "Com guincho",
      "Pernas telescópicas",
      "Base antiderrapante",
    ],
    price: 200,
    periodPrice: "dia",
  },
];

const Rentals: React.FC<RentalsProps> = ({ handleWhatsApp, formatCurrency }) => {
  return (
    <section id="aluguel" className="py-20 bg-white">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
        <div className="text-center mb-16">
          <h2 className="section-title text-gray-700 text-3xl md:text-5xl font-bold pb-4">
            Aluguel de Equipamentos
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Soluções completas para suas necessidades temporárias em trabalhos em altura e espaços confinados.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {rentals.map((rental, index) => (
            <div
              key={index}
              className="group relative flex flex-col h-full overflow-hidden rounded-2xl bg-white shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={rental.image}
                  alt={rental.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  width={400}
                  height={400}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent duration-500 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">{rental.name}</h3>
                  <p className="text-white/90 text-lg">{rental.period}</p>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-4">Características:</h4>
                  <ul className="space-y-3">
                    {rental.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 text-primary-light mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t pt-4 mt-auto">
                  {Number(rental.price) > 0 ? (
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-3xl font-bold bg-primary-light bg-clip-text text-transparent">
                        { formatCurrency(rental.price) }
                        <span className="text-sm font-light text-black">/{rental.periodPrice}</span>
                      </span>
                    </div>
                   ) :
                    (
                    <div className="flex flex-col items-center justify-between mb-4">
                      <span className="text-lg font-semibold text-primary-light">
                        Entre em contato
                      </span>
                      <span className="text-sm text-gray-500">
                        Disponibilidade e valores sob consulta!
                      </span>
                    </div>
                    )
                  }
                  <Button
                    className="w-full bg-black hover:bg-primary-light text-white transition-colors"
                    onClick={() =>
                      handleWhatsApp(
                        `Olá, gostaria de solicitar um Orçamento de Locação para ${rental.name}!`
                      )
                    }
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

export default Rentals;
