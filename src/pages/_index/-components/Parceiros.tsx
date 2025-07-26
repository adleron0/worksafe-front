// import Icon from "@/components/general-components/Icon";
import parceiro1 from "../../../assets/images/parceiros/1.png";
import parceiro2 from "../../../assets/images/parceiros/2.png";
import parceiro3 from "../../../assets/images/parceiros/3.png";
import parceiro4 from "../../../assets/images/parceiros/4.png";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import Autoplay from 'embla-carousel-autoplay';

export default function Parceiros() {
  // Array of client images
  const clientImages = [
    parceiro1, parceiro2, parceiro3, parceiro4,
  ];
  
  // State to track if images are loaded
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Preload images to fix Safari mobile issue
  useEffect(() => {
    const preloadImages = async () => {
      const promises = clientImages.map((src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });
      });
      
      await Promise.all(promises);
      setImagesLoaded(true);
    };
    
    preloadImages();
  }, []);

  return (
    <section id="clientes" className="py-4 bg-gray-100 overflow-hidden">
      <div className="flex flex-col md:flex-row my-4 items-center justify-between gap-4 mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-start">
          {/* <h2 className="flex items-center justify-center md:justify-start section-title text-primary-light text-3xl md:text-5xl font-bold pb-4">
            <Icon name="asterisk" className="inline-block w-8 h-8 md:w-12 md:h-12" />
            Parceiros
          </h2> */}
          <p className="text-gray-600 font-medium text-base md:text-lg max-w-2xl mx-auto">
            <strong className="text-primary-light underline">Parcerias</strong> com grandes Nomes para oferecer o de Melhor e mais Moderno em Segurança do Trabalho.
          </p>
        </div>

        {/* Carousel using shadcn/ui */}
        <div className="relative w-full max-w-xl">
          {/* Fade effect - left side */}
          <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-gray-100 to-transparent z-10"></div>
          
          <Carousel
            className="w-full"
            plugins={[
              Autoplay({
                delay: 2000,
                jump: false,
              }),
            ]}
            opts={{
              align: "start",
              loop: true,
              dragFree: true,
            }}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {imagesLoaded ? (
                <>
                  {clientImages.map((src, index) => (
                    <CarouselItem key={`carousel-${index}`} className="pl-0.5 md:pl-1 basis-1/3 md:basis-1/4">
                      <Card className="border-none shadow-none bg-transparent">
                        <CardContent className="flex items-center justify-center p-1">
                          <img 
                            src={src} 
                            alt={`Parceiro ${index + 1}`} 
                            className="h-24 w-auto object-contain rounded-md grayscale hover:grayscale-0 transition-all duration-300"
                            loading="eager"
                          />
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                  {/* Duplicate images for better looping experience */}
                  {clientImages.map((src, index) => (
                    <CarouselItem key={`carousel-dup-${index}`} className="pl-0.5 md:pl-1 basis-1/3 md:basis-1/4">
                      <Card className="border-none shadow-none bg-transparent">
                        <CardContent className="flex items-center justify-center p-1">
                          <img 
                            src={src} 
                            alt={`Parceiro ${index + 1}`} 
                            className="h-24 w-auto object-contain rounded-md grayscale hover:grayscale-0 transition-all duration-300"
                            loading="eager"
                          />
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </>
              ) : (
                <div className="h-24 w-full"></div>
              )}
            </CarouselContent>
            {/* No navigation arrows as requested */}
          </Carousel>
          
          {/* Fade effect - right side */}
          <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-gray-100 to-transparent z-10"></div>
        </div>
      </div>
    </section>
  );
}
