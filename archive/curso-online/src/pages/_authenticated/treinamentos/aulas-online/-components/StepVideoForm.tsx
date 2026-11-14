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
import Icon from "@/components/general-components/Icon";

interface IVideoContent {
  videoUrl: string;
  videoId?: string;
  description: string;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
  }>;
}

interface IOnlineLessonStep {
  id?: number;
  lessonId: number;
  title: string;
  order: number;
  duration?: number; // Em minutos, armazenado na coluna duration
  contentType: "VIDEO";
  isActive: boolean;
  content: IVideoContent;
}

interface StepVideoFormProps {
  onClose: () => void;
  lessonId: number;
  step?: IOnlineLessonStep | null;
  lastOrder?: number;
}

const videoSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  duration: z.number().min(1, "Duração deve ser pelo menos 1 minuto"),
  content: z.object({
    videoUrl: z
      .string()
      .url("URL inválida")
      .refine(
        (url) => {
          const youtubeRegex =
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
          const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+/;
          return youtubeRegex.test(url) || vimeoRegex.test(url);
        },
        { message: "URL deve ser do YouTube ou Vimeo" },
      ),
    description: z.string().min(1, "Descrição é obrigatória"),
  }),
});

const StepVideoForm: React.FC<StepVideoFormProps> = ({
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
      videoUrl: string;
      videoId: string;
      description: string;
      attachments: any[];
    };
  }>({
    title: "",
    duration: 5, // Padrão 5 minutos
    content: {
      videoUrl: "",
      videoId: "",
      description: "",
      attachments: [],
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        duration: step.duration || 5,
        content: {
          videoUrl: step.content.videoUrl || "",
          videoId: step.content.videoId || "",
          description: step.content.description || "",
          attachments: step.content.attachments || [],
        },
      });
    } else {
      setFormData({
        title: "",
        duration: 5,
        content: {
          videoUrl: "",
          videoId: "",
          description: "",
          attachments: [],
        },
      });
    }
    setErrors({});
  }, [step]);

  const extractVideoId = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    );
    if (youtubeMatch) {
      return { platform: "youtube", id: youtubeMatch[1] };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { platform: "vimeo", id: vimeoMatch[1] };
    }

    return null;
  };

  const handleUrlChange = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        videoUrl: url,
      },
    }));

    // Extract video ID
    const videoInfo = extractVideoId(url);
    if (videoInfo) {
      setFormData((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          videoId: videoInfo.id,
        },
      }));
    }
  };

  const { mutate: saveStep, isPending } = useMutation({
    mutationFn: async (data: any) => {
      showLoader(isEditing ? "Atualizando vídeo..." : "Adicionando vídeo...");

      const payload = {
        lessonId,
        title: data.title,
        order: isEditing ? step.order : lastOrder + 100000,
        duration: Number(data.duration), // Garantir que é número
        contentType: "VIDEO",
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
        title: isEditing ? "Vídeo atualizado!" : "Vídeo adicionado!",
        description: `O vídeo foi ${isEditing ? "atualizado" : "adicionado"} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["onlineLessonSteps"] });
      onClose();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: `Erro ao ${isEditing ? "atualizar" : "adicionar"} vídeo`,
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = videoSchema.safeParse(formData);

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
    console.log(
      `handleChange chamado - field: ${field}, value:`,
      value,
      `tipo: ${typeof value}`,
    );

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
            Título do Vídeo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Ex: Introdução ao tema"
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <Label htmlFor="videoUrl">
            URL do Vídeo <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="videoUrl"
              name="videoUrl"
              value={formData.content.videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={errors["content.videoUrl"] ? "border-destructive" : ""}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Suporta URLs do YouTube e Vimeo
          </p>
          {errors["content.videoUrl"] && (
            <p className="text-sm text-destructive mt-1">
              {errors["content.videoUrl"]}
            </p>
          )}
          {formData.content.videoId && (
            <p className="text-xs text-green-600 mt-1">
              <Icon name="check-circle" className="inline h-3 w-3 mr-1" />
              ID do vídeo detectado: {formData.content.videoId}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="duration">
            Duração (minutos) <span className="text-destructive">*</span>
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
            placeholder="Ex: 30"
            className={errors.duration ? "border-destructive" : ""}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Duração do conteúdo da sessão em minutos
          </p>
          {errors.duration && (
            <p className="text-sm text-destructive mt-1">{errors.duration}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">
            Descrição <span className="text-destructive">*</span>
          </Label>
          <RichTextEditor
            value={formData.content.description}
            onChange={(value) => handleChange("content.description", value)}
            placeholder="Descreva o conteúdo do vídeo..."
            height={300}
          />
          {errors["content.description"] && (
            <p className="text-sm text-destructive mt-1">
              {errors["content.description"]}
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

export default StepVideoForm;
