import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get, post } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, Users, Award, Shield, ShieldCheck, HardHat, CheckCircle, Star, MessageCircle, Gift, ArrowRight, User, Mail, RefreshCw, Building, Briefcase, CalendarDays, GraduationCap, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "./-components/NavBar";
import Footer from "./-components/Footer";
import Clients from "./-components/Clients";

export const Route = createFileRoute("/_index/turma/$id")({
  component: TurmaLandingPage,
});

interface InstructorDetails {
  id: number;
  name: string;
  companyId: number;
  email?: string;
  cpf?: string;
  phone?: string;
  imageUrl?: string;
  signatureUrl?: string;
  active: boolean;
  curriculum?: string;
  highlight?: string;
  formation?: string;
  formationCode?: string;
  createdAt: string;
  updatedAt: string;
  inactiveAt: string | null;
}

interface Instructor {
  id: number;
  classId: number;
  instructorId: number;
  active: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  inactiveAt: string | null;
  instructor?: InstructorDetails;
}

interface Review {
  generalRating: number;
  opinionRating: string;
  trainee: {
    name: string;
    occupation?: string | null;
    customer?: {
      name: string;
    } | null;
  };
}

interface Course {
  id: number;
  name: string;
  courseId: number;
  price: string;
  oldPrice: string | null;
  hoursDuration: number;
  openClass: boolean;
  description: string;
  imageUrl: string;
  videoUrl?: string | null;
  videoTitle?: string | null;
  videoSubtitle?: string | null;
  videoDescription?: string | null;
  initialDate: string;
  finalDate: string;
  landingPagesDates: string;
  minimumQuorum: number | null;
  maxSubscriptions: number | null;
  active: boolean;
  gradeTheory?: string;
  gradePracticle?: string;
  faq?: string;
  gifts?: string;
  dividedIn?: number | null;
  course?: {
    id: number;
    name: string;
    description: string;
    yearOfValidation?: number;
    reviews?: Review[];
  };
  instructors?: Instructor[];
  _count?: {
    subscriptions: number;
  };
}

interface ApiResponse {
  total: number;
  rows: Course[];
}

