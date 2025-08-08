import React, { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";

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
  initialDate: string;
  finalDate: string;
  landingPagesDates: string;
  minimumQuorum: number | null;
  maxSubscriptions: number | null;
  active: boolean;
}

interface ApiResponse {
  total: number;
  rows: Course[];
}

const entity = {
  name: "Turma",
  pluralName: "Turmas",
  model: "classes",
};

interface TrainingSummaryProps {
  handleWhatsApp?: (message?: string) => void;
}

const TrainingSummary: React.FC<TrainingSummaryProps> = ({ handleWhatsApp }) => {
  // Defina como true para iniciar com a imagem, false para iniciar com as informações
  const START_WITH_IMAGE = true;
  
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  
  const searchParams = { active: true };
  
  const { 
    data, 
    isLoading, 
    isError, 
  } = useQuery<ApiResponse | undefined>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get(entity.model, '', params);
    },
  });
  
  const upcomingCourses = data?.rows?.filter(course => course.active) || [];

  useEffect(() => {
    const handleResize = () => {
      // Limpa os cards flipados ao mudar de mobile para desktop
      if (window.innerWidth > 768) {
        setFlippedCards(new Set());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(numValue);
  };

  const getCourseCategory = (name: string) => {
    if (name.includes('NR33') || name.includes('NR-33')) return 'Espaço Confinado';
    if (name.includes('NR35') || name.includes('NR-35')) return 'Trabalho em Altura';
    if (name.includes('NR10') || name.includes('NR-10')) return 'Segurança Elétrica';
    if (name.includes('NR18') || name.includes('NR-18')) return 'Construção Civil';
    if (name.includes('NR12') || name.includes('NR-12')) return 'Máquinas e Equipamentos';
    return 'Segurança do Trabalho';
  };

  const getCourseColor = (courseId: number) => {
    const colors = [
      'bg-purple-100 text-purple-700',
      'bg-green-100 text-green-700',
      'bg-blue-100 text-blue-700',
      'bg-red-100 text-red-700',
      'bg-yellow-100 text-yellow-700',
      'bg-orange-100 text-orange-700',
    ];
    return colors[courseId % colors.length];
  };

  const handleEnrollment = (course: Course) => {
    const message = `Olá! Gostaria de me inscrever no curso ${course.name} - ${course.landingPagesDates}`;
    if (handleWhatsApp) {
      handleWhatsApp(message);
    }
  };

  const handleCardClick = (e: React.MouseEvent, courseId: number) => {
    e.stopPropagation();
    
    // Previne conflito com hover no desktop
    if (window.innerWidth <= 768) {
      if (flippedCards.has(courseId)) {
        const newSet = new Set(flippedCards);
        newSet.delete(courseId);
        setFlippedCards(newSet);
      } else {
        const newSet = new Set(flippedCards);
        newSet.add(courseId);
        setFlippedCards(newSet);
      }
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-light" />
          </div>
        )}
        
        {/* Error State */}
        {isError && (
          <div className="text-center py-20">
            <p className="text-gray-600">Erro ao carregar os treinamentos. Por favor, tente novamente.</p>
          </div>
        )}
        
        {/* Course Carousel */}
        {!isLoading && !isError && upcomingCourses.length > 0 && (
        <div className="mb-12 py-4">
          <Carousel 
            className="w-full overflow-visible"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-4 py-2">
              {upcomingCourses.map((course) => (
                <CarouselItem key={course.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div 
                    className={`relative h-[420px] ${course.imageUrl ? '[perspective:1000px] md:cursor-pointer' : ''}`}
                    onMouseEnter={() => course.imageUrl && window.innerWidth > 768 && setHoveredCard(course.id)}
                    onMouseLeave={() => course.imageUrl && window.innerWidth > 768 && setHoveredCard(null)}
                    onClick={(e) => course.imageUrl && handleCardClick(e, course.id)}
                  >
                    <div 
                      className="relative w-full h-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d]"
                      style={{ 
                        transformStyle: 'preserve-3d',
                        transform: course.imageUrl 
                          ? `rotateY(${
                              START_WITH_IMAGE 
                                ? (hoveredCard === course.id || flippedCards.has(course.id)) ? 0 : 180
                                : (hoveredCard === course.id || flippedCards.has(course.id)) ? 180 : 0
                            }deg)`
                          : 'rotateY(0deg)'
                      }}
                    >
                      {/* Front side */}
                      <Card className="absolute inset-0 bg-white border border-gray-100 shadow-sm hover:shadow-md [backface-visibility:hidden] w-full h-full">
                        <div className="p-5 h-full flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <Badge className={`${getCourseColor(course.courseId)} border-0 text-xs font-medium`}>
                              {getCourseCategory(course.name)}
                            </Badge>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">
                            {course.name}
                          </h3>
                          
                          <div className="space-y-2 text-sm text-gray-600 mb-4 flex-grow">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{course.landingPagesDates}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{course.hoursDuration} horas</span>
                            </div>
                            {course.maxSubscriptions && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>{course.maxSubscriptions} vagas</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                {course.oldPrice && (
                                  <p className="text-xs text-gray-400 line-through">
                                    {formatCurrency(course.oldPrice)}
                                  </p>
                                )}
                                <p className="text-lg font-bold text-gray-800">
                                  {formatCurrency(course.price)}
                                </p>
                              </div>
                              {course.openClass && (
                                <Badge className="bg-green-50 text-green-700 border-0 text-xs">
                                  Turma Aberta
                                </Badge>
                              )}
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
                      
                      {/* Back side - only render if imageUrl exists */}
                      {course.imageUrl && (
                        <Card className="absolute inset-0 bg-white border border-gray-100 shadow-sm overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden] w-full h-full">
                          <div className="relative h-full">
                            <img
                              src={course.imageUrl}
                              alt={course.name}
                              className="w-full h-full object-cover"
                            />
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
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-4 lg:-left-12 bg-primary-light hover:bg-primary-light/90 border-0 text-white" />
            <CarouselNext className="absolute -right-4 lg:-right-12 bg-primary-light hover:bg-primary-light/90 border-0 text-white" />
          </Carousel>
        </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !isError && upcomingCourses.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-600">Nenhum treinamento disponível no momento.</p>
          </div>
        )}

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