import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import Loader from "@/components/general-components/Loader";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";
import Icon from "@/components/general-components/Icon";

interface ExamFormProps {
  courseData: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

// Define the structure for a single question
interface Question {
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
}

const CoursesExamForm = ({ courseData, openSheet, entity }: ExamFormProps) => {
  const queryClient = useQueryClient();

  // Schema for validation
  const OptionSchema = z.object({
    text: z.string().min(1, { message: "Texto da opção é obrigatório" }),
    isCorrect: z.boolean()
  });

  const QuestionSchema = z.object({
    question: z.string().min(3, { message: "Pergunta deve ter pelo menos 3 caracteres" }),
    options: z.array(OptionSchema)
      .min(2, { message: "Deve haver pelo menos 2 opções" })
      .refine(
        (options) => options.some(option => option.isCorrect),
        { message: "Pelo menos uma opção deve ser marcada como correta" }
      )
  });

  const ExamSchema = z.object({
    exam: z.array(QuestionSchema)
      .min(1, { message: "Deve haver pelo menos uma pergunta" })
  });

  type ExamFormData = z.infer<typeof ExamSchema>;

  // Initialize with existing exam data or create a default question
  const initializeExamData = (): Question[] => {
    if (courseData.exam) {
      // If exam is a string (JSON), parse it
      if (typeof courseData.exam === 'string') {
        try {
          const parsedExam = JSON.parse(courseData.exam);
          if (Array.isArray(parsedExam) && parsedExam.length > 0) {
            return parsedExam;
          }
        } catch (error) {
          console.error('Error parsing exam data:', error);
        }
      } 
      // If exam is already an array
      else if (Array.isArray(courseData.exam) && courseData.exam.length > 0) {
        return courseData.exam;
      }
    }
    
    // Default initial question with 5 options
    return [{
      question: "",
      options: Array(5).fill(null).map((_, index) => ({
        text: "",
        isCorrect: index === 0 // First option is correct by default
      }))
    }];
  };

  const [examData, setExamData] = useState<Question[]>(initializeExamData());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedCorrectOptions, setSelectedCorrectOptions] = useState<{ [key: number]: number }>({});

  // Initialize selected correct options based on existing data
  useEffect(() => {
    const initialSelectedOptions: { [key: number]: number } = {};
    
    examData.forEach((question, qIndex) => {
      const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
      // Always set a value (default to 0 if no correct option found)
      initialSelectedOptions[qIndex] = correctOptionIndex !== -1 ? correctOptionIndex : 0;
    });
    
    setSelectedCorrectOptions(initialSelectedOptions);
  }, []);

