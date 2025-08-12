# Visualizador de Certificados

## Visão Geral

O Visualizador de Certificados é um componente React independente que permite visualizar certificados já criados no sistema, com substituição dinâmica de variáveis e capacidade de exportação para PDF.

## Características

- ✅ **Somente Leitura**: Visualização sem possibilidade de edição
- ✅ **Substituição Dinâmica**: Substitui variáveis como `{{nome_do_aluno}}` por dados reais
- ✅ **Suporte Multi-página**: Visualiza frente e verso do certificado
- ✅ **Exportação PDF**: Gera PDF de alta qualidade
- ✅ **Reutilização**: Aproveita infraestrutura do gerador (Fabric.js, proxy de imagens)

## Uso Básico

```tsx
import VisualizadorCertificados from '@/components/general-components/visualizadorCertificados/VisualizadorCertificados';

const ExemploUso = () => {
  const certificateData = {
    id: 1,
    name: "Certificado NR-35",
    fabricJsonFront: { /* JSON do canvas da frente */ },
    fabricJsonBack: { /* JSON do canvas do verso (opcional) */ }
  };

  const studentData = {
    nome_do_aluno: "João Silva Santos",
    nome_do_curso: "Segurança do Trabalho - NR 35",
    data_conclusao: "15/12/2024",
    instrutor_assinatura_url: "https://example.com/assinatura.png",
    carga_horaria: "40 horas"
  };

  return (
    <VisualizadorCertificados
      certificateData={certificateData}
      studentData={studentData}
      onDownloadPDF={() => console.log('PDF baixado!')}
      className="h-screen"
    />
  );
};
```

## Props

### `CertificateViewerProps`

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `certificateData` | `CertificateData` | ✅ | Dados do certificado do backend |
| `studentData` | `StudentData` | ✅ | Dados do aluno para substituição |
| `onDownloadPDF` | `() => void` | ❌ | Callback quando PDF for baixado |
| `className` | `string` | ❌ | Classes CSS adicionais |
| `zoom` | `number` | ❌ | Nível de zoom (padrão: 100) |

### `CertificateData`

```typescript
interface CertificateData {
  id: number;
  name: string;
  fabricJsonFront: any;          // JSON do Fabric.js da frente
  fabricJsonBack?: any | null;   // JSON do Fabric.js do verso
  canvasWidth?: number;          // Largura do canvas
  canvasHeight?: number;         // Altura do canvas
}
```

### `StudentData`

```typescript
interface StudentData {
  nome_do_aluno: string;
  nome_do_curso?: string;
  data_conclusao?: string;
  instrutor_assinatura_url?: string;
  carga_horaria?: string;
  nome_empresa?: string;
  instrutor_nome?: string;
  data_emissao?: string;
  // Permite outras propriedades dinâmicas
  [key: string]: string | undefined;
}
```

## Substituição de Variáveis

O componente automaticamente substitui variáveis no formato `{{chave}}` pelos valores correspondentes em `studentData`.

### Exemplos de Variáveis Suportadas

- `{{nome_do_aluno}}` → "João Silva Santos"
- `{{nome_do_curso}}` → "Segurança do Trabalho - NR 35"
- `{{data_conclusao}}` → "15/12/2024"
- `{{carga_horaria}}` → "40 horas"

### Placeholders de Imagem

Placeholders criados no gerador podem ser substituídos por URLs reais:

```typescript
// Se o certificado tem um placeholder chamado "instrutor_assinatura_url"
studentData = {
  instrutor_assinatura_url: "https://meusite.com/assinatura.png"
  // Placeholder será automaticamente convertido em imagem real
};
```

## Estrutura de Arquivos

```
visualizadorCertificados/
├── VisualizadorCertificados.tsx     # Componente principal
├── components/
│   ├── CertificateCanvas.tsx        # Canvas somente leitura
│   └── DownloadToolbar.tsx          # Barra de ferramentas
├── hooks/
│   └── useCertificateViewer.ts      # Lógica principal
├── utils/
│   └── VariableReplacer.ts          # Substitui variáveis
└── types/
    └── index.ts                     # Definições de tipos
```

## Funcionalidades dos Componentes

### `VisualizadorCertificados` (Principal)

- Carrega fontes do Google automaticamente
- Gerencia estado de páginas múltiplas
- Coordena carregamento e renderização

### `CertificateCanvas`

- Canvas Fabric.js em modo somente leitura
- Desabilita todos os controles de edição
- Mantém sistema de proxy para imagens
- Suporte a orientação paisagem/retrato

### `DownloadToolbar`

- Exibe informações do certificado e aluno
- Botão para download do PDF
- Indicador de loading durante exportação

### `useCertificateViewer` (Hook)

- Processa dados do certificado
- Substitui variáveis dinamicamente
- Gerencia carregamento nos canvas
- Exporta PDF multi-página

### `VariableReplacer` (Utilitário)

- Substitui `{{variáveis}}` por valores reais
- Converte placeholders em imagens
- Valida variáveis obrigatórias
- Extrai lista de variáveis do JSON

## Diferenças do Gerador

| Aspecto | Gerador | Visualizador |
|---------|---------|--------------|
| **Interatividade** | Edição completa | Somente visualização |
| **Controles** | Ferramentas, zoom, orientação | Apenas navegação e download |
| **Dados** | Canvas vazio/template | Dados processados |
| **Objetivo** | Criar certificados | Visualizar certificados finais |
| **Performance** | Carregamento sob demanda | Otimizada para exibição |

## Integração com Backend

### Dados Esperados do Backend

```json
{
  "id": 1,
  "name": "Certificado NR-35",
  "fabricJsonFront": {
    "objects": [
      {
        "type": "textbox",
        "text": "Certificado para {{nome_do_aluno}}"
        // ... outras propriedades
      }
    ]
  },
  "fabricJsonBack": null,
  "canvasWidth": 842,
  "canvasHeight": 595
}
```

### Exemplo de Endpoint

```typescript
// GET /api/certificates/:id/view
const response = await fetch(`/api/certificates/${certificateId}/view`);
const certificateData = await response.json();

// Dados do aluno (fonte pode variar)
const studentData = {
  nome_do_aluno: "João Silva",
  // ... outros dados
};
```

## Validação e Debug

### Utilitários de Validação

```typescript
import { VariableReplacer } from './utils/VariableReplacer';

// Extrair variáveis do certificado
const variables = VariableReplacer.extractVariables(certificateData.fabricJsonFront);
console.log('Variáveis encontradas:', variables);

// Validar se todas as variáveis estão presentes
const validation = VariableReplacer.validateRequiredVariables(
  certificateData.fabricJsonFront,
  studentData
);

if (!validation.isValid) {
  console.warn('Variáveis faltando:', validation.missingVariables);
}
```

### Dados de Exemplo

```typescript
// Criar dados de exemplo para teste
const sampleData = VariableReplacer.createSampleStudentData();
```

## Limitações e Considerações

1. **Dependências**: Requer mesmas dependências do gerador (Fabric.js, jsPDF)
2. **Fontes**: Carrega fontes do Google automaticamente (pode impactar tempo inicial)
3. **CORS**: Mantém sistema de proxy para imagens externas
4. **Performance**: Otimizado para visualização, não edição
5. **Compatibilidade**: Funciona com JSONs criados pelo gerador existente

## Futuras Melhorias

- [ ] Cache de fontes para melhor performance
- [ ] Zoom interativo na visualização
- [ ] Pré-visualização em miniatura para múltiplas páginas
- [ ] Marca d'água de pré-visualização
- [ ] Exportação em outros formatos (JPG, PNG)
- [ ] Assinatura digital no PDF