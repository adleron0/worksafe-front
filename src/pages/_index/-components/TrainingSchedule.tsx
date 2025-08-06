import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Course {
  id: number;
  name: string;
  category: string;
  date: string;
  endDate?: string;
  time: string;
  duration: string;
  instructor: string;
  spotsAvailable: number;
  totalSpots: number;
  price: number;
  location: string;
  color: string;
  highlights: string[];
  featured?: boolean;
  dayNumber: number;
}

const mockCourses: Course[] = [
  // Julho (mês anterior)
  {
    id: 1,
    name: "NR-35 - Trabalho em Altura",
    category: "Trabalhador",
    date: "15 de Julho",
    endDate: "15 de Julho",
    dayNumber: 15,
    time: "08:00 - 17:00",
    duration: "8 horas",
    instructor: "João Silva - Instrutor N3",
    spotsAvailable: 0,
    totalSpots: 20,
    price: 350,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-blue-100 text-blue-700",
    highlights: ["Certificado MTE", "Material incluso", "Coffee break"],
  },
  {
    id: 2,
    name: "NR-12 - Máquinas e Equipamentos",
    category: "Operador",
    date: "22 de Julho",
    endDate: "22 de Julho",
    dayNumber: 22,
    time: "08:00 - 17:00",
    duration: "8 horas",
    instructor: "Roberto Lima - Eng. Mecânico",
    spotsAvailable: 0,
    totalSpots: 15,
    price: 380,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-indigo-100 text-indigo-700",
    highlights: ["Prática em máquinas", "Apostila digital", "Certificado"],
  },
  // Agosto (mês atual)
  {
    id: 3,
    name: "NR-33 - Espaço Confinado",
    category: "Trabalhador e Vigia",
    date: "8 de Agosto",
    endDate: "9 de Agosto",
    dayNumber: 8,
    time: "08:00 - 18:00",
    duration: "16 horas",
    instructor: "Maria Santos - Instrutora Sênior",
    spotsAvailable: 8,
    totalSpots: 15,
    price: 450,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-purple-100 text-purple-700",
    highlights: ["Simulação prática", "EPIs fornecidos", "Certificado digital"],
    featured: true,
  },
  {
    id: 4,
    name: "Alpinismo Industrial N1",
    category: "Acesso por Corda",
    date: "12 de Agosto",
    endDate: "17 de Agosto",
    dayNumber: 12,
    time: "08:00 - 17:00",
    duration: "48 horas (6 dias)",
    instructor: "Carlos Oliveira - Instrutor ANEAC",
    spotsAvailable: 3,
    totalSpots: 12,
    price: 2600,
    location: "Torre de Treinamento WorkSafe",
    color: "bg-green-100 text-green-700",
    highlights: ["Certificação ANEAC", "Equipamentos premium", "Prática em altura real"],
    featured: true,
  },
  {
    id: 5,
    name: "NR-35 - Trabalho em Altura",
    category: "Trabalhador",
    date: "19 de Agosto",
    endDate: "19 de Agosto",
    dayNumber: 19,
    time: "08:00 - 17:00",
    duration: "8 horas",
    instructor: "João Silva - Instrutor N3",
    spotsAvailable: 12,
    totalSpots: 20,
    price: 350,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-blue-100 text-blue-700",
    highlights: ["Certificado MTE", "Material incluso", "Coffee break"],
  },
  {
    id: 6,
    name: "Resgate Técnico Industrial",
    category: "RTI",
    date: "22 de Agosto",
    endDate: "24 de Agosto",
    dayNumber: 22,
    time: "08:00 - 17:00",
    duration: "24 horas (3 dias)",
    instructor: "Pedro Costa - Especialista em Resgate",
    spotsAvailable: 10,
    totalSpots: 16,
    price: 650,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-red-100 text-red-700",
    highlights: ["Simulações reais", "Técnicas avançadas", "Material completo"],
  },
  {
    id: 7,
    name: "NR-10 - Segurança em Eletricidade",
    category: "Básico",
    date: "26 de Agosto",
    endDate: "30 de Agosto",
    dayNumber: 26,
    time: "08:00 - 17:00",
    duration: "40 horas",
    instructor: "Marcos Almeida - Eng. Elétrico",
    spotsAvailable: 5,
    totalSpots: 18,
    price: 680,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-yellow-100 text-yellow-700",
    highlights: ["Prática em campo", "NR-10 completa", "Material didático"],
  },
  // Setembro (próximo mês)
  {
    id: 8,
    name: "NR-35 - Supervisor",
    category: "Supervisor de Altura",
    date: "2 de Setembro",
    endDate: "6 de Setembro",
    dayNumber: 2,
    time: "08:00 - 17:00",
    duration: "40 horas (5 dias)",
    instructor: "Ana Paula - Engenheira de Segurança",
    spotsAvailable: 12,
    totalSpots: 20,
    price: 850,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-orange-100 text-orange-700",
    highlights: ["Gestão de equipes", "Análise de riscos", "Documentação completa"],
  },
  {
    id: 9,
    name: "Brigada de Incêndio",
    category: "Emergência",
    date: "9 de Setembro",
    endDate: "13 de Setembro",
    dayNumber: 9,
    time: "08:00 - 17:00",
    duration: "40 horas (5 dias)",
    instructor: "Corpo de Bombeiros",
    spotsAvailable: 15,
    totalSpots: 25,
    price: 950,
    location: "Campo de Treinamento",
    color: "bg-amber-100 text-amber-700",
    highlights: ["Fogo real", "Primeiros socorros", "Certificação oficial"],
  },
  {
    id: 10,
    name: "NR-18 - Construção Civil",
    category: "Segurança",
    date: "16 de Setembro",
    endDate: "16 de Setembro",
    dayNumber: 16,
    time: "08:00 - 17:00",
    duration: "8 horas",
    instructor: "Paulo Mendes - Eng. Civil",
    spotsAvailable: 20,
    totalSpots: 30,
    price: 320,
    location: "Centro de Treinamento WorkSafe",
    color: "bg-gray-100 text-gray-700",
    highlights: ["Normas atualizadas", "Cases práticos", "Certificação"],
  },
];

