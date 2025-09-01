import React from "react";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import { Switch } from "@/components/ui/switch";
import IconPicker from "@/components/general-components/IconPicker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import Icon from "@/components/general-components/Icon";

interface WhyUsCard {
  icon: string;
  title: string;
  description: string;
}

interface WhyUsData {
  active: boolean;
  title: string;
  subtitle: string;
  cards: WhyUsCard[];
}

interface WhyUsEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors?: { [key: string]: string };
}

const DEFAULT_WHY_US: WhyUsData = {
  active: true,
  title: "Por que nos escolher?",
  subtitle: "Somos referência em nossa área de atuação, com anos de mercado.",
  cards: [
    {
      icon: "award",
      title: "Certificação Reconhecida",
      description: "Certificados válidos em todo território nacional",
    },
    {
      icon: "users",
      title: "Turmas Reduzidas",
      description: "Atenção personalizada para cada aluno",
    },
    {
      icon: "shield",
      title: "Instrutores Especializados",
      description: "Profissionais com vasta experiência no mercado",
    },
    {
      icon: "clock",
      title: "Horários Flexíveis",
      description: "Turmas em diversos horários para sua conveniência",
    },
  ],
};

const WhyUsEditor: React.FC<WhyUsEditorProps> = ({ value, onChange, errors }) => {
  const parseValue = (): WhyUsData => {
    if (!value || value === "") {
      return DEFAULT_WHY_US;
    }
    try {
      const parsed = JSON.parse(value);
      return {
        active: parsed.active ?? DEFAULT_WHY_US.active,
        title: parsed.title || DEFAULT_WHY_US.title,
        subtitle: parsed.subtitle || DEFAULT_WHY_US.subtitle,
        cards: parsed.cards && parsed.cards.length > 0 ? parsed.cards : DEFAULT_WHY_US.cards,
      };
    } catch {
      return DEFAULT_WHY_US;
    }
  };

  const data = parseValue();

  const updateData = (updates: Partial<WhyUsData>) => {
    const newData = { ...data, ...updates };
    onChange(JSON.stringify(newData));
  };

  const updateCard = (index: number, updates: Partial<WhyUsCard>) => {
    const newCards = [...data.cards];
    newCards[index] = { ...newCards[index], ...updates };
    updateData({ cards: newCards });
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Seção "Por que nos escolher?"
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Configure a seção de vantagens que aparece na landing page
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="whyUsActive" className="text-sm">
            Ativo
          </Label>
          <Switch
            id="whyUsActive"
            checked={data.active}
            onCheckedChange={(checked) => updateData({ active: checked })}
          />
        </div>
      </div>

      {data.active && (
        <>
          <div className="space-y-3 pt-2">
            <div>
              <Label htmlFor="whyUsTitle" className="text-sm">
                Título da Seção
              </Label>
              <Input
                id="whyUsTitle"
                value={data.title}
                onChange={(e) => updateData({ title: e.target.value })}
                placeholder="Ex: Por que nos escolher?"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="whyUsSubtitle" className="text-sm">
                Subtítulo
              </Label>
              <Input
                id="whyUsSubtitle"
                value={data.subtitle}
                onChange={(e) => updateData({ subtitle: e.target.value })}
                placeholder="Ex: Somos referência em nossa área..."
                type="textArea"
                className="mt-1 min-h-[60px]"
              />
            </div>
          </div>

          <div className="pt-2">
            <Label className="text-sm mb-2 block">Cards de Vantagens</Label>
            <Accordion type="single" collapsible className="w-full">
              {data.cards.map((card, index) => (
                <AccordionItem key={index} value={`card-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      {card.icon && (
                        <Icon name={card.icon} className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        Card {index + 1}: {card.title || "Sem título"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-3">
                    <div>
                      <IconPicker
                        value={card.icon}
                        onChange={(iconName) => updateCard(index, { icon: iconName })}
                        label="Ícone"
                        placeholder="Buscar ícone..."
                      />
                    </div>

                    <div>
                      <Label htmlFor={`cardTitle-${index}`} className="text-sm">
                        Título do Card
                      </Label>
                      <Input
                        id={`cardTitle-${index}`}
                        value={card.title}
                        onChange={(e) => updateCard(index, { title: e.target.value })}
                        placeholder="Ex: Certificação Reconhecida"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`cardDescription-${index}`} className="text-sm">
                        Descrição
                      </Label>
                      <Input
                        id={`cardDescription-${index}`}
                        value={card.description}
                        onChange={(e) => updateCard(index, { description: e.target.value })}
                        placeholder="Ex: Certificados válidos em todo território nacional"
                        type="textArea"
                        className="mt-1 min-h-[60px]"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      )}

      {errors?.whyUs && <p className="text-red-500 text-sm mt-2">{errors.whyUs}</p>}
    </div>
  );
};

export default WhyUsEditor;