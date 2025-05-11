import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import CalendarPicker from "@/components/general-components/Calendar";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { Turmas as EntityInterface } from "./interfaces/turmas.interface";
import { Courses as Course, FaqItem } from "../Treinamentos-Courses/interfaces/courses.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2 } from "lucide-react";

interface FormProps {
  formData?: EntityInterface;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    customerId: z.number().optional().nullable(),
    courseId: z.number().min(1, { message: "Id do curso é obrigatório" }),
    price: z.number().min(0, { message: "Valor de venda é obrigatório" }),
    oldPrice: z.number(),
    hoursDuration: z.number().min(1, { message: "Duração é obrigatório" }),
    openClass: z.boolean(),
    gifts: z.string().optional().nullable(),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, { message: "Grade teórica deve ter pelo menos 10 caracteres" }),
    gradePracticle: z.string().min(10, { message: "Grade prática deve ter pelo menos 10 caracteres" }),
    videoUrl: z.string().url({ message: "URL do vídeo deve ser uma URL válida" }).optional(),
    videoTitle: z.string().optional(),
    videoSubtitle: z.string().optional(),
    videoDescription: z.string().optional(),
    active: z.boolean().optional().nullable(),
    faq: z.array(
      z.object({
        question: z.string().min(3, { message: "Pergunta deve ter pelo menos 3 caracteres" }),
        answer: z.string().min(3, { message: "Resposta deve ter pelo menos 3 caracteres" })
      })
    ).optional(),
    initialDate: z.string().optional().nullable(),
    finalDate: z.string().optional().nullable(),
    landingPagesDates: z.string().min(3, { message: "Datas de divulgação devem ter pelo menos 3 caracteres" }),
    allowExam: z.boolean().optional().nullable(),
    allowReview: z.boolean().optional(),
    minimumQuorum: z.number().optional(),
    maxSubscriptions: z.number().optional(),
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  })

  type FormData = z.infer<typeof Schema>;

  // Function to parse existing FAQ string into array of FaqItem objects
  const parseFaqString = (faqData: string | FaqItem[] | null | undefined): FaqItem[] => {
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
    name: formData?.name || '',
    imageUrl: formData?.imageUrl || '',
    customerId: formData?.customerId || null,
    courseId: formData?.courseId || 0,
    price: Number(formData?.price) || 0,
    oldPrice: Number(formData?.oldPrice) || 0,
    hoursDuration: formData?.hoursDuration || 1,
    openClass: formData?.openClass || true,
    gifts: formData?.gifts || '',
    description: formData?.description || "",
    gradeTheory: formData?.gradeTheory || "",
    gradePracticle: formData?.gradePracticle || "",
    videoUrl: formData?.videoUrl || "",
    videoTitle: formData?.videoTitle || "",
    videoSubtitle: formData?.videoSubtitle || "",
    videoDescription: formData?.videoDescription || "",
    active: formData?.active || null,
    faq: parseFaqString(formData?.faq),
    initialDate: formData?.initialDate || null,
    finalDate: formData?.finalDate || null,
    landingPagesDates: formData?.landingPagesDates || "",
    allowExam: formData?.allowExam || true,
    allowReview: formData?.allowReview || true,
    minimumQuorum: formData?.minimumQuorum || 0,
    maxSubscriptions: formData?.maxSubscriptions || 0,
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
      return post<EntityInterface>(entity.model, '', newItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} cadastrado!`,
        description: `Novo ${entity.name} cadastrado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
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
      return put<EntityInterface>(entity.model, `${formData?.id}`, updatedItem);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
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

  const handleChange = (name: string, value: string | number | null) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
  const { 
      data: courses, 
      isLoading: isLoadingCourses,
    } = useQuery<Response | undefined, ApiError>({
      queryKey: [`listCursos`],
      queryFn: async () => {
        const params = [
          { key: 'limit', value: 999 },
          { key: 'order-name', value: 'asc' },
        ];
        return get('courses', '', params);
      },
    });

  // Função para encontrar um curso pelo ID
  const findCourseById = (id: number) => {
    if (!courses) return null;
    return courses?.rows?.find(course => course.id === id);
  };

  // Função genérica para atualizar um campo do formulário com base em outro valor
  const updateFormField = <T,>(fieldToUpdate: keyof FormData, valueGetter: (selectedName: string, selectedValue: string | string[]) => T | undefined) => {
    return (selectedName: string, selectedValue: string | string[]) => {
      const newValue = valueGetter(selectedName, selectedValue);
      if (newValue !== undefined && dataForm[fieldToUpdate] !== newValue) {
        setDataForm(prev => ({ ...prev, [fieldToUpdate]: newValue }));
      }
    };
  };

  // Helper para atualizar campos com base em propriedades do curso
  const updateFromCourse = <T extends keyof FormData>(field: T, propertyGetter: (course: Course) => FormData[T] | undefined) => 
    updateFormField(field, (_, value) => {
      // Ensure value is a string and can be converted to a number
      const courseId = typeof value === 'string' ? parseInt(value, 10) : null;
      if (courseId === null) return undefined;
      
      const course = findCourseById(courseId) as Course | null;
      return course ? propertyGetter(course) : undefined;
    });

  // Special handler for FAQ from course
  const updateFaqFromCourse = (selectedValue: string | string[]) => {
    const courseId = typeof selectedValue === 'string' ? parseInt(selectedValue, 10) : null;
    if (courseId === null) return;
    
    const course = findCourseById(courseId) as Course | null;
    if (!course) return;
    
    // Parse FAQ items from the course
    const parsedFaq = parseFaqString(course.faq);
    
    // Update the form data with the new FAQ items
    setDataForm(prev => ({
      ...prev,
      faq: parsedFaq
    }));
    
    // Reset expanded items when loading FAQ from a course
    setExpandedItems([]);
    
    // Clear any existing FAQ-related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith('faq.')) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4">
      <DropUpload
        setImage={setDataForm}
        EditPreview={preview}
      />

      <div>
        <Label htmlFor="courseId">Curso<span>*</span></Label>
        <Select 
          name="courseId"
          disabled={isLoadingCourses}
          options={courses?.rows || []}
          onChange={(name, value) => handleChange(name, +value)} 
          state={dataForm.courseId ? String(dataForm.courseId) : ""}
          placeholder="Selecione o curso"
          callBacks={[
            updateFromCourse("name", course => course.name),
            updateFromCourse("hoursDuration", course => course.hoursDuration),
            updateFromCourse("description", course => course.description),
            updateFromCourse("gradeTheory", course => course.gradeTheory),
            updateFromCourse("gradePracticle", course => course.gradePracticle),
            updateFaqFromCourse,
          ]}
        />
        {errors.courseId && <p className="text-red-500 text-sm">{errors.courseId}</p>}
      </div>

      <div>
        <Label htmlFor="name">Nome da Turma <span>*</span></Label>
          <Input
            id="name"
            name="name"
            placeholder={`Digite nome da ${entity.name}`}
            value={dataForm.name}
            onValueChange={handleChange}
            className="mt-1"
          />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="hoursDuration">Carga Horária (Horas) <span>*</span></Label>
        <NumberInput
          id="hoursDuration"
          name="hoursDuration"
          min={1}
          max={1000}
          value={dataForm.hoursDuration}
          onValueChange={handleChange}
        />
        {errors.hoursDuration && <p className="text-red-500 text-sm">{errors.hoursDuration}</p>}
      </div>

      <div>
        <Label htmlFor="initialDate">Data de Início <span>*</span></Label>
        <CalendarPicker
          mode="single"
          name="initialDate"
          value={dataForm.initialDate}
          onValueChange={(name, value) => handleChange(name, value)}
          formField="initialDate"
          placeholder="Selecione a data de início"
          className="mt-1"
        />
        {errors.initialDate && <p className="text-red-500 text-sm">{errors.initialDate}</p>}
      </div>

      <div>
        <Label htmlFor="finalDate">Data de Fim <span>*</span></Label>
        <CalendarPicker
          mode="single"
          name="finalDate"
          value={dataForm.finalDate}
          onValueChange={(name, value) => handleChange(name, value)}
          formField="finalDate"
          placeholder="Selecione a data de fim"
          className="mt-1"
        />
        {errors.finalDate && <p className="text-red-500 text-sm">{errors.finalDate}</p>}
      </div>

      <div>
        <Label htmlFor="landingPagesDates">Datas Exatas para Divulgação <span>*</span></Label>
        <Input
          id="landingPagesDates"
          name="landingPagesDates"
          placeholder="Ex: 12, 13 e 14 de janeiro"
          value={dataForm.landingPagesDates ?? ''}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.landingPagesDates && <p className="text-red-500 text-sm">{errors.landingPagesDates}</p>}
      </div>
      
      <div>
        <Label htmlFor="price">Valor atual</Label>
        <Input
          id="price"
          name="price"
          value={dataForm.price}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
        />
        {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
      </div>

      <div>
        <Label htmlFor="oldPrice">Valor antigo</Label>
        <p className="text-xs text-muted-foreground font-medium">Para evidenciar quando houver promoções</p>
        <Input
          id="oldPrice"
          name="oldPrice"
          value={dataForm.oldPrice}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
        />
        {errors.oldPrice && <p className="text-red-500 text-sm">{errors.oldPrice}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição <span>*</span></Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite a descrição"
          value={dataForm.description}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradeTheory">Grade curricular teórica</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar com #</p>
        <Input
          id="gradeTheory"
          name="gradeTheory"
          placeholder="Digite a grade teórica"
          value={dataForm.gradeTheory}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.gradeTheory && <p className="text-red-500 text-sm">{errors.gradeTheory}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradePracticle">Grade curricular prática</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar com #</p>
        <Input
          id="gradePracticle"
          name="gradePracticle"
          placeholder="Digite o grade prática"
          value={dataForm.gradePracticle}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.gradePracticle && <p className="text-red-500 text-sm">{errors.gradePracticle}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="minimumQuorum">Quorum Mínimo</Label>
        <p className="text-xs text-muted-foreground font-medium">Mínimo de inscritos para confirmação da turma</p>
        <NumberInput
          id="minimumQuorum"
          name="minimumQuorum"
          min={0}
          max={100}
          value={dataForm.minimumQuorum}
          onValueChange={handleChange}
        />
        {errors.minimumQuorum && <p className="text-red-500 text-sm">{errors.minimumQuorum}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxSubscriptions">Máximo de Inscrições</Label>
        <p className="text-xs text-muted-foreground font-medium">Máximo de participantes que podem se inscrever na turma</p>
        <NumberInput
          id="maxSubscriptions"
          name="maxSubscriptions"
          min={0}
          max={100}
          value={dataForm.maxSubscriptions}
          onValueChange={handleChange}
        />
        {errors.maxSubscriptions && <p className="text-red-500 text-sm">{errors.maxSubscriptions}</p>}
      </div>

      <div className="mt-4 flex justify-between">
        <Label htmlFor="openClass">Turma aberta?</Label>
        <Switch
          id="openClass"
          name="openClass"
          checked={dataForm.openClass ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, openClass: !prev.openClass }))}
          className="mt-1"
        />
      </div>

      <div className="mt-4 flex justify-between">
        <Label htmlFor="allowExam">Tem Prova?</Label>
        <Switch
          id="allowExam"
          name="allowExam"
          checked={dataForm.allowExam ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, allowExam: !prev.allowExam }))}
          className="mt-1"
        />
      </div>

      <div className="mt-4 flex justify-between">
        <Label htmlFor="allowReview">Tem Avaliação?</Label>
        <Switch
          id="allowReview"
          name="allowReview"
          checked={dataForm.allowReview ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, allowReview: !prev.allowReview }))}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="gifts">Brindes do Curso</Label>
        <p className="text-xs text-muted-foreground font-medium">Separar brindes com #</p>
        <Input
          id="gifts"
          name="gifts"
          placeholder="Presentes"
          value={dataForm.gifts ?? ''}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.gifts && <p className="text-red-500 text-sm">{errors.gifts}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl">URL do vídeo</Label>
        <Input
          id="videoUrl"
          name="videoUrl"
          placeholder="Digite a URL do vídeo"
          value={dataForm.videoUrl}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoUrl && <p className="text-red-500 text-sm">{errors.videoUrl}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoTitle">Título do vídeo</Label>
        <Input
          id="videoTitle"
          name="videoTitle"
          placeholder="Digite o título do vídeo"
          value={dataForm.videoTitle}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoTitle && <p className="text-red-500 text-sm">{errors.videoTitle}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoSubtitle">Subtítulo do vídeo</Label>
        <Input
          id="videoSubtitle"
          name="videoSubtitle"
          placeholder="Digite o subtítulo do vídeo"
          value={dataForm.videoSubtitle}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoSubtitle && <p className="text-red-500 text-sm">{errors.videoSubtitle}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoDescription">Descrição do vídeo</Label>
        <Input
          id="videoDescription"
          name="videoDescription"
          placeholder="Digite a descrição do vídeo"
          value={dataForm.videoDescription}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.videoDescription && <p className="text-red-500 text-sm">{errors.videoDescription}</p>}
      </div>

      <div className="border-2 border-primary/20 rounded-lg p-4 mt-6 mb-6 bg-primary/5">
        <h3 className="text-base font-semibold mb-4 text-primary">Perguntas Frequentes (FAQ)</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label htmlFor="faq" className="text-xs">Gerenciar perguntas e respostas</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addFaqItem}
              className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20"
            >
              <PlusCircle size={16} />
              Adicionar
            </Button>
          </div>
          
          {dataForm.faq && dataForm.faq.length > 0 ? (
            <Accordion 
              type="multiple" 
              value={expandedItems}
              onValueChange={setExpandedItems}
              className="w-full"
            >
              {dataForm.faq.map((faqItem, index) => (
                <AccordionItem 
                  value={`item-${index}`} 
                  key={index} 
                  className={`border ${
                    errors[`faq.${index}.question`] || errors[`faq.${index}.answer`] 
                      ? 'border-red-500' 
                      : 'border-primary/20'
                  }`}
                >
                  <div className="flex items-center">
                    <AccordionTrigger 
                      className={`flex-1 hover:bg-primary/5 p-2 cursor-pointer ${
                        errors[`faq.${index}.question`] || errors[`faq.${index}.answer`] 
                          ? 'text-red-500 font-medium' 
                          : ''
                      }`}
                    >
                      {`Pergunta ${index + 1}`}
                      {(errors[`faq.${index}.question`] || errors[`faq.${index}.answer`]) && 
                        <span className="ml-2 text-xs">(Erro de validação)</span>
                      }
                    </AccordionTrigger>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeFaqItem(index)}
                      className="mr-2"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                  <AccordionContent className="bg-white">
                    <div className="space-y-4 p-3">
                      <div>
                        <Label htmlFor={`faq-question-${index}`}>Pergunta</Label>
                        <textarea
                          id={`faq-question-${index}`}
                          value={faqItem.question || ''}
                          onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                          placeholder="Digite a pergunta"
                          className="w-full min-h-[60px] p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {errors[`faq.${index}.question`] && (
                          <p className="text-red-500 text-sm">{errors[`faq.${index}.question`]}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`faq-answer-${index}`}>Resposta</Label>
                        <textarea
                          id={`faq-answer-${index}`}
                          value={faqItem.answer || ''}
                          onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                          placeholder="Digite a resposta"
                          className="w-full min-h-[100px] p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {errors[`faq.${index}.answer`] && (
                          <p className="text-red-500 text-sm">{errors[`faq.${index}.answer`]}</p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="bg-white p-6 rounded-md text-center border border-primary/20">
              <p className="text-muted-foreground mb-3 text-xs">Nenhuma pergunta frequente adicionada</p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addFaqItem}
                className="bg-primary/10 hover:bg-primary/20"
              >
                Adicionar pergunta
              </Button>
            </div>
          )}
          {errors.faq && <p className="text-red-500 text-sm">{errors.faq}</p>}
        </div>
      </div>

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
