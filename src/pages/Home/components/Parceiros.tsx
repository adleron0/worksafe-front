// import Icon from "@/components/general-components/Icon";
import parceiro1 from "../../../assets/images/parceiros/1.png";
import parceiro2 from "../../../assets/images/parceiros/2.png";
import parceiro3 from "../../../assets/images/parceiros/3.png";
import parceiro4 from "../../../assets/images/parceiros/4.png";
import { useEffect, useState } from "react";

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

        {/* Slider - Left to Right */}
        <div className="relative overflow-hidden">
          {/* Fade effect - left side */}
          <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-gray-100 to-transparent z-10"></div>
          
          <div className="flex overflow-hidden whitespace-nowrap">
            <div 
              className="flex space-x-4 py-4 animate-marquee" 
              style={{ 
                animationDuration: "20s", 
                visibility: imagesLoaded ? "visible" : "hidden" 
              }}
            >
              {clientImages.map((src, index) => (
                <div key={`slider1-${index}`} className="flex-shrink-0 h-24 w-auto">
                  <img 
                    src={src} 
                    alt={`Parceiro ${index + 1}`} 
                    className="h-full w-auto object-contain rounded-md grayscale hover:grayscale-0 transition-all duration-300"
                    loading="eager"
                  />
                </div>
              ))}
              {/* Duplicate images for seamless loop */}
              {clientImages.map((src, index) => (
                <div key={`slider1-dup-${index}`} className="flex-shrink-0 h-24 w-auto">
                  <img 
                    src={src} 
                    alt={`Parceiro ${index + 1}`} 
                    className="h-full w-auto object-contain rounded-md grayscale hover:grayscale-0 transition-all duration-300"
                    loading="eager"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Fade effect - right side */}
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-gray-100 to-transparent z-10"></div>
        </div>
      </div>
    </section>
  );
}
