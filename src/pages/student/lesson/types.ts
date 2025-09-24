// Types for Lesson Player components

export type StepStatus = 'completed' | 'in_progress' | 'available' | 'locked' | 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
export type StepType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'DOWNLOAD';
export type ProgressMode = 'sequential' | 'free' | 'grouped';

export interface ProgressConfig {
  mode: ProgressMode;
  requireSequential: boolean;
  allowSkip: boolean;
  videoCompletePercent: number;  // Ex: 85 = precisa assistir 85%
  textCompletePercent: number;   // Ex: 90 = precisa ler 90%
  unlockNext?: number;
  requireMinProgress?: number;
  stepsPerGroup?: number;
}

export interface LessonInfo {
  id: number;
  title: string;
  description: string;
  version: string;
  totalSteps: number;
  progressConfig: ProgressConfig;
}

export type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LessonProgress {
  progress: number;
  status: LessonStatus; // NOVO - status padronizado
  startedAt?: string | null;
  lastAccessAt?: string | null; // NOVO - último acesso
  completedAt?: string | null;
  completed: boolean;
  completedSteps: number; // Agora conta corretamente no backend
  totalSteps: number;
}

export interface StepOverview {
  id: number;
  title: string;
  type: StepType;
  order: number;
  duration?: number;
  status: StepStatus;
  progress: number;
  firstAccessAt?: string;
  lastAccessAt?: string;
  completedAt?: string;
}

export interface StepContent {
  id: number;
  content: {
    content?: string; // Para conteúdo HTML/texto
    videoUrl?: string;
    videoId?: string;
    text?: string;
    html?: string;
    description?: string;
    questions?: QuizQuestion[];
    files?: DownloadFile[];
    attachments?: any[];
    externalLinks?: any[];
  };
  stepProgress?: {
    progressPercent: number;
    progressData?: any;
  } | null;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  options?: { id: string; text: string }[];
  correctAnswer?: string;
}

export interface DownloadFile {
  id: string;
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface LessonMetadata {
  currentStepOrder: number;
  nextAvailableStep?: StepOverview;
  canComplete: boolean;
}

export interface LessonResponse {
  lesson: LessonInfo;
  lessonProgress: LessonProgress;
  stepsOverview: StepOverview[];
  stepsContent: StepContent[];
  metadata: LessonMetadata;
  // Novo campo retornado quando modelId é fornecido
  nextLesson?: number | null;
  // Campos legados para compatibilidade
  classId?: number;
  className?: string;
  courseId?: number;
  courseName?: string;
}

// Tipo mesclado para facilitar uso no frontend
export interface MergedStep extends StepOverview {
  content?: StepContent['content'] | null;
  hasContent: boolean;
  stepProgress?: StepContent['stepProgress'] | null;
}

// Extended response with merged steps
export interface LessonDataWithSteps extends LessonResponse {
  steps: MergedStep[];
}

// Props for content components
export interface ContentComponentProps {
  step: MergedStep;
  onUpdateProgress?: (data: { stepId: number; progress: number; data?: any }) => void;
  onCompleteStep?: (data: {
    stepId: number;
    contentType?: string;
    progressData?: any;
    data?: any;
  }) => Promise<any> | void;
  progressConfig?: ProgressConfig;
  completedStepIds?: Set<string>;
  isCompletingStep?: boolean;
}

// Props for video content
export interface VideoContentProps {
  step: MergedStep;
  onProgress: (progress: number, currentTime?: number, duration?: number) => void;
  onCompleteStep?: (data: {
    stepId: number;
    contentType?: string;
    progressData?: any;
  }) => Promise<any> | void;
  progressConfig?: ProgressConfig;
  isCompletingStep?: boolean;
}