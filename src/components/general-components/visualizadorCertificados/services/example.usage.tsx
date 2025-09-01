import { useState } from 'react';
import CertificatePDFService from './CertificatePDFService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Download, 
  Mail, 
  FileDown, 
  Users, 
  Loader2 
} from 'lucide-react';

/**
 * Exemplos de uso do CertificatePDFService
 */

// Exemplo 1: Download direto do PDF
export const DownloadCertificateExample = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Dados do certificado (normalmente viriam da API)
      const certificateData = {
        id: 1,
        certificateId: 'CERT-001',
        name: 'Certificado de Conclusão',
        fabricJsonFront: '{}', // JSON do canvas da frente
        fabricJsonBack: '{}', // JSON do canvas do verso (opcional)
        canvasWidth: 842,
        canvasHeight: 595
      };

      // Variáveis para substituir no template
      const variables = {
        nome_do_aluno: { type: 'string' as const, value: 'João Silva' },
        nome_do_curso: { type: 'string' as const, value: 'NR-35 Trabalho em Altura' },
        data_conclusao: { type: 'string' as const, value: '15/03/2024' },
        carga_horaria: { type: 'string' as const, value: '8 horas' }
      };

      // Gerar e baixar o PDF
      const result = await CertificatePDFService.generatePDF(
        certificateData,
        variables
      );

      if (result.success) {
        toast.success('Certificado baixado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao gerar certificado');
      }
    } catch (error) {
      toast.error('Erro ao processar certificado');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isGenerating}>
      {isGenerating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Baixar Certificado
    </Button>
  );
};

// Exemplo 2: Gerar PDF como Blob para envio por email
export const EmailCertificateExample = () => {
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      const certificateData = {
        id: 2,
        certificateId: 'CERT-002',
        name: 'Certificado de Participação',
        fabricJsonFront: '{}',
        canvasWidth: 842,
        canvasHeight: 595
      };

      const variables = {
        nome_do_aluno: { type: 'string' as const, value: 'Maria Santos' },
        nome_do_curso: { type: 'string' as const, value: 'NR-10 Segurança em Eletricidade' }
      };

      // Gerar PDF como Blob
      const pdfData = await CertificatePDFService.generatePDFForEmail(
        certificateData,
        variables
      );

      if (pdfData) {
        // Criar FormData para enviar ao backend
        const formData = new FormData();
        formData.append('pdf', pdfData.blob, pdfData.fileName);
        formData.append('email', 'maria.santos@email.com');
        formData.append('subject', 'Seu Certificado de Participação');
        
        // Enviar para o backend (exemplo)
        // const response = await fetch('/api/send-certificate-email', {
        //   method: 'POST',
        //   body: formData
        // });
        
        toast.success('Certificado enviado por email!');
      } else {
        toast.error('Erro ao gerar certificado');
      }
    } catch (error) {
      toast.error('Erro ao enviar certificado');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button onClick={handleSendEmail} disabled={isSending}>
      {isSending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Mail className="w-4 h-4 mr-2" />
      )}
      Enviar por Email
    </Button>
  );
};

// Exemplo 3: Gerar PDF como Base64
export const Base64CertificateExample = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [base64Data, setBase64Data] = useState<string>('');

  const handleGenerateBase64 = async () => {
    setIsGenerating(true);
    
    try {
      const certificateData = {
        id: 3,
        certificateId: 'CERT-003',
        name: 'Certificado de Treinamento',
        fabricJsonFront: '{}',
        canvasWidth: 842,
        canvasHeight: 595
      };

      const variables = {
        nome_do_aluno: { type: 'string' as const, value: 'Pedro Oliveira' }
      };

      // Gerar PDF como Base64
      const result = await CertificatePDFService.generatePDF(
        certificateData,
        variables,
        { returnBase64: true }
      );

      if (result.success && typeof result.data === 'string') {
        setBase64Data(result.data);
        toast.success('PDF gerado como Base64!');
        
        // Pode usar o base64 para:
        // - Salvar no banco de dados
        // - Enviar via API
        // - Exibir em iframe
        console.log('Base64 PDF:', result.data.substring(0, 100) + '...');
      }
    } catch (error) {
      toast.error('Erro ao gerar certificado');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <Button onClick={handleGenerateBase64} disabled={isGenerating}>
        {isGenerating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4 mr-2" />
        )}
        Gerar como Base64
      </Button>
      
      {base64Data && (
        <div className="mt-4 p-4 border rounded">
          <p className="text-sm text-gray-600">PDF gerado em Base64</p>
          <iframe 
            src={base64Data} 
            className="w-full h-96 mt-2"
            title="Preview PDF"
          />
        </div>
      )}
    </div>
  );
};

// Exemplo 4: Processamento em lote
export const BatchCertificatesExample = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleBatchGeneration = async () => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });
    
    try {
      const certificateData = {
        id: 4,
        certificateId: 'CERT-BATCH',
        name: 'Certificado de Curso',
        fabricJsonFront: '{}',
        canvasWidth: 842,
        canvasHeight: 595
      };

      // Lista de alunos
      const students = [
        {
          variables: {
            nome_do_aluno: { type: 'string' as const, value: 'Ana Silva' },
            nome_do_curso: { type: 'string' as const, value: 'NR-35' }
          }
        },
        {
          variables: {
            nome_do_aluno: { type: 'string' as const, value: 'Carlos Santos' },
            nome_do_curso: { type: 'string' as const, value: 'NR-35' }
          }
        },
        {
          variables: {
            nome_do_aluno: { type: 'string' as const, value: 'Beatriz Lima' },
            nome_do_curso: { type: 'string' as const, value: 'NR-35' }
          }
        }
      ];

      // Gerar PDFs em lote
      const results = await CertificatePDFService.generateBatchPDFs(
        certificateData,
        students,
        { returnBlob: true },
        (current, total) => {
          setProgress({ current, total });
        }
      );

      // Processar resultados
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        // Aqui você pode:
        // - Criar um ZIP com todos os PDFs
        // - Enviar para o servidor
        // - Salvar no localStorage
        
        toast.success(`${successful.length} certificados gerados com sucesso!`);
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} certificados falharam`);
      }

      // Exemplo: Download de todos como ZIP (necessita biblioteca adicional como JSZip)
      // const zip = new JSZip();
      // successful.forEach((result, index) => {
      //   if (result.data instanceof Blob) {
      //     zip.file(`certificado_${result.studentName}.pdf`, result.data);
      //   }
      // });
      // const zipBlob = await zip.generateAsync({ type: 'blob' });
      // saveAs(zipBlob, 'certificados.zip');
      
    } catch (error) {
      toast.error('Erro ao processar certificados');
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div>
      <Button onClick={handleBatchGeneration} disabled={isProcessing}>
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Users className="w-4 h-4 mr-2" />
        )}
        Gerar Certificados em Lote
      </Button>
      
      {isProcessing && progress.total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Processando certificados...
            </span>
            <span className="text-sm font-medium">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Exemplo 5: Integração com componente existente
export const IntegrationExample = () => {
  const [selectedQuality, setSelectedQuality] = useState<'low' | 'medium' | 'high' | 'maximum'>('high');

  const handleCustomGeneration = async () => {
    try {
      // Buscar dados do certificado da API
      // const certificateResponse = await fetch(`/api/certificates/${certificateId}`);
      // const certificateData = await certificateResponse.json();
      
      // Buscar dados do aluno
      // const studentResponse = await fetch(`/api/students/${studentId}`);
      // const studentData = await studentResponse.json();
      
      // Exemplo com dados mockados
      const certificateData = {
        id: 5,
        certificateId: 'CERT-API-001',
        name: 'Certificado Personalizado',
        fabricJsonFront: '{}',
        canvasWidth: 842,
        canvasHeight: 595
      };

      const variables = {
        nome_do_aluno: { type: 'string' as const, value: 'Exemplo Aluno' }
      };

      // Gerar com qualidade selecionada
      const result = await CertificatePDFService.generatePDF(
        certificateData,
        variables,
        { 
          quality: selectedQuality,
          fileName: 'certificado_personalizado.pdf'
        }
      );

      if (result.success) {
        toast.success('Certificado gerado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao gerar certificado');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Qualidade do PDF
        </label>
        <select 
          value={selectedQuality}
          onChange={(e) => setSelectedQuality(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="low">Baixa (Rápido, arquivo menor)</option>
          <option value="medium">Média</option>
          <option value="high">Alta (Recomendado)</option>
          <option value="maximum">Máxima (Arquivo maior)</option>
        </select>
      </div>
      
      <Button onClick={handleCustomGeneration}>
        <Download className="w-4 h-4 mr-2" />
        Gerar com Qualidade {selectedQuality}
      </Button>
    </div>
  );
};