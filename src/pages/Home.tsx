import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import RotatingText from "@/components/ui-bits/RotatingText/RotatingText";
import Icon from "@/components/general-components/Icon";
import {
  Phone,
  MessageCircleMore,
  ShoppingCart,
  ArrowRight,
  Plus,
  Minus,
  Shield,
  Award,
  Clock,
  Users,
  X,
  ChevronRight,
  Star,
  CheckCircle,
  ArrowUpRight,
  Trash,
  ChevronDown,
} from "lucide-react";

// Calcula anos
const foundationYear = 2018;
const yearsOfExperience = new Date().getFullYear() - foundationYear;

// Logo
import Logo from "@/components/general-components/Logo";

// Video Hero
import HeroVideo from "../assets/video-website-header.mp4";

// Video Treinamento
const TreinamentoVideo = "/assets/videos/treinamento.mp4";

// Imagens do About
import AboutImage1 from "../assets/images/fundador-1.webp";
import AboutImage2 from "../assets/images/fundador-2.webp";

// Imagens Serviços
// import Altura from "../assets/images/altura.jpg";
import Confinado from "../assets/images/confinado.jpg";
import Resgate from "../assets/images/resgate.jpg";
import LinhaDeVida from "../assets/images/linha-de-vida.jpg";
import Eolica from "../assets/images/eolica.webp";

// Imagens Hero Slides
// comenta algo
import Altura2 from "../assets/images/altura-2.jpg";
// import Equipamentos from "../assets/images/equipamentos.jpg";
// import Treinamento from "../assets/images/treinamento.jpg";
// import Resgate2 from "../assets/images/resgate-2.jpg";

// Hero Slides
// const slides = [
//   {
//     image: Altura,
//     title: "Especialistas em Trabalho em Altura",
//     subtitle: "Segurança e qualidade em cada projeto",
//     highlight: `${yearsOfExperience}+ anos de experiência`,
//   },
//   {
//     image: Resgate2,
//     title: "Equipe de Resgate de Prontidão",
//     subtitle: "Expertise na segurança em Altura e Espaços Confinados",
//     highlight: `Atendimento 24h`,
//   },
//   {
//     image: Equipamentos,
//     title: "Equipamentos Certificados",
//     subtitle: "As melhores marcas do mercado",
//     highlight: "100% certificados",
//   },
//   {
//     image: Treinamento,
//     title: "Treinamentos Especializados",
//     subtitle: "Capacitação em Acesso por Cordas e NBRs diversas",
//     highlight: "1000+ profissionais treinados",
//   },
// ];

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

// Produto Destaque Venda
import Corda11 from "../assets/images/equipamentos/corda-11.webp";
const featuredProduct = {
  id: "corda-11-mm",
  name: "Corda de 11mm Para Trabalho em Altura e Resgate",
  image: Corda11,
  price: 2499.9,
  oldPrice: 2999.9,
  description:
    "A corda semi-estática de 11mm é de alta performance, garantindo segurança para trabalho ou esportes em altura. Possui certificações NR 18 e NBR 15986, construída com alma e capa para máxima resistência e durabilidade.",
  features: [
    "Diâmetro: 11mm",
    "Carga Mínima de Ruptura: 36kN",
    "Alongamento (E): 3,2%",
    "Peso: 100 g/m (20 kg/200 m)",
    "Conforme NR 35, ABNT NBR 15986 e EN 1891",
  ],
};

// Imagens de Equipamentos para Venda
import AscensorDePunho from "../assets/images/equipamentos/ascensor-de-punho.webp";
import Capacete from "../assets/images/equipamentos/capacete.webp";
import Cinto7y from "../assets/images/equipamentos/cinto-7y.webp";
import DescensorAutoblocante from "../assets/images/equipamentos/descensor-autoblocante.webp";
import FitaAncoragem from "../assets/images/equipamentos/fita-ancoragem.webp";
import LoryAutoBlocante from "../assets/images/equipamentos/lory-auto-blocante.webp";
import MosquetaoOvalAco from "../assets/images/equipamentos/mosquetao-oval-aco.webp";
import OlhalAncoragemPredial from "../assets/images/equipamentos/olhal-ancoragem-predial.webp";
import PoliaDupla from "../assets/images/equipamentos/polia-dupla.webp";
import PoliaSimples from "../assets/images/equipamentos/polia-simples.webp";
import TalabarteY from "../assets/images/equipamentos/talabarte-y.webp";
import TravaQuedasCordaAbs from "../assets/images/equipamentos/trava-quedas-corda-abs.webp";
import TravaQuedasRetratil from "../assets/images/equipamentos/trava-quedas-retratil.webp";
import Mochila from "../assets/images/equipamentos/mochila-equipamentos.webp";

