import React, { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import { PlusCircle, Trash2 } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}


interface FaqGeneratorProps {
  value?: string | FaqItem[] | null;
  onChange?: (value: string) => void;
  // Alternative: direct form state management
  formData?: any;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  fieldName?: string;
  errors?: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  onErrorsClear?: (keys: string[]) => void;
  minQuestionLength?: number;
  minAnswerLength?: number;
  questionPlaceholder?: string;
  answerPlaceholder?: string;
  title?: string;
  description?: string;
}

// Define the component type with the static method
interface FaqGeneratorComponent extends React.FC<FaqGeneratorProps> {
  parseFaqString: (faqData: string | FaqItem[] | null | undefined) => FaqItem[];
}

/**
 * FaqGenerator Component
 * 
 * A reusable component for managing FAQ (Frequently Asked Questions) with add, edit, and delete functionality.
 * 
 * @component
 * 
 * @param {FaqGeneratorProps} props - Component props
 * @param {string | FaqItem[] | null} [props.value] - Current FAQ data (JSON string or array)
 * @param {Function} props.onChange - Callback when FAQ data changes (receives JSON string)
 * @param {Object} [props.errors] - Error messages object with keys like "faq.0.question"
 * @param {Function} [props.onErrorsClear] - Callback to clear specific error keys
 * @param {number} [props.minQuestionLength=3] - Minimum characters for questions
 * @param {number} [props.minAnswerLength=3] - Minimum characters for answers
 * @param {string} [props.questionPlaceholder] - Placeholder text for question input
 * @param {string} [props.answerPlaceholder] - Placeholder text for answer input
 * @param {string} [props.title="Perguntas Frequentes (FAQ)"] - Section title
 * @param {string} [props.description="Adicione perguntas e respostas comuns"] - Section description
 * 
 * @example
 * // Simple usage - Direct state management (RECOMMENDED)
 * import FaqGenerator from '@/components/general-components/FaqGenerator';
 * 
 * const MyForm = () => {
 *   const [dataForm, setDataForm] = useState({
 *     name: '',
 *     faq: FaqGenerator.parseFaqString(formData?.faq), // Parse initial data
 *     // ... other fields
 *   });
 *   const [errors, setErrors] = useState({});
 * 
 *   return (
 *     <FaqGenerator
 *       formData={dataForm}
 *       setFormData={setDataForm}
 *       fieldName="faq"
 *       errors={errors}
 *       setErrors={setErrors}
 *       title="FAQ do Curso"
 *       description="Perguntas e respostas sobre o curso"
 *     />
 *   );
 * };
 * 
 * @example
 * // Alternative usage - With onChange callback
 * const MyForm = () => {
 *   const [faqData, setFaqData] = useState('');
 *   const [errors, setErrors] = useState({});
 * 
 *   return (
 *     <FaqGenerator
 *       value={faqData}
 *       onChange={(jsonString) => {
 *         const parsed = JSON.parse(jsonString);
 *         setFormData(prev => ({ ...prev, faq: parsed }));
 *       }}
 *       errors={errors}
 *       onErrorsClear={(keys) => {
 *         setErrors(prev => {
 *           const newErrors = { ...prev };
 *           keys.forEach(key => delete newErrors[key]);
 *           return newErrors;
 *         });
 *       }}
 *     />
 *   );
 * };
 */
