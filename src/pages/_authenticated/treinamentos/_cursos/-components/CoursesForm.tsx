import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import Number from "@/components/general-components/Number";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import IconPicker from "@/components/general-components/IconPicker";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2 } from "lucide-react";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Define FAQ item interface
  interface FaqItem {
    question: string;
    answer: string;
  }

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    hoursDuration: z.number().min(1, { message: "Duração deve ser maior que 0" }),
    yearOfValidation: z.number().min(1, { message: "Anos de validade deve ser maior que 0" }).optional(),
    flags: z.string().min(3, { message: "Curso deve ter pelo menos 1 bandeira" }),
    icon: z.string().optional(),
    color: z.string().optional(),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, { message: "Grade teórica deve ter pelo menos 10 caracteres" }),
    gradePracticle: z.string().min(10, { message: "Grade prática deve ter pelo menos 10 caracteres" }),
    weekly: z.boolean(),
    weekDays: z.string().optional(),
    media: z.number().min(0, { message: "Média deve ser maior ou igual a 0" }).max(10, { message: "Média deve ser menor ou igual a 10" }),
    faq: z.array(
      z.object({
        question: z.string().min(3, { message: "Pergunta deve ter pelo menos 3 caracteres" }),
        answer: z.string().min(3, { message: "Resposta deve ter pelo menos 3 caracteres" })
      })
    ).optional(),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  })

  type FormData = z.infer<typeof Schema>;

  // Function to parse existing FAQ string into array of FaqItem objects
  const parseFaqString = (faqData: string | FaqItem[] | undefined): FaqItem[] => {
    if (!faqData) return [];
    
    // If it's already an array of FaqItems, return it
    if (Array.isArray(faqData)) {
      return faqData;
    }
    
    try {
      // First check if it's a JSON string
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

  const [dataForm, setDataForm] = useState<FormData>({
    name: formData?.name || "",
    hoursDuration: formData?.hoursDuration || 1,
    yearOfValidation: formData?.yearOfValidation || undefined,
    flags: formData?.flags || "",
    icon: formData?.icon || "",
    color: formData?.color || "#000000",
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    weekly: formData?.weekly || false,
    weekDays: formData?.weekDays || "",
    media: formData?.media || 6,
    faq: parseFaqString(formData?.faq),
    imageUrl: formData?.imageUrl || "",
    image: formData?.image || null,
  });
  const initialFormRef = useRef(dataForm);

  const [preview, setPreview] = useState<string | null>(''); // Preview da imagem quando for editar
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Efeito para preview de imagem se necessário
  useEffect(() => {
    if (formData) {
      if (formData.imageUrl) {
        setPreview(formData.imageUrl);
      }
    }
  }, []);

  const { mutate: registerCustomer, isPending } = useMutation({
    mutationFn: (newItem: FormData) => {
      showLoader(`Registrando ${entity.name}...`);
      return post<IEntity>(entity.model, '', newItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} cadastrado!`,
        description: `Novo ${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['turma'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      // Força refetch de todos os dados
      queryClient.refetchQueries({ queryKey: [`list${entity.pluralName}`] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao cadastrar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCustomerMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedItem: FormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      return put<IEntity>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['turma'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      // Força refetch de todos os dados
      queryClient.refetchQueries({ queryKey: [`list${entity.pluralName}`] });
      // Limpa o formulário e fecha o Sheet
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao atualizar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | number) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    // Pre-validate FAQ items to ensure they meet minimum requirements
    let faqHasErrors = false;
    const newErrors: { [key: string]: string } = {};
    
    // Check if FAQ items exist and validate each one
    if (dataForm.faq && dataForm.faq.length > 0) {
      dataForm.faq.forEach((item, index) => {
        // Check question length
        if (item.question.trim().length < 3) {
          newErrors[`faq.${index}.question`] = "Pergunta deve ter pelo menos 3 caracteres";
          faqHasErrors = true;
        }
        
        // Check answer length
        if (item.answer.trim().length < 3) {
          newErrors[`faq.${index}.answer`] = "Resposta deve ter pelo menos 3 caracteres";
          faqHasErrors = true;
          console.log(`FAQ answer at index ${index} is invalid. Length: ${item.answer.trim().length}, Value: "${item.answer}"`);
        }
      });
      
      // If FAQ validation failed, set errors, expand items with errors, and return
      if (faqHasErrors) {
        setErrors(prev => ({ ...prev, ...newErrors }));
        
        // Auto-expand items with errors
        const itemsWithErrors = Object.keys(newErrors)
          .filter(key => key.startsWith('faq.'))
          .map(key => {
            const match = key.match(/faq\.(\d+)\./);
            return match ? `item-${match[1]}` : null;
          })
          .filter(Boolean) as string[];
        
        // Add items with errors to expanded items without duplicates
        setExpandedItems(prev => {
          const uniqueItems = new Set([...prev, ...itemsWithErrors]);
          return Array.from(uniqueItems);
        });
        
        return;
      }
    }
    
    // Proceed with Zod schema validation
    const result = Schema.safeParse(dataForm);
    
    if (!result.success) {
      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (path) {
          newErrors[path] = error.message;
          console.log("🚀 ~ result.error.errors.forEach ~ path:", path);
          console.log("🚀 ~ result.error.errors.forEach ~ error.message:", error.message);
        }
      });
      
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // Create a copy of the data form with faq converted to JSON string
    const submissionData = {
      ...dataForm,
      faq: JSON.stringify(dataForm.faq || [])
    } as unknown as FormData;

    if (formData) {
      updateCustomerMutation(submissionData);
    } else {
      registerCustomer(submissionData);
    }
  };

  // FAQ management functions
  const addFaqItem = () => {
    const newFaq = [...(dataForm.faq || []), { question: '', answer: '' }];
    const newIndex = newFaq.length - 1;
    
    // Update the form data with the new FAQ item
    setDataForm(prev => ({
      ...prev,
      faq: newFaq
    }));
    
    // Auto-expand the newly added FAQ item
    setExpandedItems(prev => [...prev, `item-${newIndex}`]);
  };

  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    // Ensure the value is a string and not empty or undefined
    const processedValue = String(value || '');
    
    setDataForm(prev => {
      const updatedFaq = [...(prev.faq || [])];
      
      updatedFaq[index] = {
        ...updatedFaq[index],
        [field]: processedValue
      };
      
      // Clear any existing error for this specific field
      if (errors[`faq.${index}.${field}`]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`faq.${index}.${field}`];
          return newErrors;
        });
      }
      
      return { ...prev, faq: updatedFaq };
    });
    
    // Log the updated value for debugging
    console.log(`Updated FAQ ${field} at index ${index} with value:`, value);
    console.log(`- Length:`, value ? value.length : 0);
    console.log(`- Trimmed length:`, value ? value.trim().length : 0);
  };

  const removeFaqItem = (index: number) => {
    // Update the form data by removing the FAQ item
    setDataForm(prev => {
      const updatedFaq = [...(prev.faq || [])];
      updatedFaq.splice(index, 1);
      return { ...prev, faq: updatedFaq };
    });
    
    // Update the expanded items state to remove the deleted item and adjust indices
    setExpandedItems(prev => {
      const itemToRemove = `item-${index}`;
      const newExpandedItems = prev.filter(item => item !== itemToRemove);
      
      // Adjust indices for items that come after the removed item
      return newExpandedItems.map(item => {
        const itemParts = item.split('-');
        const itemIndex = parseInt(itemParts[1], 10);
        
        if (itemIndex > index) {
          return `item-${itemIndex - 1}`;
        }
        return item;
      });
    });
    
    // Clear any errors related to the removed item
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`faq.${index}.question`];
      delete newErrors[`faq.${index}.answer`];
      return newErrors;
    });
  };

  // Buscas de valores para variaveis de formulário

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <DropUpload
        setImage={setDataForm}
        EditPreview={preview}
      />
      <div>
        <Label htmlFor="name">Nome <span>*</span></Label>
          <Input
            id="name"
            name="name"
            placeholder={`Digite nome do ${entity.name}`}
            value={dataForm.name}
            onValueChange={handleChange}
            className="mt-1"
          />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <IconPicker
          value={dataForm.icon}
          onChange={(iconName) => handleChange('icon', iconName)}
          label="Ícone do Curso"
          placeholder="Selecione um ícone para o curso"
        />
        {errors.icon && <p className="text-red-500 text-sm">{errors.icon}</p>}
      </div>

      <div className="space-y-2">
        <ColorPickerInput
          value={dataForm.color}
          onChange={(color) => handleChange('color', color)}
          label="Cor do Curso"
        />
        {errors.color && <p className="text-red-500 text-sm">{errors.color}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hoursDuration">Carga Horária (Horas)</Label>
        <Number
          id="hoursDuration"
          name="hoursDuration"
          min={1}
          max={1000}
          value={dataForm.hoursDuration}
          onValueChange={handleChange}
        />
        {errors.hoursDuration && <p className="text-red-500 text-sm">{errors.hoursDuration}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="yearOfValidation">Anos de Validade do Certificado</Label>
        <Number
          id="yearOfValidation"
          name="yearOfValidation"
          min={1}
          max={100}
          value={dataForm.yearOfValidation || 0}
          onValueChange={handleChange}
          placeholder="Ex: 2 anos"
        />
        {errors.yearOfValidation && <p className="text-red-500 text-sm">{errors.yearOfValidation}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="media">Média para Aprovação <span>*</span></Label>
        <p className="text-xs text-muted-foreground font-medium">Nota mínima necessária para aprovação no exame do curso</p>
        <Number
          id="media"
          name="media"
          min={0}
          max={10}
          value={dataForm.media}
          onValueChange={handleChange}
          placeholder="Ex: 6"
        />
        {errors.media && <p className="text-red-500 text-sm">{errors.media}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="flags">Bandeiras do curso</Label>
        <p className="text-xs font-medium text-muted-foreground">Tags ou informações que identificam ou categorizam o curso</p>
        <TagInput
          value={dataForm.flags}
          onChange={(value) => handleChange('flags', value)}
          separator="#"
          placeholder="Digite uma bandeira e pressione Enter"
          className="mt-1"
        />
        {errors.flags && <p className="text-red-500 text-sm">{errors.flags}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite uma descrição"
          value={dataForm.description}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradeTheory">Grade curricular teórica</Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione os itens da grade curricular teórica</p>
        <TagInput
          value={dataForm.gradeTheory}
          onChange={(value) => handleChange('gradeTheory', value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradeTheory && <p className="text-red-500 text-sm">{errors.gradeTheory}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradePracticle">Grade curricular prática</Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione os itens da grade curricular prática</p>
        <TagInput
          value={dataForm.gradePracticle}
          onChange={(value) => handleChange('gradePracticle', value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradePracticle && <p className="text-red-500 text-sm">{errors.gradePracticle}</p>}
      </div>

      <div className="space-y-2 flex items-center gap-2">
        <Label htmlFor="weekly">Curso semanal?</Label>
        <Switch
          id="weekly"
          name="weekly"
          checked={dataForm.weekly}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, weekly: !prev.weekly }))}
          className="mt-1"
        />
      </div>

      {
        dataForm.weekly && (
          <div className="space-y-2">
            <Label htmlFor="weekDays">Dias da semana</Label>
            <p className="text-xs text-muted-foreground font-medium">Informe os dias da semana que o curso é oferecido</p>
            <Input
              id="weekDays"
              name="weekDays"
              placeholder="ex: seg, ter e qua"
              value={dataForm.weekDays}
              onValueChange={handleChange}
              className="mt-1"
            />
            {errors.weekDays && <p className="text-red-500 text-sm">{errors.weekDays}</p>}
          </div>
        )
      }

      <div className="space-y-2 mt-6">
        <div>
          <h3 className="text-lg font-semibold">Perguntas Frequentes (FAQ)</h3>
          <p className="text-sm text-muted-foreground mb-4">Adicione perguntas e respostas comuns sobre o curso</p>
        </div>
        
        {dataForm.faq && dataForm.faq.length > 0 ? (
          <>
            <Accordion 
              type="multiple" 
              value={expandedItems}
              onValueChange={setExpandedItems}
              className="w-full space-y-2"
            >
              {dataForm.faq.map((faqItem, index) => (
                <AccordionItem 
                  value={`item-${index}`} 
                  key={index} 
                  className={`border rounded-lg ${
                    errors[`faq.${index}.question`] || errors[`faq.${index}.answer`] 
                      ? 'border-red-500/50' 
                      : ''
                  }`}
                >
                  <AccordionTrigger 
                    className={`group flex items-center justify-between w-full px-4 py-3 hover:no-underline [&>svg]:ml-2 ${
                      errors[`faq.${index}.question`] || errors[`faq.${index}.answer`] 
                        ? 'text-red-500' 
                        : ''
                    }`}
                  >
                    <div className="text-left flex-1">
                      <span className="font-medium">
                        Pergunta {String(index + 1).padStart(2, '0')}
                      </span>
                      {(errors[`faq.${index}.question`] || errors[`faq.${index}.answer`]) && (
                        <span className="ml-2 text-xs text-red-500">(Erro de validação)</span>
                      )}
                    </div>
                    <div 
                      className="flex items-center gap-2 h-8 w-8 p-0 hover:bg-destructive/10 rounded cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFaqItem(index);
                      }}
                    >
                      <Trash2 size={16} className="text-destructive mx-auto" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`faq-question-${index}`} className="text-sm font-medium">
                          Pergunta <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`faq-question-${index}`}
                          value={faqItem.question || ''}
                          onValueChange={(_, value) => updateFaqItem(index, 'question', value as string)}
                          placeholder="Ex: Qual é a carga horária do curso?"
                          className={`mt-1 ${errors[`faq.${index}.question`] ? 'border-red-500' : ''}`}
                        />
                        {errors[`faq.${index}.question`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`faq.${index}.question`]}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`faq-answer-${index}`} className="text-sm font-medium">
                          Resposta <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`faq-answer-${index}`}
                          value={faqItem.answer || ''}
                          onValueChange={(_, value) => updateFaqItem(index, 'answer', value as string)}
                          placeholder="Ex: O curso tem duração total de 40 horas, distribuídas em..."
                          type="textArea"
                          className={`mt-1 min-h-[80px] ${errors[`faq.${index}.answer`] ? 'border-red-500' : ''}`}
                        />
                        {errors[`faq.${index}.answer`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`faq.${index}.answer`]}</p>
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
        {errors.faq && <p className="text-red-500 text-xs mt-2">{errors.faq}</p>}
      </div>
      
      {/* <div className="space-y-2">
        <Label htmlFor="exam">Exame</Label>
        <p className="text-xs text-muted-foreground font-medium">Informe o exame do curso</p>
        <Input
          id="exam"
          name="exam"
          placeholder="ex: Teste de matemática"
          value={dataForm.exam}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.exam && <p className="text-red-500 text-sm">{errors.exam}</p>}
      </div> */}

      <Button
        type="submit"
        className="w-full my-4"
        disabled={isPending || isPendingUpdate}
      >
        {isPending || isPendingUpdate
          ? formData
            ? "Atualizando..."
            : "Registrando..."
          : formData
          ? `Atualizar ${entity.name}`
          : `Registrar ${entity.name}`}
      </Button>
    </form>
  );
};

export default Form;