// Produtos para Venda
const products = [
  {
    id: "ascensor-de-punho",
    name: "Ascensor de Punho",
    image: AscensorDePunho,
    price: 289.9,
    oldPrice: 329.9,
    description:
      "Facilita a ascensão em cordas com bloqueio seguro e manuseio simples.",
    rating: 4.8,
    reviews: 47,
    inStock: true,
  },
  {
    id: "capacete-01",
    name: "Capacete de Segurança Tipo III  Classe A",
    image: Capacete,
    price: 189.9,
    oldPrice: 219.9,
    description:
      "Utilizado como EPI no trabalhos em altura e espaços confinados na construção civil, petroquímica, mineração, agroindústria, dentre outras.",
    rating: 4.9,
    reviews: 93,
    inStock: true,
  },
  {
    id: "cinto-7y",
    name: "Cinto Paraquedista 7Y",
    image: Cinto7y,
    price: 449.9,
    oldPrice: 499.9,
    description:
      "Cinto completo com múltiplos pontos de conexão para maior segurança.",
    rating: 4.7,
    reviews: 182,
    inStock: true,
  },
  {
    id: "descensor-autoblocante",
    name: "Descensor Autoblocante",
    image: DescensorAutoblocante,
    price: 349.9,
    oldPrice: 399.9,
    description:
      "Permite descida controlada e bloqueio automático para trabalhos em altura.",
    rating: 4.8,
    reviews: 76,
    inStock: true,
  },
  {
    id: "mochila",
    name: "Mochila de Equipamentos",
    image: Mochila,
    price: 149.9,
    oldPrice: 199.9,
    description:
      "Mochila de equipamentos para armazenamento de materiais e equipamentos.",
    rating: 4.8,
    reviews: 76,
    inStock: true,
  },
  {
    id: "fita-ancoragem",
    name: "Fita Anelar de Ancoragem",
    image: FitaAncoragem,
    price: 129.9,
    oldPrice: 159.9,
    description:
      "Fita completa com múltiplos pontos de conexão para maior segurança.",
    rating: 4.6,
    reviews: 38,
    inStock: true,
  },
  {
    id: "lory-auto-blocante",
    name: "Lory Auto Blocante",
    image: LoryAutoBlocante,
    price: 399.9,
    oldPrice: 449.9,
    description:
      "Descensor auto-blocante LORY SAFE com função anti-pânico, ideal para atividades em acesso por cordas, rapel e escalada.",
    rating: 4.9,
    reviews: 91,
    inStock: true,
  },
  {
    id: "mosquetao-oval-aco",
    name: "Mosquetão Oval de Aço",
    image: MosquetaoOvalAco,
    price: 54.9,
    oldPrice: 69.9,
    description:
      "Mosquetão oval em aço para conexões seguras em qualquer situação.",
    rating: 4.8,
    reviews: 52,
    inStock: true,
  },
  {
    id: "olhal-ancoragem-predial",
    name: "Olhal de Ancoragem",
    image: OlhalAncoragemPredial,
    price: 69.9,
    oldPrice: 79.9,
    description:
      "Projetado para ancoragens prediais e linhas de vida, resistente e durável.",
    rating: 4.7,
    reviews: 63,
    inStock: true,
  },
  {
    id: "polia-dupla",
    name: "Polia Dupla",
    image: PoliaDupla,
    price: 149.9,
    oldPrice: 179.9,
    description:
      "Ideal para sistemas de redução de força e resgates em altura.",
    rating: 4.8,
    reviews: 40,
    inStock: true,
  },
  {
    id: "polia-simples",
    name: "Polia Simples",
    image: PoliaSimples,
    price: 99.9,
    oldPrice: 119.9,
    description:
      "Polia de uso geral para aplicações de içamento e desvio de carga.",
    rating: 4.6,
    reviews: 28,
    inStock: true,
  },
  {
    id: "talabarte-y",
    name: "Talabarte em Y",
    image: TalabarteY,
    price: 229.9,
    oldPrice: 259.9,
    description:
      "Talabarte versátil em Y para movimentação segura em estruturas.",
    rating: 4.7,
    reviews: 65,
    inStock: true,
  },
  {
    id: "trava-quedas-corda-abs",
    name: "Trava-Quedas para Corda ABS",
    image: TravaQuedasCordaAbs,
    price: 279.9,
    oldPrice: 319.9,
    description:
      "Bloqueio automático em cordas, garantindo segurança e praticidade.",
    rating: 4.8,
    reviews: 55,
    inStock: true,
  },
  {
    id: "trava-quedas-retratil",
    name: "Trava-Quedas Retrátil",
    image: TravaQuedasRetratil,
    price: 759.9,
    oldPrice: 849.9,
    description:
      "Dispositivo retrátil de segurança para total liberdade de movimento.",
    rating: 4.9,
    reviews: 112,
    inStock: true,
  },
];

// Imagens Produtos Locação
import ConjuntoAutonomo from "../assets/images/locacao/conjunto-autonomo.webp";
import Detector from "../assets/images/locacao/detector.webp";
import Exaustor from "../assets/images/locacao/exaustor.webp";
import KitResgate from "../assets/images/locacao/kit-resgate.webp";
import MacaSked from "../assets/images/locacao/maca-sked.webp";
import Tripe from "../assets/images/locacao/tripe.webp";

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

