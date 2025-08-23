import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import { toast } from "@/hooks/use-toast";
import { get } from "@/services/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  CreditCardBack,
  CreditCardChip,
  CreditCardCvv,
  CreditCardExpiry,
  CreditCardFlipper,
  CreditCardFront,
  CreditCardMagStripe,
  CreditCardName,
  CreditCardNumber,
} from '@/components/ui/kibo-ui/credit-card';
import {
  Loader2,
  CreditCard as CreditCardIcon,
  QrCode,
  FileText,
  Copy,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Shield,
  MessageCircle,
  Building,
  Briefcase,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Wallet,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Select from "@/components/general-components/Select";

interface PersonalData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  workedAt: string;
  occupation: string;
}

interface AddressData {
  zipCode: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  installments: string;
}

interface CheckoutFormProps {
  turma: {
    name: string;
    price: string | number;
    discountPrice?: string | number | null;
    dividedIn?: number | null;
    landingPagesDates?: string;
    paymentMethods?: string[];
  };
  onComplete: (paymentData: {
    paymentMethod: string;
    personalData: PersonalData;
    addressData: AddressData;
    cardData?: CardData;
    status: string;
    onPaymentResponse?: (response: any) => void;
  }) => void;
  onBack?: () => void;
  initialData?: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    workedAt: string;
    occupation: string;
  };
  isProcessingPayment?: boolean;
}

type PaymentMethod = 'pix' | 'boleto' | 'cartaoCredito';
type CheckoutStep = 'personal' | 'address' | 'payment';

// Simple card brand logo component
const CardBrandLogo = ({ brand }: { brand: string }) => {
  switch(brand) {
    case 'Visa':
      return (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-base lg:text-xl">
          VISA
        </div>
      );
    case 'Mastercard':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex">
            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-red-500 opacity-90"></div>
            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-yellow-500 opacity-90 -ml-3 lg:-ml-4"></div>
          </div>
        </div>
      );
    case 'Elo':
      return (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-base lg:text-xl">
          elo
        </div>
      );
    case 'Hipercard':
      return (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm lg:text-base">
          HIPER
        </div>
      );
    case 'Amex':
      return (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm lg:text-base">
          AMEX
        </div>
      );
    default:
      return null;
  }
};

