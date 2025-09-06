import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import NumberInput from "@/components/general-components/Number";
import Icon from "@/components/general-components/Icon";

interface IQuestion {
  id: string;
  question: string;
  type: "multiple_choice";
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface IQuizContent {
  description: string;
  questions: IQuestion[];
  passingScore?: number;
  maxAttempts?: number;
}

interface IOnlineLessonStep {
  id?: number;
  lessonId: number;
  title: string;
  order: number;
  duration?: number; // Em minutos, armazenado na coluna duration
  contentType: "QUIZ";
  isActive: boolean;
  content: IQuizContent;
}

interface StepQuizFormProps {
  onClose: () => void;
  lessonId: number;
  step?: IOnlineLessonStep | null;
  lastOrder?: number;
}

const quizSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  duration: z.number().min(1, "Duração deve ser pelo menos 1 minuto"),
  content: z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    questions: z
      .array(
        z.object({
          id: z.string(),
          question: z.string().min(1, "Pergunta é obrigatória"),
          type: z.literal("multiple_choice"),
          options: z
            .array(z.string())
            .min(2, "Mínimo de 2 opções")
            .max(5, "Máximo de 5 opções"),
          correctAnswer: z.number().min(0),
          explanation: z.string().optional(),
        }),
      )
      .min(1, "Adicione pelo menos uma pergunta"),
  }),
});

