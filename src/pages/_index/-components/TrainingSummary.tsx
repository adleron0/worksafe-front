import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from '@tanstack/react-router';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Calendar,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface Course {
  id: number;
  name: string;
  category: string;
  date: string;
  time: string;
  duration: string;
  spotsAvailable: number;
  price: number;
  color: string;
  imageUrl?: string;
}

const upcomingCourses: Course[] = [
  {
    id: 1,
    name: "NR-33 - Espaço Confinado",
    category: "Trabalhador e Vigia",
    date: "8 de Agosto",
    time: "08:00 - 18:00",
    duration: "16 horas",
    spotsAvailable: 8,
    price: 450,
    color: "bg-purple-100 text-purple-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 2,
    name: "Alpinismo Industrial N1",
    category: "Acesso por Corda",
    date: "12 de Agosto",
    time: "08:00 - 17:00",
    duration: "48 horas",
    spotsAvailable: 3,
    price: 2600,
    color: "bg-green-100 text-green-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 3,
    name: "NR-35 - Trabalho em Altura",
    category: "Trabalhador",
    date: "19 de Agosto",
    time: "08:00 - 17:00",
    duration: "8 horas",
    spotsAvailable: 12,
    price: 350,
    color: "bg-blue-100 text-blue-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 4,
    name: "Resgate Técnico Industrial",
    category: "RTI",
    date: "22 de Agosto",
    time: "08:00 - 17:00",
    duration: "24 horas",
    spotsAvailable: 10,
    price: 650,
    color: "bg-red-100 text-red-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 5,
    name: "NR-10 - Segurança em Eletricidade",
    category: "Básico",
    date: "26 de Agosto",
    time: "08:00 - 17:00",
    duration: "40 horas",
    spotsAvailable: 5,
    price: 680,
    color: "bg-yellow-100 text-yellow-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 6,
    name: "NR-35 - Supervisor",
    category: "Supervisor de Altura",
    date: "2 de Setembro",
    time: "08:00 - 17:00",
    duration: "40 horas",
    spotsAvailable: 12,
    price: 850,
    color: "bg-orange-100 text-orange-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 7,
    name: "Brigada de Incêndio",
    category: "Emergência",
    date: "9 de Setembro",
    time: "08:00 - 17:00",
    duration: "40 horas",
    spotsAvailable: 15,
    price: 950,
    color: "bg-amber-100 text-amber-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 8,
    name: "NR-18 - Construção Civil",
    category: "Segurança",
    date: "16 de Setembro",
    time: "08:00 - 17:00",
    duration: "8 horas",
    spotsAvailable: 20,
    price: 320,
    color: "bg-gray-100 text-gray-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 9,
    name: "NR-12 - Máquinas e Equipamentos",
    category: "Operador",
    date: "23 de Setembro",
    time: "08:00 - 17:00",
    duration: "8 horas",
    spotsAvailable: 7,
    price: 380,
    color: "bg-indigo-100 text-indigo-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
  {
    id: 10,
    name: "Primeiros Socorros",
    category: "Emergência",
    date: "30 de Setembro",
    time: "08:00 - 17:00",
    duration: "16 horas",
    spotsAvailable: 25,
    price: 280,
    color: "bg-rose-100 text-rose-700",
    imageUrl: "https://worksafe-brasil.s3.us-east-1.amazonaws.com/classes-image/1747003173138_Forma%C3%A7%C3%A3o_Trabalho_em_Espa%C3%A7os_Confinados",
  },
];

interface TrainingSummaryProps {
  handleWhatsApp?: (message?: string) => void;
}

const TrainingSummary: React.FC<TrainingSummaryProps> = ({ handleWhatsApp }) => {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const handleEnrollment = (course: Course) => {
    const message = `Olá! Gostaria de me inscrever no curso ${course.name} - ${course.date}`;
    if (handleWhatsApp) {
      handleWhatsApp(message);
    }
  };

  const handleMouseEnter = (courseId: number) => {
    if (!animatingCards.has(courseId)) {
      setAnimatingCards(prev => new Set(prev).add(courseId));
      setFlippedCards(prev => new Set(prev).add(courseId));
      
      // Após a animação, remove do animating
      setTimeout(() => {
        setAnimatingCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(courseId);
          return newSet;
        });
      }, 600);
    }
  };

  const handleMouseLeave = (courseId: number) => {
    if (!animatingCards.has(courseId)) {
      setAnimatingCards(prev => new Set(prev).add(courseId));
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      
      // Remove do animating após a animação completar
      setTimeout(() => {
        setAnimatingCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(courseId);
          return newSet;
        });
      }, 600);
    }
  };

  return (
    <section id="treinamentos" className="pt-10 pb-20 md:pt-12 bg-white">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="section-title text-gray-800 text-3xl md:text-5xl font-bold md:pb-4">
            Próximos Treinamentos
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Capacite sua equipe com os melhores cursos de segurança do trabalho
          </p>
        </div>

        {/* Course Carousel */}
        <div className="mb-12">
          <Carousel 
            className="w-full"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-4">
              {upcomingCourses.map((course) => (
                <CarouselItem key={course.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div 
                    className="relative h-[420px] [perspective:1000px]"
                    onMouseEnter={() => handleMouseEnter(course.id)}
                    onMouseLeave={() => handleMouseLeave(course.id)}
                  >
                    <div 
                      className={`relative w-full h-full transition-transform duration-[600ms] ease-in-out [transform-style:preserve-3d] ${
                        flippedCards.has(course.id) ? '[transform:rotateY(180deg)]' : ''
                      }`}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Front side */}
                      <Card className="absolute inset-0 bg-white border border-gray-100 shadow-sm hover:shadow-md [backface-visibility:hidden] w-full h-full">
                        <div className="p-5 h-full flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <Badge className={`${course.color} border-0 text-xs font-medium`}>
                              {course.category}
                            </Badge>
                            {course.spotsAvailable <= 5 && (
                              <span className="text-xs text-orange-600 font-semibold">
                                Últimas vagas!
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">
                            {course.name}
                          </h3>
                          
                          <div className="space-y-2 text-sm text-gray-600 mb-4 flex-grow">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{course.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{course.duration}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>{course.spotsAvailable} vagas disponíveis</span>
                            </div>
                          </div>
                          
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-xs text-gray-500">Investimento</p>
                                <p className="text-lg font-bold text-gray-800">
                                  {formatCurrency(course.price)}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="w-full bg-primary-light hover:bg-primary-light/90 text-white"
                              onClick={() => handleEnrollment(course)}
                            >
                              Inscrever-se
                            </Button>
                          </div>
                        </div>
                      </Card>
                      
                      {/* Back side */}
                      <Card className="absolute inset-0 bg-white border border-gray-100 shadow-sm overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden] w-full h-full">
                        <div className="relative h-full">
                          {course.imageUrl ? (
                            <img
                              src={course.imageUrl}
                              alt={course.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-light/20 to-primary-light/40 flex items-center justify-center">
                              <p className="text-primary-light font-semibold text-center px-4">
                                {course.name}
                              </p>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                            <h3 className="text-white font-semibold mb-3">{course.name}</h3>
                            <Button
                              size="sm"
                              className="w-full bg-white text-primary-light hover:bg-gray-100"
                              onClick={() => handleEnrollment(course)}
                            >
                              Inscrever-se
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-4 lg:-left-12 bg-primary-light hover:bg-primary-light/90 border-0 text-white" />
            <CarouselNext className="absolute -right-4 lg:-right-12 bg-primary-light hover:bg-primary-light/90 border-0 text-white" />
          </Carousel>
        </div>

        {/* CTA para página completa */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link to="/treinamento">
            <Button
              size="lg"
              className="bg-black hover:bg-black/90 text-white font-normal text-base px-6 py-2.5 shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              Ver Todos os Treinamentos 
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default TrainingSummary;