import { createFileRoute } from "@tanstack/react-router";
import { useCart } from "../../hooks/use-cart"; // Import the custom hook
import { MessageCircleMore } from "lucide-react";
import NavBar from "./-components/NavBar";
import Footer from "./-components/Footer";
import LojaProducts from "./-components/LojaProducts";
import Cta from "./-components/Cta";

export const Route = createFileRoute("/_index/loja")({
  component: () => <Loja />,
});

function Loja() {
  const { cart, setCart, addToCart, clearCart } = useCart(); // Use the custom hook

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
        {/* Products Section */}
        <LojaProducts addToCart={addToCart} formatCurrency={formatCurrency} />

        {/* CTA Section */}
        <Cta
          title="Precisando de Equipamentos com Urgência?"
          subtitle="Entre em contato agora mesmo e receba uma cotação!"
          buttonText="Solicitar Cotação"
          whatsAppMessage="Olá, gostaria de solicitar um orçamento."
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
}
