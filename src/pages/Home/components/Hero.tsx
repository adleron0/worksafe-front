import React from "react";
import { Button } from "@/components/ui/button";
import RotatingText from "@/components/ui-bits/RotatingText/RotatingText";
import Icon from "@/components/general-components/Icon";

// Video Hero
import HeroVideo from "../../../assets/video-website-header.mp4";

interface HeroProps {
  yearsOfExperience: number;
}

const Hero: React.FC<HeroProps> = () => {
  return (
    <section className="relative h-[calc(100vh-5rem)] overflow-hidden">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={HeroVideo} type="video/mp4" />
        Seu navegador não suporta a tag de vídeo.
      </video>
      {/* Overlay */}
      <div className="bg-black/30 absolute inset-0 z-0" />

      <div className="relative h-full flex items-center py-20">
        <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-60 w-full">
          <div className="max-w-4xl flex flex-col gap-4 items-start justify-center text-left">
            <h2 className="text-white text-xl sm:text-2xl md:text-4xl font-medium leading-tight">
              Nossa Especialidade
            </h2>

            <RotatingText
              texts={[
                'Alpinismo Industrial',
                'Treinamentos das NBRs',
                'Trabalhos em Altura',
                'Espaços Confinados',
                'Resgate Técnico Industrial',
                'Soluções em Linha de Vida',
                'Formações NR33 e NR35',
                'Consultoria em SST'
              ]}
              mainClassName="px-4 py-2 sm:py-2.5 text-2xl sm:text-3xl md:text-5xl font-bold bg-primary-light border border-primary-light text-white rounded-lg shadow-lg"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-1 sm:pb-1.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={5000}
            />

            <p className="text-zinc-200 text-base sm:text-2xl max-w-xl">
              Venha conhecer o maior centro em segurança do trabalho industrial do Nordeste.
            </p>

            <Button
              variant="default"
              className="flex items-center"
            >
              Saiba mais
              <Icon name="arrow-right" className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
