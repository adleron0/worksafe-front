import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Award, XCircle, Eye } from 'lucide-react';

interface ExamResultCardProps {
  exam: {
    id: number;
    result: boolean;
    createdAt: string;
    certificates?: Array<{
      key: string;
    }>;
    examResponses: Array<{
      options: Array<{
        text: string;
        isCorrect: boolean;
        isSelected: boolean;
        isUserCorrect: boolean;
      }>;
      question: string;
    }>;
  };
  onViewDetails: () => void;
}

export function ExamResultCard({ exam, onViewDetails }: ExamResultCardProps) {
  // Calcular o resultado
  const totalQuestions = exam.examResponses.length;
  const correctAnswers = exam.examResponses.reduce((acc, response) => {
    const hasCorrectAnswer = response.options.some(opt => opt.isSelected && opt.isCorrect);
    return acc + (hasCorrectAnswer ? 1 : 0);
  }, 0);
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const passed = exam.result;
  const hasCertificate = exam.certificates && exam.certificates.length > 0;
  const certificateKey = hasCertificate ? exam.certificates[0].key : null;

  // Formatar data
  const examDate = new Date(exam.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Card className={`border-2 ${passed ? 'border-green-500/20 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500/20 bg-red-50/50 dark:bg-red-950/20'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          {passed ? (
            <Award className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
          )}
          Prova de Avaliação - Concluída
        </CardTitle>
        <CardDescription className="text-sm">
          Realizada em {examDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={passed ? "default" : "destructive"}
                className="text-xs"
              >
                {passed ? 'Aprovado' : 'Reprovado'}
              </Badge>
              <span className="text-base font-semibold">
                {percentage.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {correctAnswers} de {totalQuestions} questões corretas
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onViewDetails}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Questões
          </Button>
          {passed && hasCertificate && (
            <Button
              variant="default"
              className="flex-1"
              size="sm"
              onClick={() => {
                if (certificateKey) {
                  window.open(`/certificados/${certificateKey}`, '_blank');
                }
              }}
            >
              <Award className="mr-2 h-4 w-4" />
              Ver Certificado
            </Button>
          )}
          {passed && !hasCertificate && (
            <Button
              variant="default"
              className="flex-1"
              disabled
              size="sm"
            >
              <Award className="mr-2 h-4 w-4" />
              Certificado em Processamento
            </Button>
          )}
        </div>

        {!passed && (
          <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Entre em contato com o instrutor para mais informações sobre uma nova tentativa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}