const StepQuizForm: React.FC<StepQuizFormProps> = ({
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
      description: string;
      questions: IQuestion[];
      passingScore: number;
      maxAttempts: number;
    };
  }>({
    title: "",
    duration: 10, // Padrão 10 minutos para quiz
    content: {
      description: "",
      questions: [] as IQuestion[],
      passingScore: 70,
      maxAttempts: 1,
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        duration: step.duration || 10,
        content: {
          description: step.content.description || "",
          questions: step.content.questions || [],
          passingScore: step.content.passingScore || 70,
          maxAttempts: step.content.maxAttempts || 1,
        },
      });
      if (step.content.questions && step.content.questions.length > 0) {
        setExpandedQuestion(step.content.questions[0].id);
      }
    } else {
      setFormData({
        title: "",
        duration: 10,
        content: {
          description: "",
          questions: [],
          passingScore: 70,
          maxAttempts: 1,
        },
      });
      setExpandedQuestion(null);
    }
    setErrors({});
  }, [step]);

  const handleAddQuestion = () => {
    const newQuestion: IQuestion = {
      id: uuidv4(),
      question: "",
      type: "multiple_choice",
      options: ["", ""],
      correctAnswer: 0,
      explanation: "",
    };

    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        questions: [...prev.content.questions, newQuestion],
      },
    }));
    setExpandedQuestion(newQuestion.id);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        questions: prev.content.questions.filter((q) => q.id !== questionId),
      },
    }));

    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    }
  };

  const handleQuestionChange = (
    questionId: string,
    field: keyof IQuestion,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        questions: prev.content.questions.map((q) =>
          q.id === questionId ? { ...q, [field]: value } : q,
        ),
      },
    }));
  };

  const handleOptionChange = (
    questionId: string,
    optionIndex: number,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        questions: prev.content.questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.map((opt, idx) =>
                  idx === optionIndex ? value : opt,
                ),
              }
            : q,
        ),
      },
    }));
  };

  const handleAddOption = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        questions: prev.content.questions.map((q) =>
          q.id === questionId && q.options.length < 5
            ? { ...q, options: [...q.options, ""] }
            : q,
        ),
      },
    }));
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        questions: prev.content.questions.map((q) => {
          if (q.id === questionId && q.options.length > 2) {
            const newOptions = q.options.filter(
              (_, idx) => idx !== optionIndex,
            );
            const newCorrectAnswer =
              q.correctAnswer >= optionIndex && q.correctAnswer > 0
                ? q.correctAnswer - 1
                : q.correctAnswer;
            return {
              ...q,
              options: newOptions,
              correctAnswer: newCorrectAnswer,
            };
          }
          return q;
        }),
      },
    }));
  };

  const { mutate: saveStep, isPending } = useMutation({
    mutationFn: async (data: any) => {
      showLoader(isEditing ? "Atualizando quiz..." : "Adicionando quiz...");

      const payload = {
        lessonId,
        title: data.title,
        order: isEditing ? step.order : lastOrder + 100000,
        duration: Number(data.duration), // Garantir que é número
        contentType: "QUIZ",
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
        title: isEditing ? "Quiz atualizado!" : "Quiz adicionado!",
        description: `O quiz foi ${isEditing ? "atualizado" : "adicionado"} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["onlineLessonSteps"] });
      onClose();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: `Erro ao ${isEditing ? "atualizar" : "adicionar"} quiz`,
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = quizSchema.safeParse(formData);

    if (!validation.success) {
      const newErrors: { [key: string]: string } = {};
      validation.error.errors.forEach((error) => {
        const path = error.path.join(".");
        newErrors[path] = error.message;
      });
      setErrors(newErrors);

      // Show first error in toast
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    // Validate that all questions have valid options and correct answer
    const invalidQuestion = formData.content.questions.find(
      (q) =>
        q.options.some((opt) => !opt.trim()) ||
        q.correctAnswer >= q.options.length,
    );

    if (invalidQuestion) {
      toast({
        title: "Erro de validação",
        description:
          "Verifique se todas as perguntas têm opções preenchidas e resposta correta selecionada.",
        variant: "destructive",
      });
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
            Título do Quiz <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Ex: Quiz de fixação"
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title}</p>
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
            placeholder="Ex: 15"
            className={errors.duration ? "border-destructive" : ""}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tempo estimado para completar o quiz
          </p>
          {errors.duration && (
            <p className="text-sm text-destructive mt-1">{errors.duration}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">
            Descrição <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.content.description}
            onChange={(e) =>
              handleChange("content.description", e.target.value)
            }
            placeholder="Descreva o objetivo do quiz..."
            rows={3}
            className={
              errors["content.description"] ? "border-destructive" : ""
            }
          />
          {errors["content.description"] && (
            <p className="text-sm text-destructive mt-1">
              {errors["content.description"]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Perguntas</Label>
            <Button
              type="button"
              onClick={handleAddQuestion}
              size="sm"
              variant="outline"
            >
              <Icon name="plus" className="h-4 w-4 mr-1" />
              Adicionar Pergunta
            </Button>
          </div>

          {formData.content.questions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Icon
                  name="help-circle"
                  className="h-12 w-12 text-muted-foreground mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  Nenhuma pergunta adicionada ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {formData.content.questions.map((question, qIndex) => (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Label>Pergunta {qIndex + 1}</Label>
                            <Textarea
                              value={question.question}
                              onChange={(e) =>
                                handleQuestionChange(
                                  question.id,
                                  "question",
                                  e.target.value,
                                )
                              }
                              placeholder="Digite a pergunta..."
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleRemoveQuestion(question.id)}
                            size="sm"
                            variant="ghost"
                            className="ml-2"
                          >
                            <Icon
                              name="trash"
                              className="h-4 w-4 text-destructive"
                            />
                          </Button>
                        </div>

                        <div>
                          <Label>Opções de Resposta</Label>
                          <RadioGroup
                            value={question.correctAnswer.toString()}
                            onValueChange={(value) =>
                              handleQuestionChange(
                                question.id,
                                "correctAnswer",
                                parseInt(value),
                              )
                            }
                          >
                            {question.options.map((option, oIndex) => (
                              <div
                                key={oIndex}
                                className="flex items-center gap-2 mt-2"
                              >
                                <RadioGroupItem
                                  value={oIndex.toString()}
                                  id={`${question.id}-${oIndex}`}
                                />
                                <Input
                                  value={option}
                                  onChange={(e) =>
                                    handleOptionChange(
                                      question.id,
                                      oIndex,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Opção ${oIndex + 1}`}
                                  className="flex-1"
                                />
                                {question.options.length > 2 && (
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveOption(question.id, oIndex)
                                    }
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <Icon name="x" className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </RadioGroup>
                          {question.options.length < 5 && (
                            <Button
                              type="button"
                              onClick={() => handleAddOption(question.id)}
                              size="sm"
                              variant="ghost"
                              className="mt-2"
                            >
                              <Icon name="plus" className="h-4 w-4 mr-1" />
                              Adicionar Opção
                            </Button>
                          )}
                        </div>

                        <div>
                          <Label>Explicação (opcional)</Label>
                          <Textarea
                            value={question.explanation || ""}
                            onChange={(e) =>
                              handleQuestionChange(
                                question.id,
                                "explanation",
                                e.target.value,
                              )
                            }
                            placeholder="Explique a resposta correta..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {errors["content.questions"] && (
            <p className="text-sm text-destructive">
              {errors["content.questions"]}
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

export default StepQuizForm;
