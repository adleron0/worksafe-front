import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/api';

interface CertificateSaveModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    courseId: number;
  }) => void;
  isLoading?: boolean;
  defaultValues?: {
    name?: string;
    courseId?: number;
  };
  mode?: 'create' | 'update';
}

interface Course {
  id: number;
  name: string;
  hoursDuration: number;
  flags: string;
  companyId: number;
  description: string;
  active: boolean;
}

export const CertificateSaveModal: React.FC<CertificateSaveModalProps> = ({
  open,
  onClose,
  onSave,
  isLoading = false,
  defaultValues = {},
  mode = 'create'
}) => {
  const [name, setName] = useState(defaultValues.name || '');
  const [courseId, setCourseId] = useState<number | null>(defaultValues.courseId || null);

  // Buscar cursos disponíveis (o backend filtra pela empresa do token)
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses-for-certificate'],
    queryFn: async () => {
      const response = await get<{ rows: Course[]; total: number }>('courses', '');
      return response?.rows || [];
    },
    enabled: open
  });

  // Resetar valores quando o modal abrir
  useEffect(() => {
    if (open) {
      setName(defaultValues.name || '');
      setCourseId(defaultValues.courseId || null);
    }
  }, [open, defaultValues]);

  const handleSave = () => {
    // Validações
    if (!name.trim()) {
      toast.error('Por favor, insira um nome para o modelo');
      return;
    }

    if (!courseId) {
      toast.error('Por favor, selecione um curso');
      return;
    }

    onSave({
      name: name.trim(),
      courseId
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Salvar Novo Modelo de Certificado' : 'Atualizar Modelo de Certificado'}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para {mode === 'create' ? 'salvar' : 'atualizar'} o modelo de certificado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Modelo</Label>
            <Input
              id="name"
              placeholder="Ex: Certificado de Conclusão"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="course">Curso</Label>
            <Select
              value={courseId?.toString() || ''}
              onValueChange={(value) => setCourseId(Number(value))}
              disabled={isLoading || isLoadingCourses || mode === 'update'}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder={
                  isLoadingCourses ? "Carregando cursos..." : "Selecione um curso"
                } />
              </SelectTrigger>
              <SelectContent>
                {coursesData?.filter(course => course.active).map((course) => (
                  <SelectItem key={course.id} value={course.id.toString()}>
                    {course.name}
                    {course.hoursDuration && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({course.hoursDuration}h)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mode === 'update' && (
              <p className="text-sm text-gray-500">
                O curso não pode ser alterado após a criação do certificado
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name || !courseId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Salvando...' : 'Atualizando...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Salvar Modelo' : 'Atualizar Modelo'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};