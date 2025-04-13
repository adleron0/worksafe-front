import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

interface CtaProps {
  title: string;
  subtitle: string;
  buttonText: string;
  whatsAppMessage: string;
  handleWhatsApp: (message: string) => void;
}

const Cta: React.FC<CtaProps> = ({ title, subtitle, buttonText, whatsAppMessage, handleWhatsApp }) => {
  return (
    <section className="py-10 bg-gradient-to-r from-green-400 to-primary-light">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50 px-4">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {title}
          </h2>
          <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
          <Button
            size="lg"
            className="bg-black hover:bg-black/80 text-white text-lg px-12"
            onClick={() => handleWhatsApp(whatsAppMessage)}
          >
            {buttonText} <ArrowUpRight className="ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Cta;
