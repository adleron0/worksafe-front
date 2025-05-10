import { MessageCircleMore } from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FaqData {
  question: string;
  answer: string;
}

const Faq = ({ faqData = [] }: { faqData: FaqData[] }) => {
  return (
    <section id="faq" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-5 md:mx-20 lg:mx-40 2xl:mx-50">
        <div className="text-center mb-16">
          <h2 className="section-title text-gray-700 text-3xl md:text-5xl font-bold pb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Encontre respostas para as dúvidas mais comuns sobre os nossos cursos.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <Accordion type="single" collapsible className="divide-y">
              {faqData.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className={cn(
                    "border-b-0 last:border-0",
                    index === 0 ? "rounded-t-xl overflow-hidden" : "",
                    index === faqData.length - 1 ? "rounded-b-xl overflow-hidden" : ""
                  )}
                >
                  <AccordionTrigger className="py-4 md:py-6 px-4 md:px-6 hover:no-underline group cursor-pointer">
                    <div className="flex items-center gap-3 md:gap-4 text-left w-full">
                      <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-md bg-primary/10 text-primary shadow-sm group-hover:bg-primary/15 transition-all duration-300">
                        <MessageCircleMore size={16} className="md:hidden" strokeWidth={1.5} />
                        <MessageCircleMore size={18} className="hidden md:block" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm md:text-base lg:text-lg font-medium text-gray-800 group-hover:text-primary transition-colors duration-200">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 md:px-6 pb-4 md:pb-6 pt-0 text-gray-600 leading-relaxed">
                    <div className="pl-10 md:pl-14 border-l-2 border-primary/20 ml-3 md:ml-5 py-2 text-sm md:text-base">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Faq;
