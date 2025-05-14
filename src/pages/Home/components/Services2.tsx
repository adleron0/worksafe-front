import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/general-interfaces/api.interface";
import { SiteServices as EntityInterface } from "@/pages/Site-Services/interfaces/site-services.interface";
import { get } from "@/services/api";
import { Wrench } from "lucide-react";

interface Services2Props {
  handleWhatsApp: (message?: string) => void;
}

const Services2: React.FC<Services2Props> = ({ handleWhatsApp }) => {
  interface Response {
    rows: EntityInterface[];
    total: number;
  }

  const { 
    data, 
    isLoading, 
  } = useQuery<Response | undefined, ApiError>({
    queryKey: ["listSiteServices"],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 999 },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ]
      return get('site-services', '', params);
    },
  });

  return (
    <section className="py-15 md:py-20 bg-gray-50" id="servicos">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="section-title text-gray-800 text-3xl md:text-5xl font-bold md:pb-4">
            Nossos Serviços
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Soluções especializadas para trabalhos em altura, espaços confinados e resgate.
          </p>
        </div>
        
        {/* Responsive grid: 1 card on small mobile, 2 on larger mobile/tablet, up to 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
          {isLoading ? (
            // Render skeleton cards
            Array(4).fill(0).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex flex-col bg-white rounded-xl overflow-hidden shadow-lg h-full border border-gray-100"
              >
                <div className="p-5 flex flex-col h-full">
                  {/* Title with icon skeleton */}
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                  
                  {/* Features skeleton */}
                  <div className="mb-5 flex-grow">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  
                  {/* Button skeleton - positioned at the bottom */}
                  <div className="mt-auto mb-5">
                    <Skeleton className="w-full h-10" />
                  </div>
                  
                  {/* Image skeleton with fixed height */}
                  <div className="h-48 md:h-56 relative rounded-lg overflow-hidden shadow-md">
                    <Skeleton className="absolute inset-0 h-full w-full" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            data?.rows?.map((service, index) => (
              <div
                key={`service-${index}`}
                className="flex flex-col bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl h-full border border-gray-100 hover:border-primary-light/30"
              >
                <div className="p-5 flex flex-col h-full">
                  {/* Title with fixed service icon */}
                  <div className="flex items-start gap-2 mb-3">
                    <Wrench className="w-5 h-5 text-primary-light flex-shrink-0 pt-1.5" />
                    <h3 className="text-lg md:text-xl font-bold text-gray-800">{service.name}</h3>
                  </div>
                  
                  {/* Features as comma-separated text */}
                  <div className="mb-5 flex-grow">
                    <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                      {service.features?.split('#').join(', ')}
                    </p>
                  </div>
                  
                  {/* Button - positioned at the bottom with mt-auto */}
                  <div className="mt-auto mb-5">
                    <Button
                      className="w-fit text-xs md:text-sm bg-black hover:bg-primary-light text-white transition-all shadow-sm hover:shadow-md"
                      onClick={() => handleWhatsApp()}
                    >
                      Solicitar Orçamento
                    </Button>
                  </div>
                  
                  {/* Rounded image with fixed height */}
                  <div className="h-48 md:h-56 relative rounded-lg overflow-hidden shadow-md">
                    <img
                      src={service.imageUrl || ""}
                      alt={service.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform ease-in-out duration-500 hover:scale-105"
                      width={400}
                      height={300}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-60"></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Services2;
