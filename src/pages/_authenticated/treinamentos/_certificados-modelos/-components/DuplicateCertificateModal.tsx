import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { post, get } from "@/services/api";
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
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { ICertificate } from "../-interfaces/entity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";

interface DuplicateCertificateModalProps {
  certificate: ICertificate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DuplicateCertificateModal = ({
  certificate,
  open,
  onOpenChange,
}: DuplicateCertificateModalProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const [name, setName] = useState(certificate.name + " (Cópia)");
  const [courseId, setCourseId] = useState(certificate.courseId || 0);
  const [errors, setErrors] = useState<{ name?: string; courseId?: string }>({});

  // Query para buscar cursos ativos
  const { 
    data: courses, 
    isLoading: isLoadingCourses,
  } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'active', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      return get('courses', '', params);
    },
  });

  // Mutation para duplicar certificado
  const { mutate: duplicateCertificate, isPending } = useMutation({
    mutationFn: (data: Partial<ICertificate>) => {
      showLoader("Duplicando certificado...");
      return post<ICertificate>("certificate", "", data as ICertificate);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Certificado duplicado!",
        description: "O certificado foi duplicado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["list_Certificados"] });
      onOpenChange(false);
      // Reset form
      setName(certificate.name + " (Cópia)");
      setCourseId(certificate.courseId || 0);
      setErrors({});
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: "Erro ao duplicar certificado",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Validação
    const newErrors: { name?: string; courseId?: string } = {};
    
    if (!name || name.trim().length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    }
    
    if (!courseId || courseId <= 0) {
      newErrors.courseId = "Selecione um curso";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar dados para duplicação
    const duplicateData: Partial<ICertificate> = {
      name: name.trim(),
      courseId: courseId,
      companyId: certificate.companyId,
      active: true,
      canvasWidth: certificate.canvasWidth,
      canvasHeight: certificate.canvasHeight,
      fabricJsonFront: certificate.fabricJsonFront,
      fabricJsonBack: certificate.fabricJsonBack,
    };

    duplicateCertificate(duplicateData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="copy" className="w-5 h-5" />
            Duplicar Certificado
          </DialogTitle>
          <DialogDescription>
            Crie uma cópia do certificado "{certificate.name}" com um novo nome
            e curso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Nome do Certificado <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Digite o nome do certificado"
              value={name}
              onValueChange={(_, value) => {
                setName(String(value));
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: undefined }));
                }
              }}
              className="col-span-3"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="courseId">
              Curso <span className="text-red-500">*</span>
            </Label>
            <Select
              name="courseId"
              disabled={isLoadingCourses}
              options={courses?.rows || []}
              onChange={(_, value) => {
                setCourseId(Number(value));
                if (errors.courseId) {
                  setErrors(prev => ({ ...prev, courseId: undefined }));
                }
              }}
              state={courseId ? String(courseId) : ""}
              placeholder={isLoadingCourses ? "Carregando cursos..." : "Selecione o curso"}
            />
            {errors.courseId && (
              <p className="text-red-500 text-sm">{errors.courseId}</p>
            )}
          </div>
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
            disabled={isPending || isLoadingCourses}
          >
            {isPending ? (
              <>
                <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Icon name="copy" className="mr-2 h-4 w-4" />
                Duplicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateCertificateModal;