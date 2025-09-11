import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { get, post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

// Interfaces
interface ILesson {
  id: number;
  title: string;
  description?: string;
  version?: string;
  isActive: boolean;
  progressConfig?: any;
  course?: {
    id: number;
    name: string;
  };
}

interface IModelLesson {
  id?: number;
  modelId: number;
  lessonId: number;
  order: number;
  isActive: boolean;
  lesson?: ILesson;
}

interface CourseLessonsManagerProps {
  modelId: number;
  courseId: number;
  onClose?: () => void;
}

// Componente para aula vinculável com switch
const LinkableLesson = ({
  lesson,
  isLinked,
  onToggle,
  isUpdating,
}: {
  lesson: ILesson;
  isLinked: boolean;
  onToggle: () => void;
  isUpdating?: boolean;
}) => {
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">{lesson.title}</h4>
            {lesson.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {lesson.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {lesson.version && (
                <Badge variant="outline" className="text-xs">
                  v{lesson.version}
                </Badge>
              )}
              {lesson.progressConfig?.isRequired && (
                <Badge variant="default" className="text-xs">
                  Obrigatória
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Switch
              checked={isLinked}
              onCheckedChange={onToggle}
              disabled={isUpdating}
            />
            <span className="text-xs text-muted-foreground">
              {isLinked ? "Vinculada" : "Não vinculada"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para item ordenável (apenas para aulas vinculadas)
const SortableLesson = ({
  lesson,
  order,
  onRemove,
  isDragging,
}: {
  lesson: ILesson;
  order: number;
  onRemove: () => void;
  isDragging?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lesson.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "relative group",
        isDragging && "cursor-grabbing",
        !isDragging && "cursor-grab",
      )}
    >
      <Card
        className={cn(
          "transition-all duration-200",
          "hover:shadow-md hover:border-primary/50",
          "bg-primary/5",
          isSortableDragging && "shadow-lg border-primary",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1" {...listeners}>
              <div className="flex items-center gap-2">
                <Icon
                  name="grip-vertical"
                  className="h-4 w-4 text-muted-foreground"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  #{order}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-1">
                  {lesson.title}
                </h4>
                {lesson.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {lesson.description}
                  </p>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-8 w-8 p-0"
            >
              <Icon name="x" className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Interface para resposta da API
interface ApiResponse {
  rows: any[];
  total: number;
}

// Componente principal
const CourseLessonsManager: React.FC<CourseLessonsManagerProps> = ({
  modelId,
  courseId,
  onClose,
}) => {
  const [allLessons, setAllLessons] = useState<ILesson[]>([]);
  const [modelLessons, setModelLessons] = useState<IModelLesson[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [updatingLessonId, setUpdatingLessonId] = useState<number | null>(null);

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

  // Buscar todas as aulas do curso
  const { data: lessonsData, isLoading: isLoadingLessons } =
    useQuery<ApiResponse>({
      queryKey: ["courseLessons", courseId],
      queryFn: async () => {
        if (!courseId) return { rows: [], total: 0 };
        const params = [
          { key: "or", value: `[{ "courseId": ${courseId} }, { "courseId": null }]` },
          { key: "limit", value: 'all' },
          { key: "active", value: true },
        ];
        return get("online-lesson", "", params) as Promise<ApiResponse>;
      },
      enabled: !!courseId,
    });

  // Buscar aulas já vinculadas ao modelo
  const {
    data: linkedLessonsData,
    isLoading: isLoadingLinked,
    refetch: refetchLinked,
  } = useQuery<ApiResponse>({
    queryKey: ["modelLessons", modelId],
    queryFn: async () => {
      const params = [
        { key: "modelId", value: modelId },
        { key: "limit", value: 'all' },
        { key: "show", value: "lesson" },
        { key: "order-order", value: "asc" },
      ];
      return get("online-course-lesson", "", params) as Promise<ApiResponse>;
    },
  });

  // Mutation para vincular/desvincular/reordenar aulas
  const { mutate: updateModelLesson } = useMutation({
    mutationFn: async (data: {
      modelId: number;
      lessonId: number;
      order: number;
      isActive: boolean;
    }) => {
      return post("online-course-lesson", "upsert", data);
    },
    onSuccess: () => {
      refetchLinked();
      setUpdatingLessonId(null);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a vinculação da aula.",
        variant: "destructive",
      });
      setUpdatingLessonId(null);
    },
  });

  // Mutation para atualizar múltiplas aulas de uma vez (batch)
  const { mutate: batchUpdateModelLessons } = useMutation({
    mutationFn: async (
      updates: Array<{
        modelId: number;
        lessonId: number;
        order: number;
        isActive: boolean;
      }>,
    ) => {
      // Fazer todas as requisições em paralelo
      const promises = updates.map((data) =>
        post("online-course-lesson", "upsert", data),
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      // Refetch apenas uma vez após todos os updates
      refetchLinked();
    },
    onError: () => {
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível atualizar a ordem das aulas.",
        variant: "destructive",
      });
    },
  });

  // Atualizar states quando os dados chegarem
  useEffect(() => {
    if (lessonsData?.rows) {
      setAllLessons(lessonsData.rows);
    }
  }, [lessonsData]);

  useEffect(() => {
    if (linkedLessonsData?.rows) {
      const active = linkedLessonsData.rows.filter(
        (ml: IModelLesson) => ml.isActive,
      );
      setModelLessons(
        active.sort((a: IModelLesson, b: IModelLesson) => a.order - b.order),
      );
    }
  }, [linkedLessonsData]);

  // Toggle vincular/desvincular aula
  const handleToggleLesson = (lesson: ILesson) => {
    setUpdatingLessonId(lesson.id);
    const isCurrentlyLinked = modelLessons.some(
      (ml) => ml.lessonId === lesson.id,
    );

    if (isCurrentlyLinked) {
      // Desvincular
      updateModelLesson({
        modelId,
        lessonId: lesson.id,
        order: 0,
        isActive: false,
      });
      toast({
        title: "Aula desvinculada",
        description: `${lesson.title} foi removida do modelo.`,
        variant: "default",
      });
    } else {
      // Vincular
      const order =
        modelLessons.length === 0
          ? 100000
          : modelLessons[modelLessons.length - 1].order + 100000;

      updateModelLesson({
        modelId,
        lessonId: lesson.id,
        order,
        isActive: true,
      });
      toast({
        title: "Aula vinculada",
        description: `${lesson.title} foi adicionada ao modelo.`,
        variant: "success",
      });
    }
  };

  // Reordenar aulas no modelo
  const handleReorderLessons = (newOrder: IModelLesson[]) => {
    const updates: Array<{
      modelId: number;
      lessonId: number;
      order: number;
      isActive: boolean;
    }> = [];

    newOrder.forEach((item, index) => {
      const newOrderValue = (index + 1) * 100000;
      if (item.order !== newOrderValue) {
        updates.push({
          modelId,
          lessonId: item.lessonId,
          order: newOrderValue,
          isActive: true,
        });
      }
    });

    // Se houver atualizações, fazer batch update
    if (updates.length > 0) {
      batchUpdateModelLessons(updates);
      toast({
        title: "Ordem atualizada",
        description: "A ordem das aulas foi atualizada com sucesso.",
        variant: "success",
      });
    }
  };

  // Handlers do drag and drop (apenas para reordenação)
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

    const oldIndex = modelLessons.findIndex((ml) => ml.lessonId === activeId);
    const newIndex = modelLessons.findIndex((ml) => ml.lessonId === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(modelLessons, oldIndex, newIndex);
      setModelLessons(newOrder);
      handleReorderLessons(newOrder);
    }

    setActiveId(null);
  };

  const activeLesson = activeId
    ? modelLessons.find((ml) => ml.lessonId === activeId)?.lesson
    : null;

  const isLoading = isLoadingLessons || isLoadingLinked;

  // Verificar quais aulas estão vinculadas
  const isLessonLinked = (lessonId: number) => {
    return modelLessons.some((ml) => ml.lessonId === lessonId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Todas as Aulas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Aulas Disponíveis</CardTitle>
            <CardDescription>
              {allLessons.length} aulas - Use o switch para vincular/desvincular
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : allLessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Icon
                    name="folder-open"
                    className="h-12 w-12 text-muted-foreground mb-2"
                  />
                  <p className="text-muted-foreground text-sm">
                    Nenhuma aula disponível neste curso
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allLessons.map((lesson) => (
                    <LinkableLesson
                      key={lesson.id}
                      lesson={lesson}
                      isLinked={isLessonLinked(lesson.id)}
                      onToggle={() => handleToggleLesson(lesson)}
                      isUpdating={updatingLessonId === lesson.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Coluna Direita - Aulas Vinculadas (ordenáveis) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Aulas do Modelo</CardTitle>
            <CardDescription>
              {modelLessons.length} aulas vinculadas - Arraste para reordenar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : modelLessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Icon
                    name="layers"
                    className="h-12 w-12 text-muted-foreground mb-2"
                  />
                  <p className="text-muted-foreground text-sm">
                    Nenhuma aula vinculada ainda
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use os switches ao lado para vincular aulas
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToWindowEdges]}
                >
                  <SortableContext
                    items={modelLessons.map((ml) => ml.lessonId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {modelLessons.map(
                        (modelLesson, index) =>
                          modelLesson.lesson && (
                            <SortableLesson
                              key={modelLesson.lessonId}
                              lesson={modelLesson.lesson}
                              order={index + 1}
                              onRemove={() =>
                                handleToggleLesson(modelLesson.lesson!)
                              }
                              isDragging={activeId === modelLesson.lessonId}
                            />
                          ),
                      )}
                    </div>
                  </SortableContext>

                  {/* Overlay para o item sendo arrastado */}
                  <DragOverlay>
                    {activeLesson && (
                      <Card className="shadow-xl border-primary opacity-90">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Icon
                              name="grip-vertical"
                              className="h-4 w-4 text-muted-foreground"
                            />
                            <h4 className="font-medium text-sm">
                              {activeLesson.title}
                            </h4>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Rodapé com estatísticas e botão fechar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total: {allLessons.length} aulas</span>
          <span>•</span>
          <span>Vinculadas: {modelLessons.length}</span>
          <span>•</span>
          <span>Não vinculadas: {allLessons.length - modelLessons.length}</span>
        </div>
        <Button onClick={onClose} variant="outline">
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default CourseLessonsManager;
