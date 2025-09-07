// Estrutura do progressConfig
export interface IProgressConfig {
  videoCompletePercent: number;
  textCompletePercent: number;
  requireSequential: boolean;
  allowSkip: boolean;
  isRequired: boolean;
}

// Interface para os passos da lição
export interface IOnlineLessonStep {
  id: number;
  lessonId: number;
  order: number;
  title: string;
  type: "video" | "text" | "quiz" | "activity";
  content: any;
  duration?: number;
}

// Interface para os modelos que contêm essa lição
export interface IOnlineModelLesson {
  id: number;
  modelId: number;
  lessonId: number;
  order: number;
  model?: {
    id: number;
    courseId: number;
    title: string;
    description?: string;
    course?: {
      id: number;
      name: string;
      description?: string;
    };
  };
}

export interface IEntity {
  id: number;
  companyId?: number;
  courseId?: number | null;
  title: string;
  description?: string;
  version?: string;
  isActive: boolean;
  progressConfig: IProgressConfig;
  inactiveAt?: Date | string | null;
  createdAt?: string;
  updatedAt?: string;

  // Novos relacionamentos
  steps?: IOnlineLessonStep[];
  modelLessons?: IOnlineModelLesson[];
  course?: {
    id: number;
    name: string;
    description?: string;
  };
}
