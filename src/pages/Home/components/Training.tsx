import {
  Star,
} from "lucide-react";

// Training Courses
import Brigada from "../../../assets/images/treinamentos/brigada.jpg";
import Nr35Trabalhador from "../../../assets/images/treinamentos/nr35-trabalhador.jpg";
import Nr35Liberador from "../../../assets/images/treinamentos/nr35-liberador.webp";
import Nr35Supervisor from "../../../assets/images/treinamentos/nr35-supervisor.jpg";
import NR11 from "../../../assets/images/treinamentos/nr-11.jpg";
import NR12 from "../../../assets/images/treinamentos/nr-12.png";
import NR20 from "../../../assets/images/treinamentos/nr-20.jpg";
import NR23 from "../../../assets/images/treinamentos/nr-23.webp";
import Nr33 from "../../../assets/images/treinamentos/nr-33.webp";
import Nr33Supervisor from "../../../assets/images/treinamentos/nr33-supervisor.webp";
import RTI from "../../../assets/images/treinamentos/resgate-industrial.webp";
import RTO from "../../../assets/images/treinamentos/resgate-operacional.webp";
import RTL from "../../../assets/images/treinamentos/resgate-lider.webp";
import RTC from "../../../assets/images/treinamentos/resgate-coordenador.jpg";
import N1 from "../../../assets/images/treinamentos/n1.webp";
import N2 from "../../../assets/images/treinamentos/n2.webp";
import N3 from "../../../assets/images/treinamentos/n3.jpg";

