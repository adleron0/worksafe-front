export interface IEntity {
  id?: number;
  traineeId: number;
  courseId: number;
  classId: number;
  examResponses?: string;
  result: boolean;
  companyId?: number;
  createdAt?: string;
  inactiveAt?: string | null;
  
  // Relações
  trainee?: {
    id: number;
    name: string;
    cpf: string;
  };
  course?: {
    id: number;
    name: string;
  };
  class?: {
    id: number;
    name: string;
  };
}

export interface IExamResponse {
  answers: Array<{
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
    question?: string;
    options?: Array<{
      text: string;
      isCorrect: boolean;
    }>;
    correctOption?: number;
  }>;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
}