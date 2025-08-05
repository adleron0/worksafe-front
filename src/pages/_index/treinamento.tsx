import { createFileRoute } from '@tanstack/react-router';
import { useCart } from "../../hooks/use-cart";
import { MessageCircleMore } from "lucide-react";
import NavBar from "./-components/NavBar";
import Hero from "./-components/Hero";
import TrainingSchedule from "./-components/TrainingSchedule";
import CourseBadges from "./-components/CourseBadges";
import Cta from "./-components/Cta";
import Faq from "./-components/Faq";
import Footer from "./-components/Footer";

// Calcula anos
const foundationYear = 2018;
const yearsOfExperience = new Date().getFullYear() - foundationYear;

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

export const Route = createFileRoute('/_index/treinamento')({
  component: () => <Treinamento />,
})

function Treinamento() {
  const { cart, setCart, clearCart } = useCart();

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

  return (
    <>
      <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />

      <main className="min-h-screen pt-20">
        <Hero yearsOfExperience={yearsOfExperience} />

        {/* Course Badges */}
        <CourseBadges />

        {/* Training Schedule - Component completo */}
        <TrainingSchedule handleWhatsApp={handleWhatsApp} />

        {/* CTA Section */}
        <Cta
          title="Precisa de Treinamento para sua Equipe?"
          subtitle="Oferecemos treinamentos in-company personalizados para sua Empresa."
          buttonText="Agendar Consultoria"
          whatsAppMessage="Olá, gostaria de agendar um treinamento para minha equipe!"
          handleWhatsApp={handleWhatsApp}
        />

        {/* FAQ Section */}
        <Faq faqData={faqs} />

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
  );
}