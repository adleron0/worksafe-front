# Exemplos de Uso - Visualizador de Certificados

## Nova Estrutura Recomendada com `variableToReplace`

### Estrutura do Objeto `variableToReplace`

```typescript
interface VariableToReplace {
  [key: string]: {
    type: 'string' | 'url';
    value: string;
  };
}
```

### Exemplo Completo de Uso

```tsx
import VisualizadorCertificados from '@/components/general-components/visualizadorCertificados';

const ExemploCompleto = () => {
  const certificateData = {
    id: 1,
    name: "Certificado NR-35",
    fabricJsonFront: {
      objects: [
        {
          type: "textbox",
          text: "Certificamos que {{nome_do_aluno}} concluiu o curso {{nome_do_curso}}",
          left: 100,
          top: 200
        },
        {
          type: "textbox", 
          text: "Data: {{data_conclusao}} - Carga horária: {{carga_horaria}}",
          left: 100,
          top: 300
        },
        {
          isPlaceholder: true,
          placeholderName: "instrutor_assinatura_url",
          left: 400,
          top: 500,
          width: 200,
          height: 100
        }
      ]
    },
    fabricJsonBack: null // Opcional
  };

  const variableToReplace = {
    // Variáveis do tipo STRING para substituição em textos
    nome_do_aluno: {
      type: 'string',
      value: 'João Silva Santos'
    },
    nome_do_curso: {
      type: 'string', 
      value: 'Segurança do Trabalho - NR 35'
    },
    data_conclusao: {
      type: 'string',
      value: '15/12/2024'
    },
    carga_horaria: {
      type: 'string',
      value: '40 horas'
    },
    nome_empresa: {
      type: 'string',
      value: 'Adleron Tecnologia'
    },
    instrutor_nome: {
      type: 'string',
      value: 'Dr. Carlos Eduardo'
    },
    certificado_numero: {
      type: 'string',
      value: '2024-001234'
    },
    
    // Variáveis do tipo URL para substituir placeholders de imagem
    instrutor_assinatura_url: {
      type: 'url',
      value: 'https://meusite.com/assinatura-instructor.png'
    },
    logo_empresa: {
      type: 'url',
      value: 'https://meusite.com/logo-empresa.png'
    },
    selo_certificacao: {
      type: 'url',
      value: 'https://meusite.com/selo-nr35.png'
    }
  };

  return (
    <VisualizadorCertificados
      certificateData={certificateData}
      variableToReplace={variableToReplace}
      onDownloadPDF={() => console.log('PDF baixado!')}
      className="h-screen"
    />
  );
};
```

## Como as Variáveis São Processadas

### 1. Variáveis do Tipo `string`

Usadas para substituir texto como `{{nome_do_aluno}}`:

```typescript
// No texto do certificado:
"Certificamos que {{nome_do_aluno}} concluiu..."

// Com a variável:
nome_do_aluno: {
  type: 'string',
  value: 'João Silva Santos'
}

// Resultado:
"Certificamos que João Silva Santos concluiu..."
```

### 2. Variáveis do Tipo `url`

Usadas para substituir placeholders de imagem:

```typescript
// Placeholder no fabricJSON:
{
  isPlaceholder: true,
  placeholderName: "instrutor_assinatura_url",
  left: 400,
  top: 500
}

// Com a variável:
instrutor_assinatura_url: {
  type: 'url',
  value: 'https://exemplo.com/assinatura.png'
}

// Resultado: placeholder é convertido em imagem real:
{
  type: "image",
  src: "https://exemplo.com/assinatura.png",
  left: 400,
  top: 500,
  selectable: false
}
```

## Exemplos de Diferentes Cenários

### Certificado Básico (Só Textos)

```typescript
const variableToReplace = {
  nome_do_aluno: { type: 'string', value: 'Maria Oliveira' },
  curso: { type: 'string', value: 'Primeiros Socorros' },
  data: { type: 'string', value: '20/12/2024' },
  instrutor: { type: 'string', value: 'Dr. Pedro Silva' }
};
```

### Certificado com Imagens

