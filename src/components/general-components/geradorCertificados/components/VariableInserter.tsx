import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Variable, Type, Image } from 'lucide-react';
import { CertificateVariable, AvailableVariables } from '../types';

interface VariableInserterProps {
  availableVariables?: AvailableVariables;
  onInsertVariable: (variableKey: string) => void;
  type?: 'text' | 'image' | 'all';
}

const VariableInserter: React.FC<VariableInserterProps> = ({
  availableVariables,
  onInsertVariable,
  type = 'all'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Mock de variáveis caso não venha do backend ainda
  const mockVariables: AvailableVariables = {
    nome_aluno: {
      key: "nome_aluno",
      label: "Nome do Aluno",
      name: "Nome do Aluno",
      description: "Nome completo do aluno",
      type: "text",
      source: "trainee.name",
      required: true,
      placeholder: "João da Silva"
    },
    cpf_aluno: {
      key: "cpf_aluno",
      label: "CPF do Aluno",
      name: "CPF do Aluno",
      description: "CPF do aluno",
      type: "text",
      source: "trainee.cpf",
      required: false,
      placeholder: "123.456.789-00"
    },
    nome_curso: {
      key: "nome_curso",
      label: "Nome do Curso",
      name: "Nome do Curso",
      description: "Nome do curso realizado",
      type: "text",
      source: "course.name",
      required: true,
      placeholder: "Curso de Segurança"
    },
    data_inicio: {
      key: "data_inicio",
      label: "Data de Início",
      name: "Data de Início",
      description: "Data de início do curso",
      type: "text",
      source: "courseClass.startDate",
      required: true,
      placeholder: "01/01/2024"
    },
    data_fim: {
      key: "data_fim",
      label: "Data de Término",
      name: "Data de Término",
      description: "Data de término do curso",
      type: "text",
      source: "courseClass.endDate",
      required: true,
      placeholder: "05/01/2024"
    },
    carga_horaria: {
      key: "carga_horaria",
      label: "Carga Horária",
      name: "Carga Horária",
      description: "Total de horas do curso",
      type: "text",
      source: "course.duration",
      required: true,
      placeholder: "40 horas"
    },
    nome_empresa: {
      key: "nome_empresa",
      label: "Nome da Empresa",
      name: "Nome da Empresa",
      description: "Nome da empresa cliente",
      type: "text",
      source: "customer.name",
      required: true,
      placeholder: "Empresa ABC Ltda"
    },
    assinatura_instrutor: {
      key: "assinatura_instrutor",
      label: "Assinatura do Instrutor",
      name: "Assinatura do Instrutor",
      description: "Assinatura digital do instrutor",
      type: "image",
      source: "instructor.signatureUrl",
      required: false,
      placeholder: "https://example.com/signature.png"
    },
    logo_empresa: {
      key: "logo_empresa",
      label: "Logo da Empresa",
      name: "Logo da Empresa",
      description: "Logotipo da empresa",
      type: "image",
      source: "customer.logoUrl",
      required: false,
      placeholder: "https://example.com/logo.png"
    }
  };

  const variables = availableVariables || mockVariables;

  // Filtrar variáveis por tipo
  const filteredVariables = Object.entries(variables).filter(([_, variable]) => {
    if (type === 'all') return true;
    return (variable as CertificateVariable).type === type;
  });

  // Agrupar variáveis por categoria
  const groupedVariables = filteredVariables.reduce((acc, [key, variable]) => {
    const typedVariable = variable as CertificateVariable;
    let category = 'Outros';
    
    if (typedVariable.type === 'image') {
      category = 'Imagens';
    } else if (key.includes('aluno') || key.includes('cpf')) {
      category = 'Aluno';
    } else if (key.includes('curso') || key.includes('carga')) {
      category = 'Curso';
    } else if (key.includes('data')) {
      category = 'Datas';
    } else if (key.includes('empresa') || key.includes('cliente')) {
      category = 'Empresa';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...typedVariable, key });
    return acc;
  }, {} as Record<string, Array<CertificateVariable & { key: string }>>);

  const handleSelectVariable = (variableKey: string) => {
    onInsertVariable(variableKey);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Variable className="w-4 h-4 mr-2" />
          Inserir Variável
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        {Object.entries(groupedVariables).map(([category, vars]) => (
          <div key={category}>
            <DropdownMenuLabel className="text-xs font-semibold">
              {category}
            </DropdownMenuLabel>
            {vars.map((variable) => (
              <DropdownMenuItem
                key={variable.key}
                onClick={() => handleSelectVariable(variable.key)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-2 w-full">
                  {variable.type === 'text' ? (
                    <Type className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Image className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{variable.name}</span>
                      {variable.required && (
                        <span className="text-xs text-red-500">*</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {variable.description}
                    </p>
                    <code className="text-xs text-primary mt-1 block">
                      {`{{${variable.key}}}`}
                    </code>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VariableInserter;