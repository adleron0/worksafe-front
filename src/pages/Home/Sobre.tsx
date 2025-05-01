import { useState, useEffect } from "react";
import {
  MessageCircleMore,
} from "lucide-react";
import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import About from "./components/About";
import Clients from "./components/Clients";
import Cta from "./components/Cta"; // Import Cta component
import Footer from "./components/Footer";

// Calcula anos
const foundationYear = 2018;
const yearsOfExperience = new Date().getFullYear() - foundationYear;
// const features = [
//   {
//     icon: Shield,
//     title: "Segurança Garantida",
//     description: "Equipamentos certificados e profissionais qualificados",
//   },
//   {
//     icon: Award,
//     title: "Certificações",
//     description: "Credenciamento em diversas normas técnicas",
//   },
//   {
//     icon: Clock,
//     title: "Atendimento 24/7",
//     description: "Atendimento emergencial disponível 24h",
//   },
//   {
//     icon: Users,
//     title: "Equipe Especializada",
//     description: "Profissionais com vasta experiência no setor",
//   },
// ];

/* =======================
   FUNCIONALIDADE DO CARRINHO
=========================== */

// Definindo o tipo do item do carrinho
type CartItem = {
  id: number;
  name: string;
  quantity: number;
};

export default function Sobre() {
  const [cart, setCart] = useState<CartItem[]>([]);

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

  const clearCart = () => {
    setCart([]);
  };

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

        {/* Clients Section */}
        <Clients />

        {/* About Section */}
        <About />

        {/* CTA Section */}
        <Cta
          title="Pronto para Elevar a Segurança do seu Trabalho?"
          subtitle="Entre em contato conosco e descubra como nossas soluções personalizadas podem proteger sua equipe e otimizar suas operações."
          buttonText="Solicitar Orçamento"
          whatsAppMessage="Olá! Gostaria de solicitar um orçamento para serviços de segurança do trabalho."
          handleWhatsApp={handleWhatsApp}
        />

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
};
