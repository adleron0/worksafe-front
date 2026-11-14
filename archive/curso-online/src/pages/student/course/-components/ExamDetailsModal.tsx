import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ExamOption {
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
  isUserCorrect: boolean;
}

interface ExamResponse {
  options: ExamOption[];
  question: string;
}

interface ExamDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examResponses: ExamResponse[];
  result: boolean;
}

export function ExamDetailsModal({ isOpen, onClose, examResponses, result }: ExamDetailsModalProps) {
  // Calcular estatísticas
  const totalQuestions = examResponses.length;
  const correctAnswers = examResponses.reduce((acc, response) => {
    const hasCorrectAnswer = response.options.some(opt => opt.isSelected && opt.isCorrect);
    return acc + (hasCorrectAnswer ? 1 : 0);
  }, 0);
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] sm:h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Detalhes da Prova</DialogTitle>
          <DialogDescription>
            Confira suas respostas e as alternativas corretas
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          {/* Resumo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Badge variant={result ? "default" : "destructive"}>
                {result ? 'APROVADO' : 'REPROVADO'}
              </Badge>
              <span className="text-base sm:text-lg font-semibold">
                {percentage.toFixed(0)}% de acerto
              </span>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {correctAnswers}/{totalQuestions} questões corretas
            </span>
          </div>
        </div>

        <Separator />

        {/* Questões */}
        <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-6">
              {examResponses.map((response, index) => {
                const isQuestionCorrect = response.options.some(opt => opt.isSelected && opt.isCorrect);

                return (
                  <div key={index} className="space-y-3 pr-4">
                    <div className="flex items-start gap-3">
                      {isQuestionCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 space-y-3 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base break-words">
                          Questão {index + 1}: {response.question}
                        </h4>

                        <div className="space-y-2">
                          {response.options.map((option, optIndex) => {
                            const isCorrectOption = option.isCorrect;
                            const isSelectedOption = option.isSelected;

                            return (
                              <div
                                key={optIndex}
                                className={`rounded-lg border transition-colors ${
                                  isCorrectOption
                                    ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'
                                    : isSelectedOption
                                    ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
                                    : 'bg-background border-border'
                                }`}
                              >
                                <div className="p-3 space-y-2">
                                  <span className="block text-xs sm:text-sm break-words">
                                    {String.fromCharCode(65 + optIndex)}) {option.text}
                                  </span>
                                  {(isCorrectOption || isSelectedOption) && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {isCorrectOption && (
                                        <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/50 w-fit">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Correta
                                        </Badge>
                                      )}
                                      {isSelectedOption && !isCorrectOption && (
                                        <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900/50 w-fit">
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Sua resposta
                                        </Badge>
                                      )}
                                      {isSelectedOption && isCorrectOption && (
                                        <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/50 w-fit">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Sua resposta
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!isQuestionCorrect && (
                          <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 break-words">
                              A resposta correta é: {response.options.find(opt => opt.isCorrect)?.text}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {index < examResponses.length - 1 && <Separator className="mt-6" />}
                  </div>
                );
              })}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}