import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import {
  Calendar,
  Clock,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface TrainingScheduleProps {
  handleWhatsApp?: (message?: string) => void;
}

const TrainingSchedule: React.FC<TrainingScheduleProps> = ({ handleWhatsApp }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", 
    "Maio", "Junho", "Julho", "Agosto", 
    "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  // Calculate first and last day of selected month in ISO-8601 format
  const firstDay = useMemo(() => {
    // Create date in UTC directly
    const date = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0, 0));
    return date.toISOString();
  }, [selectedYear, selectedMonth]);
  
  const lastDay = useMemo(() => {
    // Get last day of month (day 0 of next month = last day of current month)
    const date = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999));
    return date.toISOString();
  }, [selectedYear, selectedMonth]);
  
  // Fetch data with date filter
  const searchParams = useMemo(() => ({
    active: true,
    openClass: true,
    'lte-initialDate': lastDay,
    'gte-initialDate': firstDay,
    'order-initialDate': 'asc',
    'show': ['_count']
  }), [firstDay, lastDay]);
  
  const { 
    data, 
    isLoading, 
    isError,
  } = useQuery<ApiResponse | undefined>({
    queryKey: ['trainingSchedule', searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get('classes', '', params);
    },
  });
  
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setExpandedCourse(null);
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setExpandedCourse(null);
  };

  const currentMonthCourses = data?.rows || [];

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(numValue);
  };
  
  
  const getDayFromDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate();
  };

  const handleEnrollment = (course: Course) => {
    // Redirect to landing page
    window.location.href = `/turma/${course.id}`;
  };

  const toggleExpand = (courseId: number) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  return (
    <section className="pt-10 pb-20 md:pt-12 bg-white">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="section-title text-gray-800 text-3xl md:text-5xl font-bold md:pb-4">
            Calendário de Cursos
          </h2>
          <p id="treinamentos" className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Capacitação profissional com os melhores instrutores do mercado
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          </Button>
          <h3 className="text-2xl font-bold text-gray-800 min-w-[200px] text-center">
            {months[selectedMonth]} {selectedYear}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-700" />
          </Button>
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

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-12 lg:left-24 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-light/20 via-primary-light/40 to-primary-light/20 z-0" />
          
          {/* Courses */}
          <div className="space-y-4 md:space-y-6">
            {!isLoading && !isError && currentMonthCourses.length > 0 ? (
              currentMonthCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex items-center"
                >
                  {/* Date Label */}
                  <div className="absolute left-0 w-7 md:w-10 lg:w-20 text-right pr-0.5 md:pr-2 lg:pr-4">
                    <div className="text-sm md:text-lg lg:text-xl font-semibold text-gray-800 leading-none">
                      {getDayFromDate(course.initialDate)}
                    </div>
                    <div className="text-[9px] md:text-xs text-gray-500 uppercase">
                      {months[selectedMonth].substring(0, 3)}
                    </div>
                  </div>
                  
                  {/* Timeline Dot and Connector */}
                  <div className="absolute left-8 md:left-12 lg:left-24 flex items-center" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-white border-2 border-primary-light rounded-full z-20" style={{ marginLeft: '-6px' }} />
                    <div className="h-0.5 w-3 md:w-6 lg:w-12 bg-primary-light/40" style={{ marginLeft: '-2px' }} />
                  </div>
                  
                  {/* Course Card */}
                  <div className="w-full pl-12 md:pl-24 lg:pl-44">
                    <Card 
                      className={`bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden ${
                        expandedCourse === course.id ? 'border-primary-light/40' : ''
                      }`}
                      onClick={() => toggleExpand(course.id)}
                    >
                      {/* Compact View */}
                      <div className="p-3 md:p-4 lg:p-5 relative">
                        {/* Mobile expand icon */}
                        <div className="md:hidden absolute top-3 right-3">
                          <ChevronDown 
                            className={`w-3 h-3 text-gray-400 transition-transform ${
                              expandedCourse === course.id ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0 mb-3">
                          <div className="flex gap-3 flex-1">
                            {/* Course Image */}
                            {course.imageUrl && (
                              <div className="hidden sm:block w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                                <img 
                                  src={course.imageUrl} 
                                  alt={course.name}
                                  className="w-full h-full object-cover rounded-lg"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-800">
                                  {course.name}
                                </h3>
                                {(() => {
                                  const isInactive = !course.active;
                                  const isPastDate = new Date(course.initialDate) < new Date();
                                  const isFull = course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions;
                                  const isOpen = !isInactive && !isPastDate && !isFull;
                                  
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <div className="relative">
                                        <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-yellow-500' : isOpen ? 'bg-green-500' : 'bg-red-500'}`}>
                                          {(isOpen || isFull) && (
                                            <div className={`absolute inset-0 rounded-full ${isFull ? 'bg-yellow-500' : 'bg-green-500'} animate-ping`} />
                                          )}
                                        </div>
                                      </div>
                                      <span className={`text-[10px] md:text-xs font-medium ${isFull ? 'text-yellow-700' : isOpen ? 'text-green-700' : 'text-red-700'}`}>
                                        {isFull ? 'Max Inscritos Atingidos' : isOpen ? 'Inscrições Abertas' : 'Inscrições Encerradas'}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:gap-4 text-xs md:text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {course.landingPagesDates}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                  {course.hoursDuration} horas
                                </span>
                                {course.maxSubscriptions && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                                    {course.maxSubscriptions} vagas
                                  </span>
                                )}
                              </div>
                              
                              {/* Progress bar for enrollments */}
                              {course.maxSubscriptions && course._count && (
                                <div className="mt-2 max-w-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">Inscrições</span>
                                    <span className="text-xs font-medium text-primary-light">
                                      {course._count.subscriptions}/{course.maxSubscriptions}
                                    </span>
                                  </div>
                                  <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="absolute h-full bg-gradient-to-r from-primary-light to-primary-light/80 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min((course._count.subscriptions / course.maxSubscriptions) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronDown 
                            className={`w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-transform ${
                              expandedCourse === course.id ? 'rotate-180' : ''
                            } hidden md:block`}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
                          <div className="flex items-baseline justify-between sm:block">
                            {course.oldPrice && (
                              <p className="text-xs text-gray-400 line-through">
                                {formatCurrency(course.oldPrice)}
                              </p>
                            )}
                            <p className="text-base md:text-lg font-bold text-gray-800">
                              {formatCurrency(course.price)}
                            </p>
                            {course.dividedIn && course.dividedIn > 1 && (
                              <p className="text-xs text-gray-500">
                                Em até {course.dividedIn}x
                              </p>
                            )}
                          </div>
                          {(() => {
                            const isInactive = !course.active;
                            const isPastDate = new Date(course.initialDate) < new Date();
                            const isFull = course.maxSubscriptions && course._count && course._count.subscriptions >= course.maxSubscriptions;
                            const isDisabled = isInactive || isPastDate || isFull;
                            
                            return (
                              <Button
                                size="sm"
                                className={`w-full sm:w-auto text-xs md:text-sm ${
                                  isDisabled 
                                    ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed opacity-50' 
                                    : 'bg-primary-light hover:bg-primary-light/90 text-white'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDisabled) {
                                    handleEnrollment(course);
                                  }
                                }}
                                disabled={!!isDisabled}
                              >
                                <span className={isDisabled ? 'line-through' : ''}>
                                  {isFull ? 'Turma Lotada' : 'Inscrever-se'}
                                </span>
                              </Button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Expanded View */}
                      <AnimatePresence>
                        {expandedCourse === course.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-gray-100">
                              <div className="pt-3 md:pt-4">
                                <p className="text-xs md:text-sm text-gray-500 mb-2">Descrição do Curso</p>
                                <p className="text-xs md:text-sm text-gray-700 mb-4">
                                  {course.description}
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                  {/* Left Column */}
                                  <div className="space-y-2 md:space-y-3">
                                    <div>
                                      <p className="text-xs md:text-sm text-gray-500 mb-1">Período</p>
                                      <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">
                                          {new Date(course.initialDate).toLocaleDateString('pt-BR')} - {new Date(course.finalDate).toLocaleDateString('pt-BR')}
                                        </span>
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs md:text-sm text-gray-500 mb-1">Carga Horária</p>
                                      <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{course.hoursDuration} horas</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right Column */}
                                  <div className="space-y-2 md:space-y-3">
                                    {course.maxSubscriptions && (
                                      <div>
                                        <p className="text-xs md:text-sm text-gray-500 mb-1">Vagas Disponíveis</p>
                                        <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                          <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                          <span className="truncate">
                                            {course._count 
                                              ? Math.max(0, course.maxSubscriptions - course._count.subscriptions)
                                              : course.maxSubscriptions
                                            } vagas
                                          </span>
                                        </p>
                                      </div>
                                    )}
                                    {course.minimumQuorum && (
                                      <div>
                                        <p className="text-xs md:text-sm text-gray-500 mb-1">Quórum Mínimo</p>
                                        <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                          <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                          <span className="truncate">{course.minimumQuorum} participantes</span>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </div>
                </motion.div>
              ))
            ) : (
              !isLoading && !isError && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 flex justify-end"
                >
                  <div className="w-4/5 md:w-full break-words">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">Nenhum curso agendado para {months[selectedMonth]} de {selectedYear}.</p>
                    <Button 
                      onClick={() => handleWhatsApp && handleWhatsApp("Olá! Gostaria de saber sobre próximos treinamentos.")}
                      className="bg-primary-light hover:brightness-110 text-white transition-all"
                    >
                      Consultar Disponibilidade
                    </Button>
                  </div>
                </motion.div>
              )
            )}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 bg-gradient-to-br from-primary-light/5 to-primary-light/10 rounded-2xl p-8 md:p-12 text-center border border-primary-light/20"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
            Treinamento Exclusivo para sua Empresa
          </h3>
          <p className="text-lg mb-6 text-gray-600 max-w-2xl mx-auto">
            Desenvolvemos programas personalizados de capacitação alinhados com as necessidades específicas do seu negócio.
          </p>
          <Button
            size="lg"
            className="bg-black hover:bg-primary-light text-white transition-colors"
            onClick={() => handleWhatsApp && handleWhatsApp("Olá! Gostaria de solicitar um orçamento para treinamento in-company.")}
          >
            Solicitar Proposta Personalizada
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default TrainingSchedule;