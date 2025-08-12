import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  CalendarDays,
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
  dividedIn?: number | null;
  _count?: {
    subscriptions: number;
  };
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

const TrainingSummary: React.FC<TrainingSummaryProps> = () => {
  // Defina como true para iniciar com a imagem, false para iniciar com as informações
  const START_WITH_IMAGE = true;
  
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  
  const [searchParams] = useState({
    limit: 999,
    'gte-initialDate': new Date().toISOString(), // Data atual
    show: ['_count'],
  });
  
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
  
  const upcomingCourses = data?.rows?.filter(course => course.active)?.sort((a, b) => {
    // Check if courses are full
    const aIsFull = a.maxSubscriptions && a._count && a._count.subscriptions >= a.maxSubscriptions;
    const bIsFull = b.maxSubscriptions && b._count && b._count.subscriptions >= b.maxSubscriptions;
    
    // If one is full and the other isn't, put the full one at the end
    if (aIsFull && !bIsFull) return 1;
    if (!aIsFull && bIsFull) return -1;
    
    // If both have the same status, maintain original order
    return 0;
  }) || [];

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
                            <div className="flex items-center gap-1.5">
                              <div className="relative">
                                <div className={`w-2 h-2 rounded-full ${
                                  course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}>
                                  <div className={`absolute inset-0 rounded-full ${
                                    course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                  } animate-ping`} />
                                </div>
                              </div>
                              <span className={`text-xs font-medium ${
                                course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions 
                                  ? 'text-yellow-700' 
                                  : 'text-green-700'
                              }`}>
                                {course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions 
                                  ? 'Max Inscritos Atingidos' 
                                  : 'Inscrições Abertas'
                                }
                              </span>
                            </div>
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
                            
                            {/* Progress bar for enrollments */}
                            {course.maxSubscriptions && course._count && (
                              <div className="pt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-500">Vagas</span>
                                  <span className="text-xs font-medium text-primary-light">
                                    {course._count.subscriptions}/{course.maxSubscriptions}
                                  </span>
                                </div>
                                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="absolute h-full bg-gradient-to-r from-primary-light to-primary-light/80 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((course._count.subscriptions / course.maxSubscriptions) * 100, 100)}%` }}
                                  />
                                </div>
                                {course.maxSubscriptions - course._count.subscriptions > 0 ? (
                                  <p className="text-xs text-green-600 mt-1">
                                    {course.maxSubscriptions - course._count.subscriptions} vagas disponíveis
                                  </p>
                                ) : (
                                  <p className="text-xs text-red-600 mt-1">Turma lotada</p>
                                )}
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
                                {course.dividedIn && course.dividedIn > 1 && (
                                  <p className="text-xs text-gray-500">
                                    Em até {course.dividedIn}x
                                  </p>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const isFull = course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions;
                              
                              return (
                                <Button
                                  size="sm"
                                  className={`w-full ${
                                    isFull 
                                      ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed opacity-50' 
                                      : 'bg-primary-light hover:bg-primary-light/90 text-white'
                                  }`}
                                  onClick={() => {
                                    if (!isFull) {
                                      window.location.href = `/turma/${course.id}`;
                                    }
                                  }}
                                  disabled={!!isFull}
                                >
                                  <span className={isFull ? 'line-through' : ''}>
                                    {isFull ? 'Turma Lotada' : 'Saiba Mais'}
                                  </span>
                                </Button>
                              );
                            })()}
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
                            
                            {/* Dark overlay for full courses */}
                            {course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions && (
                              <>
                                <div className="absolute inset-0 bg-black/70 pointer-events-none" />
                                
                                {/* Diagonal banner for full courses */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                  <div 
                                    className="absolute bg-primary-light text-white text-center font-bold py-3 shadow-lg"
                                    style={{
                                      transform: 'rotate(-45deg)',
                                      transformOrigin: 'center',
                                      top: '30%',
                                      left: '-30%',
                                      right: '-30%',
                                      width: '160%',
                                      fontSize: '13px',
                                      letterSpacing: '1px',
                                      textTransform: 'uppercase',
                                      lineHeight: '1'
                                    }}
                                  >
                                    INSCRIÇÕES ESGOTADAS
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {/* Status indicator on image */}
                            <div className="absolute top-4 left-4">
                              {course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions ? (
                                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                                  <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500">
                                      <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping" />
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium text-yellow-700">
                                    Esgotado
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                                  <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-green-500">
                                      <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium text-green-700">
                                    Inscrições Abertas
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                              <h3 className="text-white font-semibold mb-3">{course.name}</h3>
                              {(() => {
                                const isFull = course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions;
                                
                                return (
                                  <Button
                                    size="sm"
                                    className={`w-full ${
                                      isFull 
                                        ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed opacity-50 text-gray-600' 
                                        : 'bg-white text-primary-light hover:bg-gray-100'
                                    }`}
                                    onClick={() => {
                                      if (!isFull) {
                                        window.location.href = `/turma/${course.id}`;
                                      }
                                    }}
                                    disabled={!!isFull}
                                  >
                                    <span className={isFull ? 'line-through' : ''}>
                                      {isFull ? 'Turma Lotada' : 'Saiba Mais'}
                                    </span>
                                  </Button>
                                );
                              })()}
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
              <CalendarDays className="mr-2 h-4 w-4" />
              Ver Agenda Completa
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default TrainingSummary;