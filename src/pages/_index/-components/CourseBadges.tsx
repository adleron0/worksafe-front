import React, { useEffect, useState } from "react";
import { 
  Zap, 
  Flame, 
  Building2, 
  Mountain,
  Settings,
  Heart,
  Package
} from "lucide-react";

const courses = [
  { name: "NR-35", icon: Mountain, color: "bg-slate-100 text-slate-800 border-slate-200" },
  { name: "NR-33", icon: Package, color: "bg-zinc-100 text-zinc-800 border-zinc-200" },
  { name: "NR-10", icon: Zap, color: "bg-amber-100 text-amber-900 border-amber-200" },
  { name: "NR-12", icon: Settings, color: "bg-gray-100 text-gray-800 border-gray-200" },
  { name: "NR-18", icon: Building2, color: "bg-stone-100 text-stone-800 border-stone-200" },
  { name: "NR-20", icon: Flame, color: "bg-red-100 text-red-900 border-red-200" },
  { name: "Alpinismo N1", icon: Mountain, color: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  { name: "Alpinismo N2", icon: Mountain, color: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  { name: "Alpinismo N3", icon: Mountain, color: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  { name: "Resgate", icon: Heart, color: "bg-rose-100 text-rose-900 border-rose-200" },
  { name: "Brigada", icon: Flame, color: "bg-orange-100 text-orange-900 border-orange-200" },
  { name: "Primeiros Socorros", icon: Heart, color: "bg-cyan-100 text-cyan-900 border-cyan-200" },
];

const CourseBadges: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
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
  }, [activeIndex]);

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
        `}
      </style>
      <section className="py-12 md:py-16 bg-white overflow-hidden">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
          <div className="max-w-full md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] 2xl:max-w-[50%] mx-auto">
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {courses.map((course, index) => {
                const Icon = course.icon;
                return (
                  <div
                    key={index}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-default relative overflow-hidden ${course.color} transition-all hover:scale-105 hover:shadow-sm`}
                  >
                    {/* Shimmer effect */}
                    {activeIndex === index && (
                      <div 
                        className="absolute inset-0 w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white to-transparent opacity-30"
                        style={{
                          transform: 'translate(-100%, -100%)',
                          animation: 'shimmer 2s ease-in-out'
                        }}
                      />
                    )}
                    <Icon className="w-3 h-3 relative z-10" />
                    <span className="relative z-10">{course.name}</span>
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