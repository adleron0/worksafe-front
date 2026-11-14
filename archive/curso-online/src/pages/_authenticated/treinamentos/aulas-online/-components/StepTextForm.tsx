import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { z } from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/general-components/Number";
import RichTextEditor from "@/components/general-components/RichTextEditor";

interface ITextContent {
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: "pdf" | "link" | "image";
    size?: number;
  }>;
  externalLinks?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

interface IOnlineLessonStep {
  id?: number;
  lessonId: number;
  title: string;
  order: number;
  duration?: number; // Em minutos, armazenado na coluna duration
  contentType: "TEXT";
  isActive: boolean;
  content: ITextContent;
}

interface StepTextFormProps {
  onClose: () => void;
  lessonId: number;
  step?: IOnlineLessonStep | null;
  lastOrder?: number;
}

const textSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  duration: z.number().min(1, "Tempo de leitura deve ser pelo menos 1 minuto"),
  content: z.object({
    content: z.string().min(1, "Conteúdo é obrigatório"),
  }),
});

const StepTextForm: React.FC<StepTextFormProps> = ({
  onClose,
  lessonId,
  step,
  lastOrder = 0,
}) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const isEditing = !!step;

  const [formData, setFormData] = useState<{
    title: string;
    duration: number;
    content: {
      content: string;
      attachments: any[];
      externalLinks: any[];
    };
  }>({
    title: "",
    duration: 5, // Padrão 5 minutos
    content: {
      content: "",
      attachments: [],
      externalLinks: [],
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (step) {
      // Parse do content se vier como string JSON
      let parsedContent = step.content;
      if (typeof step.content === 'string') {
        try {
          parsedContent = JSON.parse(step.content);
        } catch (e) {
          console.error('Failed to parse step content:', e);
          parsedContent = { content: step.content, attachments: [], externalLinks: [] };
        }
      }
      
      setFormData({
        title: step.title,
        duration: step.duration || 5,
        content: {
          content: parsedContent.content || "",
          attachments: parsedContent.attachments || [],
          externalLinks: parsedContent.externalLinks || [],
        },
      });
    } else {
      setFormData({
        title: "",
        duration: 5,
        content: {
          content: "",
          attachments: [],
          externalLinks: [],
        },
      });
    }
    setErrors({});
  }, [step]);

  const estimateReadTime = (htmlContent: string) => {
    // Remove HTML tags para contar apenas o texto
    const textOnly = htmlContent.replace(/<[^>]*>/g, "");
    // Estimate based on average reading speed of 200 words per minute
    const words = textOnly.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return Math.max(1, minutes); // Mínimo de 1 minuto
  };

  const handleContentChange = (content: string) => {
    const estimatedTime = estimateReadTime(content);
    setFormData((prev) => ({
      ...prev,
      duration: estimatedTime,
      content: {
        ...prev.content,
        content,
      },
    }));
  };

  const { mutate: saveStep, isPending } = useMutation({
    mutationFn: async (data: any) => {
      showLoader(isEditing ? "Atualizando texto..." : "Adicionando texto...");

      const payload = {
        lessonId,
        title: data.title,
        order: isEditing ? step.order : lastOrder + 100000,
        duration: Number(data.duration), // Garantir que é número
        contentType: "TEXT",
        isActive: true,
        content: JSON.stringify(data.content),
      };

      if (isEditing && step?.id) {
        return put("online-lesson-step", step.id.toString(), payload);
      } else {
        return post("online-lesson-step", "", payload);
      }
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: isEditing ? "Texto atualizado!" : "Texto adicionado!",
        description: `O conteúdo foi ${isEditing ? "atualizado" : "adicionado"} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["onlineLessonSteps"] });
      onClose();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: `Erro ao ${isEditing ? "atualizar" : "adicionar"} texto`,
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = textSchema.safeParse(formData);

    if (!validation.success) {
      const newErrors: { [key: string]: string } = {};
      validation.error.errors.forEach((error) => {
        const path = error.path.join(".");
        newErrors[path] = error.message;
      });
      setErrors(newErrors);
      return;
    }

    saveStep(formData);
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith("content.")) {
      const contentField = field.replace("content.", "");
      setFormData((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          [contentField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <div>
          <Label htmlFor="title">
            Título <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Ex: Conceitos fundamentais"
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title}</p>
          )}
        </div>

        <div className="w-fit">
          <Label htmlFor="duration">
            Tempo de Leitura (minutos){" "}
            <span className="text-destructive">*</span>
          </Label>
          <NumberInput
            id="duration"
            name="duration"
            value={formData.duration}
            onValueChange={(name: string, value: any) =>
              handleChange(name, value)
            }
            min={1}
            step={1}
            placeholder="Ex: 10"
            className={errors.duration ? "border-destructive" : ""}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Calculado automaticamente baseado no conteúdo, mas pode ser ajustado
            manualmente
          </p>
          {errors.duration && (
            <p className="text-sm text-destructive mt-1">{errors.duration}</p>
          )}
        </div>

        <div>
          <Label htmlFor="content">
            Conteúdo <span className="text-destructive">*</span>
          </Label>
          <RichTextEditor
            value={formData.content.content}
            onChange={handleContentChange}
            placeholder="Digite o conteúdo do texto..."
            height={300}
          />
          {errors["content.content"] && (
            <p className="text-sm text-destructive mt-1">
              {errors["content.content"]}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : isEditing ? "Atualizar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
};

export default StepTextForm;
