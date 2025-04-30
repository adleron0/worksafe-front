import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

// Produto Destaque Venda
import Corda11 from "../../../assets/images/equipamentos/corda-11.webp";

// Imagens de Equipamentos para Venda
import AscensorDePunho from "../../../assets/images/equipamentos/ascensor-de-punho.webp";
import Capacete from "../../../assets/images/equipamentos/capacete.webp";
import Cinto7y from "../../../assets/images/equipamentos/cinto-7y.webp";
import DescensorAutoblocante from "../../../assets/images/equipamentos/descensor-autoblocante.webp";
import FitaAncoragem from "../../../assets/images/equipamentos/fita-ancoragem.webp";
import LoryAutoBlocante from "../../../assets/images/equipamentos/lory-auto-blocante.webp";
import MosquetaoOvalAco from "../../../assets/images/equipamentos/mosquetao-oval-aco.webp";
import OlhalAncoragemPredial from "../../../assets/images/equipamentos/olhal-ancoragem-predial.webp";
import PoliaDupla from "../../../assets/images/equipamentos/polia-dupla.webp";
import PoliaSimples from "../../../assets/images/equipamentos/polia-simples.webp";
import TalabarteY from "../../../assets/images/equipamentos/talabarte-y.webp";
import TravaQuedasCordaAbs from "../../../assets/images/equipamentos/trava-quedas-corda-abs.webp";
import TravaQuedasRetratil from "../../../assets/images/equipamentos/trava-quedas-retratil.webp";
import Mochila from "../../../assets/images/equipamentos/mochila-equipamentos.webp";

// Produtos para Venda
const products = [
  {
    id: 1,
    featured: true,
    name: "Corda de 11mm Para Trabalho em Altura e Resgate",
    imageUrl: Corda11,
    price: 0,
    oldPrice: 0,
    description:
      "A corda semi-estática de 11mm é de alta performance, garantindo segurança para trabalho ou esportes em altura. Possui certificações NR 18 e NBR 15986, construída com alma e capa para máxima resistência e durabilidade.",
    features: [
      "Diâmetro: 11mm",
      "Carga Mínima de Ruptura: 36kN",
      "Alongamento (E): 3,2%",
      "Peso: 100 g/m (20 kg/200 m)",
      "Conforme NR 35, ABNT NBR 15986 e EN 1891",
    ],
    active: false,
  },
  {
    id: 2,
    featured: false,
    name: "Ascensor de Punho",
    imageUrl: AscensorDePunho,
    price: 100,
    oldPrice: 110,
    description:
      "Facilita a ascensão em cordas com bloqueio seguro e manuseio simples.",
    features: [
      "Teste 01",
      "Teste 02",
    ],
    active: false,
  },
  {
    id: 3,
    featured: false,
    name: "Capacete de Segurança Tipo III  Classe A",
    imageUrl: Capacete,
    price: 0,
    oldPrice: 0,
    description:
      "Utilizado como EPI no trabalhos em altura e espaços confinados na construção civil, petroquímica, mineração, agroindústria, dentre outras.",
    features: [
      "Teste 01",
      "Teste 02",
    ],
    active: true,
  },
  {
    id: 4,
    featured: false,
    name: "Cinto Paraquedista 7Y",
    imageUrl: Cinto7y,
    price: 0,
    oldPrice: 0,
    description:
      "Cinto completo com múltiplos pontos de conexão para maior segurança.",
    features: [],
    active: true,
  },
  {
    id: 5,
    featured: false,
    name: "Descensor Autoblocante",
    imageUrl: DescensorAutoblocante,
    price: 0,
    oldPrice: 0,
    description:
      "Permite descida controlada e bloqueio automático para trabalhos em altura.",
    features: [],
    active: true,
  },
  {
    id: 6,
    featured: false,
    name: "Mochila de Equipamentos",
    imageUrl: Mochila,
    price: 0,
    oldPrice: 0,
    description:
      "Mochila de equipamentos para armazenamento de materiais e equipamentos.",
    features: [],
    active: true,
  },
  {
    id: 7,
    featured: false,
    name: "Fita Anelar de Ancoragem",
    imageUrl: FitaAncoragem,
    price: 0,
    oldPrice: 0,
    description:
      "Fita completa com múltiplos pontos de conexão para maior segurança.",
    features: [],
    active: true,
  },
  {
    id: 8,
    featured: false,
    name: "Lory Auto Blocante",
    imageUrl: LoryAutoBlocante,
    price: 0,
    oldPrice: 0,
    description:
      "Descensor auto-blocante LORY SAFE com função anti-pânico, ideal para atividades em acesso por cordas, rapel e escalada.",
    features: [],
    active: true,
  },
  {
    id: 9,
    featured: false,
    name: "Mosquetão Oval de Aço",
    imageUrl: MosquetaoOvalAco,
    price: 0,
    oldPrice: 0,
    description:
      "Mosquetão oval em aço para conexões seguras em qualquer situação.",
    features: [],
    active: true,
  },
  {
    id: 10,
    featured: false,
    name: "Olhal de Ancoragem",
    imageUrl: OlhalAncoragemPredial,
    price: 0,
    oldPrice: 0,
    description:
      "Projetado para ancoragens prediais e linhas de vida, resistente e durável.",
    features: [],
    active: true,
  },
  {
    id: 11,
    featured: false,
    name: "Polia Dupla",
    imageUrl: PoliaDupla,
    price: 0,
    oldPrice: 0,
    description:
      "Ideal para sistemas de redução de força e resgates em altura.",
    features: [],
    active: true,
  },
  {
    id: 12,
    featured: false,
    name: "Polia Simples",
    imageUrl: PoliaSimples,
    price: 0,
    oldPrice: 0,
    description:
      "Polia de uso geral para aplicações de içamento e desvio de carga.",
    features: [],
    active: true,
  },
  {
    id: 13,
    featured: false,
    name: "Talabarte em Y",
    imageUrl: TalabarteY,
    price: 0,
    oldPrice: 0,
    description:
      "Talabarte versátil em Y para movimentação segura em estruturas.",
    features: [],
    active: true,
  },
  {
    id: 14,
    featured: false,
    name: "Trava-Quedas para Corda ABS",
    imageUrl: TravaQuedasCordaAbs,
    price: 0,
    oldPrice: 0,
    description:
      "Bloqueio automático em cordas, garantindo segurança e praticidade.",
    features: [],
    active: true,
  },
  {
    id: 15,
    featured: false,
    name: "Trava-Quedas Retrátil",
    imageUrl: TravaQuedasRetratil,
    price: 0,
    oldPrice: 0,
    description:
      "Dispositivo retrátil de segurança para total liberdade de movimento.",
    features: [],
    active: true,
  },
];