// Training Courses
import Brigada from "../assets/images/treinamentos/brigada.jpg";
import Nr35Trabalhador from "../assets/images/treinamentos/nr35-trabalhador.jpg";
import Nr35Liberador from "../assets/images/treinamentos/nr35-liberador.webp";
import Nr35Supervisor from "../assets/images/treinamentos/nr35-supervisor.jpg";
import NR11 from "../assets/images/treinamentos/nr-11.jpg";
import NR12 from "../assets/images/treinamentos/nr-12.png";
import NR20 from "../assets/images/treinamentos/nr-20.jpg";
import NR23 from "../assets/images/treinamentos/nr-23.webp";
import Nr33 from "../assets/images/treinamentos/nr-33.webp";
import Nr33Supervisor from "../assets/images/treinamentos/nr33-supervisor.webp";
import RTI from "../assets/images/treinamentos/resgate-industrial.webp";
import RTO from "../assets/images/treinamentos/resgate-operacional.webp";
import RTL from "../assets/images/treinamentos/resgate-lider.webp";
import RTC from "../assets/images/treinamentos/resgate-coordenador.jpg";
import N1 from "../assets/images/treinamentos/n1.webp";
import N2 from "../assets/images/treinamentos/n2.webp";
import N3 from "../assets/images/treinamentos/n3.jpg";

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

// Imagens Clientes
import AlagoasAmbiental from "../assets/images/clientes/alagoas-ambiental.png";
import AmbiparLogo from "../assets/images/clientes/ambipar-logo.png";
import Braskem from "../assets/images/clientes/braskem.png";
import Petrobras from "../assets/images/clientes/petrobras.png";
import Prevenir from "../assets/images/clientes/prevenir.png";
import RipAlagoas from "../assets/images/clientes/rip-alagoas.png";

// Client Logos
const clients = [
  {
    name: "Alagoas Ambiental",
    logo: AlagoasAmbiental,
  },
  {
    name: "Ambipar",
    logo: AmbiparLogo,
  },
  {
    name: "Braskem",
    logo: Braskem,
  },
  {
    name: "Petrobras",
    logo: Petrobras,
  },
  {
    name: "Prevenir",
    logo: Prevenir,
  },
  {
    name: "RIP Kaefer",
    logo: RipAlagoas,
  },
];

// FAQ treinamentos
const faqs = [
  {
    question: "Quais são os pré-requisitos para se inscrever em um curso?",
    answer:
      "Os pré-requisitos podem variar de curso para curso, mas geralmente exigem conhecimento básico sobre normas de segurança e, em alguns casos, experiência na área. Confira a descrição de cada curso para mais detalhes.",
  },
  {
    question: "Os cursos possuem certificado?",
    answer:
      "Sim, todos os cursos incluem certificado de participação, reconhecido pelo MTE e demais órgãos competentes.",
  },
  {
    question: "Qual é a validade dos certificados?",
    answer:
      "A validade dos certificados varia conforme o curso. Por exemplo, o certificado do curso NR-35 tem validade de 2 anos. Verifique as informações específicas de cada curso.",
  },
  {
    question: "Como faço para me inscrever em um curso?",
    answer:
      "Você pode se inscrever entrando em contato pelo WhatsApp. Utilize o botão de inscrição presente na seção de cada curso para iniciar o processo.",
  },
  {
    question: "Há turmas programadas regularmente?",
    answer:
      "Sim, oferecemos turmas periódicas. As datas das turmas, incluindo as dos cursos NR-35, NR-33, Alpinismo Industrial, RTI e Bombeiro Civil, devem ser consultadas entrando em contato conosco.",
  },
  {
    question: "O que é abordado no curso NR-35?",
    answer:
      "O curso NR-35 trata de trabalhos em altura, abordando desde os fundamentos da segurança até técnicas práticas para prevenção de quedas. É voltado para trabalhadores e supervisores, e as datas das turmas devem ser consultadas conosco.",
  },
  {
    question: "Quais as diferenças entre os cursos NR-35 e NR-33?",
    answer:
      "Enquanto o NR-35 foca em trabalhos em altura, o NR-33 é direcionado para atividades em espaços confinados, incluindo aspectos de ventilação, sinalização e procedimentos de emergência. Para ambas as datas e detalhes, entre em contato conosco.",
  },
  {
    question: "O que é ensinado no curso de Alpinismo Industrial?",
    answer:
      "O curso de Alpinismo Industrial aborda técnicas de acesso por cordas para manutenção e inspeção em estruturas elevadas, enfatizando a segurança e o uso correto dos equipamentos. Consulte-nos para obter informações sobre as datas das turmas.",
  },
  {
    question: "Quais são os conteúdos do curso RTI (Resgate Técnico Industrial)?",
    answer:
      "O curso RTI capacita os participantes em procedimentos de resgate técnico, combinando teoria e prática com simulações reais de emergência. Para saber mais sobre a disponibilidade das turmas, entre em contato conosco.",
  },
];


