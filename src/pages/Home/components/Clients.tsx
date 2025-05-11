import cliente1 from "../../../assets/images/clientes/1.png";
import cliente2 from "../../../assets/images/clientes/2.png";
import cliente3 from "../../../assets/images/clientes/3.png";
import cliente4 from "../../../assets/images/clientes/4.png";
import cliente5 from "../../../assets/images/clientes/5.png";
import cliente6 from "../../../assets/images/clientes/6.png";
import cliente7 from "../../../assets/images/clientes/7.png";
import cliente8 from "../../../assets/images/clientes/8.png";
import cliente9 from "../../../assets/images/clientes/9.png";
import cliente10 from "../../../assets/images/clientes/10.png";
import cliente11 from "../../../assets/images/clientes/11.png";
import cliente12 from "../../../assets/images/clientes/12.png";
import cliente13 from "../../../assets/images/clientes/13.png";
import cliente14 from "../../../assets/images/clientes/14.png";
import cliente15 from "../../../assets/images/clientes/15.png";
import cliente16 from "../../../assets/images/clientes/16.png";
import cliente17 from "../../../assets/images/clientes/17.png";
import cliente18 from "../../../assets/images/clientes/18.png";
import cliente19 from "../../../assets/images/clientes/19.png";
import cliente20 from "../../../assets/images/clientes/20.png";
import cliente21 from "../../../assets/images/clientes/21.png";
import cliente22 from "../../../assets/images/clientes/22.png";
import cliente23 from "../../../assets/images/clientes/23.png";
import cliente24 from "../../../assets/images/clientes/24.png";
import cliente25 from "../../../assets/images/clientes/25.png";
import cliente26 from "../../../assets/images/clientes/26.png";

export default function Clients() {
  // Array of client images
  const clientImages = [
    cliente1, cliente2, cliente3, cliente4, cliente5, cliente6, cliente7,
    cliente8, cliente9, cliente10, cliente11, cliente12, cliente13, cliente14,
    cliente15, cliente16, cliente17, cliente18, cliente19, cliente20, cliente21,
    cliente22, cliente23, cliente24, cliente25, cliente26
  ];

  return (
    <section id="clientes" className="py-10 bg-gray-50 overflow-hidden">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-center mb-8">
          <h2 className="section-title text-gray-700 text-3xl md:text-5xl font-bold pb-4">
            Faça como grandes marcas
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Experimente nossos serviços e veja como nossos profissionais podem ajudar você a alcançar seus objetivos.
          </p>
        </div>

        {/* First slider - Left to Right */}
        <div className="relative overflow-hidden">
          {/* Fade effect - left side */}
          <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-gray-50 to-transparent z-10"></div>
          
          <div className="flex overflow-hidden whitespace-nowrap">
            <div className="flex space-x-8 py-4 animate-marquee">
              {clientImages.map((src, index) => (
                <div key={`slider1-${index}`} className="flex-shrink-0 h-24 w-auto">
                  <img 
                    src={src} 
                    alt={`Cliente ${index + 1}`} 
                    className="h-full w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              ))}
              {/* Duplicate images for seamless loop */}
              {clientImages.map((src, index) => (
                <div key={`slider1-dup-${index}`} className="flex-shrink-0 h-24 w-auto">
                  <img 
                    src={src} 
                    alt={`Cliente ${index + 1}`} 
                    className="h-full w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Fade effect - right side */}
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-gray-50 to-transparent z-10"></div>
        </div>
        
        {/* Second slider - Right to Left */}
        <div className="relative overflow-hidden">
          {/* Fade effect - left side */}
          <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-gray-50 to-transparent z-10"></div>
          
          <div className="flex overflow-hidden whitespace-nowrap">
            <div className="flex space-x-8 py-4 animate-marquee-reverse">
              {[...clientImages].reverse().map((src, index) => (
                <div key={`slider2-${index}`} className="flex-shrink-0 h-24 w-auto">
                  <img 
                    src={src} 
                    alt={`Cliente ${index + 1}`} 
                    className="h-full w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              ))}
              {/* Duplicate images for seamless loop */}
              {[...clientImages].reverse().map((src, index) => (
                <div key={`slider2-dup-${index}`} className="flex-shrink-0 h-24 w-auto">
                  <img 
                    src={src} 
                    alt={`Cliente ${index + 1}`} 
                    className="h-full w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Fade effect - right side */}
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-gray-50 to-transparent z-10"></div>
        </div>
      </div>
    </section>
  );
}