const FaqGenerator: FaqGeneratorComponent = ({
  value,
  onChange,
  formData,
  setFormData,
  fieldName = 'faq',
  errors = {},
  setErrors,
  onErrorsClear,
  // minQuestionLength = 3,
  // minAnswerLength = 3,
  questionPlaceholder = "Ex: Qual é a carga horária do curso?",
  answerPlaceholder = "Ex: O curso tem duração total de 40 horas, distribuídas em...",
  title = "Perguntas Frequentes (FAQ)",
  description = "Adicione perguntas e respostas comuns"
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [localErrors, setLocalErrors] = useState<{ [key: string]: string }>({});
  
  // Determine the initial value based on props
  const initialValue = formData && fieldName ? formData[fieldName] : value;
  const [faqItems, setFaqItems] = useState<FaqItem[]>(() => FaqGenerator.parseFaqString(initialValue));

  useEffect(() => {
    const currentValue = formData && fieldName ? formData[fieldName] : value;
    setFaqItems(FaqGenerator.parseFaqString(currentValue));
  }, [value, formData, fieldName]);

  const updateParent = (items: FaqItem[]) => {
    // Use direct form state management if available
    if (setFormData && fieldName) {
      setFormData((prev: any) => ({ ...prev, [fieldName]: items }));
    } 
    // Otherwise use the onChange callback with JSON string
    else if (onChange) {
      onChange(JSON.stringify(items));
    }
  };
  
  const clearErrors = (errorKeys: string[]) => {
    // Clear local errors
    const newLocalErrors = { ...localErrors };
    errorKeys.forEach(key => delete newLocalErrors[key]);
    setLocalErrors(newLocalErrors);
    
    // Use direct error state management if available
    if (setErrors) {
      setErrors(prev => {
        const newErrors = { ...prev };
        errorKeys.forEach(key => delete newErrors[key]);
        return newErrors;
      });
    }
    // Otherwise use the callback
    else if (onErrorsClear) {
      onErrorsClear(errorKeys);
    }
  };

  const addFaqItem = () => {
    const newItems = [...faqItems, { question: '', answer: '' }];
    const newIndex = newItems.length - 1;
    
    setFaqItems(newItems);
    updateParent(newItems);
    setExpandedItems(prev => [...prev, `item-${newIndex}`]);
  };

  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    const processedValue = String(value || '');
    const updatedItems = [...faqItems];
    
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: processedValue
    };
    
    setFaqItems(updatedItems);
    updateParent(updatedItems);
    
    // Clear error for this field
    const errorKey = `faq.${index}.${field}`;
    if (localErrors[errorKey] || errors[errorKey]) {
      clearErrors([errorKey]);
    }
  };

  const removeFaqItem = (index: number) => {
    const updatedItems = [...faqItems];
    updatedItems.splice(index, 1);
    
    setFaqItems(updatedItems);
    updateParent(updatedItems);
    
    // Update expanded items
    setExpandedItems(prev => {
      const itemToRemove = `item-${index}`;
      const newExpandedItems = prev.filter(item => item !== itemToRemove);
      
      return newExpandedItems.map(item => {
        const itemParts = item.split('-');
        const itemIndex = parseInt(itemParts[1], 10);
        
        if (itemIndex > index) {
          return `item-${itemIndex - 1}`;
        }
        return item;
      });
    });
    
    // Clear errors for removed item
    const errorKeys = [`faq.${index}.question`, `faq.${index}.answer`];
    clearErrors(errorKeys);
  };


  const combinedErrors = { ...localErrors, ...errors };

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      </div>
      
      {faqItems.length > 0 ? (
        <>
          <Accordion 
            type="multiple" 
            value={expandedItems}
            onValueChange={setExpandedItems}
            className="w-full space-y-2"
          >
            {faqItems.map((faqItem, index) => (
              <AccordionItem 
                value={`item-${index}`} 
                key={index} 
                className={`border rounded-lg ${
                  combinedErrors[`faq.${index}.question`] || combinedErrors[`faq.${index}.answer`] 
                    ? 'border-red-500/50' 
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <AccordionTrigger 
                    className={`group flex items-center justify-between flex-1 px-4 py-3 hover:no-underline [&>svg]:ml-2 ${
                      combinedErrors[`faq.${index}.question`] || combinedErrors[`faq.${index}.answer`] 
                        ? 'text-red-500' 
                        : ''
                    }`}
                  >
                    <div className="text-left flex-1">
                      <span className="font-medium">
                        Pergunta {String(index + 1).padStart(2, '0')}
                      </span>
                      {(combinedErrors[`faq.${index}.question`] || combinedErrors[`faq.${index}.answer`]) && (
                        <span className="ml-2 text-xs text-red-500">(Erro de validação)</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFaqItem(index)}
                    className="h-8 w-8 mr-2"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`faq-question-${index}`} className="text-sm font-medium">
                        Pergunta <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`faq-question-${index}`}
                        name={`faq-question-${index}`}
                        value={faqItem.question || ''}
                        onValueChange={(_, value) => updateFaqItem(index, 'question', String(value))}
                        placeholder={questionPlaceholder}
                        className={`mt-1 ${combinedErrors[`faq.${index}.question`] ? 'border-red-500' : ''}`}
                      />
                      {combinedErrors[`faq.${index}.question`] && (
                        <p className="text-red-500 text-xs mt-1">{combinedErrors[`faq.${index}.question`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`faq-answer-${index}`} className="text-sm font-medium">
                        Resposta <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`faq-answer-${index}`}
                        name={`faq-answer-${index}`}
                        value={faqItem.answer || ''}
                        onValueChange={(_, value) => updateFaqItem(index, 'answer', String(value))}
                        placeholder={answerPlaceholder}
                        type="textArea"
                        className={`mt-1 min-h-[80px] ${combinedErrors[`faq.${index}.answer`] ? 'border-red-500' : ''}`}
                      />
                      {combinedErrors[`faq.${index}.answer`] && (
                        <p className="text-red-500 text-xs mt-1">{combinedErrors[`faq.${index}.answer`]}</p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addFaqItem}
            className="w-full mt-3 flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} />
            Adicionar Nova Pergunta
          </Button>
        </>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <PlusCircle size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">Nenhuma pergunta frequente adicionada</p>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addFaqItem}
          >
            Adicionar primeira pergunta
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Parses FAQ data from various formats into an array of FaqItem objects
 * 
 * @param faqData - The FAQ data to parse. Can be:
 *   - An array of FaqItem objects (returns as-is)
 *   - A JSON string containing an array of FaqItem objects
 *   - A legacy string format: "Question?r-Answer#Question2?r-Answer2"
 *   - null or undefined (returns empty array)
 * 
 * @returns An array of FaqItem objects
 * 
 * @example
 * // From JSON string
 * FaqGenerator.parseFaqString('[{"question":"Q1","answer":"A1"}]')
 * 
 * @example
 * // From legacy format
 * FaqGenerator.parseFaqString('Pergunta 01?r-resposta 01#Pergunta 02?r-resposta 02')
 * 
 * @example
 * // From array (passthrough)
 * FaqGenerator.parseFaqString([{question: 'Q1', answer: 'A1'}])
 */
FaqGenerator.parseFaqString = (faqData: string | FaqItem[] | null | undefined): FaqItem[] => {
  if (!faqData) return [];
  
  if (Array.isArray(faqData)) {
    return faqData;
  }
  
  try {
    try {
      const parsed = JSON.parse(faqData);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON, continue with string parsing
    }
    
    // Parse the old format: "Pergunta 01?r-resposta da pergunta 01# Pergunta 02?r-resposta da pergunta 02"
    const faqItems: FaqItem[] = [];
    const items = faqData.split('#');
    
    items.forEach(item => {
      const trimmedItem = item.trim();
      if (!trimmedItem) return;
      
      const parts = trimmedItem.split('?r-');
      if (parts.length === 2) {
        faqItems.push({
          question: parts[0].trim(),
          answer: parts[1].trim()
        });
      }
    });
    
    return faqItems;
  } catch (error) {
    console.error("Error parsing FAQ string:", error);
    return [];
  }
};

export default FaqGenerator;