// Testimonials
// const testimonials = [
//   {
//     name: "João Silva",
//     company: "Construtora ABC",
//     role: "Gerente de Segurança",
//     image:
//       "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200",
//     video: "https://www.youtube.com/embed/your-video-id-1",
//     text: "A RTL transformou nossa abordagem em segurança do trabalho. Os treinamentos são excepcionais.",
//   },
//   {
//     name: "Maria Santos",
//     company: "Indústria XYZ",
//     role: "Coordenadora de EHS",
//     image:
//       "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200",
//     video: "https://www.youtube.com/embed/your-video-id-2",
//     text: "Equipamentos de alta qualidade e suporte técnico incomparável. Recomendo fortemente.",
//   },
//   {
//     name: "Pedro Costa",
//     company: "Engenharia Beta",
//     role: "Diretor de Operações",
//     image:
//       "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200",
//     video: "https://www.youtube.com/embed/your-video-id-3",
//     text: "Parceria que faz diferença. Profissionalismo em cada detalhe dos serviços prestados.",
//   },
// ];

// Features
const features = [
  {
    icon: Shield,
    title: "Segurança Garantida",
    description: "Equipamentos certificados e profissionais qualificados",
  },
  {
    icon: Award,
    title: "Certificações",
    description: "Credenciamento em diversas normas técnicas",
  },
  {
    icon: Clock,
    title: "Atendimento 24/7",
    description: "Atendimento emergencial disponível 24h",
  },
  {
    icon: Users,
    title: "Equipe Especializada",
    description: "Profissionais com vasta experiência no setor",
  },
];

/* =======================
   FUNCIONALIDADE DO CARRINHO
=========================== */

