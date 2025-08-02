import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FolderOpen, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/api';
import { CertificateResponse } from '../hooks/useCertificateApi';

interface CertificateLoadModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (certificate: CertificateResponse) => void;
  isLoading?: boolean;
}

interface Company {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  companyId: number;
}

export const CertificateLoadModal: React.FC<CertificateLoadModalProps> = ({
  open,
  onClose,
  onLoad,
  isLoading = false
}) => {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);

  // Buscar empresas
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await get<{ rows: Company[] }>('companies');
      return response?.rows || [];
    },
    enabled: open
  });

  // Buscar cursos baseado na empresa selecionada
  const { data: coursesData } = useQuery({
    queryKey: ['courses', companyId],
    queryFn: async () => {
      const params = companyId ? [{ key: 'companyId', value: companyId }] : undefined;
      const response = await get<{ rows: Course[] }>('courses', '', params);
      return response?.rows || [];
    },
    enabled: open && !!companyId
  });

  // Buscar certificado do curso selecionado
  const { data: certificateData, isLoading: isLoadingCertificate } = useQuery({
    queryKey: ['certificate', 'course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      try {
        const response = await get<CertificateResponse>('certificate/course', `${courseId}`);
        return response;
      } catch (error) {
        return null;
      }
    },
    enabled: open && !!courseId
  });

  // Resetar courseId quando companyId mudar
  React.useEffect(() => {
    setCourseId(null);
  }, [companyId]);

  // Resetar seleções quando o modal abrir/fechar
  React.useEffect(() => {
    if (!open) {
      setCompanyId(null);
      setCourseId(null);
    }
  }, [open]);

  const handleLoad = () => {
    if (certificateData) {
      onLoad(certificateData);
    }
  };

  const hasNoCertificate = courseId && !isLoadingCertificate && !certificateData;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Carregar Modelo de Certificado</DialogTitle>
          <DialogDescription>
            Selecione a empresa e o curso para carregar um modelo de certificado existente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Empresa</Label>
            <Select
              value={companyId?.toString() || ''}
              onValueChange={(value) => setCompanyId(Number(value))}
              disabled={isLoading}
            >
              <SelectTrigger id="company">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companiesData?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="course">Curso</Label>
            <Select
              value={courseId?.toString() || ''}
              onValueChange={(value) => setCourseId(Number(value))}
              disabled={isLoading || !companyId}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder={!companyId ? "Selecione uma empresa primeiro" : "Selecione um curso"} />
              </SelectTrigger>
              <SelectContent>
                {coursesData?.map((course) => (
                  <SelectItem key={course.id} value={course.id.toString()}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Informações do certificado encontrado */}
          {certificateData && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Modelo encontrado!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    <strong>Nome:</strong> {certificateData.name}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Páginas:</strong> {certificateData.fabricJsonBack ? '2 (Frente e Verso)' : '1 (Apenas Frente)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem quando não há certificado */}
          {hasNoCertificate && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Nenhum modelo de certificado encontrado para este curso.
              </p>
            </div>
          )}

          {/* Loading do certificado */}
          {isLoadingCertificate && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-sm text-gray-500">Buscando modelo...</span>
            </div>
          )}
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
            onClick={handleLoad}
            disabled={isLoading || !certificateData}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                Carregar Modelo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};