interface TrainingScheduleProps {
  handleWhatsApp?: (message?: string) => void;
}

const TrainingSchedule: React.FC<TrainingScheduleProps> = ({ handleWhatsApp }) => {
  const [selectedMonth, setSelectedMonth] = useState(1); // Inicia em Agosto (índice 1)
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const months = ["Julho", "Agosto", "Setembro"];
  
  const handlePrevMonth = () => {
    setSelectedMonth(prev => (prev - 1 + months.length) % months.length);
    setExpandedCourse(null);
  };
  
  const handleNextMonth = () => {
    setSelectedMonth(prev => (prev + 1) % months.length);
    setExpandedCourse(null);
  };

  const currentMonthCourses = mockCourses
    .filter(course => course.date.includes(months[selectedMonth]))
    .sort((a, b) => a.dayNumber - b.dayNumber);

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

  const toggleExpand = (courseId: number) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  return (
    <section id="treinamentos" className="pt-10 pb-20 md:pt-12 bg-white">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="section-title text-gray-800 text-3xl md:text-5xl font-bold md:pb-4">
            Próximos Cursos
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
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
          <h3 className="text-2xl font-bold text-gray-800 min-w-[150px] text-center">
            {months[selectedMonth]} 2025
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

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-12 lg:left-24 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-light/20 via-primary-light/40 to-primary-light/20 z-0" />
          
          {/* Courses */}
          <div className="space-y-4 md:space-y-6">
            {currentMonthCourses.length > 0 ? (
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
                      {course.dayNumber}
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
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <Badge className={`${course.color} border-0 text-[10px] md:text-xs font-medium`}>
                                {course.category}
                              </Badge>
                              {course.featured && (
                                <Badge className="bg-gradient-to-r from-amber-50 to-orange-50 text-orange-600 border-orange-200 text-[10px] md:text-xs">
                                  Destaque
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-800 mb-2">
                              {course.name}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:gap-4 text-xs md:text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {course.date === course.endDate ? course.date : `${course.dayNumber}/${months[selectedMonth].substring(0, 3)} - ${course.endDate}`}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                {course.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                                {course.spotsAvailable} vagas
                              </span>
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
                            <p className="text-xs md:text-sm text-gray-500">Investimento</p>
                            <p className="text-base md:text-lg font-bold text-gray-800">
                              {formatCurrency(course.price)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto bg-primary-light hover:bg-primary-light/90 text-white text-xs md:text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnrollment(course);
                            }}
                            disabled={course.spotsAvailable === 0}
                          >
                            {course.spotsAvailable > 0 ? 'Inscrever-se' : 'Lista de Espera'}
                          </Button>
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4">
                                {/* Left Column */}
                                <div className="space-y-2 md:space-y-3">
                                  <div>
                                    <p className="text-xs md:text-sm text-gray-500 mb-1">Horário</p>
                                    <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="truncate">{course.time} ({course.duration})</span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs md:text-sm text-gray-500 mb-1">Local</p>
                                    <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="truncate">{course.location}</span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs md:text-sm text-gray-500 mb-1">Instrutor</p>
                                    <p className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                                      <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="truncate">{course.instructor}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-2 md:space-y-3">
                                  <div>
                                    <p className="text-xs md:text-sm text-gray-500 mb-1">Diferenciais</p>
                                    <div className="flex flex-wrap gap-1">
                                      {course.highlights.map((highlight, idx) => (
                                        <span key={idx} className="text-[10px] md:text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                                          {highlight}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500 mb-1">Vagas</p>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-primary-light to-primary-light/70 h-2 rounded-full transition-all"
                                          style={{ 
                                            width: `${((course.totalSpots - course.spotsAvailable) / course.totalSpots) * 100}%` 
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm text-gray-600">
                                        {course.spotsAvailable}/{course.totalSpots}
                                      </span>
                                    </div>
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="ml-12 md:ml-24 lg:ml-44">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4 -ml-20 md:-ml-32">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4 -ml-20 md:-ml-32">Nenhum curso agendado para {months[selectedMonth]}.</p>
                  <Button 
                    onClick={() => handleWhatsApp && handleWhatsApp("Olá! Gostaria de saber sobre próximos treinamentos.")}
                    className="bg-primary-light hover:brightness-110 text-white transition-all -ml-20 md:-ml-32"
                  >
                    Consultar Disponibilidade
                  </Button>
                </div>
              </motion.div>
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