function TurmaLandingPage() {
  const { id } = Route.useParams();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    workedAt: "",
    occupation: ""
  });
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: "" });
  const [captchaError, setCaptchaError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleWhatsApp = (message?: string) => {
    const defaultMessage = message || "Olá! Gostaria de mais informações sobre o curso.";
    const phoneNumber = "5581989479259";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(url, "_blank");
  };

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ num1, num2, answer: "" });
    setCaptchaError(false);
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Generate new captcha when user scrolls to form
    generateCaptcha();
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.cpf.trim() !== "" &&
      captcha.answer.trim() !== ""
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate captcha
    const correctAnswer = captcha.num1 + captcha.num2;
    if (parseInt(captcha.answer) !== correctAnswer) {
      setCaptchaError(true);
      generateCaptcha(); // Generate new captcha on error
      toast({
        title: "Verificação incorreta",
        description: "Por favor, responda corretamente a soma matemática.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const subscriptionData = {
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        workedAt: formData.workedAt || "Não informado",
        occupation: formData.occupation || "Não informado",
        companyId: 1,
        classId: parseInt(id)
      };
      
      // Send to API
      await post("subscription", "subscribe", subscriptionData);
      
      // Show success toast
      toast({
        title: "Inscrição realizada com sucesso!",
        description: "Você será redirecionado para o WhatsApp para finalizar o processo.",
        variant: "default",
      });
      
      // Clear form
      setFormData({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        workedAt: "",
        occupation: ""
      });
      generateCaptcha();
      
      // Wait a moment before redirecting to WhatsApp
      setTimeout(() => {
        const message = `Olá! Inscrição realizada com sucesso no curso ${turma?.name}.
    
Dados do inscrito:
Nome: ${formData.name}
CPF: ${formData.cpf}
E-mail: ${formData.email}
Telefone: ${formData.phone}
Empresa: ${formData.workedAt || "Não informado"}
Profissão: ${formData.occupation || "Não informado"}

Turma: ${turma?.landingPagesDates}`;
        
        handleWhatsApp(message);
      }, 1500);
      
    } catch (error: any) {
      console.error("Erro ao enviar inscrição:", error);
      
      // Show error toast
      toast({
        title: "Erro ao realizar inscrição",
        description: error?.response?.data?.message || "Por favor, verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data, isLoading, isError } = useQuery<ApiResponse | undefined>({
    queryKey: ["turma", id],
    queryFn: async () => {
      const params = [
        { key: "id", value: id },
        // Removido o filtro active para buscar turmas inativas também
        { key: "show", value: ["course", "instructors", "_count"] },
      ];
      return get("classes", "", params);
    },
  });

  const turma = data?.rows?.[0];

  // Generate initial captcha when component mounts
  useState(() => {
    generateCaptcha();
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(numValue);
  };

  const parseGrade = (grade: string | undefined) => {
    if (!grade) return [];
    return grade.split('#').filter(item => item.trim());
  };

  const parseFaq = (faqString: string | undefined): Array<{ question: string; answer: string }> => {
    if (!faqString) return [];
    try {
      return JSON.parse(faqString);
    } catch {
      return [];
    }
  };

  const parseGifts = (gifts: string | undefined) => {
    if (!gifts) return [];
    return gifts.split('#').filter(item => item.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ colorScheme: 'light' }}>
        <Loader2 className="h-12 w-12 animate-spin text-primary-light" />
      </div>
    );
  }

  if (isError || !turma) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ colorScheme: 'light' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1F2937' }}>Turma não encontrada</h2>
          <p style={{ color: '#4B5563' }}>A turma que você está procurando não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  // Check if course is inactive or has ended
  const isInactive = !turma.active;
  const isPastDate = new Date(turma.initialDate) < new Date();
  const isCourseUnavailable = isInactive || isPastDate;

  // If course is unavailable, show full page with message
  if (isCourseUnavailable) {
    return (
      <div className="min-h-screen bg-white" style={{ colorScheme: 'light' }}>
        {/* Navigation */}
        <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />

        {/* Message Section */}
        <section className="pt-24 pb-20 px-4">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-8">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#111827' }}>
                Turma Encerrada
              </h1>
              
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg mb-8 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold mb-3" style={{ color: '#1F2937' }}>
                  {turma.name}
                </h2>
                <p className="mb-4" style={{ color: '#4B5563' }}>
                  Esta turma já foi finalizada ou as inscrições foram encerradas. 
                  Mas não se preocupe! Temos novas turmas disponíveis para você.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                  <Clock className="h-4 w-4" />
                  <span>Período: {turma.landingPagesDates}</span>
                </div>
              </div>

              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: '#374151' }}>
                Confira nossa agenda completa e encontre a próxima turma disponível 
                para o curso que você deseja.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-primary-light hover:bg-primary-light/90 text-white shadow-lg"
                  onClick={() => window.location.href = '/treinamento'}
                >
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Ver Agenda Completa
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-gray-300"
                  onClick={() => handleWhatsApp(`Olá! Gostaria de informações sobre as próximas turmas do curso ${turma.name}`)}
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Falar com Consultor
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Clients Section */}
        <Clients />

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  const faqs = parseFaq(turma.faq);
  const theoryTopics = parseGrade(turma.gradeTheory);
  const practicalTopics = parseGrade(turma.gradePracticle);
  const gifts = parseGifts(turma.gifts);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
      <div className="min-h-screen bg-white" style={{ colorScheme: 'light' }}>
      {/* Navigation */}
      <NavBar cart={cart} setCart={setCart} handleWhatsApp={handleWhatsApp} />

      {/* Hero Section */}
      <section className="pt-24 pb-8 sm:pb-12 lg:pb-16 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full text-left"
            >
              <div className="flex flex-wrap gap-2 mb-4 font-thin">
                {/* <Badge className="bg-muted text-foreground border-0 hover:bg-primary-light/20 transition-colors cursor-default">
                  {turma.openClass ? "Turma Aberta" : "Em Breve"}
                </Badge> */}
                {turma.course?.yearOfValidation && (
                  <Badge className="bg-green-100 text-green-700 border-0 hover:bg-green-200 hover:text-green-800 transition-colors cursor-default">
                    Validade: {turma.course.yearOfValidation} {turma.course.yearOfValidation === 1 ? 'ano' : 'anos'}
                  </Badge>
                )}
              </div>
              
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 lg:mb-6 leading-tight" style={{ color: '#111827' }}>
                {turma.name}
              </h1>
              
              <p className="text-base sm:text-lg mb-4 lg:mb-6 leading-relaxed max-w-2xl" style={{ color: '#4B5563' }}>
                {turma.description}
              </p>

              {/* Gifts */}
              {gifts.length > 0 && (
                <div className="flex items-center justify-start gap-3 mb-6 lg:mb-8">
                  <Gift className="h-5 w-5 text-primary-light flex-shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {gifts.map((gift, index) => (
                      <span key={index} className="text-sm px-3 py-1 rounded-full" style={{ color: '#4B5563', backgroundColor: '#F3F4F6' }}>
                        {gift}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-6 lg:mb-8">
                {(() => {
                  const isFull = turma.maxSubscriptions && turma._count && turma._count.subscriptions >= turma.maxSubscriptions;
                  
                  return (
                    <>
                      <Button 
                        size="lg" 
                        className={`shadow-lg ${
                          isFull 
                            ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed opacity-50' 
                            : 'bg-primary-light hover:bg-primary-light/90 text-white cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isFull) {
                            scrollToForm();
                          }
                        }}
                        disabled={!!isFull}
                      >
                        <span className={isFull ? 'line-through' : ''}>
                          {isFull ? 'Turma Lotada' : 'Inscreva-se Agora'}
                        </span>
                        {!isFull && <ArrowRight className="ml-2 h-5 w-5" />}
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="border-gray-300 cursor-pointer"
                        onClick={() => handleWhatsApp(`Olá! Gostaria de mais informações sobre o curso ${turma.name}`)}
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Falar com Consultor
                      </Button>
                    </>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2" style={{ color: '#4B5563' }}>
                  <Calendar className="h-4 w-4" />
                  <span>{turma.landingPagesDates}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2" style={{ color: '#4B5563' }}>
                    <Clock className="h-4 w-4" />
                    <span>{turma.hoursDuration} horas</span>
                  </div>
                  {turma.maxSubscriptions && (
                    <div className="flex items-center gap-2" style={{ color: '#4B5563' }}>
                      <Users className="h-4 w-4" />
                      <span>{turma.maxSubscriptions} vagas</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar for Enrollments */}
              {turma.maxSubscriptions && turma._count && (
                <div className="mt-6 max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: '#374151' }}>
                      Vagas Preenchidas
                    </span>
                    <span className="text-sm font-semibold text-primary-light">
                      {turma._count.subscriptions} / {turma.maxSubscriptions}
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((turma._count.subscriptions / turma.maxSubscriptions) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute h-full bg-gradient-to-r from-primary-light to-primary-light/80 rounded-full"
                    />
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {turma.maxSubscriptions - turma._count.subscriptions > 0 ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-700 font-medium">
                          {turma.maxSubscriptions - turma._count.subscriptions} vagas disponíveis
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-yellow-500">
                            <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping" />
                          </div>
                        </div>
                        <span className="text-xs text-yellow-700 font-medium">
                          Max inscritos atingidos
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative w-full"
            >
              {turma.imageUrl ? (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={turma.imageUrl}
                    alt={turma.name}
                    className="w-full h-[350px] sm:h-[400px] lg:h-[500px] object-cover"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-primary-light/20 to-primary-light/40 rounded-2xl h-[350px] sm:h-[400px] lg:h-[500px] flex items-center justify-center">
                  <Award className="h-24 sm:h-28 lg:h-32 w-24 sm:w-28 lg:w-32 text-primary-light/50" />
                </div>
              )}

              {/* Floating Price Card with 3D Effect */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8">
                <div className="relative">
                  {/* Dark shadow layer underneath - simulates floating effect */}
                  <div 
                    className="absolute inset-x-2 top-6 bottom-[-10px] bg-black/40 rounded-2xl blur-xl"
                    style={{
                      transform: 'perspective(600px) rotateX(5deg) scale(0.95)',
                    }}
                  />
                  
                  {/* Semi-transparent backdrop for better blend */}
                  <div className="absolute -inset-4 bg-black/10 backdrop-blur-sm rounded-3xl" />
                  
                  {/* Main white card */}
                  <div 
                    className="relative bg-white rounded-xl p-4 sm:p-5 transform-gpu transition-all duration-500 hover:scale-105 hover:-translate-y-1"
                    style={{
                      boxShadow: `
                        0 1px 3px rgba(0,0,0,0.12),
                        0 1px 2px rgba(0,0,0,0.24),
                        0 10px 40px rgba(0,0,0,0.3),
                        0 20px 60px rgba(0,0,0,0.22)
                      `
                    }}
                  >
                    <div className="relative z-10">
                      <div className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                        Investimento
                      </div>
                      {turma.oldPrice && (
                        <div className="text-gray-400 line-through text-xs">
                          {formatCurrency(turma.oldPrice)}
                        </div>
                      )}
                      <div className="text-xl sm:text-2xl font-bold" style={{ color: '#111827' }}>
                        {formatCurrency(turma.price)}
                      </div>
                      {turma.dividedIn && turma.dividedIn > 1 && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          Em até {turma.dividedIn}x
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
        
        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 sm:mt-12 lg:mt-16 bg-gray-50 -mx-4 px-4 py-6 sm:mx-0 sm:bg-transparent sm:p-0"
        >
          <div className="flex flex-wrap items-center justify-start sm:justify-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2 cursor-default" style={{ color: '#4B5563' }}>
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span>Certificado Reconhecido</span>
            </div>
            <div className="flex items-center gap-2 cursor-default" style={{ color: '#4B5563' }}>
              <HardHat className="h-5 w-5 text-blue-600" />
              <span>Instrutores Certificados</span>
            </div>
            <div className="flex items-center gap-2 cursor-default" style={{ color: '#4B5563' }}>
              <Users className="h-5 w-5 text-purple-600" />
              <span>+1000 Alunos Formados</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-10 lg:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: '#111827' }}>
              O que você vai aprender
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
              Conteúdo completo e atualizado com as melhores práticas do mercado
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* Theory Topics */}
            {theoryTopics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-4 sm:p-6 lg:p-8 h-full border-0 shadow-lg" style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                      <Award className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold" style={{ color: '#111827' }}>Conteúdo Teórico</h3>
                  </div>
                  <ul className="space-y-3">
                    {theoryTopics.map((topic, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm sm:text-base" style={{ color: '#374151' }}>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* Practical Topics */}
            {practicalTopics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="p-4 sm:p-6 lg:p-8 h-full border-0 shadow-lg" style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold" style={{ color: '#111827' }}>Conteúdo Prático</h3>
                  </div>
                  <ul className="space-y-3">
                    {practicalTopics.map((topic, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm sm:text-base" style={{ color: '#374151' }}>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}
          </div>

        </div>
      </section>

      {/* Video Section */}
      {turma.videoUrl && (
        <section id="video" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Video Player - Left Side on Desktop, Top on Mobile */}
                <div className="order-1 lg:order-1">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black aspect-video">
                    {turma.videoUrl.includes('youtube.com') || turma.videoUrl.includes('youtu.be') ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={turma.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        title={turma.videoTitle || "Vídeo do curso"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        style={{ border: 0 }}
                        loading="lazy"
                      />
                    ) : (
                      <video
                        controls
                        className="w-full h-full"
                        poster={turma.imageUrl}
                        preload="metadata"
                      >
                        <source src={turma.videoUrl} type="video/mp4" />
                        Seu navegador não suporta vídeos HTML5.
                      </video>
                    )}
                    
                    {/* Play overlay for visual cue */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                        <PlayCircle className="h-16 w-16 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Info - Right Side on Desktop, Bottom on Mobile */}
                <div className="order-2 lg:order-2">
                  {turma.videoTitle && (
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                      {turma.videoTitle}
                    </h2>
                  )}
                  
                  {turma.videoSubtitle && (
                    <h3 className="text-lg sm:text-xl text-primary-light font-medium mb-4">
                      {turma.videoSubtitle}
                    </h3>
                  )}
                  
                  {turma.videoDescription && (
                    <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                      {turma.videoDescription}
                    </p>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      size="lg" 
                      className="bg-primary-light hover:bg-primary-light/90 text-white shadow-lg"
                      onClick={scrollToForm}
                    >
                      Inscreva-se Agora
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-gray-300"
                      onClick={() => handleWhatsApp(`Olá! Vi o vídeo sobre o curso ${turma.name} e gostaria de mais informações`)}
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Mais Informações
                    </Button>
                  </div>

                  {/* Video badges */}
                  <div className="mt-6 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <PlayCircle className="h-4 w-4 text-primary-light" />
                      <span>Conteúdo Exclusivo</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award className="h-4 w-4 text-primary-light" />
                      <span>Material Didático</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Why Choose Us Section */}
      <section id="why-choose" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-10 lg:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: '#111827' }}>
              Por que escolher a WorkSafe?
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
              Somos referência em treinamentos de segurança do trabalho
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                icon: Award,
                title: "Certificação Reconhecida",
                description: "Certificados válidos em todo território nacional",
              },
              {
                icon: Users,
                title: "Turmas Reduzidas",
                description: "Atenção personalizada para cada aluno",
              },
              {
                icon: Shield,
                title: "Instutores Especializados",
                description: "Profissionais com vasta experiência no mercado",
              },
              {
                icon: Clock,
                title: "Horários Flexíveis",
                description: "Turmas em diversos horários para sua conveniência",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="p-4 sm:p-6 text-center h-full border-0 shadow-md hover:shadow-xl transition-shadow cursor-default" style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary-light/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <item.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-light" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: '#111827' }}>{item.title}</h3>
                  <p className="text-xs sm:text-sm" style={{ color: '#4B5563' }}>{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructors Section - Compact Carousel */}
      {turma.instructors && turma.instructors.length > 0 && (
        <section id="instructors" className="py-10 sm:py-12 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-6 sm:mb-8"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2" style={{ color: '#111827' }}>
                Instrutores do Curso
              </h2>
              <p className="text-sm sm:text-base" style={{ color: '#4B5563' }}>
                Profissionais certificados e experientes
              </p>
            </motion.div>

            <Carousel
              className="w-full max-w-5xl mx-auto"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-4">
                {turma.instructors
                  .filter(inst => inst.active !== false && inst.instructor)
                  .map((instructorData, index) => {
                    const instructor = instructorData.instructor!;
                    return (
                      <CarouselItem key={instructorData.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <div className="h-full">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="h-full"
                          >
                            <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow h-full min-h-[360px]">
                              <div className="flex flex-col items-center text-center justify-between h-full">
                                <div className="flex flex-col items-center">
                                  {/* Avatar at Top */}
                                  <div className="mb-4">
                                    {instructor.imageUrl ? (
                                      <img
                                        src={instructor.imageUrl}
                                        alt={instructor.name}
                                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-primary-light/20"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-primary-light/10 to-primary-light/20 flex items-center justify-center">
                                        <GraduationCap className="h-12 w-12 sm:h-14 sm:w-14 text-primary-light/70" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Name */}
                                  <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#111827' }}>
                                    {instructor.name}
                                  </h3>
                                  
                                  {/* Formation */}
                                  {instructor.formation && (
                                    <p className="text-sm mt-1" style={{ color: '#4B5563' }}>
                                      {instructor.formation}
                                    </p>
                                  )}
                                  
                                  {/* Formation Code */}
                                  {instructor.formationCode && (
                                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                      {instructor.formationCode}
                                    </p>
                                  )}
                                  
                                  {/* Highlight */}
                                  {instructor.highlight && (
                                    <span className="text-xs font-medium text-primary-light mt-1">
                                      {instructor.highlight}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Curriculum - split by # and join with comma */}
                                {instructor.curriculum && (
                                  <div className="mt-4 px-2">
                                    <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                                      {instructor.curriculum
                                        .split('#')
                                        .filter(item => item.trim())
                                        .join(', ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </CarouselItem>
                    );
                  })}
              </CarouselContent>
              {turma.instructors.filter(inst => inst.active !== false).length > 1 && (
                <>
                  <CarouselPrevious className="absolute -left-4 lg:-left-12 bg-white hover:bg-gray-100 border-gray-200" />
                  <CarouselNext className="absolute -right-4 lg:-right-12 bg-white hover:bg-gray-100 border-gray-200" />
                </>
              )}
            </Carousel>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-10 sm:py-12 bg-gradient-to-r from-primary-light to-primary-light/80">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Garanta sua vaga agora!
            </h2>
            <p className="text-lg text-white/90 mb-5">
              Vagas limitadas. Garanta sua participação nesta turma exclusiva.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-primary-light hover:bg-gray-100"
              onClick={scrollToForm}
            >
              Inscreva-se Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Reviews Section */}
      {turma.course?.reviews && turma.course.reviews.length > 0 && (
        <section id="reviews" className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8 sm:mb-10 lg:mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: '#111827' }}>
                O que nossos alunos dizem
              </h2>
              <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
                Avaliações reais de quem já fez o curso
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {turma.course.reviews.map((review, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="p-4 sm:p-5 lg:p-6 h-full border-0 shadow-lg cursor-default" style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>
                    <div className="flex gap-1 mb-4">
                      {[...Array(review.generalRating || 5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="mb-4 italic" style={{ color: '#374151' }}>"{review.opinionRating}"</p>
                    <div>
                      <p className="font-semibold" style={{ color: '#111827' }}>{review.trainee?.name || 'Aluno'}</p>
                      {review.trainee?.occupation && (
                        <p className="text-sm" style={{ color: '#4B5563' }}>{review.trainee.occupation}</p>
                      )}
                      {review.trainee?.customer && (
                        <p className="text-xs" style={{ color: '#6B7280' }}>{review.trainee.customer.name}</p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
              {/* Left Side - Title and Description */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:sticky lg:top-32 lg:self-start"
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Perguntas Frequentes
                </h2>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  Reunimos as principais dúvidas sobre nossos cursos para facilitar sua decisão. 
                  Se não encontrar sua resposta aqui, fique à vontade para nos contatar.
                </p>
                <div className="mt-8">
                  <Button 
                    variant="outline" 
                    className="border-gray-300"
                    onClick={() => handleWhatsApp("Olá! Tenho uma dúvida sobre o curso.")}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Fazer uma pergunta
                  </Button>
                </div>
              </motion.div>

              {/* Right Side - FAQ Items */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-200 pb-4 last:border-0"
                  >
                    <button
                      className="w-full text-left group cursor-pointer"
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <div className={`w-6 h-6 rounded-full border-2 ${openFaq === index ? 'border-primary-light bg-primary-light' : 'border-gray-300'} flex items-center justify-center transition-all duration-300`}>
                            <span className={`text-sm font-semibold ${openFaq === index ? 'text-white' : 'text-gray-500'}`}>
                              {openFaq === index ? '−' : '+'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-light transition-colors">
                            {faq.question}
                          </h3>
                          <AnimatePresence>
                            {openFaq === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-3 overflow-hidden"
                              >
                                <p className="text-gray-600 leading-relaxed pr-4">
                                  {faq.answer}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Registration Form Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="mx-auto max-w-4xl px-4" ref={formRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {(() => {
              const isFull = turma?.maxSubscriptions && turma._count && turma._count.subscriptions >= turma.maxSubscriptions;
              
              if (isFull) {
                return (
                  <div className="text-center">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 mb-8">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="relative">
                          <div className="w-3 h-3 rounded-full bg-yellow-500">
                            <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-yellow-800">
                          Max Inscritos Atingidos
                        </h3>
                      </div>
                      <p className="text-yellow-700 mb-6">
                        Infelizmente, todas as vagas para esta turma já foram preenchidas.
                      </p>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                        onClick={() => handleWhatsApp(`Olá! Gostaria de informações sobre a próxima turma do curso ${turma.name}`)}
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Consultar Próximas Turmas
                      </Button>
                    </div>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="text-center mb-8 sm:mb-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                      Faça sua inscrição
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600">
                      Preencha o formulário abaixo e garanta sua vaga
                    </p>
                  </div>

                  <Card className="p-6 sm:p-8 border-0 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
              <form onSubmit={handleSubmit} className="space-y-6" style={{ colorScheme: 'light' }}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">
                      Nome completo *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onValueChange={(name, value) => setFormData({ ...formData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light bg-white text-gray-900"
                        style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-gray-700 font-medium">
                      CPF *
                    </Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        id="cpf"
                        name="cpf"
                        format="cpf"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onValueChange={(name, value) => setFormData({ ...formData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light bg-white text-gray-900"
                        style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">
                      E-mail *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onValueChange={(name, value) => setFormData({ ...formData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light bg-white text-gray-900"
                        style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium">
                      WhatsApp *
                    </Label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        id="phone"
                        name="phone"
                        format="phone"
                        placeholder="(81) 9 9999-9999"
                        value={formData.phone}
                        onValueChange={(name, value) => setFormData({ ...formData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light bg-white text-gray-900"
                        style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workedAt" className="text-gray-700 font-medium">
                      Empresa onde trabalha
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        id="workedAt"
                        name="workedAt"
                        type="text"
                        placeholder="Nome da empresa"
                        value={formData.workedAt}
                        onValueChange={(name, value) => setFormData({ ...formData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light bg-white text-gray-900"
                        style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occupation" className="text-gray-700 font-medium">
                      Profissão
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        id="occupation"
                        name="occupation"
                        type="text"
                        placeholder="Sua profissão"
                        value={formData.occupation}
                        onValueChange={(name, value) => setFormData({ ...formData, [name]: value })}
                        className="pl-10 border-gray-300 focus:border-primary-light bg-white text-gray-900"
                        style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-primary-light/5 rounded-lg p-4 border border-primary-light/20">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary-light mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Turma selecionada:</p>
                      <p className="text-sm text-gray-600">{turma?.name}</p>
                      <p className="text-sm text-gray-600">{turma?.landingPagesDates}</p>
                    </div>
                  </div>
                </div>

                {/* Captcha Section */}
                <div className="space-y-2">
                  <Label htmlFor="captcha" className="text-gray-700 font-medium text-sm">
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
                      className={`h-10 flex-1 sm:flex-initial sm:w-20 text-center bg-white text-gray-900 ${captchaError ? 'border-red-500' : 'border-gray-300'} focus:border-primary-light`}
                      style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
                      required
                    />
                  </div>
                  {captchaError && (
                    <p className="text-xs text-red-500">
                      Resposta incorreta.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 sm:h-11 px-6 text-base sm:text-sm border-gray-300 order-2 sm:order-1"
                    onClick={() => handleWhatsApp(`Olá! Tenho dúvidas sobre a inscrição no curso ${turma?.name}`)}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Tirar Dúvidas
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormValid() || isSubmitting || !!(turma?.maxSubscriptions && turma._count && turma._count.subscriptions >= turma.maxSubscriptions)}
                    className="flex-1 h-12 sm:h-11 px-6 text-base sm:text-sm bg-primary-light hover:bg-primary-light/90 text-white disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Confirmar Inscrição
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
                
                {turma?.dividedIn && turma.dividedIn > 1 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-700">
                      Parcelamento em até <span className="font-semibold">{turma.dividedIn}x</span> disponível
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 text-center">
                  Ao enviar seus dados, você será direcionado para o WhatsApp para finalizar sua inscrição.
                  Seus dados estão protegidos e não serão compartilhados.
                </p>
              </form>
                  </Card>
                </>
              );
            })()}
          </motion.div>
        </div>
      </section>

      {/* Clients Section */}
      <Clients />

      {/* Footer */}
      <Footer />
      </div>
    </>
  );
}

export default TurmaLandingPage;