import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { get, patch, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import useVerify from "@/hooks/use-verify";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import Icon from "@/components/general-components/Icon";
import Dialog from "@/components/general-components/Dialog";
import Loader from "@/components/general-components/Loader";

// Step Forms
import StepVideoForm from "./-components/StepVideoForm";
import StepTextForm from "./-components/StepTextForm";
import StepQuizForm from "./-components/StepQuizForm";

// Interfaces
interface IProgressConfig {
  videoCompletePercent: number;
  textCompletePercent: number;
  requireSequential: boolean;
  allowSkip: boolean;
  isRequired: boolean;
}

interface IOnlineLesson {
  id?: number;
  title: string;
  description?: string;
  version?: string;
  isActive: boolean;
  progressConfig: IProgressConfig;
  createdAt?: string;
  updatedAt?: string;
}

interface IVideoContent {
  videoUrl: string;
  videoId?: string;
  duration?: number;
  description: string;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
  }>;
}

interface ITextContent {
  content: string;
  estimatedReadTime: number;
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

interface IQuizContent {
  description: string;
  questions: Array<{
    id: string;
    question: string;
    type: "multiple_choice";
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }>;
  passingScore?: number;
  maxAttempts?: number;
}

type StepContent = IVideoContent | ITextContent | IQuizContent;

interface IOnlineLessonStep {
  id?: number;
  lessonId?: number;
  title: string;
  order: number;
  contentType: "VIDEO" | "TEXT" | "QUIZ";
  isActive: boolean;
  content: StepContent;
  duration?: number;
  inactiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Componente para item ordenável
const SortableStepItem = ({
  step,
  index,
  onEdit,
  onToggleStatus,
}: {
  step: IOnlineLessonStep;
  index: number;
  onEdit: () => void;
  onToggleStatus: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id || index,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return "video";
      case "TEXT":
        return "file-text";
      case "QUIZ":
        return "help-circle";
      default:
        return "file";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group rounded-lg border p-3 sm:p-4 transition-all ${
        step.isActive
          ? "border-border hover:border-primary bg-background"
          : "border-muted bg-muted/30 opacity-60"
      } ${isDragging ? "shadow-lg border-primary cursor-grabbing" : "cursor-grab"}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Icon
            name="grip-vertical"
            className="h-4 w-4 text-muted-foreground hidden sm:block"
          />
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
            {index + 1}
          </div>
          <Icon
            name={getStepIcon(step.contentType)}
            className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-sm sm:text-base truncate">
              {step.title}
            </h4>
            {!step.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inativo
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {step.contentType}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {step.contentType === "VIDEO" && "Conteúdo em vídeo"}
            {step.contentType === "TEXT" && "Conteúdo em texto"}
            {step.contentType === "QUIZ" && "Questionário"}
            {step.duration && ` • ${step.duration} min`}
          </p>
        </div>

        <div className="flex items-center gap-1 mt-2 sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Icon name="pencil" className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
          >
            <Icon
              name={step.isActive ? "eye-off" : "eye"}
              className="h-4 w-4"
            />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Route setup
export const Route = createFileRoute(
  "/_authenticated/treinamentos/aulas-online/$id",
)({
  component: AulaOnlineDetails,
});

function AulaOnlineDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { can } = useVerify();

  const { showLoader, hideLoader } = useLoader();

  const isNewLesson = id === "novo";

  // States
  const [lessonData, setLessonData] = useState<IOnlineLesson | null>(null);
  const [steps, setSteps] = useState<IOnlineLessonStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<IOnlineLessonStep | null>(
    null,
  );
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepModalType, setStepModalType] = useState<
    "VIDEO" | "TEXT" | "QUIZ" | null
  >(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Queries - Ajustado para usar query params
  const { data: lessonResponse, isLoading: isLoadingLesson } = useQuery<any>({
    queryKey: ["onlineLesson", id],
    queryFn: async () => {
      if (isNewLesson) return null;
      const params = [{ key: "id", value: id }];
      return get("online-lesson", "", params);
    },
    enabled: !isNewLesson,
  });

  const {
    data: stepsResponse,
    isLoading: isLoadingSteps,
    refetch: refetchSteps,
  } = useQuery<any>({
    queryKey: ["onlineLessonSteps", id],
    queryFn: async () => {
      if (isNewLesson) return { rows: [], total: 0 };
      const params = [
        { key: "lessonId", value: id },
        { key: "order-order", value: "asc" },
        { key: "limit", value: 999 },
      ];
      return get("online-lesson-step", "", params);
    },
    enabled: !isNewLesson,
  });

  // Effects
  useEffect(() => {
    if (lessonResponse) {
      const lesson = Array.isArray(lessonResponse.rows)
        ? lessonResponse.rows[0]
        : lessonResponse;
      if (lesson) {
        const progressConfig =
          typeof lesson.progressConfig === "string"
            ? JSON.parse(lesson.progressConfig)
            : lesson.progressConfig;

        setLessonData({
          ...lesson,
          progressConfig,
        });
      }
    }
  }, [lessonResponse]);

  useEffect(() => {
    if (stepsResponse?.rows) {
      const parsedSteps = stepsResponse.rows.map((step: any) => ({
        ...step,
        content:
          typeof step.content === "string"
            ? JSON.parse(step.content)
            : step.content,
      }));
      setSteps(parsedSteps);
    }
  }, [stepsResponse]);

  // Mutations for steps
  const { mutate: deactivateStep } = useMutation({
    mutationFn: (stepId: number) => {
      showLoader("Inativando step...");
      return patch("online-lesson-step", `inactive/${stepId}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Step inativado!",
        description: "Step foi inativado com sucesso.",
        variant: "success",
      });
      refetchSteps();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro ao inativar step",
        description: error.response?.data?.message || "Erro ao inativar step",
        variant: "destructive",
      });
    },
  });

  const { mutate: activateStep } = useMutation({
    mutationFn: (stepId: number) => {
      showLoader("Ativando step...");
      return patch("online-lesson-step", `active/${stepId}`);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Step reativado!",
        description: "Step foi reativado com sucesso.",
        variant: "success",
      });
      refetchSteps();
    },
    onError: (error: any) => {
      hideLoader();
      toast({
        title: "Erro ao reativar step",
        description: error.response?.data?.message || "Erro ao reativar step",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar a ordem de um step individual
  // Comentado temporariamente - pode ser necessário no futuro
  /*
  const { mutate: updateStepOrder } = useMutation({
    mutationFn: async (data: {
      id: number;
      order: number;
      step: IOnlineLessonStep;
    }) => {
      // Mantém todos os dados do step, apenas atualizando a order
      const payload = {
        lessonId: data.step.lessonId,
        title: data.step.title,
        order: data.order,
        duration: data.step.duration,
        contentType: data.step.contentType,
        isActive: data.step.isActive,
        content:
          typeof data.step.content === "string"
            ? data.step.content
            : JSON.stringify(data.step.content),
      };
      return put("online-lesson-step", data.id.toString(), payload);
    },
    onError: () => {
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível atualizar a ordem das etapas.",
        variant: "destructive",
      });
    },
  });
  */

  // Mutation para atualizar múltiplos steps de uma vez (batch)
  const { mutate: batchUpdateStepsOrder } = useMutation({
    mutationFn: async (
      updates: Array<{
        id: number;
        order: number;
        step: IOnlineLessonStep;
      }>,
    ) => {
      showLoader("Atualizando ordem das etapas...");
      // Fazer todas as requisições em paralelo
      const promises = updates.map((data) => {
        // Mantém todos os dados do step, apenas atualizando a order
        const payload = {
          lessonId: data.step.lessonId,
          title: data.step.title,
          order: data.order,
          duration: data.step.duration,
          contentType: data.step.contentType,
          isActive: data.step.isActive,
          content:
            typeof data.step.content === "string"
              ? data.step.content
              : JSON.stringify(data.step.content),
        };
        return put("online-lesson-step", data.id.toString(), payload);
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Ordem atualizada",
        description: "A ordem das etapas foi atualizada com sucesso.",
        variant: "success",
      });
      refetchSteps();
    },
    onError: () => {
      hideLoader();
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível atualizar a ordem das etapas.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddStep = (type: "VIDEO" | "TEXT" | "QUIZ") => {
    setSelectedStep(null);
    setStepModalType(type);
    setIsStepModalOpen(true);
  };

  const handleEditStep = (step: IOnlineLessonStep) => {
    setSelectedStep(step);
    setStepModalType(step.contentType);
    setIsStepModalOpen(true);
  };

  const handleToggleStepStatus = (step: IOnlineLessonStep) => {
    if (!step.id) return;

    if (step.isActive) {
      deactivateStep(step.id);
    } else {
      activateStep(step.id);
    }
  };

  // Handlers do drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeId = Number(active.id);
    const overId = Number(over.id);

    const oldIndex = steps.findIndex((step) => step.id === activeId);
    const newIndex = steps.findIndex((step) => step.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSteps = arrayMove(steps, oldIndex, newIndex);
      setSteps(newSteps);

      // Preparar updates para batch
      const updates: Array<{
        id: number;
        order: number;
        step: IOnlineLessonStep;
      }> = [];
      newSteps.forEach((step, index) => {
        if (step.id) {
          const newOrderValue = (index + 1) * 100000;
          if (step.order !== newOrderValue) {
            updates.push({
              id: step.id,
              order: newOrderValue,
              step: step,
            });
          }
        }
      });

      // Se houver atualizações, fazer batch update
      if (updates.length > 0) {
        batchUpdateStepsOrder(updates);
      }
    }

    setActiveId(null);
  };

  const activeSteps = steps.filter((s) => s.isActive);
  const isLoading = isLoadingLesson || isLoadingSteps;
  const hasPermission = can("view_treinamentos");

  // Check permissions after all hooks
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (isNewLesson) {
    return (
      <div className="container mx-auto py-6 px-0 max-w-7xl">
        <div className="flex flex-col items-center justify-center h-96">
          <Icon
            name="alert-circle"
            className="h-12 w-12 text-muted-foreground mb-4"
          />
          <p className="text-xl font-semibold mb-2">Criação de nova aula</p>
          <p className="text-muted-foreground mb-4">
            Para criar uma nova aula, use o formulário na página de listagem
          </p>
          <Button
            onClick={() => navigate({ to: "/treinamentos/aulas-online" })}
          >
            Voltar para listagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-0 max-w-7xl">
      {/* Header */}
      <Card className="mb-4 md:mb-6 mx-4 md:mx-0">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <Icon
                  name="book-open"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0 mt-1 sm:mt-0"
                />
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words">
                  {lessonData?.title || "Aula Online"}
                </h1>
              </div>
              {lessonData?.description && (
                <p className="text-sm sm:text-base text-muted-foreground mt-2 sm:ml-8 md:ml-9">
                  {lessonData.description}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => navigate({ to: "/treinamentos/aulas-online" })}
            >
              <Icon name="arrow-left" className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loader title="Carregando detalhes da aula..." />
      ) : (
        <div className="px-4 md:px-0">
          {/* Mobile: Card de adicionar conteúdo inline */}
          <Card className="mb-4 lg:hidden">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Adicionar Conteúdo</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddStep("VIDEO")}
                >
                  <Icon name="video" className="h-4 w-4" />
                  <span className="ml-2 hidden xs:inline">Vídeo</span>
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddStep("TEXT")}
                >
                  <Icon name="file-text" className="h-4 w-4" />
                  <span className="ml-2 hidden xs:inline">Texto</span>
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddStep("QUIZ")}
                >
                  <Icon name="help-circle" className="h-4 w-4" />
                  <span className="ml-2 hidden xs:inline">Quiz</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Column - Steps List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">
                    Etapas da Aula
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Organize o conteúdo da aula em etapas sequenciais
                    <span className="hidden sm:inline">
                      {" "}
                      • Arraste para reordenar
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {steps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Icon
                        name="layers"
                        className="h-12 w-12 text-muted-foreground mb-4"
                      />
                      <p className="text-muted-foreground mb-2">
                        Nenhuma etapa criada
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Adicione vídeos, textos ou quizzes para construir sua
                        aula
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToWindowEdges]}
                      >
                        <SortableContext
                          items={steps.map((s) => s.id || 0)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {steps.map((step, index) => (
                              <SortableStepItem
                                key={step.id || index}
                                step={step}
                                index={index}
                                onEdit={() => handleEditStep(step)}
                                onToggleStatus={() =>
                                  handleToggleStepStatus(step)
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>

                        {/* Overlay para o item sendo arrastado */}
                        <DragOverlay>
                          {activeId && (
                            <Card className="shadow-xl border-primary opacity-90">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                  <Icon
                                    name="grip-vertical"
                                    className="h-4 w-4 text-muted-foreground"
                                  />
                                  <h4 className="font-medium text-sm">
                                    {
                                      steps.find((s) => s.id === activeId)
                                        ?.title
                                    }
                                  </h4>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </DragOverlay>
                      </DndContext>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Side Column - Desktop Only */}
            <div className="space-y-4 md:space-y-6">
              {/* Add Steps Card - Desktop */}
              <Card className="hidden lg:block">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">
                    Adicionar Conteúdo
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Escolha o tipo de conteúdo para adicionar
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleAddStep("VIDEO")}
                  >
                    <Icon name="video" className="mr-2 h-4 w-4" />
                    Adicionar Vídeo
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleAddStep("TEXT")}
                  >
                    <Icon name="file-text" className="mr-2 h-4 w-4" />
                    Adicionar Texto
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleAddStep("QUIZ")}
                  >
                    <Icon name="help-circle" className="mr-2 h-4 w-4" />
                    Adicionar Quiz
                  </Button>
                </CardContent>
              </Card>

              {/* Timeline Preview */}
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">
                    Preview da Aula
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Visualize o fluxo da aula
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon
                          name="layers"
                          className="h-4 w-4 text-muted-foreground"
                        />
                        <span>{activeSteps.length} etapas ativas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon
                          name="eye-off"
                          className="h-4 w-4 text-muted-foreground"
                        />
                        <span>
                          {steps.length - activeSteps.length} inativas
                        </span>
                      </div>
                    </div>

                    {activeSteps.length > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Icon name="clock" className="h-4 w-4" />
                        <span>
                          Tempo estimado:{" "}
                          {activeSteps.reduce(
                            (total, step) => total + (step.duration || 0),
                            0,
                          )}{" "}
                          minutos
                        </span>
                      </div>
                    )}

                    {activeSteps.length > 0 && (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                        <div className="space-y-4">
                          {activeSteps.map((step, index) => (
                            <div
                              key={step.id || index}
                              className="flex items-center gap-3"
                            >
                              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {step.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {step.contentType}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Step Dialogs */}
      {!isNewLesson && (
        <>
          {/* Video Dialog */}
          <Dialog
            showBttn={false}
            showHeader={true}
            open={isStepModalOpen && stepModalType === "VIDEO"}
            onOpenChange={(open) => {
              if (!open) {
                setIsStepModalOpen(false);
                setSelectedStep(null);
                setStepModalType(null);
              }
            }}
            title={selectedStep ? "Editar Vídeo" : "Adicionar Vídeo"}
            description="Configure o conteúdo em vídeo para esta etapa da aula"
            className="sm:max-w-2xl"
          >
            <StepVideoForm
              onClose={() => {
                setIsStepModalOpen(false);
                setSelectedStep(null);
                setStepModalType(null);
              }}
              lessonId={parseInt(id)}
              step={selectedStep as any}
              lastOrder={
                steps.length > 0 ? Math.max(...steps.map((s) => s.order)) : 0
              }
            />
          </Dialog>

          {/* Text Dialog */}
          <Dialog
            showBttn={false}
            showHeader={true}
            open={isStepModalOpen && stepModalType === "TEXT"}
            onOpenChange={(open) => {
              if (!open) {
                setIsStepModalOpen(false);
                setSelectedStep(null);
                setStepModalType(null);
              }
            }}
            title={selectedStep ? "Editar Texto" : "Adicionar Texto"}
            description="Configure o conteúdo em texto para esta etapa da aula"
            className="sm:max-w-2xl"
          >
            <StepTextForm
              onClose={() => {
                setIsStepModalOpen(false);
                setSelectedStep(null);
                setStepModalType(null);
              }}
              lessonId={parseInt(id)}
              step={selectedStep as any}
              lastOrder={
                steps.length > 0 ? Math.max(...steps.map((s) => s.order)) : 0
              }
            />
          </Dialog>

          {/* Quiz Dialog */}
          <Dialog
            showBttn={false}
            showHeader={true}
            open={isStepModalOpen && stepModalType === "QUIZ"}
            onOpenChange={(open) => {
              if (!open) {
                setIsStepModalOpen(false);
                setSelectedStep(null);
                setStepModalType(null);
              }
            }}
            title={selectedStep ? "Editar Quiz" : "Adicionar Quiz"}
            description="Configure o questionário para esta etapa da aula"
            className="sm:max-w-2xl"
          >
            <StepQuizForm
              onClose={() => {
                setIsStepModalOpen(false);
                setSelectedStep(null);
                setStepModalType(null);
              }}
              lessonId={parseInt(id)}
              step={selectedStep as any}
              lastOrder={
                steps.length > 0 ? Math.max(...steps.map((s) => s.order)) : 0
              }
            />
          </Dialog>
        </>
      )}
    </div>
  );
}

export default AulaOnlineDetails;
