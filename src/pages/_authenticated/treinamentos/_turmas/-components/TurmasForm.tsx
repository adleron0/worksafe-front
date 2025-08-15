import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
// Template Components
import { useLoader } from "@/context/GeneralContext";
import DropUpload from "@/components/general-components/DropUpload";
import CalendarPicker from "@/components/general-components/Calendar";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
// Interfaces and validations
import { IEntity } from "../-interfaces/entity.interface";
import { IEntity as Course, FaqItem } from "../../_cursos/-interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, RefreshCw, HelpCircle } from "lucide-react";

interface FormProps {
  formData?: IEntity;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const Form = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Função para gerar hash alfanumérico de 4 dígitos
  const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Schema
  const Schema = z.object({
    name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
    imageUrl: z.string().nullable(), // Schema atualizado para validar image como File ou null
    customerId: z.number().optional().nullable(),
    courseId: z.number().min(1, { message: "Id do curso é obrigatório" }),
    certificateId: z.number().optional().nullable(),
    price: z.number().min(0, { message: "Valor de venda é obrigatório" }),
    oldPrice: z.number(),
    dividedIn: z.number().min(1).optional().nullable(),
    hoursDuration: z.number().min(1, { message: "Duração é obrigatório" }),
    openClass: z.boolean(),
    gifts: z.string().optional().nullable(),
    description: z.string().min(10, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    gradeTheory: z.string().min(10, { message: "Grade teórica deve ter pelo menos 10 caracteres" }),
    gradePracticle: z.string().min(10, { message: "Grade prática deve ter pelo menos 10 caracteres" }),
    videoUrl: z.string()
    .optional()
    .nullable()
    .refine((value) => {
      // Se não há valor ou tem 1 caractere ou menos, passa na validação
      if (!value || value.length <= 1) return true;
      
      // Se tem mais de 1 caractere, valida se é URL válida
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, {
      message: "URL do vídeo deve ser uma URL válida"
    }),
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
    classCode: z.string().optional().nullable(),
    minimumQuorum: z.number().optional(),
    maxSubscriptions: z.number().optional(),
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  }).refine((data) => {
    // Se allowExam é true, classCode é obrigatório
    if (data.allowExam && (!data.classCode || data.classCode.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: "Código de acesso é obrigatório quando a turma tem prova",
    path: ["classCode"],
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
    certificateId: (formData as any)?.certificateId || null,
    price: Number(formData?.price) || 0,
    oldPrice: Number(formData?.oldPrice) || 0,
    dividedIn: (formData as any)?.dividedIn || null,
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
    allowExam: formData?.allowExam,
    allowReview: formData?.allowReview || false,
    classCode: formData?.classCode || (!formData ? generateClassCode() : (formData?.classCode || generateClassCode())),
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
      return post<IEntity>(entity.model, '', newItem);
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
      return put<IEntity>(entity.model, `${formData?.id}`, updatedItem);
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
        if (!item.question || item.question.trim().length < 3) {
          newErrors[`faq.${index}.question`] = "Pergunta deve ter pelo menos 3 caracteres";
          faqHasErrors = true;
        }
        
        // Check answer length
        if (!item.answer || item.answer.trim().length < 3) {
          newErrors[`faq.${index}.answer`] = "Resposta deve ter pelo menos 3 caracteres";
          faqHasErrors = true;
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
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      return get('courses', '', params);
    },
  });

  const { 
    data: certificates, 
    isLoading: isLoadingCertificates,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCertificates`, dataForm.courseId],
    queryFn: async () => {
      const params = [
        { key: 'active', value: true },
        { key: 'courseId', value: dataForm.courseId },
        { key: 'limit', value: 999 },
        { key: 'order-name', value: 'asc' },
      ];
      return get('certificate', '', params);
    },
    // Only run the query if courseId is valid (greater than 0)
    enabled: dataForm.courseId > 0,
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
        <Label htmlFor="certificateId">Certificado</Label>
        <Select 
          name="certificateId"
          disabled={!dataForm.courseId || isLoadingCertificates}
          options={certificates?.rows || []}
          onChange={(name, value) => handleChange(name, value ? +value : null)} 
          state={dataForm.certificateId ? String(dataForm.certificateId) : ""}
          placeholder={!dataForm.courseId ? "Selecione um curso primeiro" : "Selecione o certificado"}
        />
        {errors.certificateId && <p className="text-red-500 text-sm">{errors.certificateId}</p>}
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

      <div>
        <Label htmlFor="dividedIn">Parcelamento</Label>
        <p className="text-xs text-muted-foreground font-medium">Número de parcelas permitidas no pagamento</p>
        <NumberInput
          id="dividedIn"
          name="dividedIn"
          min={1}
          max={12}
          value={dataForm.dividedIn || 1}
          onValueChange={handleChange}
          placeholder="Ex: 3"
        />
        {errors.dividedIn && <p className="text-red-500 text-sm">{errors.dividedIn}</p>}
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

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center">
        <Label htmlFor="openClass" className="cursor-pointer flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Turma aberta
        </Label>
        <Switch
          id="openClass"
          name="openClass"
          checked={dataForm.openClass ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, openClass: !prev.openClass }))}
        />
      </div>

      <div className={`mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowExam ? 'pb-4' : ''}`}>
        <div className="flex justify-between items-center">
          <Label htmlFor="allowExam" className="cursor-pointer flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Habilitar Prova
          </Label>
          <Switch
            id="allowExam"
            name="allowExam"
            checked={dataForm.allowExam ? true : false}
            onCheckedChange={() => setDataForm((prev) => ({ ...prev, allowExam: !prev.allowExam }))}
          />
        </div>

        {dataForm.allowExam && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="classCode">Código de Acesso à Prova <span className="text-red-500">*</span></Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">Código que os alunos usarão para acessar a prova</p>
            <div className="flex gap-2">
              <Input
                id="classCode"
                name="classCode"
                placeholder="Ex: A3B9"
                value={dataForm.classCode || ''}
                onValueChange={handleChange}
                className="flex-1"
                required={dataForm.allowExam}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newCode = generateClassCode();
                  handleChange('classCode', newCode);
                }}
                title="Gerar novo código"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {errors.classCode && <p className="text-red-500 text-sm mt-1">{errors.classCode}</p>}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center">
        <Label htmlFor="allowReview" className="cursor-pointer flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Habilitar Avaliação
        </Label>
        <Switch
          id="allowReview"
          name="allowReview"
          checked={dataForm.allowReview ? true : false}
          onCheckedChange={() => setDataForm((prev) => ({ ...prev, allowReview: !prev.allowReview }))}
        />
      </div>

      <div>
        <Label htmlFor="gifts">Brindes do Curso</Label>
        <p className="text-xs text-muted-foreground font-medium">Adicione os brindes oferecidos no curso</p>
        <TagInput
          value={dataForm.gifts ?? ''}
          onChange={(value) => handleChange('gifts', value)}
          separator="#"
          placeholder="Digite um brinde e pressione Enter"
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
          value={dataForm.videoUrl || ''}
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
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFaqItem(index);
                        }}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
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
                          name={`faq-question-${index}`}
                          value={faqItem.question || ''}
                          onValueChange={(_, value) => updateFaqItem(index, 'question', String(value))}
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
                          name={`faq-answer-${index}`}
                          value={faqItem.answer || ''}
                          onValueChange={(_, value) => updateFaqItem(index, 'answer', String(value))}
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
