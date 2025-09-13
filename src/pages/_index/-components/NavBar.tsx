import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import DynamicLogo from "@/components/general-components/DynamicLogo";
import { ThemeToggle } from "@/components/general-components/ThemeToggle";
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash,
  ChevronDown,
  Award,
  Calendar,
} from "lucide-react";

// Define the type for cart items
// Define the type for cart items (including imageUrl)
type CartItem = {
  id: number;
  name: string;
  quantity: number;
  imageUrl?: string; // Add imageUrl
};

interface NavBarProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  handleWhatsApp: (message?: string) => void;
}

export default function NavBar({ cart, setCart, handleWhatsApp }: NavBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Desativa rolagem do body se o menu ou o carrinho estiverem abertos
  useEffect(() => {
    if (isMenuOpen || isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Limpa o estilo ao desmontar componente (boa prática)
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen, isCartOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Funções para modificar o carrinho
  const incrementQuantity = (id: number) => {
    setCart((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(id) ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decrementQuantity = (id: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          Number(item.id) === Number(id) ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((item) => Number(item.id) !== Number(id))); // Corrected logic here too
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

  return (
    <>
      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-background/95 dark:bg-background/90 backdrop-blur-md z-50 shadow-sm border-b border-border">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
          <div className="flex items-center justify-between h-20">
            <a href="https://www.worksafebrasil.com.br" className="flex gap-2 items-center cursor-pointer">
              <DynamicLogo width={150} height={50} />
            </a>
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              <a
                href="https://www.worksafebrasil.com.br#servicos"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Serviços
              </a>
              {/* <a
                onClick={() => {navigate({to: `/`})}}
                href="#produtos"
                className="text-gray-600 hover:text-primary-light transition-colors"
              >
                Produtos
              </a> */}
              <a
                href="https://www.worksafebrasil.com.br/loja"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Loja
              </a>
              {/* <a
                onClick={() => {navigate({to: `/`})}}
                href="#aluguel"
                className="text-gray-600 hover:text-primary-light transition-colors"
              >
                Aluguel
              </a> */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Treinamentos
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-popover rounded-md shadow-lg border border-border py-1 z-50">
                    <a
                      onClick={() => {
                        setIsDropdownOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        navigate({to: `/certificados`});
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      Certificados
                    </a>
                    <a
                      href="https://www.worksafebrasil.com.br/treinamento#treinamentos"
                      onClick={() => {
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      Calendário
                    </a>
                  </div>
                )}
              </div>
              <a
                href="https://www.worksafebrasil.com.br/sobre"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Sobre Nós
              </a>
              <ThemeToggle variant="ghost" size="icon" className="ml-2" />
              <Button
                onClick={() => {
                  navigate({
                    to: `/student`,
                  })
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Login
              </Button>
            </div>
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle variant="ghost" size="icon" />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="group h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <div className="grid justify-items-center gap-1">
                  <span
                    className={`h-0.5 w-5 rounded-full bg-primary-foreground transition-transform duration-300 ${
                      isMenuOpen ? "rotate-45 translate-y-1.5" : ""
                    }`}
                  />
                  <span
                    className={`h-0.5 w-5 rounded-full bg-primary-foreground transition-transform duration-300 ${
                      isMenuOpen ? "scale-x-0" : ""
                    }`}
                  />
                  <span
                    className={`h-0.5 w-5 rounded-full bg-primary-foreground transition-transform duration-300 ${
                      isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <a
                  href="https://www.worksafebrasil.com.br/sobre"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sobre Nós
                </a>
                <a
                  href="https://www.worksafebrasil.com.br#servicos"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Serviços
                </a>
                {/* <a
                  href="/#produtos"
                  className="text-gray-600 hover:text-primary-light transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Produtos
                </a> */}
                <a
                  href="https://www.worksafebrasil.com.br/loja"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Loja
                </a>
                {/* <a
                  href="/#aluguel"
                  className="text-gray-600 hover:text-primary-light transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Aluguel
                </a> */}
                <div>
                  <button
                    onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                    className="flex items-center justify-between w-full text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Treinamentos
                    <ChevronDown className={`w-4 h-4 transition-transform ${isMobileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Mobile Dropdown Items */}
                  {isMobileDropdownOpen && (
                    <div className="ml-4 mt-2 space-y-2">
                      <a
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsMobileDropdownOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          navigate({to: `/certificados`});
                        }}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        Certificados
                      </a>
                      <a
                        href="https://www.worksafebrasil.com.br/treinamento#treinamentos"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsMobileDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" />
                        Calendário
                      </a>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate({
                      to: `/student`,
                    })
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                >
                  Login
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Cart Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Sidebar */}
      <div
        className={`fixed top-0 right-0 w-full md:w-96 h-full bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full"> {/* Inner flex container */}
          {/* Cart Header */}
          <div className="flex justify-between items-center p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-primary">Carrinho</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-accent rounded-sm cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2">Seu carrinho está vazio</p>
                <p className="text-sm text-muted-foreground/70">
                  Adicione produtos para solicitar um orçamento
                </p>
              </div>
            ) : (
              <ul className="space-y-6">
                {cart.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-4 p-2 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                  >
                    {/* Product Image */}
                    <div className="w-14 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {/* Placeholder Icon or Text */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-foreground mb-1">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                    <div className="flex text-foreground items-center gap-2">
                      <button
                        onClick={() => decrementQuantity(item.id)}
                        className="p-1 rounded cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => incrementQuantity(item.id)}
                        className="p-1 rounded cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded cursor-pointer bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
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
          <div className="p-4 border-t border-border bg-muted/50"> {/* Footer container */}
            {/* Total Items Display */}
            {cart.length > 0 && (
              <div className="mb-4 text-start">
                <p className="text-sm font-semibold text-foreground">
                  Total: {cart.reduce((acc, item) => acc + item.quantity, 0)} {cart.reduce((acc, item) => acc + item.quantity, 0) === 1 ? 'item' : 'itens'}
                </p>
              </div>
            )}
            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-2">
              <Button
                onClick={() => {
                  handleWhatsApp(generateCartMessage());
                  setIsCartOpen(false);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Solicitar Orçamento
              </Button>
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full"
              >
                Limpar Carrinho
              </Button>
            </div> {/* Closes Action Buttons div */}
          </div> {/* Closes Footer container div */}
        </div> {/* Closes Inner flex container div */}
      </div> {/* Closes Cart Sidebar div */}
    </>
  );
}