// Definindo o tipo do item do carrinho
type CartItem = {
  id: string;
  name: string;
  quantity: number;
};

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<typeof courses[0] | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const navigate = useNavigate();


  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const openModal = (course: typeof courses[0]) => {
    setSelectedCourse(course);
  };

  const closeModal = () => {
    setSelectedCourse(null);
  };

  // Desativa rolagem do body se o menu ou o carrinho estiverem abertos
  useEffect(() => {
    if (isMenuOpen || isCartOpen || selectedCourse) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Limpa o estilo ao desmontar componente (boa prática)
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen, isCartOpen, selectedCourse]);

  // Recupera o carrinho do localStorage ao montar
  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // Salva o carrinho no localStorage sempre que houver alteração
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Função para adicionar um item ao carrinho
  const addToCart = (product: { id: string; name: string }) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { id: product.id, name: product.name, quantity: 1 }];
      }
    });
  };

  // Funções para modificar o carrinho
  const incrementQuantity = (id: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decrementQuantity = (id: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Função para gerar a mensagem do carrinho para o WhatsApp
  const generateCartMessage = () => {
    if (cart.length === 0) {
      return "Olá, gostaria de solicitar um orçamento.";
    }
    let message =
      "Olá, gostaria de solicitar um orçamento para os seguintes itens:\n\n";
    cart.forEach((item) => {
      message += `• ${item.name} (Quantidade: ${item.quantity})\n`;
    });
    return message;
  };

  // Configurações WhatsApp
  const whatsappNumber1 = "82988361789";

  // Função para abrir o WhatsApp com a mensagem
  const handleWhatsApp = (message: string = "") => {
    const url = `https://wa.me/${whatsappNumber1}${
      message ? `?text=${encodeURIComponent(message)}` : ""
    }`;
    window.open(url, "_blank");
    // Se for uma solicitação de orçamento, limpa o carrinho automaticamente
    if (message) {
      clearCart();
    }
  };

  // Função para formatar número de telefone
  const formatPhoneNumber = (phoneNumber: string) => {
    const numerosLimpos = phoneNumber.replace(/\D/g, "");
    if (numerosLimpos.length === 11) {
      return `(${numerosLimpos.slice(0, 2)}) ${numerosLimpos[2]}-${numerosLimpos.slice(
        3,
        7
      )}-${numerosLimpos.slice(7)}`;
    } else if (numerosLimpos.length === 10) {
      return `(${numerosLimpos.slice(0, 2)}) ${numerosLimpos.slice(
        2,
        6
      )}-${numerosLimpos.slice(6)}`;
    } else {
      return "Número inválido";
    }
  };

  // Função para formatar moeda Brl
  const formatCurrency = (value: number) => {
    if (!value) return;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Controle da exibição dos produtos (arquivo original)
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  let initialCount;
  if (windowWidth < 768) {
    initialCount = 3;
  } else if (windowWidth < 1024) {
    initialCount = 2;
  } else {
    initialCount = 4;
  }
  const displayedProducts = showAllProducts ? products : products.slice(0, initialCount);

  return (
    <>
      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-primary/30 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 shadow-sm">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
          <div className="flex items-center justify-between h-20">
            <div className="flex gap-1 items-center">
              <Logo colorPath24="black" colorPath25="hsl(var(--primary))" className="h-10 w-10" />
              <div className="flex flex-col text-black">
                <span className="font-black text-2xl">WORKSAFE</span>
                <span className="text-sm -mt-1.5 font-semibold">Brasil</span>
              </div>
            </div>
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              <a
                href="#servicos"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Serviços
              </a>
              <a
                href="#produtos"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Produtos
              </a>
              <a
                href="#aluguel"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Aluguel
              </a>
              <a
                href="#treinamentos"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Treinamentos
              </a>
              <a
                href="#sobre"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Sobre Nós
              </a>
              <Button
                onClick={() => {
                  navigate({
                    to: `/login`,
                  })
                }}
                className="bg-primary  text-white"
              >
                Login
              </Button>
              {/* Botão do Carrinho */}
              <button
                className="relative p-2 hover:scale-110 cursor-pointer transition-transform duration-200"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="w-6 h-6 text-gray-900" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full text-xs w-5 h-5 flex items-center justify-center animate-bounce">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Botão do Carrinho */}
              <button
                className="relative text-gray-900 cursor-pointer p-2 hover:scale-110 transition-transform duration-200"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full text-xs w-5 h-5 flex items-center justify-center animate-bounce">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="group h-8 w-8 rounded-lg bg-primary hover:brightness-125 text-white"
              >
                <div className="grid justify-items-center gap-1">
                  <span
                    className={`h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${
                      isMenuOpen ? "rotate-45 translate-y-1.5" : ""
                    }`}
                  />
                  <span
                    className={`h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${
                      isMenuOpen ? "scale-x-0" : ""
                    }`}
                  />
                  <span
                    className={`h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${
                      isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">

                <a
                  href="#sobre"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sobre Nós
                </a>
                <a
                  href="#servicos"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Serviços
                </a>
                <a
                  href="#produtos"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Produtos
                </a>
                <a
                  href="#aluguel"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Aluguel
                </a>
                <a
                  href="#treinamentos"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Treinamentos
                </a>

                <Button
                  onClick={() => {
                    navigate({
                      to: `/login`,
                    })
                  }}
                  className="bg-primary hover:brightness-125 text-white w-full"
                >
                  Login
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Menu Lateral do Carrinho */}
      {/* Cart Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Sidebar */}
      <div
        className={`fixed top-0 right-0 w-full md:w-96 h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Cart Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-primary">Carrinho</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-sm cursor-pointer text-gray-700 hover:text-destructive transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">Seu carrinho está vazio</p>
                <p className="text-sm text-gray-400">
                  Adicione produtos para solicitar um orçamento
                </p>
              </div>
            ) : (
              <ul className="space-y-6">
                {cart.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementQuantity(item.id)}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => incrementQuantity(item.id)}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded bg-red-200 hover:bg-red-300 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cart Footer */}
          <div className="flex flex-col md:flex-row gap-2 p-4 border-t bg-gray-50">
            <Button
              onClick={() => {
                handleWhatsApp(generateCartMessage());
                setIsCartOpen(false);
              }}
              className="w-full bg-primary hover:brightness-110 text-white gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Solicitar Orçamento
            </Button>
            <Button
              variant="outline"
              onClick={clearCart}
              className="border-gray-300 w-full text-gray-600 hover:bg-gray-100"
            >
              Limpar Carrinho
            </Button>
          </div>
        </div>
      </div>

      <main className="min-h-screen pt-20">
        {/* Hero Section with Slider */}
        <section className="relative h-[calc(100vh-5rem)] overflow-hidden">
          {/* Video background */}
          <video
            autoPlay
            loop
            muted
            className="absolute inset-0 w-full h-full object-cover"
            src={HeroVideo}
          />
          {/* Overlay */}
          <div className="bg-black/50 absolute inset-0 z-0" />

          <div className="relative h-full flex items-center py-20">
            <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-60 w-full">
              <div className="max-w-4xl flex flex-col gap-4 items-start justify-center text-left">
                <h2 className="text-white text-xl sm:text-2xl md:text-4xl font-medium leading-tight">
                  Somos Especialistas em
                </h2>

                <RotatingText
                  texts={[
                    'Alpinismo Industrial',
                    'Treinamentos das NBRs',
                    'Trabalhos em Altura',
                    'Espaços Confinados',
                    'Resgate Técnico Industrial',
                    'Soluções em Linha de Vida',
                    'Formações NR33 e NR35',
                    'Consultoria em SST'
                  ]}
                  mainClassName="px-4 py-2 sm:py-2.5 text-2xl sm:text-3xl md:text-5xl font-bold bg-primary text-white rounded-lg shadow-lg"
                  staggerFrom="last"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-120%" }}
                  staggerDuration={0.025}
                  splitLevelClassName="overflow-hidden pb-1 sm:pb-1.5"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={5000}
                />

                <p className="text-zinc-200 text-base sm:text-2xl max-w-xl">
                  Venha conhecer o maior centro em segurança do trabalho industrial do Nordeste.
                </p>

                <Button 
                  variant="outline"
                  className="flex items-center border-primary px-6 bg-transparent hover:bg-primary"
                >
                  Saiba mais
                  <Icon name="arrow-right" className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>


          {/* Navigation dots */}
          {/* <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  currentSlide === index ? "bg-orange-500 w-8" : "bg-white/50 hover:bg-white/75"
                }`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div> */}
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 rounded-xl card-hover">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gradient-to-r from-red-400 to-orange-500 text-white">
                    <feature.icon size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="py-20 bg-gray-50">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="section-title w-full text-center text-3xl md:text-5xl font-bold mb-8 pb-4">
                  Sobre Nós
                </h2>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Desde 2018, a RPL Rope Access se consolidou como referência em soluções de acesso por cordas e segurança do trabalho.
                </p>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Com mais de {yearsOfExperience} anos de experiência no setor, atuamos com excelência e compromisso na execução de serviços em altura, sempre priorizando a segurança e a qualidade.
                </p>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Nosso fundador, Roberto Leite, é profissional certificado em Nível 3 de Acesso por Cordas desde 2012, trazendo para a empresa toda sua experiência e conhecimento técnico.
                </p>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Contamos com uma equipe de especialistas altamente qualificados e certificados, garantindo que cada projeto seja realizado de acordo com as normas técnicas e padrões de segurança mais rigorosos do mercado.
                </p>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Na RPL Rope Access, unimos expertise, profissionalismo e inovação para oferecer soluções sob medida para nossos clientes, assegurando a eficiência e a segurança em todas as etapas do trabalho.
                </p>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="stats-grid p-6 rounded-2xl">
                    <h3 className="font-bold text-4xl bg-primary text-transparent bg-clip-text mb-2">
                      500+
                    </h3>
                    <p className="text-gray-600 font-medium">Projetos Realizados</p>
                  </div>
                  <div className="stats-grid p-6 rounded-2xl">
                    <h3 className="font-bold text-4xl bg-primary text-transparent bg-clip-text mb-2">
                      1000+
                    </h3>
                    <p className="text-gray-600 font-medium">Profissionais Treinados</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="bg-primary hover:brightness-125 text-white text-lg px-8 shadow-lg"
                  onClick={() => handleWhatsApp()}
                >
                  Entre em Contato <Phone className="ml-2" />
                </Button>
              </div>
              <div className="space-y-6">
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={AboutImage1}
                    alt="Fundador 1"
                    width={1080}
                    height={1080}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <video
                    className="w-full rounded-xl z-10 cursor-pointer"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src={TreinamentoVideo} type="video/mp4" />
                    Seu navegador não suporta a tag de vídeo.
                  </video>
                  <div className="relative rounded-xl overflow-hidden shadow-lg h-full">
                    <img
                      src={AboutImage2}
                      alt="Fundador 2"
                      width={1080}
                      height={1080}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
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
                          <CheckCircle className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <Button
                        className="w-full mt-6 bg-black hover:bg-orange-500 text-white transition-colors"
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

        {/* Products Section */}
        <section id="produtos" className="py-20 bg-gray-50">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="text-center mb-16">
              <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
                Equipamentos e EPIs
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Oferecemos uma linha completa de equipamentos certificados para trabalho em altura e espaços confinados.
              </p>
            </div>

            {/* Produto Destaque */}
            <div className="mb-16">
              <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-64 md:h-full">
                    <img
                      src={featuredProduct.image}
                      alt={featuredProduct.name}
                      width={1080}
                      height={1080}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-orange-400 text-white px-4 py-2 rounded-full font-semibold">
                      Produto em Destaque
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold mb-4">{featuredProduct.name}</h3>
                    <p className="text-gray-600 mb-6">{featuredProduct.description}</p>
                    <ul className="space-y-3 mb-8">
                      {featuredProduct.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-gray-700">
                          <CheckCircle className="w-5 h-5 text-orange-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col items-center gap-4 mb-6">
                      <span className="text-3xl font-bold bg-primary bg-clip-text text-transparent">
                        Entre em contato
                      </span>
                      <span>Disponibilidade e valores sob consulta!</span>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={() => addToCart(featuredProduct)} size="lg" className="flex-1 bg-primary hover:brightness-125 text-white">
                        Adicionar ao Carrinho
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
              {displayedProducts.map((product, index) => (
                <Card id={index === 2 ? "grid-produtos" : undefined} key={index} className="h-full flex flex-col overflow-hidden group card-hover border-0 shadow-lg">
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                      width={400}
                      height={400}
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-gray-600 mb-4">{product.description}</p>
                    <div className="flex flex-col items-center justify-between mb-4">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-yellow-600">
                          Entre em contato
                        </span>
                        <span className="text-center text-xs md:text-sm">
                          Disponibilidade e valores sob consulta!
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Button
                        className="w-full bg-black hover:bg-yellow-500 text-white transition-colors"
                        onClick={() => addToCart(product)}
                        disabled={!product.inStock}
                      >
                        {product.inStock ? "Adicionar ao Carrinho" : "Avise-me"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Botão "Ver Mais" / "Ocultar" */}
            <div className="text-center">
              <Button
                size="lg"
                className="bg-primary hover:brightness-125 text-white text-lg px-8 shadow-lg"
                onClick={() => {
                  setShowAllProducts((prev) => !prev);
                  if (showAllProducts) document.getElementById("grid-produtos")?.scrollIntoView();
                }}
              >
                {showAllProducts ? (
                  <>
                    Ocultar <ChevronRight className="ml-2 rotate-180" />
                  </>
                ) : (
                  <>
                    Ver Mais <Plus className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section 1 */}
        <section className="py-10 bg-gradient-to-r from-red-500 to-orange-400">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Precisando de Equipamentos com Urgência?
              </h2>
              <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto">
                Entre em contato agora mesmo e receba uma cotação!
              </p>
              <Button
                size="lg"
                className="bg-black hover:bg-black/80 text-white text-lg px-12"
                onClick={() => handleWhatsApp()}
              >
                Solicitar Cotação <ArrowUpRight className="ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Rentals Section */}
        <section id="aluguel" className="py-20 bg-white">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="text-center mb-16">
              <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
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
                            <CheckCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t pt-4 mt-auto">
                      <div className="flex flex-col items-center justify-between mb-4">
                        <span className="text-lg font-semibold text-yellow-600">
                          Entre em contato
                        </span>
                        <span className="text-sm text-gray-500">
                          Disponibilidade e valores sob consulta!
                        </span>
                      </div>
                      <Button
                        className="w-full bg-black hover:bg-yellow-500 text-white transition-colors"
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

        {/* CTA Section 2 */}
        <section className="py-20 bg-black text-white">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Precisa de Treinamento para sua Equipe?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Oferecemos treinamentos in-company personalizados para sua Empresa. Capacite sua equipe com os melhores profissionais do mercado.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-red-400 to-orange-500 hover:brightness-125 text-white text-sm md:text-lg px-12"
                onClick={() =>
                  handleWhatsApp("Olá, gostaria de agendar um treinamento para minha equipe!")
                }
              >
                Agendar Consultoria Gratuita <ArrowRight className="ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Training Section */}
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
                    onClick={() => openModal(course)}
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
                        <div className="absolute bottom-1 right-1 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                          {course.flag}
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 font-bold text-lg bg-primary bg-clip-text text-transparent">{course.name}</h3>
                    <p className="text-gray-600">{course.duration}</p>
                    {course.price > 0 ? (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Investimento</span>
                          <span className="text-xl font-bold text-orange-500">{formatCurrency(course.price)}</span>
                        </div>
                        <Star className="w-5 h-5 text-yellow-400" />
                      </div>
                    ) : (
                      <p className="text-gray-600 font-semibold mt-2 italic">valores sob consulta</p>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal de Detalhes do Curso */}
          {selectedCourse && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={closeModal}
              />

              {/* Conteúdo do Modal */}
                <div className="relative bg-white rounded-xl shadow-2xl p-6 pr-0 max-w-lg h-5/6 w-full mx-4 z-10">
                <button
                  onClick={closeModal}
                  className="absolute z-10 top-4 right-4 text-white p-1 hover:text-gray-900 bg-gradient-to-r from-red-500 to-orange-500 rounded-md transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="overflow-y-auto h-5/6 pr-6">
                  <div className="relative h-64 w-full rounded-xl overflow-hidden">
                    <img
                      src={selectedCourse.image}
                      alt={selectedCourse.name}
                      className="rounded-xl brightness-50"
                    />
                    {selectedCourse.flag && (
                      <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                        {selectedCourse.flag}
                      </div>
                    )}
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">{selectedCourse.name}</h2>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-gray-600">
                      Duração: {selectedCourse.duration}
                    </p>
                    {selectedCourse.price > 0 && (
                      <p className="text-xl font-bold text-orange-500">
                        {formatCurrency(selectedCourse.price)}
                      </p>
                    )}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Destaques:</h4>
                    <ul className="space-y-2">
                      {selectedCourse.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-center text-gray-700">
                          <div className="w-5 aspect-square mr-1">
                            <Shield className="w-4 h-4 text-yellow-500 mr-2" />
                          </div>
                          <p>{highlight}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between p-2 mr-6" style={{boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
                  <span className="text-sm text-gray-500">
                    Próxima turma:<br/>
                    {selectedCourse.nextDate}
                  </span>
                  <Button
                    onClick={() =>
                      handleWhatsApp(
                        `Olá, gostaria de inscrever-me na próxima turma de ${selectedCourse.name}${selectedCourse.flag ? ` (${selectedCourse.flag})` : ''}! ${selectedCourse.price > 0 ? `\nValor do investimento: ${formatCurrency(selectedCourse.price)}` : ''}`
                      )
                    }
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:brightness-110 text-white"
                  >
                    Inscrever-se <ArrowRight className="ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
        {/* <section id="treinamentos" className="py-20 bg-gray-50">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
            <div className="text-center mb-16">
              <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
                Treinamentos
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Capacitação profissional em normas regulamentadoras e procedimentos de emergência.
              </p>
            </div>
            <div className="relative overflow-hidden mb-12">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentCourse * 100}%)` }}
              >
                {courses.map((course, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="relative aspect-square md:aspect-auto">
                          <img
                            src={course.image}
                            alt={course.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            width={400}
                            height={400}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                          <div className="absolute bottom-6 left-6 right-6">
                            <span className="inline-block bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold mb-3">
                              {course.duration}
                            </span>
                            <h3 className="text-2xl font-bold text-white">
                              {course.name}
                            </h3>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="mb-6">
                            <h4 className="font-semibold text-lg mb-4">Detalhes do Curso:</h4>
                            <ul className="space-y-3">
                              {course.highlights.map((highlight, idx) => (
                                <li key={idx} className="flex items-center text-gray-700">
                                  <Shield className="w-5 h-5 text-yellow-500 mr-2" />
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="border-t pt-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                              <div>
                                <p className="text-sm text-gray-500">Próxima turma</p>
                                <p className="text-lg font-semibold text-yellow-600">
                                  {course.nextDate}
                                </p>
                              </div>
                              <div className="lg:text-right">
                                <p className="text-sm text-gray-500">Vagas limitadas</p>
                                <p className="text-lg font-semibold text-green-500">
                                  Disponível
                                </p>
                              </div>
                            </div>
                            <Button
                              className="w-full bg-black hover:bg-yellow-500 text-white transition-colors"
                              onClick={() =>
                                handleWhatsApp(
                                  `Olá, gostaria de inscrever-me na próxima turma de ${course.name}!`
                                )
                              }
                            >
                              Inscrever-se
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3 mt-8">
                {courses.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentCourse === index ? "bg-yellow-500 w-6" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    onClick={() => setCurrentCourse(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section> */}

        <section id="faq" className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
            <div className="text-center mb-16">
              <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Encontre respostas para as dúvidas mais comuns sobre os nossos cursos.
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex justify-between items-center p-6 focus:outline-none"
                  >
                    <span className="text-left text-lg font-medium text-gray-800 flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 text-orange-600">
                        <MessageCircleMore size={18} />
                      </span>
                      {faq.question}
                    </span>
                    <span className={`text-blue-500 transition-transform duration-300 ${activeIndex === index ? 'rotate-180' : ''}`}>
                      <ChevronDown size={20} />
                    </span>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      activeIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-6 pt-0 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Clients Section */}
        <section className="py-20 bg-white">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="text-center mb-16">
              <h2 className="section-title text-3xl md:text-5xl font-bold mb-6 pb-4">
                Nossos Clientes
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Empresas que confiam em nossa expertise e qualidade.
              </p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              {clients.map((client, index) => (
                <div
                  key={index}
                  className="w-32 md:w-48 grayscale hover:grayscale-0 transition-all duration-300"
                >
                  <img
                    src={client.logo}
                    alt={client.name}
                    className="w-full h-auto"
                    width={400}
                    height={400}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-white py-20">
          <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  {/* <img src={Logo} width={40} height={40} alt="Logo" /> */}
                  <span className="text-xl font-extrabold bg-primary bg-clip-text text-transparent">
                    RPL Rope Access
                  </span>
                </div>
                <p className="text-gray-400 mb-6">
                  Especialistas em trabalho em altura e segurança do trabalho.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="text-gray-400 hover:text-orange-500">
                    {/* Ícone do Facebook */}
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-orange-500">
                    {/* Ícone do Instagram */}
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.897 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.897-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-orange-500">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#sobre" className="text-gray-400 hover:text-yellow-500">
                      Sobre Nós
                    </a>
                  </li>
                  <li>
                    <a href="#servicos" className="text-gray-400 hover:text-yellow-500">
                      Serviços
                    </a>
                  </li>
                  <li>
                    <a href="#produtos" className="text-gray-400 hover:text-yellow-500">
                      Produtos
                    </a>
                  </li>
                  <li>
                    <a href="#aluguel" className="text-gray-400 hover:text-yellow-500">
                      Aluguel
                    </a>
                  </li>
                  <li>
                    <a href="#treinamentos" className="text-gray-400 hover:text-yellow-500">
                      Treinamentos
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Contato</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-gray-400">
                    <Phone className="w-5 h-5 mt-1" />
                    <div>
                      <p>Comercial</p>
                      <p className="text-white">{formatPhoneNumber(whatsappNumber1)}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-gray-400">
                    <svg className="w-5 h-5 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p>E-mail</p>
                      <p className="text-white">rplropeaccess@gmail.com</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-gray-400">
                    <svg className="w-5 h-5 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p>Endereço</p>
                      <p className="text-white">
                        R. Jornalista Oseias Rosas - n° 106
                        <br />
                        Trapiche da Barra Maceió - AL
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-16 pt-8 text-center text-gray-400">
              <p>
                © 2024 RPL Rope Access. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp Button */}
        <button
          onClick={() =>
            handleWhatsApp("Olá, gostaria de falar com a RPL Rope Access!")
          }
          className="floating-whatsapp fixed bottom-8 right-8 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-40 flex items-center gap-2"
        >
          <MessageCircleMore size={24} />
          <span className="hidden md:inline">Fale Conosco</span>
        </button>
      </main>
    </>
  );
};