  const { mutate: updateExam, isPending } = useMutation({
    mutationFn: (updatedExam: ExamFormData) => {
      // Create a minimal course object with just the exam data
      // Convert the exam array to a JSON string to prevent [object Object] issue
      delete courseData.createdAt;
      delete courseData.inactiveAt;
      delete courseData.updatedAt;
      delete courseData.formType;
      delete courseData.active;


      const examUpdateData = {
        ...courseData,
        exam: JSON.stringify(updatedExam.exam)
      };
      return put<IEntity>(entity.model, `${courseData.id}`, examUpdateData);
    },
    onSuccess: () => {
      toast({
        title: "Exame atualizado!",
        description: "O exame do curso foi atualizado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      openSheet(false);
    },
    onError: (error: ApiError) => {
      toast({
        title: "Erro ao atualizar exame",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  // Handle question text change
  const handleQuestionChange = (questionIndex: number, value: string | number) => {
    const updatedExamData = [...examData];
    updatedExamData[questionIndex].question = value.toString();
    setExamData(updatedExamData);
  };

  // Handle option text change
  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string | number) => {
    const updatedExamData = [...examData];
    updatedExamData[questionIndex].options[optionIndex].text = value.toString();
    setExamData(updatedExamData);
  };

  // Handle correct option selection
  const handleCorrectOptionChange = (questionIndex: number, optionIndex: number) => {
    // Update the selected correct option for this question
    setSelectedCorrectOptions({
      ...selectedCorrectOptions,
      [questionIndex]: optionIndex
    });

    // Update the isCorrect flags in the exam data
    const updatedExamData = [...examData];
    updatedExamData[questionIndex].options.forEach((option, idx) => {
      option.isCorrect = idx === optionIndex;
    });
    setExamData(updatedExamData);
  };

  // Add a new question
  const addQuestion = () => {
    setExamData([
      ...examData,
      {
        question: "",
        options: Array(5).fill(null).map((_, index) => ({
          text: "",
          isCorrect: index === 0 // First option is correct by default
        }))
      }
    ]);
    
    // Set the first option as correct for the new question
    setSelectedCorrectOptions({
      ...selectedCorrectOptions,
      [examData.length]: 0
    });
  };

  // Remove a question
  const removeQuestion = (questionIndex: number) => {
    if (examData.length <= 1) {
      toast({
        title: "Não é possível remover",
        description: "Deve haver pelo menos uma pergunta no exame.",
        variant: "destructive",
      });
      return;
    }

    const updatedExamData = examData.filter((_, index) => index !== questionIndex);
    setExamData(updatedExamData);

    // Update selected correct options
    const updatedSelectedOptions: { [key: number]: number } = {};
    Object.entries(selectedCorrectOptions).forEach(([qIdx, optIdx]) => {
      const qIdxNum = parseInt(qIdx);
      if (qIdxNum < questionIndex) {
        updatedSelectedOptions[qIdxNum] = optIdx;
      } else if (qIdxNum > questionIndex) {
        updatedSelectedOptions[qIdxNum - 1] = optIdx;
      }
    });
    setSelectedCorrectOptions(updatedSelectedOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: ExamFormData = {
      exam: examData
    };

    const result = ExamSchema.safeParse(formData);

    if (!result.success) {
      // Extract error messages from Zod validation result
      const newErrors: { [key: string]: string } = {};
      
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
        }
      });
      
      setErrors(newErrors);
      return;
    }

    updateExam(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full mt-4">
      
      <div className="space-y-6">
        {examData.map((question, questionIndex) => (
          <div key={questionIndex} className="p-4 border rounded-lg bg-background/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium">Pergunta {questionIndex + 1}</h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => removeQuestion(questionIndex)}
                className="h-8 w-8 p-0 text-destructive"
              >
                <Icon name="trash-2" className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2 mb-4">
              <Label htmlFor={`question-${questionIndex}`}>Texto da Pergunta</Label>
              <Input
                id={`question-${questionIndex}`}
                name={`question-${questionIndex}`}
                placeholder="Digite a pergunta"
                value={question.question}
                onValueChange={(_name, value) => handleQuestionChange(questionIndex, value)}
                type="textArea"
                className="mt-1"
              />
              {errors[`exam.${questionIndex}.question`] && (
                <p className="text-red-500 text-sm">{errors[`exam.${questionIndex}.question`]}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Opções de Resposta</Label>
              <p className="text-xs text-muted-foreground font-medium">Selecione a opção correta</p>
              
              <RadioGroup 
                value={(selectedCorrectOptions[questionIndex] || 0).toString()} 
                onValueChange={(value: string) => handleCorrectOptionChange(questionIndex, parseInt(value))}
                className="space-y-3"
              >
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={optionIndex.toString()} 
                      id={`option-${questionIndex}-${optionIndex}`} 
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Input
                        id={`option-text-${questionIndex}-${optionIndex}`}
                        name={`option-text-${questionIndex}-${optionIndex}`}
                        placeholder={`Opção ${optionIndex + 1}`}
                        value={option.text}
                        onValueChange={(_name, value) => handleOptionChange(questionIndex, optionIndex, value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </RadioGroup>
              
              {errors[`exam.${questionIndex}.options`] && (
                <p className="text-red-500 text-sm">{errors[`exam.${questionIndex}.options`]}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <Button 
        type="button" 
        variant="outline" 
        onClick={addQuestion}
        className="mt-2"
      >
        <Icon name="plus" className="w-4 h-4 mr-2" />
        Adicionar Nova Pergunta
      </Button>
      
      <Button
        type="submit"
        className="w-full my-4"
        disabled={isPending}
      >
        {isPending ? "Atualizando..." : "Salvar Exame"}
      </Button>
      
      {isPending && (
        <Loader title="Atualizando exame..." />
      )}
    </form>
  );
};

export default CoursesExamForm;