// Produto Destaque Venda
const featuredProduct = products.filter((product) => product.featured)[0];

interface ProductsProps {
  addToCart: (product: { id: number; name: string }) => void;
  formatCurrency: (value: number) => string | undefined;
}

const Products: React.FC<ProductsProps> = ({ addToCart, formatCurrency }) => {
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
    <section id="produtos" className="py-20 bg-gray-50">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
        <div className="text-center mb-16">
          <h2 className="section-title text-gray-700 text-3xl md:text-5xl font-bold mb-6 pb-4">
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
                  src={featuredProduct.imageUrl}
                  alt={featuredProduct.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-4 text-xs md:text-sm left-4 bg-gradient-to-r from-green-400 to-primary-light text-white px-4 py-2 rounded-full font-semibold">
                  Produto em Destaque
                </div>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <h3 className="text-2xl text-black font-bold mb-4">{featuredProduct.name}</h3>
                <p className="text-gray-600 mb-6">{featuredProduct.description}</p>
                <ul className="space-y-3 mb-8">
                  {featuredProduct.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-primary-light mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                { Number(featuredProduct.price) > 0 ? 
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-sm text-gray-500 line-through">
                        { Number(featuredProduct.oldPrice) > 0 ? `${formatCurrency(featuredProduct.oldPrice)}` : '' }
                      </span>
                      <span className="text-3xl font-bold bg-primary-light bg-clip-text text-transparent">
                        { formatCurrency(featuredProduct.price) }
                      </span>
                    </div>
                   : 
                    <div className="flex flex-col items-center justify-between mb-4">
                      <div className="flex flex-col items-center text-gray-700">
                        <span className="text-2xl font-bold text-primary-light">
                          Entre em contato
                        </span>
                        <span className="text-center text-xs md:text-sm">
                          Disponibilidade e valores sob consulta!
                        </span>
                      </div>
                    </div>
                  }
                <div className="flex gap-4">
                  <Button 
                    onClick={() => addToCart(featuredProduct)} 
                    disabled={!featuredProduct.active} 
                    size="lg" 
                    className={cn(
                      "flex-1 bg-primary-light hover:brightness-125 text-white",
                      !featuredProduct.active && "cursor-not-allowed opacity-50 bg-black"
                    )}
                  >
                    {featuredProduct.active ? "Adicionar ao Carrinho" : "Avise-me"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Produtos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 mb-12">
          {displayedProducts.filter((product) => !product.featured).map((product, index) => (
            <Card id={index === 2 ? "grid-produtos" : undefined} key={index} className="h-full flex flex-col overflow-hidden group card-hover border-0 shadow-lg">
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  width={400}
                  height={400}
                />
              </div>
              <div className="p-6 flex flex-col flex-grow bg-white">
                <h3 className="text-md md:text-lg text-black font-semibold mb-2">{product.name}</h3>
                <p className="text-xs md:text-sm text-gray-600 mb-4">{product.description}</p>
                <ul className="space-y-3 mb-8">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center mb-1.5 text-gray-700 text-xs md:text-sm">
                      <CheckCircle className="w-4 h-4 text-primary-light mr-1 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  { Number(product.price) > 0 ? 
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-sm text-gray-500 line-through">
                        { Number(product.oldPrice) > 0 ? `${formatCurrency(product.oldPrice)}` : '' }
                      </span>
                      <span className="text-3xl font-bold bg-primary-light bg-clip-text text-transparent">
                        { formatCurrency(product.price) }
                      </span>
                    </div>
                   : 
                    <div className="flex flex-col items-center justify-between mb-4">
                      <div className="flex flex-col items-center text-gray-700">
                        <span className="text-xl font-bold text-primary-light">
                          Entre em contato
                        </span>
                        <span className="text-center text-xs md:text-sm">
                          Disponibilidade e valores sob consulta!
                        </span>
                      </div>
                    </div>
                  }

                  <Button
                    className="w-full bg-black hover:bg-primary-light text-white transition-colors"
                    onClick={() => addToCart(product)}
                    disabled={!product.active}
                  >
                    {product.active ? "Adicionar ao Carrinho" : "Avise-me"}
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
            className="bg-primary-light hover:brightness-110 ease-in-out duration-200 text-white text-lg px-8 shadow-lg"
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
  );
};

export default Products;
