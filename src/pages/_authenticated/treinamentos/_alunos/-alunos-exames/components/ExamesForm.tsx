import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { Badge } from "@/components/ui/badge";
import { IEntity, IExamResponse } from "../interfaces/entity.interface";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FormProps {
  formData: IEntity | null;
  setOpenForm: (open: boolean) => void;
  entity: {
    name: string;
    pluralName: string;
    model: string;
    ability: string;
  };
  traineeId: number;
}

const Form = ({ formData, setOpenForm }: FormProps) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    // Componente apenas para visualização, não precisa inicializar dados
  }, [formData]);

  const handleClose = () => {
    setOpenForm(false);
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Parse dos dados do exame
  const getExamData = (): IExamResponse | null => {
    if (!formData?.examResponses) return null;
    try {
      return JSON.parse(formData.examResponses);
    } catch {
      return null;
    }
  };

  const examData = getExamData();

  if (!formData) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Informações do Aluno */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="user" className="w-4 h-4" />
          Informações do Aluno
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Nome:</span>
            <span className="text-sm font-medium">{formData.trainee?.name || "Não informado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">CPF:</span>
            <span className="text-sm font-medium">{formData.trainee?.cpf || "Não informado"}</span>
          </div>
        </div>
      </Card>

      {/* Informações da Prova */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="file-text" className="w-4 h-4" />
          Informações da Prova
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Curso:</span>
            <span className="text-sm font-medium">{formData.course?.name || "Não informado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Turma:</span>
            <span className="text-sm font-medium">{formData.class?.name || "Não informado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Data:</span>
            <span className="text-sm font-medium">{formatDate(formData.createdAt)}</span>
          </div>
        </div>
      </Card>

      {/* Resultado */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="award" className="w-4 h-4" />
          Resultado
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={formData.result ? "success" : "destructive"}>
              {formData.result ? "Aprovado" : "Reprovado"}
            </Badge>
          </div>
          
          {examData && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nota Final:</span>
                <span className={`text-lg font-bold ${
                  examData.score >= 5 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {examData.score.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Acertos:</span>
                <span className="text-sm font-medium">
                  {examData.correctAnswers} de {examData.totalQuestions} questões
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aproveitamento:</span>
                <span className="text-sm font-medium">
                  {((examData.correctAnswers / examData.totalQuestions) * 100).toFixed(0)}%
                </span>
              </div>
              {examData.timeSpent && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tempo de Prova:</span>
                  <span className="text-sm font-medium">
                    {Math.floor(examData.timeSpent / 60)} minutos
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Detalhes das Respostas */}
      {examData && examData.answers && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Icon name="check-square" className="w-4 h-4" />
            Detalhes das Respostas
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {examData.answers.map((answer, index) => (
              <Collapsible
                key={index}
                open={expandedQuestions.has(index)}
                onOpenChange={() => toggleQuestion(index)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          Questão {answer.questionIndex + 1}
                        </span>
                        {answer.isCorrect ? (
                          <Badge variant="success" className="text-xs">
                            Correta
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Incorreta
                          </Badge>
                        )}
                      </div>
                      <Icon 
                        name={expandedQuestions.has(index) ? "chevron-up" : "chevron-down"} 
                        className="w-4 h-4 text-muted-foreground"
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-3 pt-1 bg-muted/20">
                      <div className="space-y-3">
                        {/* Pergunta */}
                        {answer.question && (
                          <div className="pb-2 border-b">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Pergunta:</p>
                            <p className="text-sm text-foreground">{answer.question}</p>
                          </div>
                        )}

                        {/* Opções */}
                        {answer.options && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Opções:</p>
                            <div className="space-y-1.5">
                              {answer.options.map((option, optIndex) => {
                                const isSelected = answer.selectedOption === optIndex;
                                const isCorrect = option.isCorrect;
                                
                                return (
                                  <div
                                    key={optIndex}
                                    className={`rounded-md p-2 text-sm flex items-start gap-2 ${
                                      isSelected && isCorrect
                                        ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                                        : isSelected && !isCorrect
                                        ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
                                        : isCorrect
                                        ? 'bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                                        : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {String.fromCharCode(65 + optIndex)}.
                                    </span>
                                    <span className="flex-1">{option.text}</span>
                                    {isSelected && (
                                      <Icon 
                                        name={isCorrect ? "check-circle" : "x-circle"} 
                                        className={`w-4 h-4 flex-shrink-0 ${
                                          isCorrect ? 'text-green-600' : 'text-red-600'
                                        }`}
                                      />
                                    )}
                                    {!isSelected && isCorrect && (
                                      <Badge variant="default" className="text-xs">
                                        Correta
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Legenda para quando não há dados completos */}
                        {!answer.question && !answer.options && (
                          <div className="flex items-start gap-2">
                            <Icon name="info" className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Resposta selecionada:</p>
                              <div className={`rounded-md p-2 text-sm ${
                                answer.isCorrect 
                                  ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300' 
                                  : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
                              }`}>
                                <span className="font-medium">Opção {String.fromCharCode(65 + answer.selectedOption)}</span>
                                {" - "}
                                <span className="text-xs">
                                  (Alternativa {answer.selectedOption + 1})
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </Card>
      )}

      {/* Botão de Ação */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default Form;