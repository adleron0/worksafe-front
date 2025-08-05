import { createFileRoute } from '@tanstack/react-router'
import { useCart } from "../../hooks/use-cart"; // Import the custom hook
import { Award, Clock, MessageCircleMore, Shield, Users } from "lucide-react";
import TrainingSummary from "./-components/TrainingSummary";
import CourseBadges from "./-components/CourseBadges";
import NavBar from "./-components/NavBar";
import TexturaBackground from "../../assets/textura.jpg";
import Hero from "./-components/Hero";
import Feature from "./-components/Feature";
import Parceiros from "./-components/Parceiros";
import Clients from "./-components/Clients";
import Services from "./-components/Services";
// import Services2 from "./components/Services2";
import Products from "./-components/Products";
// import Rentals from "./components/Rentals";
import Cta from "./-components/Cta";
import Footer from "./-components/Footer";
import Faq from "./-components/Faq";
// import About from "./components/About";
// import { IEntity } from "@/old-pages/Site-Services/interfaces/entity.interface";

// interface ServicesResponse {
//   rows: IEntity[];
//   total: number;
// }

// interface HomeProps {
//   preloadedServices?: ServicesResponse;
// }

// Calcula anos
const foundationYear = 2018;
const yearsOfExperience = new Date().getFullYear() - foundationYear;

// Features teste
const features = [
  {
    icon: Shield,
    title: "Segurança Garantida",
    description: "Equipamentos e profissionais certificados",
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

/* =======================
   FUNCIONALIDADE DO CARRINHO
=========================== */

// CartItem type is now defined in useCart.ts, no need to redefine here.

export const Route = createFileRoute('/_index/')({
  component: Index,
})

function Index() {
  const { cart, setCart, addToCart, clearCart } = useCart(); // Use the custom hook

  // Cart state and localStorage logic are now handled by useCart hook.
  // Remove local addToCart and clearCart functions.

  // Configurações WhatsApp
  const whatsappNumber1 = "+5581989479259";

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

  // Função para formatar moeda Brl
  const formatCurrency = (value: number) => {
    if (!value) return;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <>
      <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />

      <main className="min-h-screen pt-20">
        <Hero yearsOfExperience={yearsOfExperience} />

        {/* Partners Section */}
        <Parceiros />

        {/* Course Badges */}
        <CourseBadges />

        {/* Training Section */}
        <TrainingSummary handleWhatsApp={handleWhatsApp} />

        {/* Services Section */}
        {/* Original Services Component */}
        <Services handleWhatsApp={handleWhatsApp} />
        
        {/* New Services2 Component */}
        {/* <Services2 handleWhatsApp={handleWhatsApp} preloadedData={servicesData} /> */}

        {/* Features Section */}
        <div 
          className="relative py-10 bg-white"
          style={{
            backgroundImage: `url(${TexturaBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* White overlay for extra subtlety */}
          <div className="absolute inset-0 bg-white/[0.98]" />
          
          <div className="relative mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="section-title text-primary-light text-3xl md:text-5xl font-bold md:pb-4">
                Não Vendemos Segurança!
              </h2>
              <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
                Nossa missão é garantir a segurança e saúde de todos os trabalhadores, oferecendo serviços de qualidade e excelência. Por tanto, Não Vendemos Segurança, Nós a Praticamos!
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {features.map((feature) => (
                <Feature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </div>

        {/* About Section */}
        {/* <About /> */}

        {/* CTA Section 1 */}
        <Cta
          title="Precisa de Treinamento para sua Equipe?"
          subtitle="Oferecemos treinamentos in-company personalizados para sua Empresa."
          buttonText="Agendar Consultoria"
          whatsAppMessage="Olá, gostaria de agendar um treinamento para minha equipe!"
          handleWhatsApp={handleWhatsApp}
        />

        {/* Products Section */}
        <Products addToCart={addToCart} formatCurrency={formatCurrency} />

        {/* Rentals Section */}
        {/* <Rentals handleWhatsApp={handleWhatsApp} formatCurrency={formatCurrency} /> */}

        {/* CTA Section 2 */}
        <Cta
          title="Precisando de Equipamentos com Urgência?"
          subtitle="Entre em contato agora mesmo e receba uma cotação!"
          buttonText="Solicitar Cotação"
          whatsAppMessage="Olá, gostaria de solicitar um orçamento."
          handleWhatsApp={handleWhatsApp}
        />

        <Faq  faqData={faqs} />

        {/* Clients Section */}
        <Clients />

        <Footer />

        {/* Floating WhatsApp Button */}
        <button
          onClick={() =>
            handleWhatsApp("Olá, gostaria de falar com a WORKSAFE BRASIL!")
          }
          className="floating-whatsapp fixed bottom-8 cursor-pointer right-8 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-40 flex items-center gap-2"
        >
          <MessageCircleMore size={24} />
          <span className="hidden md:inline">Fale Conosco</span>
        </button>
      </main>
    </>
  )
}