```typescript
const variableToReplace = {
  // Dados de texto
  nome_do_aluno: { type: 'string', value: 'Ana Costa' },
  curso: { type: 'string', value: 'Segurança Industrial' },
  
  // Imagens
  foto_aluno: { 
    type: 'url', 
    value: 'https://empresa.com/fotos/ana-costa.jpg' 
  },
  assinatura_digital: { 
    type: 'url', 
    value: 'data:image/png;base64,iVBORw0KGgoAAAANS...' 
  },
  logo_certificadora: { 
    type: 'url', 
    value: 'https://certificadora.com/logo.png' 
  }
};
```

### Certificado Multi-página (Frente e Verso)

```typescript
const certificateData = {
  id: 2,
  name: "Certificado NR-10 Completo",
  fabricJsonFront: { /* dados da frente */ },
  fabricJsonBack: { /* dados do verso */ }
};

const variableToReplace = {
  // Frente
  nome_completo: { type: 'string', value: 'Carlos Eduardo Santos' },
  cpf: { type: 'string', value: '123.456.789-00' },
  curso_nome: { type: 'string', value: 'NR-10 - Segurança em Eletricidade' },
  
  // Verso
  conteudo_programatico: { 
    type: 'string', 
    value: '1. Fundamentos\n2. Riscos Elétricos\n3. Medidas de Proteção' 
  },
  carga_horaria_detalhada: { type: 'string', value: '40h teóricas + 8h práticas' },
  
  // Imagens (podem aparecer em ambas as páginas)
  foto_participante: { type: 'url', value: 'https://fotos.com/carlos.jpg' },
  qr_code_validacao: { type: 'url', value: 'https://qr.com/validacao.png' }
};
```

## Casos Especiais

### URLs Locais/Base64

```typescript
// Imagens em base64
assinatura_escaneada: {
  type: 'url',
  value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...'
}

// URLs de desenvolvimento
logo_local: {
  type: 'url', 
  value: 'http://localhost:3000/assets/logo.png'
}
```

### Formatação de Datas

```typescript
// Diferentes formatos de data
data_emissao: { type: 'string', value: '15 de dezembro de 2024' },
data_validade: { type: 'string', value: '15/12/2026' },
periodo_curso: { type: 'string', value: '01/11/2024 a 15/12/2024' }
```

### Conteúdo com HTML/Markdown (será renderizado como texto simples)

```typescript
descricao_curso: { 
  type: 'string', 
  value: 'Curso completo de segurança\n- Módulo 1: Teoria\n- Módulo 2: Prática\n- Módulo 3: Avaliação' 
}
```

## Integração com Backend

### Estrutura Recomendada da API

```typescript
// GET /api/certificates/:id/generate-for-student/:studentId
{
  "certificateData": {
    "id": 1,
    "name": "Certificado NR-35",
    "fabricJsonFront": { /* ... */ },
    "fabricJsonBack": null
  },
  "variableToReplace": {
    "nome_do_aluno": { "type": "string", "value": "João Silva" },
    "instrutor_assinatura_url": { "type": "url", "value": "https://..." }
    // ... outras variáveis
  }
}
```

### Validação no Frontend

```typescript
import { VariableReplacer } from './utils/VariableReplacer';

// Extrair variáveis necessárias do certificado
const requiredVariables = VariableReplacer.extractVariables(certificateData.fabricJsonFront);
console.log('Variáveis necessárias:', requiredVariables);

// Validar se todas estão presentes
const validation = VariableReplacer.validateRequiredVariables(
  certificateData.fabricJsonFront,
  variableToReplace
);

if (!validation.isValid) {
  console.error('Variáveis faltando:', validation.missingVariables);
}
```

## Compatibilidade com Versão Anterior

Para manter compatibilidade, ainda é possível usar `studentData` (será convertido automaticamente):

```typescript
// ❌ Versão antiga (ainda funciona, mas deprecated)
<VisualizadorCertificados
  certificateData={certificateData}
  studentData={{
    nome_do_aluno: 'João Silva',
    instrutor_assinatura_url: 'https://...'
  }}
/>

// ✅ Versão nova recomendada
<VisualizadorCertificados
  certificateData={certificateData}
  variableToReplace={{
    nome_do_aluno: { type: 'string', value: 'João Silva' },
    instrutor_assinatura_url: { type: 'url', value: 'https://...' }
  }}
/>
```