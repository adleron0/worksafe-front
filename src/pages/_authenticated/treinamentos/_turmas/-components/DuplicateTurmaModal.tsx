import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
// Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { IEntity } from "../-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

interface DuplicateTurmaModalProps {
  turma: IEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Função para gerar código alfanumérico de 4 dígitos
const generateClassCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const DuplicateTurmaModal = ({
  turma,
  open,
  onOpenChange,
}: DuplicateTurmaModalProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const [formData, setFormData] = useState({
    name: "",
    initialDate: "",
    finalDate: "",
    landingPagesDates: "",
    classCode: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preenche os campos quando o modal abre
  useEffect(() => {
    if (open && turma) {
      setFormData({
        name: turma.name + " (Cópia)",
        initialDate: turma.initialDate || "",
        finalDate: turma.finalDate || "",
        landingPagesDates: turma.landingPagesDates || "",
        classCode: generateClassCode(),
      });
      setErrors({});
    }
  }, [open, turma]);

  // Mutation para duplicar turma
  const { mutate: duplicateTurma, isPending } = useMutation({
    mutationFn: (data: any) => {
      showLoader("Duplicando turma...");
      return post<IEntity>("classes", "", data);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Turma duplicada!",
        description: "A turma foi duplicada com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listTurmas"] });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: "Erro ao duplicar turma",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [name]: value || "" }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    // Validação
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    }
    
    if (!formData.initialDate) {
      newErrors.initialDate = "Data de início é obrigatória";
    }
    
    if (!formData.finalDate) {
      newErrors.finalDate = "Data de fim é obrigatória";
    }
    
    if (!formData.landingPagesDates || formData.landingPagesDates.trim().length < 3) {
      newErrors.landingPagesDates = "Datas exatas devem ter pelo menos 3 caracteres";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar dados para duplicação - copiar todos os campos da turma original
    const duplicateData = {
      ...turma,
      id: undefined, // Remove o ID para criar uma nova turma
      name: formData.name.trim(),
      initialDate: formData.initialDate,
      finalDate: formData.finalDate,
      landingPagesDates: formData.landingPagesDates.trim(),
      classCode: formData.classCode,
      active: true, // Nova turma começa ativa
      imageUrl: null, // Remove a imagem da turma duplicada
      createdAt: undefined,
      updatedAt: undefined,
      inactiveAt: undefined,
      // Limpa relacionamentos que não devem ser duplicados
      instructors: undefined,
      subscriptions: undefined,
      _count: undefined,
    };

    duplicateTurma(duplicateData);
  };

  const regenerateCode = () => {
    const newCode = generateClassCode();
    handleChange('classCode', newCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="copy" className="w-5 h-5" />
            Duplicar Turma
          </DialogTitle>
          <DialogDescription>
            Crie uma cópia da turma "{turma?.name}" com novas datas e informações.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nome da Turma - Primeiro campo */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              Nome da Turma <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Digite o nome da turma"
              value={formData.name}
              onValueChange={handleChange}
              className="col-span-3"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
          </div>

          {/* Data de Início */}
          <div className="grid gap-2">
            <Label htmlFor="initialDate">
              Data de Início <span className="text-red-500">*</span>
            </Label>
            <CalendarPicker
              mode="single"
              name="initialDate"
              value={formData.initialDate}
              onValueChange={handleChange}
              formField="initialDate"
              placeholder="Selecione a data de início"
            />
            {errors.initialDate && (
              <p className="text-red-500 text-sm">{errors.initialDate}</p>
            )}
          </div>

          {/* Data de Fim */}
          <div className="grid gap-2">
            <Label htmlFor="finalDate">
              Data de Fim <span className="text-red-500">*</span>
            </Label>
            <CalendarPicker
              mode="single"
              name="finalDate"
              value={formData.finalDate}
              onValueChange={handleChange}
              formField="finalDate"
              placeholder="Selecione a data de fim"
            />
            {errors.finalDate && (
              <p className="text-red-500 text-sm">{errors.finalDate}</p>
            )}
          </div>

          {/* Datas Exatas para Divulgação */}
          <div className="grid gap-2">
            <Label htmlFor="landingPagesDates">
              Datas Exatas para Divulgação <span className="text-red-500">*</span>
            </Label>
            <Input
              id="landingPagesDates"
              name="landingPagesDates"
              placeholder="Ex: 12, 13 e 14 de janeiro"
              value={formData.landingPagesDates}
              onValueChange={handleChange}
            />
            {errors.landingPagesDates && (
              <p className="text-red-500 text-sm">{errors.landingPagesDates}</p>
            )}
          </div>

          {/* Código da Turma */}
          {turma?.allowExam && (
            <div className="grid gap-2">
              <Label htmlFor="classCode">
                Código de Acesso à Prova
              </Label>
              <div className="flex gap-2">
                <Input
                  id="classCode"
                  name="classCode"
                  placeholder="Ex: A3B9"
                  value={formData.classCode}
                  onValueChange={handleChange}
                  className="flex-1"
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={regenerateCode}
                  title="Gerar novo código"
                >
                  <Icon name="refresh-cw" className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Um novo código foi gerado automaticamente para a nova turma
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Icon name="copy" className="mr-2 h-4 w-4" />
                Duplicar Turma
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateTurmaModal;