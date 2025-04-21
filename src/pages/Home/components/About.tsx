import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

// Calcula anos
const foundationYear = 2019;
const yearsOfExperience = new Date().getFullYear() - foundationYear;

// Video Treinamento
const TreinamentoVideo = "/assets/videos/treinamento.mp4";

// Imagens do About
import AboutImage1 from "../../../assets/images/fundador-1.webp";
import AboutImage2 from "../../../assets/images/fundador-2.webp";

const About = () => {
  // Configurações WhatsApp
  const whatsappNumber1 = "82988361789";

  // Função para abrir o WhatsApp com a mensagem
  const handleWhatsApp = (message: string = "") => {
    const url = `https://wa.me/${whatsappNumber1}${
      message ? `?text=${encodeURIComponent(message)}` : ""
    }`;
    window.open(url, "_blank");
  };

  return (
    <section id="sobre" className="py-20 bg-gray-50">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="section-title text-gray-700 w-full text-center text-3xl md:text-5xl font-bold mb-8 pb-4">
              Sobre Nós
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Desde 2019, a <strong className="text-primary-light">WORKSAFE BRASIL</strong> se especializou tornando-se referência em soluções para atividades de alto risco.
            </p>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Com mais de {yearsOfExperience} anos de experiência no setor, atuamos com excelência e compromisso na execução de serviços em altura, espaços confinados e resgate, sempre priorizando a segurança e a qualidade.
            </p>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Nosso fundador, Odenis Mesquita, é profissional certificado em Nível 3i de Acesso por Cordas nacional e internacional sendo grande representante da ANEAC em Pernambuco, trazendo para a empresa toda sua experiência e conhecimento técnico.
            </p>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Na <strong className="text-primary-light">WORKSAFE BRASIL</strong>, unimos expertise, profissionalismo e inovação para oferecer soluções sob medida para nossos clientes, assegurando a eficiência e a segurança em todas as etapas do trabalho.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="stats-grid p-6 rounded-2xl">
                <h3 className="font-bold text-4xl bg-primary-light text-transparent bg-clip-text mb-2">
                  500+
                </h3>
                <p className="text-gray-600 font-medium">Serviços Realizados</p>
              </div>
              <div className="stats-grid p-6 rounded-2xl">
                <h3 className="font-bold text-4xl bg-primary-light text-transparent bg-clip-text mb-2">
                  1000+
                </h3>
                <p className="text-gray-600 font-medium">Profissionais Treinados</p>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-primary-light hover:brightness-125 text-white text-lg px-8 shadow-lg"
              onClick={() => handleWhatsApp()}
            >
              Entre em Contato <Phone className="ml-2" />
            </Button>
          </div>
          <div className="space-y-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={AboutImage2}
                alt="Fundador 1"
                width={1080}
                height={1080}
                className="object-cover w-full h-full object-top"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <video
                className="w-full rounded-xl z-10 cursor-default"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={TreinamentoVideo} type="video/mp4" />
                Seu navegador não suporta a tag de vídeo.
              </video>
              <div className="relative rounded-xl overflow-hidden shadow-lg h-full">
                <img
                  src={AboutImage1}
                  alt="Fundador 2"
                  width={1080}
                  height={1080}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