const courses = [
  {
    name: "Acesso por Corda - N1",
    flag: "N1 - Aneac",
    image: N1,
    duration: "48 horas",
    highlights: [
      "Apinismo Industrial N1",
      "Certificadora Internacional",
      "Aulas práticas",
      "Material incluso",
      "Instrutores especializados",
    ],
    nextDate: "sob consulta",
    price: 2600,
  },
  {
    name: "Acesso por Corda - N2",
    flag: "N2 - Aneac",
    image: N2,
    duration: "48 horas",
    highlights: [
      "Apinismo Industrial N2",
      "Certificadora Internacional",
      "Aulas práticas",
      "Material incluso",
      "Instrutores especializados",
    ],
    nextDate: "sob consulta",
    price: 2800,
  },
  {
    name: "Acesso por Corda - N3",
    flag: "N3 - Aneac",
    image: N3,
    duration: "48 horas",
    highlights: [
      "Apinismo Industrial N3",
      "Certificadora Internacional",
      "Aulas práticas",
      "Material incluso",
      "Instrutores especializados",
    ],
    nextDate: "sob consulta",
    price: 3000,
  },
  {
    name: "NR-35 Trabalho em Altura",
    flag: "Trabalhador",
    image: Nr35Trabalhador,
    duration: "8 horas",
    highlights: [
      "Trabalho em Altura - Versão Trabalhador",
      "Validade de 2 anos",
      "Aulas práticas",
      "Material incluso",
      "Instrutores especializados",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR-35 Trabalho em Altura",
    flag: "Liberador",
    image: Nr35Liberador,
    duration: "16 horas",
    highlights: [
      "Trabalho em Altura - Versão Liberador",
      "Validade de 2 anos",
      "Aulas práticas",
      "Material incluso",
      "Instrutores especializados",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR-35 Trabalho em Altura",
    flag: "Supervisor",
    image: Nr35Supervisor,
    duration: "40 horas",
    highlights: [
      "Trabalho em Altura - Versão Supervisor",
      "Validade de 2 anos",
      "Aulas práticas",
      "Material incluso",
      "Instrutores especializados",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR-33 Espaço Confinado",
    flag: "Trabalhador e Vigia",
    image: Nr33,
    duration: "16 horas",
    highlights: [
      "Trabalhador e Vigia",
      "Certificado MTE",
      "Simulações reais",
      "EPIs fornecidos",
      "Avaliação prática",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR-33 Espaço Confinado",
    flag: "Supervisor",
    image: Nr33Supervisor,
    duration: "40 horas",
    highlights: [
      "Supervisor",
      "Certificado MTE",
      "Simulações reais",
      "EPIs fornecidos",
      "Avaliação prática",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "Brigada de Incêndio",
    image: Brigada,
    duration: "56 a 80 horas",
    highlights: [
      "Brigada de Incêndio - Norma atualizada",
      "Prática com fogo real",
      "Primeiros socorros",
      "Certificação civil",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "Resgate Técnico Industrial",
    flag: "Industrial - RPL",
    image: RTI,
    duration: "24 horas",
    highlights: [
      "Nível básico de qualificação em resgate",
      "Participa de resgates limitados em altura e espaços confinados",
      "Utiliza sistemas de proteção individual para restrição de movimentação e retenção de quedas",
      "Deslocamento seguro com posicionamento vertical simples",
      "Emprego restrito de sistemas pré-engenharia ou pré-montados"
    ],
    nextDate: "sob consulta",
    price: 650,
  },
  {
    name: "Resgate Operacional",
    flag: "Operacional - RPL",
    image: RTO,
    duration: "48 horas",
    highlights: [
      "Nível inicial de qualificação em resgate",
      "Participa de resgates em altura e espaços confinados",
      "Utiliza sistemas de proteção individual para movimentação vertical",
      "Emprega sistemas montados de vantagem mecânica e resgate pré-montado",
      "Execução de progressões diversas com corda, mecânica e elétrica"
    ],
    nextDate: "sob consulta",
    price: 850,
  },
  {
    name: "Resgate Líder",
    flag: "Líder - RPL",
    image: RTL,
    duration: "48 horas",
    highlights: [
      "Nível intermediário de qualificação em resgate",
      "Atua em resgates em qualquer nível de altura",
      "Realiza movimentação básica de vítimas com ou sem macas",
      "Emprego de sistemas montados de vantagem mecânica e pré-montados",
      "Acesso autônomo por técnicas de progressões diversas"
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "Resgate Coordenador",
    flag: "Coordenador - RPL",
    image: RTC,
    duration: "48 horas",
    highlights: [
      "Nível avançado de qualificação em resgate",
      "Coordena operações de resgate presencialmente",
      "Planeja e dimensiona operações de resgate por corda",
      "Estabelece funções e designa responsabilidades na operação",
      "Atua em resgates de alta complexidade e avançados em suspensão"
    ],
    nextDate: "sob consulta",
    price: 0,
  },  
  {
    name: "NR11 - Transporte, Movimentação, Armazenagem e Manuseio de Materiais",
    image: NR11,
    duration: "8 a 24 horas",
    highlights: [
      "NR11 - Abordagem completa das normas de segurança",
      "Treinamento teórico e prático",
      "Conteúdo atualizado",
      "Certificação reconhecida",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR-12 - Segurança no Trabalho em Máquinas e Equipamentos",
    image: NR12,
    duration: "8 a 16 horas",
    highlights: [
      "NR-12 - Técnicas avançadas em segurança",
      "Equipamento especializado",
      "Simulações reais",
      "Certificado internacional",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR20 - Líquidos, Combustíveis e Inflamáveis",
    image: NR20,
    duration: "16 a 40 horas",
    highlights: [
      "NR20 - Procedimentos de segurança com inflamáveis",
      "Análise de riscos e medidas preventivas",
      "Treinamento prático com cenários reais",
      "Certificação conforme regulamentação",
    ],
    nextDate: "sob consulta",
    price: 0,
  },
  {
    name: "NR23 - Proteção Contra Incêndios",
    image: NR23,
    duration: "16 a 40 horas",
    highlights: [
      "NR23 - Técnicas de prevenção e combate a incêndios",
      "Procedimentos de evacuação e emergência",
      "Simulações práticas e treinamento realista",
      "Certificação reconhecida",
    ],
    nextDate: "sob consulta",
    price: 0,
  }
];

interface TrainingProps {
  formatCurrency: (value: number) => string | undefined;
}

const Training: React.FC<TrainingProps> = ({ formatCurrency }) => {

  return (
    <section id="treinamentos" className="py-20 bg-gray-50">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-center mb-16">
          <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
            Treinamentos
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Capacitação profissional em normas regulamentadoras e procedimentos de emergência.
          </p>
        </div>

        {/* Grid de Cursos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course, index) => (
              <div
                key={index}
                className="border rounded-xl shadow-lg p-4 bg-white cursor-pointer transition-transform hover:scale-105"
              >
                <div className="relative h-48 w-full rounded-xl overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.name}
                    className="transition-transform duration-500"
                  />
                  <div className="absolute top-1 left-1 flex gap-2 items-center px-2 py-1 h-6 text-xs bg-green-100 rounded-full">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/>
                    <span>Disponível</span>
                  </div>
                  {course.flag && (
                    <div className="absolute bottom-1 right-1 bg-primary-light text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {course.flag}
                    </div>
                  )}
                </div>
                <h3 className="mt-4 font-bold text-lg bg-primary-light bg-clip-text text-transparent">{course.name}</h3>
                <p className="text-gray-600">{course.duration}</p>
                {course.price > 0 ? (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Investimento</span>
                      <span className="text-xl font-bold text-primary-light">{formatCurrency(course.price)}</span>
                    </div>
                    <Star className="w-5 h-5 text-primary-light" />
                  </div>
                ) : (
                  <p className="text-gray-600 font-semibold mt-2 italic">valores sob consulta</p>
                )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Training;