const CheckoutForm = ({ turma, onComplete, onBack, initialData, isProcessingPayment }: CheckoutFormProps) => {
  // Filter available payment methods
  const availablePaymentMethods = turma.paymentMethods || [];
  
  // Map payment method strings to the PaymentMethod type
  const getInitialPaymentMethod = (): PaymentMethod => {
    if (availablePaymentMethods.includes('pix')) return 'pix';
    if (availablePaymentMethods.includes('boleto')) return 'boleto';
    if (availablePaymentMethods.includes('cartaoCredito')) return 'cartaoCredito';
    return 'pix'; // fallback
  };
  
  // If we have initial data, start at address step, otherwise start at personal
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(initialData ? 'address' : 'personal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(getInitialPaymentMethod());
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  
  // Use external processing state if provided, otherwise use local state
  const isPaymentProcessing = isProcessingPayment !== undefined ? isProcessingPayment : isProcessing;
  
  // Personal Data - use initial data if provided
  const [personalData, setPersonalData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    cpf: initialData?.cpf || "",
    workedAt: initialData?.workedAt || "",
    occupation: initialData?.occupation || ""
  });

  // Address Data
  const [addressData, setAddressData] = useState<AddressData>({
    zipCode: "",
    address: "",
    addressNumber: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
    state: ""
  });
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Payment Data
  const [pixData, setPixData] = useState({
    qrCode: "",
    copyPasteCode: "",
    isGenerating: false,
    paymentKey: ""
  });

  const [boletoData, setBoletoData] = useState({
    barCode: "",
    isGenerating: false
  });

  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    installments: "1"
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: "" });
  const [captchaError, setCaptchaError] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<() => void>(() => {});
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cardBrand, setCardBrand] = useState<string>("");
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate captcha on mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Poll PIX payment status every 10 seconds
  useEffect(() => {
    if (paymentMethod === 'pix' && paymentStatus === 'processing' && pixData.paymentKey) {
      const checkPaymentStatus = async () => {
        try {
          const response = await get("financial-records", `key/${pixData.paymentKey}`);
          
          if (response && (response.status === 'paid' || response.status === 'received')) {
            // Payment confirmed
            setPaymentStatus('completed');
            setShowSuccessScreen(true);
            
            toast({
              title: "Pagamento confirmado!",
              description: "Sua inscrição foi realizada com sucesso.",
              variant: "success",
            });
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      };

      // Check immediately
      checkPaymentStatus();

      // Then check every 10 seconds
      const interval = setInterval(checkPaymentStatus, 10000);

      return () => clearInterval(interval);
    }
  }, [paymentMethod, paymentStatus, pixData.paymentKey]);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ num1, num2, answer: "" });
    setCaptchaError(false);
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(numValue);
  };
  
  const formatPrice = (price: string | number): string => {
    return typeof price === 'number' ? price.toString() : price;
  };

  const detectCardBrand = (cardNumber: string): string => {
    const number = cardNumber.replace(/\s/g, '');
    
    if (!number || number.length < 1) return '';
    
    // Elo (check first as some Elo cards start with 4 like Visa)
    const eloRegex = /^(401178|401179|431274|438935|451416|457393|457631|457632|504175|627780|636297|636368|636369|(506699|5067[0-6][0-9]|50677[0-8])|(509[0-9]{3})|(65003[1-3])|(65003[5-9]|65004[0-9]|65005[0-1])|(65040[5-9]|6504[1-3][0-9])|(65048[5-9]|65049[0-9]|6505[0-2][0-9]|65053[0-8])|(65054[1-9]|6505[5-8][0-9]|65059[0-8])|(65070[0-9]|65071[0-8])|(65072[0-7])|(65090[1-9]|65091[0-9]|650920)|(65165[2-9]|6516[6-7][0-9])|(65500[0-9]|65501[0-9])|(65502[1-9]|6550[3-4][0-9]|65505[0-8]))/;
    if (eloRegex.test(number)) return 'Elo';
    
    // Hipercard
    if (/^(606282|3841)/.test(number)) return 'Hipercard';
    
    // Mastercard - 51-55, 2221-2720
    if (number.startsWith('5')) {
      if (number.length === 1) return 'Mastercard'; // Show Mastercard for single 5
      const firstTwo = parseInt(number.substring(0, 2));
      if (firstTwo >= 51 && firstTwo <= 55) return 'Mastercard';
    }
    if (number.startsWith('2')) {
      const firstFour = parseInt(number.substring(0, 4));
      if (firstFour >= 2221 && firstFour <= 2720) return 'Mastercard';
    }
    
    // Visa
    if (/^4/.test(number)) return 'Visa';
    
    // American Express
    if (/^3[47]/.test(number)) return 'Amex';
    
    // Diners Club
    if (/^(36|30[0-5]|3095|38|39)/.test(number)) return 'Diners';
    
    // Discover
    if (/^(6011|65|64[4-9]|622)/.test(number)) return 'Discover';
    
    // JCB
    if (/^35/.test(number)) return 'JCB';
    
    return '';
  };

  const calculateInstallmentValue = () => {
    const price = parseFloat(formatPrice(turma.discountPrice || turma.price));
    const installments = parseInt(cardData.installments);
    return price / installments;
  };

  const isPersonalDataValid = () => {
    return (
      personalData.name.trim() !== "" &&
      personalData.email.trim() !== "" &&
      personalData.phone.trim() !== "" &&
      personalData.cpf.trim() !== "" &&
      captcha.answer.trim() !== ""
    );
  };

  const handlePersonalDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate captcha
    const correctAnswer = captcha.num1 + captcha.num2;
    if (parseInt(captcha.answer) !== correctAnswer) {
      setCaptchaError(true);
      generateCaptcha();
      toast({
        title: "Verificação incorreta",
        description: "Por favor, responda corretamente a soma matemática.",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep('address');
  };

  const searchCep = async (cep: string) => {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '');
    
    // Only search if we have 8 digits
    if (cleanCep.length !== 8) return;
    
    setIsSearchingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        // Update address fields with the fetched data
        setAddressData(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          // Keep the fields that are not returned by the API
          addressNumber: prev.addressNumber,
          addressComplement: prev.addressComplement
        }));
        
        // Show success feedback
        toast({
          title: "CEP encontrado!",
          description: "Os dados do endereço foram preenchidos automaticamente.",
          variant: "success",
        });
      } else {
        // CEP not found
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado ou preencha os campos manualmente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Silent fail - user can still fill manually
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!addressData.zipCode || !addressData.address || !addressData.addressNumber || 
        !addressData.neighborhood || !addressData.city || !addressData.state) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios do endereço.",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep('payment');
  };

  // Handle payment response from backend
  const handlePaymentResponse = (response: any) => {
    if (response.error) {
      // Handle any error for any payment method
      setPaymentStatus('failed');
      setIsProcessing(false);
      setIsModalProcessing(false);
      setPixData({ ...pixData, isGenerating: false });
      setBoletoData({ ...boletoData, isGenerating: false });
      
      // Close the confirm modal if open
      setShowConfirmModal(false);
      
      return;
    }
    
    // Always clear all payment method data to handle method switching
    // This ensures old data doesn't persist when user changes payment method
    if (response.type === 'pix') {
      // Clear other payment methods
      setBoletoData({
        barCode: "",
        bankSlipUrl: "",
        isGenerating: false
      });
      
      // Set PIX data
      setPixData({
        qrCode: response.qrCode,
        copyPasteCode: response.copyPasteCode,
        isGenerating: false,
        paymentKey: response.paymentKey || ""
      });
      setPaymentStatus('processing');
      setIsModalProcessing(false);
      setShowConfirmModal(false); // Close modal after PIX is generated
    } else if (response.type === 'boleto') {
      // Clear other payment methods
      setPixData({
        qrCode: "",
        copyPasteCode: "",
        isGenerating: false,
        paymentKey: ""
      });
      
      // Set Boleto data
      setBoletoData({
        barCode: response.billNumber,
        bankSlipUrl: response.billUrl,
        isGenerating: false
      });
      setIsModalProcessing(false);
      setShowConfirmModal(false); // Close modal after boleto is generated
    } else if (response.type === 'cartaoCredito') {
      // Clear other payment methods
      setPixData({
        qrCode: "",
        copyPasteCode: "",
        isGenerating: false,
        paymentKey: ""
      });
      setBoletoData({
        barCode: "",
        bankSlipUrl: "",
        isGenerating: false
      });
      
      if (response.status === 'CONFIRMED' || !response.error) {
        setPaymentStatus('completed');
        setIsProcessing(false);
        setShowSuccessScreen(true); // Show success screen
      } else {
        setPaymentStatus('failed');
        setIsProcessing(false);
      }
      setIsModalProcessing(false);
      setShowConfirmModal(false); // Close modal after processing credit card
    }
  };

  const generatePixPayment = async () => {
    // Set generating state immediately when button is clicked
    setPixData({ ...pixData, isGenerating: true });
    
    setPendingPaymentAction(() => async () => {
      setIsModalProcessing(true);
      setPaymentStatus('processing');
      
      // Call onComplete which will handle the API call
      onComplete({
        paymentMethod: 'pix',
        personalData,
        addressData,
        status: 'pending',
        onPaymentResponse: handlePaymentResponse
      });
    });
    setShowConfirmModal(true);
  };

  const generateBoleto = async () => {
    // Set generating state immediately when button is clicked
    setBoletoData({ ...boletoData, isGenerating: true });
    
    setPendingPaymentAction(() => async () => {
      setIsModalProcessing(true);
      
      // Call onComplete which will handle the API call
      onComplete({
        paymentMethod: 'boleto',
        personalData,
        addressData,
        status: 'pending',
        onPaymentResponse: handlePaymentResponse
      });
    });
    setShowConfirmModal(true);
  };

  const handleCardPayment = async () => {
    setPendingPaymentAction(() => async () => {
      setIsModalProcessing(true);
      setIsProcessing(true);
      
      // Debug log card data before sending
      console.log("=== CARD DATA BEFORE SENDING ===");
      console.log("Card Number:", cardData.number);
      console.log("Card Name:", cardData.name);
      console.log("Card Expiry:", cardData.expiry);
      console.log("Card CVV:", cardData.cvv);
      console.log("Card Installments:", cardData.installments);
      console.log("Full Card Data Object:", cardData);
      console.log("=== END CARD DATA ===");
      
      // Call onComplete which will handle the API call
      onComplete({ 
        paymentMethod: 'cartaoCredito', 
        personalData, 
        addressData,
        cardData,
        status: 'processing',
        onPaymentResponse: handlePaymentResponse
      });
    });
    setShowConfirmModal(true);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência.`,
      variant: "success",
    });
  };

  const installmentOptions = Array.from({ length: turma.dividedIn || 1 }, (_, i) => ({
    id: String(i + 1),
    name: i === 0 
      ? `À vista - ${formatCurrency(formatPrice(turma.discountPrice || turma.price))}`
      : `${i + 1}x de ${formatCurrency(parseFloat(formatPrice(turma.discountPrice || turma.price)) / (i + 1))}`
  }));

  // If showing success screen, show only that
  if (showSuccessScreen) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              {/* Success Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }}
                className="mb-6"
              >
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Pagamento Aprovado!
                </h2>
                <p className="text-gray-600 mb-6">
                  Sua inscrição no curso foi confirmada com sucesso.
                </p>
              </motion.div>

              {/* Order Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-50 rounded-lg p-4 mb-6 text-left"
              >
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Curso:</span>
                    <span className="font-medium">{turma?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">{turma?.landingPagesDates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aluno:</span>
                    <span className="font-medium">{personalData.name}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Valor Pago:</span>
                      <span className="font-bold text-green-600">
                        {cardData.installments !== "1"
                          ? `${cardData.installments}x ${formatCurrency(calculateInstallmentValue())}`
                          : formatCurrency(formatPrice(turma?.discountPrice || turma?.price || 0))
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Next Steps */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-sm">
                    <p className="font-medium text-blue-900 mb-1">Próximos passos:</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Você receberá um e-mail de confirmação</li>
                      <li>• Nossa equipe entrará em contato via WhatsApp</li>
                      <li>• Guarde o comprovante de pagamento</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const message = `Olá! Acabei de confirmar minha inscrição no curso ${turma?.name}. Gostaria de mais informações sobre os próximos passos.`;
                    const phoneNumber = "5581989479259";
                    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                    window.open(url, "_blank");
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar com a Equipe
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Fazer Nova Inscrição
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Step 1 - Personal Data */}
            <div className={`flex flex-col sm:flex-row items-center ${currentStep === 'personal' ? 'text-primary-light' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'personal' ? 'border-primary-light bg-primary-light text-white' : 'border-gray-300 bg-white'
              }`}>
                {currentStep === 'address' || currentStep === 'payment' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <>
                    <User className="h-5 w-5 block sm:hidden" />
                    <span className="hidden sm:block text-sm font-semibold">1</span>
                  </>
                )}
              </div>
              <span className="hidden sm:block ml-2 text-sm font-medium">Dados Pessoais</span>
              <span className="text-[10px] mt-1 sm:hidden">Dados</span>
            </div>
            
            <div className="w-6 sm:w-12 h-0.5 bg-gray-300" />
            
            {/* Step 2 - Address */}
            <div className={`flex flex-col sm:flex-row items-center ${currentStep === 'address' ? 'text-primary-light' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'address' ? 'border-primary-light bg-primary-light text-white' : 'border-gray-300 bg-white'
              }`}>
                {currentStep === 'payment' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <>
                    <MapPin className="h-5 w-5 block sm:hidden" />
                    <span className="hidden sm:block text-sm font-semibold">2</span>
                  </>
                )}
              </div>
              <span className="hidden sm:block ml-2 text-sm font-medium">Endereço</span>
              <span className="text-[10px] mt-1 sm:hidden">Endereço</span>
            </div>
            
            <div className="w-6 sm:w-12 h-0.5 bg-gray-300" />
            
            {/* Step 3 - Payment */}
            <div className={`flex flex-col sm:flex-row items-center ${currentStep === 'payment' ? 'text-primary-light' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'payment' ? 'border-primary-light bg-primary-light text-white' : 'border-gray-300 bg-white'
              }`}>
                {paymentStatus === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <>
                    <Wallet className="h-5 w-5 block sm:hidden" />
                    <span className="hidden sm:block text-sm font-semibold">3</span>
                  </>
                )}
              </div>
              <span className="hidden sm:block ml-2 text-sm font-medium">Pagamento</span>
              <span className="text-[10px] mt-1 sm:hidden">Pagar</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 'personal' ? (
          <motion.div
            key="personal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 sm:p-6 lg:p-8 border-0 shadow-xl">
              <form onSubmit={handlePersonalDataSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium text-sm sm:text-base">
                      Nome completo *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 z-10" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={personalData.name}
                        onValueChange={(name, value) => setPersonalData({ ...personalData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="cpf" className="text-gray-700 font-medium text-sm sm:text-base">
                      CPF *
                    </Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 z-10" />
                      <Input
                        id="cpf"
                        name="cpf"
                        format="cpf"
                        placeholder="000.000.000-00"
                        value={personalData.cpf}
                        onValueChange={(name, value) => setPersonalData({ ...personalData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium text-sm sm:text-base">
                      E-mail *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 z-10" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={personalData.email}
                        onValueChange={(name, value) => setPersonalData({ ...personalData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium text-sm sm:text-base">
                      WhatsApp *
                    </Label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 z-10" />
                      <Input
                        id="phone"
                        name="phone"
                        format="phone"
                        placeholder="(81) 9 9999-9999"
                        value={personalData.phone}
                        onValueChange={(name, value) => setPersonalData({ ...personalData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="workedAt" className="text-gray-700 font-medium text-sm sm:text-base">
                      Empresa onde trabalha
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 z-10" />
                      <Input
                        id="workedAt"
                        name="workedAt"
                        type="text"
                        placeholder="Nome da empresa"
                        value={personalData.workedAt}
                        onValueChange={(name, value) => setPersonalData({ ...personalData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="occupation" className="text-gray-700 font-medium text-sm sm:text-base">
                      Profissão
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 z-10" />
                      <Input
                        id="occupation"
                        name="occupation"
                        type="text"
                        placeholder="Sua profissão"
                        value={personalData.occupation}
                        onValueChange={(name, value) => setPersonalData({ ...personalData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Info */}
                <div className="bg-primary-light/5 rounded-lg p-3 sm:p-4 border border-primary-light/20">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary-light mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Turma selecionada:</p>
                      <p className="text-xs sm:text-sm text-gray-600">{turma?.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{turma?.landingPagesDates}</p>
                      <p className="text-xs sm:text-sm font-semibold text-primary-light mt-1 sm:mt-2">
                        Investimento: {formatCurrency(turma?.price)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Captcha */}
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="captcha" className="text-gray-700 font-medium text-xs sm:text-sm">
                    Verificação
                  </Label>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-gray-100 rounded-md border border-gray-300 flex items-center h-10 flex-1 sm:flex-initial">
                      <button
                        type="button"
                        onClick={generateCaptcha}
                        className="h-full px-2 hover:bg-gray-200 rounded-l-md transition-colors"
                        title="Novo"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                      <span className="px-2 sm:px-3 text-sm font-semibold text-gray-700">
                        {captcha.num1 || 0} + {captcha.num2 || 0} =
                      </span>
                    </div>
                    <Input
                      id="captcha"
                      type="text"
                      placeholder="?"
                      value={captcha.answer}
                      onChange={(e) => {
                        setCaptcha({ ...captcha, answer: e.target.value });
                        setCaptchaError(false);
                      }}
                      className={`h-10 flex-1 sm:flex-initial sm:w-20 text-center ${
                        captchaError ? 'border-red-500' : 'border-gray-300'
                      } focus:border-primary-light`}
                      required
                    />
                  </div>
                  {captchaError && (
                    <p className="text-xs text-red-500">
                      Resposta incorreta.
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  {onBack && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onBack}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={!isPersonalDataValid()}
                    className="flex-1 bg-primary-light hover:bg-primary-light/90 text-white"
                  >
                    Continuar para Pagamento
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : currentStep === 'address' ? (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 sm:p-6 lg:p-8 border-0 shadow-xl">
              <form onSubmit={handleAddressSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço de cobrança</h3>
                  <p className="text-sm text-gray-600 mb-2">Informe o endereço para emissão da nota fiscal</p>
                  <p className="text-xs text-gray-500 mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    💡 Digite o CEP e os campos de endereço serão preenchidos automaticamente
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-700 font-medium text-sm sm:text-base">
                      CEP *
                    </Label>
                    <div className="relative">
                      <Input
                        id="zipCode"
                        name="zipCode"
                        format="cep"
                        placeholder="00000-000"
                        value={addressData.zipCode}
                        onValueChange={(_, value) => {
                          const zipCodeValue = String(value);
                          setAddressData({ ...addressData, zipCode: zipCodeValue });
                          // Search CEP when user finishes typing (8 digits)
                          if (zipCodeValue.replace(/\D/g, '').length === 8) {
                            searchCep(zipCodeValue);
                          }
                        }}
                        className="border-gray-300 focus:border-primary-light pr-10"
                        required
                      />
                      {isSearchingCep && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary-light" />
                        </div>
                      )}
                    </div>
                    {addressData.zipCode && !isSearchingCep && addressData.city && (
                      <p className="text-xs text-green-600">✓ CEP válido</p>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="state" className="text-gray-700 font-medium text-sm sm:text-base">
                      Estado * {isSearchingCep && <span className="text-xs text-primary-light">(buscando...)</span>}
                    </Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="PE"
                      value={addressData.state}
                      onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                      className={`border-gray-300 focus:border-primary-light ${isSearchingCep ? 'bg-gray-50' : ''}`}
                      maxLength={2}
                      disabled={isSearchingCep}
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="city" className="text-gray-700 font-medium text-sm sm:text-base">
                      Cidade * {isSearchingCep && <span className="text-xs text-primary-light">(buscando...)</span>}
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="Recife"
                      value={addressData.city}
                      onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                      className={`border-gray-300 focus:border-primary-light ${isSearchingCep ? 'bg-gray-50' : ''}`}
                      disabled={isSearchingCep}
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="neighborhood" className="text-gray-700 font-medium text-sm sm:text-base">
                      Bairro * {isSearchingCep && <span className="text-xs text-primary-light">(buscando...)</span>}
                    </Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      type="text"
                      placeholder="Nome do bairro"
                      value={addressData.neighborhood}
                      onChange={(e) => setAddressData({ ...addressData, neighborhood: e.target.value })}
                      className={`border-gray-300 focus:border-primary-light ${isSearchingCep ? 'bg-gray-50' : ''}`}
                      disabled={isSearchingCep}
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1 sm:space-y-2">
                    <Label htmlFor="address" className="text-gray-700 font-medium text-sm sm:text-base">
                      Endereço * {isSearchingCep && <span className="text-xs text-primary-light">(buscando...)</span>}
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Rua, Avenida, etc."
                      value={addressData.address}
                      onChange={(e) => setAddressData({ ...addressData, address: e.target.value })}
                      className={`border-gray-300 focus:border-primary-light ${isSearchingCep ? 'bg-gray-50' : ''}`}
                      disabled={isSearchingCep}
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="addressNumber" className="text-gray-700 font-medium text-sm sm:text-base">
                      Número *
                    </Label>
                    <Input
                      id="addressNumber"
                      name="addressNumber"
                      type="text"
                      placeholder="123"
                      value={addressData.addressNumber}
                      onChange={(e) => setAddressData({ ...addressData, addressNumber: e.target.value })}
                      className="border-gray-300 focus:border-primary-light"
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="addressComplement" className="text-gray-700 font-medium text-sm sm:text-base">
                      Complemento
                    </Label>
                    <Input
                      id="addressComplement"
                      name="addressComplement"
                      type="text"
                      placeholder="Apto, Sala, etc. (opcional)"
                      value={addressData.addressComplement}
                      onChange={(e) => setAddressData({ ...addressData, addressComplement: e.target.value })}
                      className="border-gray-300 focus:border-primary-light"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('personal')}
                    className="w-full sm:flex-1 order-2 sm:order-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:flex-1 bg-primary-light hover:bg-primary-light/90 text-white order-1 sm:order-2"
                  >
                    Continuar para Pagamento
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 sm:p-6 lg:p-8 border-0 shadow-xl">
              {/* Payment Method Selection */}
              {isMobile ? (
                <div className="mb-6">
                  <Label htmlFor="paymentMethod" className="text-gray-700 font-medium mb-2 block">
                    Método de Pagamento
                  </Label>
                  <Select
                    name="paymentMethod"
                    options={[
                      availablePaymentMethods.includes('pix') && { id: 'pix', name: 'PIX' },
                      availablePaymentMethods.includes('boleto') && { id: 'boleto', name: 'Boleto Bancário' },
                      availablePaymentMethods.includes('cartaoCredito') && { id: 'cartaoCredito', name: 'Cartão de Crédito' }
                    ].filter(Boolean) as any[]}
                    state={paymentMethod}
                    onChange={(_, value) => setPaymentMethod(value as PaymentMethod)}
                    placeholder="Selecione o método de pagamento"
                  />
                </div>
              ) : (
                <div className="flex gap-2 mb-6 border-b">
                  {availablePaymentMethods.includes('pix') && (
                    <button
                      onClick={() => setPaymentMethod('pix')}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                        paymentMethod === 'pix'
                          ? 'border-primary-light text-primary-light'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <QrCode className="h-5 w-5" />
                      PIX
                    </button>
                  )}
                  {availablePaymentMethods.includes('boleto') && (
                    <button
                      onClick={() => setPaymentMethod('boleto')}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                        paymentMethod === 'boleto'
                          ? 'border-primary-light text-primary-light'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      Boleto
                    </button>
                  )}
                  {availablePaymentMethods.includes('cartaoCredito') && (
                    <button
                      onClick={() => setPaymentMethod('cartaoCredito')}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                        paymentMethod === 'cartaoCredito'
                          ? 'border-primary-light text-primary-light'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <CreditCardIcon className="h-5 w-5" />
                      Cartão de Crédito
                    </button>
                  )}
                </div>
              )}

              {/* Payment Content */}
              <AnimatePresence mode="wait">
                {paymentMethod === 'pix' && (
                  <motion.div
                    key="pix"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {!pixData.qrCode ? (
                      <div className="text-center py-8">
                        <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                          Clique no botão abaixo para gerar o QR Code do PIX
                        </p>
                        <Button
                          onClick={generatePixPayment}
                          disabled={pixData.isGenerating || isProcessingPayment}
                          className="bg-primary-light hover:bg-primary-light/90 text-white"
                        >
                          {(pixData.isGenerating || isProcessingPayment) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando QR Code...
                            </>
                          ) : (
                            <>
                              <QrCode className="mr-2 h-4 w-4" />
                              Gerar QR Code PIX
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* QR Code */}
                        <div className="text-center">
                          <div className="bg-gray-100 p-8 rounded-lg inline-block">
                            <div className="w-48 h-48 bg-white p-2 rounded">
                              {pixData.qrCode ? (
                                <img 
                                  src={pixData.qrCode.startsWith('data:') ? pixData.qrCode : `data:image/png;base64,${pixData.qrCode}`}
                                  alt="QR Code PIX"
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-300 rounded flex items-center justify-center">
                                  <QrCode className="h-24 w-24 text-gray-500" />
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-4">
                            Escaneie o QR Code com o app do seu banco
                          </p>
                        </div>

                        {/* Copy Paste Code */}
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">
                            Ou copie o código PIX:
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              value={pixData.copyPasteCode}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(pixData.copyPasteCode, 'Código PIX')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Payment Status */}
                        {paymentStatus === 'processing' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Clock className="h-5 w-5 text-primary-light animate-pulse" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  Aguardando pagamento...
                                </p>
                                <p className="text-sm text-gray-600">
                                  Após o pagamento, a confirmação é automática
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                              <motion.div 
                                className="bg-primary-light h-1 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{
                                  duration: 10,
                                  repeat: Infinity,
                                  ease: "linear"
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {paymentStatus === 'completed' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium text-green-900">
                                  Pagamento confirmado!
                                </p>
                                <p className="text-sm text-green-700">
                                  Sua inscrição foi realizada com sucesso.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {paymentMethod === 'boleto' && (
                  <motion.div
                    key="boleto"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {!boletoData.barCode ? (
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                          Clique no botão abaixo para gerar o boleto
                        </p>
                        <Button
                          onClick={generateBoleto}
                          disabled={boletoData.isGenerating || isProcessingPayment}
                          className="bg-primary-light hover:bg-primary-light/90 text-white"
                        >
                          {(boletoData.isGenerating || isProcessingPayment) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando Boleto...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Gerar Boleto
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">
                            Linha digitável do boleto:
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              value={boletoData.barCode}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(boletoData.barCode, 'Linha digitável')}
                              title="Copiar linha digitável"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {boletoData.bankSlipUrl && (
                          <div className="flex justify-center">
                            <Button
                              onClick={() => window.open(boletoData.bankSlipUrl, '_blank')}
                              className="bg-primary-light hover:bg-primary-light/90 text-white"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Abrir Boleto
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-900">
                                Importante
                              </p>
                              <p className="text-sm text-yellow-700">
                                O boleto tem vencimento em 3 dias úteis. Após o pagamento, 
                                a confirmação pode levar até 2 dias úteis.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {paymentMethod === 'cartaoCredito' && (
                  <motion.div
                    key="credit-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                      {/* Card Preview - Left side on desktop, top on mobile */}
                      <div className="order-1 lg:order-1">
                        <div className="space-y-3 lg:sticky lg:top-24">
                          <div className="flex items-center justify-center">
                            <div className="w-full max-w-sm lg:max-w-none">
                              <CreditCard>
                                <CreditCardFlipper flipped={isFlipped}>
                                  <CreditCardFront className="bg-gradient-to-br from-gray-900 to-black">
                                    <CreditCardChip />
                                    <div className="absolute top-3 right-3 w-16 h-10 lg:w-20 lg:h-12">
                                      {cardBrand ? (
                                        <CardBrandLogo brand={cardBrand} />
                                      ) : (
                                        <div className="w-full h-full bg-white/10 rounded-md" />
                                      )}
                                    </div>
                                    <div className="absolute bottom-0 left-0 pb-4">
                                      <CreditCardName className="text-white text-sm lg:text-base uppercase">
                                        {cardData.name || 'SEU NOME'}
                                      </CreditCardName>
                                    </div>
                                  </CreditCardFront>
                                  <CreditCardBack className="bg-gradient-to-br from-gray-900 to-black">
                                    <CreditCardMagStripe />
                                    <div className="absolute top-[35%] left-0 w-full px-6 space-y-3">
                                      <CreditCardNumber className="text-white text-base lg:text-xl">
                                        {cardData.number || '0000 0000 0000 0000'}
                                      </CreditCardNumber>
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                          <div>
                                            <p className="text-white text-xs uppercase opacity-70">Validade</p>
                                            <CreditCardExpiry className="text-white text-sm lg:text-base">
                                              {cardData.expiry || 'MM/AA'}
                                            </CreditCardExpiry>
                                          </div>
                                          <div>
                                            <p className="text-white text-xs uppercase opacity-70">CVV</p>
                                            <CreditCardCvv className="text-white text-sm lg:text-base">
                                              {cardData.cvv || '***'}
                                            </CreditCardCvv>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </CreditCardBack>
                                </CreditCardFlipper>
                              </CreditCard>
                            </div>
                          </div>
                          {/* Manual flip button */}
                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsFlipped(!isFlipped)}
                              className="text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {isFlipped ? 'Ver frente' : 'Ver verso'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Card Form - Right side on desktop, bottom on mobile */}
                      <div className="order-2 lg:order-2 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Nome no Cartão</Label>
                          <Input
                            id="cardName"
                            placeholder="NOME COMO ESTÁ NO CARTÃO"
                            value={cardData.name}
                            onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                            onFocus={() => setIsFlipped(false)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Número do Cartão</Label>
                          <Input
                            id="cardNumber"
                            placeholder="0000 0000 0000 0000"
                            value={cardData.number}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, '');
                              const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                              setCardData({ ...cardData, number: formatted });
                              const brand = detectCardBrand(value);
                              setCardBrand(brand);
                            }}
                            maxLength={19}
                            onFocus={() => setIsFlipped(true)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardExpiry">Validade</Label>
                            <Input
                              id="cardExpiry"
                              placeholder="MM/AA"
                              value={cardData.expiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length >= 3) {
                                  value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                }
                                setCardData({ ...cardData, expiry: value });
                              }}
                              maxLength={5}
                              onFocus={() => setIsFlipped(true)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="cardCvv">CVV</Label>
                            <Input
                              id="cardCvv"
                              placeholder="123"
                              value={cardData.cvv}
                              onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                              maxLength={3}
                              onFocus={() => setIsFlipped(true)}
                            />
                          </div>
                        </div>

                        {turma.dividedIn && turma.dividedIn > 1 && (
                          <div className="space-y-2">
                            <Label htmlFor="installments">Parcelamento</Label>
                            <Select
                              name="installments"
                              options={installmentOptions}
                              state={cardData.installments}
                              onChange={(_, value) => setCardData({ ...cardData, installments: String(value) })}
                              placeholder="Selecione o parcelamento"
                            />
                          </div>
                        )}

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total:</span>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary-light">
                                {cardData.installments === "1"
                                  ? formatCurrency(formatPrice(turma.discountPrice || turma.price))
                                  : `${cardData.installments}x ${formatCurrency(calculateInstallmentValue())}`
                                }
                              </p>
                              {cardData.installments !== "1" && (
                                <p className="text-sm text-gray-500">
                                  Total: {formatCurrency(formatPrice(turma.discountPrice || turma.price))}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleCardPayment}
                          disabled={!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv || isPaymentProcessing}
                          className="w-full bg-primary-light hover:bg-primary-light/90 text-white"
                        >
                          {isPaymentProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processando pagamento...
                            </>
                          ) : (
                            <>
                              <CreditCardIcon className="mr-2 h-4 w-4" />
                              Finalizar Pagamento
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Back Button */}
              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('address')}
                  disabled={isPaymentProcessing || paymentStatus === 'processing'}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Endereço
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={(open) => {
        // Don't allow closing if processing
        if (!isModalProcessing) {
          setShowConfirmModal(open);
          // Reset processing state if modal is closed manually (not by processing)
          if (!open) {
            // Only reset if we're not currently processing a payment
            if (!isProcessing) {
              setIsModalProcessing(false);
              setPixData({ ...pixData, isGenerating: false });
              setBoletoData({ ...boletoData, isGenerating: false });
            }
          }
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Informações</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-left space-y-2">
                  <div className="font-semibold text-gray-900">Dados Pessoais:</div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div><span className="text-gray-600">Nome:</span> {personalData.name}</div>
                    <div><span className="text-gray-600">CPF:</span> {personalData.cpf}</div>
                    <div><span className="text-gray-600">E-mail:</span> {personalData.email}</div>
                    <div><span className="text-gray-600">WhatsApp:</span> {personalData.phone}</div>
                    {personalData.workedAt && (
                      <div><span className="text-gray-600">Empresa:</span> {personalData.workedAt}</div>
                    )}
                    {personalData.occupation && (
                      <div><span className="text-gray-600">Profissão:</span> {personalData.occupation}</div>
                    )}
                  </div>
                </div>
                
                <div className="text-left space-y-2">
                  <div className="font-semibold text-gray-900">Curso:</div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div><span className="text-gray-600">Turma:</span> {turma?.name}</div>
                    <div><span className="text-gray-600">Data:</span> {turma?.landingPagesDates}</div>
                  </div>
                </div>
                
                <div className="text-left space-y-2">
                  <div className="font-semibold text-gray-900">Pagamento:</div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div><span className="text-gray-600">Método:</span> {
                      paymentMethod === 'pix' ? 'PIX' :
                      paymentMethod === 'boleto' ? 'Boleto Bancário' :
                      'Cartão de Crédito'
                    }</div>
                    <div className="text-lg font-semibold text-primary-light">
                      <span className="text-gray-600">Valor:</span> {
                        paymentMethod === 'cartaoCredito' && cardData.installments !== "1"
                          ? `${cardData.installments}x de ${formatCurrency(calculateInstallmentValue())}`
                          : formatCurrency(formatPrice(turma?.discountPrice || turma?.price || 0))
                      }
                    </div>
                    {paymentMethod === 'cartaoCredito' && cardData.installments !== "1" && (
                      <div className="text-xs text-gray-500">
                        Total: {formatCurrency(formatPrice(turma?.discountPrice || turma?.price || 0))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 pt-2">
                  Por favor, confirme que todas as informações estão corretas antes de prosseguir com o pagamento.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isModalProcessing}>Revisar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                // Don't close modal, let the payment action handle it
                pendingPaymentAction();
              }}
              disabled={isModalProcessing}
              className="bg-primary-light hover:bg-primary-light/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isModalProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando pagamento...
                </>
              ) : (
                'Confirmar e Pagar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CheckoutForm;