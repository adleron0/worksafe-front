import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import Icon from "@/components/general-components/Icon";

interface Course {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  active: boolean;
}

const CourseBadges: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const searchParams = {
    active: true,
    limit: 100,
    companyId: 1
  };

  // Buscar cursos da API
  const { data: courses = [] } = useQuery({
    queryKey: ["courseBadges"],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      const response = await get<Course[]>('courses', 'list', params);
      return response || [];
    }
  });

  useEffect(() => {
    if (!courses?.length) return;
    
    const interval = setInterval(() => {
      // Generate random index different from current
      let newIndex = Math.floor(Math.random() * courses.length);
      while (newIndex === activeIndex && courses.length > 1) {
        newIndex = Math.floor(Math.random() * courses.length);
      }
      setActiveIndex(newIndex);
      
      // Clear the shimmer after animation duration
      setTimeout(() => {
        setActiveIndex(null);
      }, 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeIndex, courses?.length]);

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% {
              transform: translate(-100%, -100%);
            }
            100% {
              transform: translate(100%, 100%);
            }
          }
          
          @keyframes metallic-shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }
        `}
      </style>
      <section className="py-12 md:py-16 bg-white overflow-hidden">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
          <div className="max-w-full md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] 2xl:max-w-[50%] mx-auto">
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {courses?.map((course: Course, index: number) => {
                // Função para criar uma versão mais suave da cor
                const getSoftColor = (hexColor: string) => {
                  if (!hexColor) return '#666666';
                  
                  const hex = hexColor.replace('#', '');
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  
                  // Misturar com cinza para suavizar (70% cinza, 30% cor original)
                  const gray = 120;
                  const mixedR = Math.floor(gray * 0.7 + r * 0.3);
                  const mixedG = Math.floor(gray * 0.7 + g * 0.3);
                  const mixedB = Math.floor(gray * 0.7 + b * 0.3);
                  
                  return `rgb(${mixedR}, ${mixedG}, ${mixedB})`;
                };

                const softColor = getSoftColor(course.color || '');
                
                return (
                  <div
                    key={course.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-default relative overflow-hidden transition-all hover:scale-105 hover:shadow-md"
                    style={{
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {/* Shimmer effect */}
                    {activeIndex === index && (
                      <div 
                        className="absolute inset-0 w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white to-transparent opacity-40"
                        style={{
                          transform: 'translate(-100%, -100%)',
                          animation: 'shimmer 2s ease-in-out'
                        }}
                      />
                    )}
                    
                    {course.icon && (
                      <Icon 
                        name={course.icon} 
                        className="w-3 h-3 relative z-10"
                        style={{ color: softColor }}
                      />
                    )}
                    <span className="relative z-10 text-gray-700">
                      {course.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CourseBadges;