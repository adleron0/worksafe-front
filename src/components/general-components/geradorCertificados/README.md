# Gerador de Certificados - Documentação Técnica

## Visão Geral

O Gerador de Certificados é uma aplicação web construída com React e Fabric.js que permite aos usuários criar e editar certificados de forma visual e interativa. O sistema oferece ferramentas para adicionar textos, formas geométricas, imagens e manipular todos esses elementos em um canvas.

## Tecnologias e Versões

### Principais Dependências
- **React**: 18.x
- **Fabric.js**: 6.7.1
- **TypeScript**: 5.x
- **Tailwind CSS**: Para estilização
- **Lucide React**: Para ícones

### Versão do Fabric.js
Utilizamos a versão **6.7.1** do Fabric.js, que trouxe mudanças significativas em relação às versões anteriores:
- Métodos como `clone()` agora retornam Promises
- Mudanças nas interfaces TypeScript
- Novo sistema de tipos mais rigoroso

## Estrutura do Projeto

```
geradorCertificados/
├── components/
│   ├── CanvasEditor.tsx      # Editor principal do canvas
│   ├── ContextMenu.tsx       # Menu de contexto (clique direito)
│   ├── ImageGrid.tsx         # Grade de imagens disponíveis
│   ├── ImageUploadForm.tsx   # Formulário de upload de imagens
│   ├── LayersPanel.tsx       # Painel de camadas
│   ├── ShapesPanel.tsx       # Painel de formas geométricas
│   └── TextPanel.tsx         # Painel de texto
├── hooks/
│   └── useCanvas.ts          # Hook customizado para canvas
├── types/
│   └── index.ts              # Definições de tipos TypeScript
├── utils/
│   └── ListTextbox.ts        # Utilitário para texto com listas
└── gerador.tsx               # Componente principal
```

## Funcionalidades Principais

### 1. Canvas Editor
- Suporte para orientação paisagem/retrato
- Sistema de zoom (30% a 300%)
- Background branco padrão em tamanho A4
- Drag and drop de imagens e formas

### 2. Manipulação de Objetos
- Seleção e movimentação de objetos
- Redimensionamento e rotação
- Duplicação com Ctrl+D
- Exclusão com Delete/Backspace

### 3. Texto
- Editor de texto rico com suporte a:
  - Negrito (Ctrl+B)
  - Itálico (Ctrl+I)
  - Sublinhado (Ctrl+U)
  - Listas (bullet, numerada, seta)
  - Alinhamento (esquerda, centro, direita)
  - Espaçamento entre letras e linhas

### 4. Formas Geométricas
- Retângulo (com bordas arredondadas opcionais)
- Círculo
- Triângulo
- Linha
- Personalização de cor, borda e opacidade

### 5. Sistema de Camadas
- Visualização hierárquica dos objetos
- Reordenação por drag and drop
- Visibilidade toggleável
- Bloqueio de objetos

## Problemas Comuns e Soluções

### 1. Tipos do Fabric.js v6

**Problema**: A versão 6 do Fabric.js mudou várias interfaces e tipos.

**Solução**: 
```typescript
// Ao invés de fabric.ITextboxOptions
export interface ListTextboxOptions extends Partial<fabric.TextboxProps> {
  // propriedades customizadas
}
```

### 2. Método Clone

**Problema**: O método `clone()` agora retorna uma Promise.

**Solução**:
```typescript
// Versão antiga
activeObject.clone((cloned) => {
  // código
});

// Versão nova
activeObject.clone().then((cloned) => {
  // código
});
```

### 3. Eventos de Mouse e TypeScript

**Problema**: TypeScript não reconhece `button` em todos os tipos de evento.

**Solução**:
```typescript
if ('button' in opt.e && (opt.e as MouseEvent).button === 2) {
  // código para botão direito
}
```

### 4. Zoom e Coordenadas

**Problema**: Ao aplicar zoom, as coordenadas do mouse precisam ser ajustadas.

**Solução**: Usar `canvas.getPointer(event)` que já considera o zoom aplicado.

### 5. IDs Únicos para Objetos

**Problema**: Fabric.js não atribui IDs únicos automaticamente.

**Solução**:
```typescript
const uniqueId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
(object as any).__uniqueID = uniqueId;
(object as any).id = uniqueId;
```

### 6. Atalhos de Teclado vs Browser

**Problema**: Atalhos como Ctrl+D abrem favoritos no browser.

**Solução**: Prevenir comportamento padrão:
```typescript
if (e.ctrlKey || e.metaKey) {
  switch(e.key.toLowerCase()) {
    case 'd':
      e.preventDefault();
      e.stopPropagation();
      break;
  }
}
```

## Implementações Customizadas

### ListTextbox

Criamos uma extensão do Textbox do Fabric.js que suporta listas formatadas:

```typescript
export interface ListTextboxOptions extends Partial<fabric.TextboxProps> {
  listType?: 'none' | 'bullet' | 'arrow' | 'numbered';
  listIndent?: number;
  listItemSpacing?: number;
}
```

### Sistema de Zoom

O zoom é implementado usando `canvas.setZoom()` para garantir que todos os elementos sejam escalados proporcionalmente:

```typescript
const finalScale = baseScale * zoomScale;
canvas.setZoom(finalScale);
canvas.setDimensions({
  width: baseWidth * finalScale,
  height: baseHeight * finalScale
});
```

## Melhores Práticas

1. **Sempre use IDs únicos** para rastrear objetos no canvas
2. **Previna comportamentos padrão** do browser quando necessário
3. **Use TypeScript rigorosamente** para evitar erros em runtime
4. **Teste em diferentes níveis de zoom** ao implementar novas funcionalidades
5. **Mantenha o estado sincronizado** entre React e Fabric.js

## Sistema de Múltiplas Páginas (Novo!)

### Visão Geral
O Gerador de Certificados agora suporta até 2 páginas independentes, permitindo criar certificados frente e verso ou documentos de múltiplas páginas.

### Componentes Adicionados

#### PageControls (`components/PageControls.tsx`)
Controle visual para gerenciar páginas:
- Adicionar nova página (máximo 2)
- Alternar entre páginas
- Remover páginas (mantendo mínimo 1)
- Indicador visual da página ativa

### Hook Modificado

#### useCanvas (`hooks/useCanvas.ts`)
Agora gerencia múltiplas instâncias de canvas:
```typescript
interface CanvasPage {
  id: string;
  orientation: 'landscape' | 'portrait';
  zoomLevel: number;
  canvasRef: any;
}
```

**Novos recursos:**
- Array de páginas com estados independentes
- Gerenciamento de referências para múltiplos canvas
- Métodos para adicionar/remover páginas
- Estados isolados por página (zoom, orientação)

### Alterações no CanvasEditor

O componente agora aceita:
- `pageId`: Identificador único da página
- `pageIndex`: Índice da página (0 ou 1)
- `isActive`: Se a página está ativa para receber eventos

**Comportamento:**
- Apenas a página ativa processa eventos de teclado
- Canvas inativos ficam ocultos mas mantêm seu estado
- Cada página tem seu próprio conjunto de objetos

### Como Usar

1. **Adicionar Segunda Página**
   - Clique no botão "+" no controle de páginas
   
2. **Alternar Entre Páginas**
   - Clique nos botões numerados (1 ou 2)
   - A página ativa fica destacada
   
3. **Remover Página**
   - Passe o mouse sobre o botão da página
   - Clique no ícone de lixeira (apenas se houver mais de 1 página)

### Arquitetura de Múltiplas Páginas

```
GeradorCertificados
├── PageControls (gerencia páginas)
└── Múltiplos CanvasEditor
    ├── Página 1 (canvas independente)
    └── Página 2 (canvas independente)
```

### Correções de Problemas

#### 1. CORS com Imagens S3
**Problema**: Imagens do S3 bloqueadas por CORS
**Solução**: Alterada ordem de tentativa - primeiro sem CORS, depois com fallback

#### 2. Layout do Canvas
**Problema**: Canvas aparecia pequeno/estreito
**Solução**: Ajustados containers com flex layout apropriado e `min-h-0`

#### 3. Itens Indo para Página Errada
**Problema**: Formas e textos sempre iam para primeira página
**Solução**: Adicionadas dependências corretas nos callbacks do hook

#### 4. Editor de Formas Não Funcionando
**Problema**: Mudanças de cor/opacidade não eram aplicadas
**Solução**: Corrigido acesso ao canvas usando `getCurrentCanvasRef()`

## Futuras Melhorias Sugeridas

1. **Undo/Redo**: Implementar histórico de ações
2. **Templates**: Sistema de templates pré-definidos
3. **Export Individual**: Exportar páginas separadamente ou juntas
4. **Navegação por Teclado**: Atalhos para trocar de página (ex: Ctrl+1, Ctrl+2)
5. **Copiar Entre Páginas**: Permitir copiar objetos de uma página para outra
6. **Preview de Impressão**: Ver como ficará o certificado impresso frente e verso
7. **Mais Páginas**: Expandir para suportar mais de 2 páginas se necessário

## Debugging

Para debug, utilize os console.logs já existentes ou adicione novos:
```typescript
console.log('Object selected:', obj);
console.log('Object ID:', (obj as any).__uniqueID);
```

O Fabric.js também oferece métodos úteis para debug:
- `canvas.getObjects()` - lista todos os objetos
- `canvas.getActiveObject()` - objeto atualmente selecionado
- `canvas.toJSON()` - serializa o canvas completo

## Correções de CORS e Exportação PDF (Dezembro 2024)

### Problema Principal
Canvas ficava "tainted" (contaminado) em produção ao carregar imagens do S3, impedindo exportação para PDF com erro:
```
SecurityError: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': 
The canvas has been tainted by cross-origin data.
```

### Solução Implementada

#### 1. Carregamento de Imagens com CORS
**Arquivo**: `components/CanvasEditor.tsx`

Todas as imagens agora são carregadas com `crossOrigin: 'anonymous'`:
```typescript
fabric.FabricImage.fromURL(imageUrl, {
  crossOrigin: 'anonymous'
}).then((fabricImage) => {
  // adicionar ao canvas
});
```

**Fallback com timestamp**: Se falhar, tenta novamente com timestamp para forçar novo carregamento:
```typescript
const urlWithTimestamp = imageUrl.includes('?') 
  ? `${imageUrl}&t=${Date.now()}`
  : `${imageUrl}?t=${Date.now()}`;
```

#### 2. Simplificação da Exportação PDF
**Arquivo**: `hooks/useCanvas.ts`

Removida a complexa renderização manual. Agora usa sempre o método direto do Fabric.js:
```typescript
const dataURL = canvas.toDataURL({
  format: 'png',
  quality: 1.0,
  multiplier: 4 // Alta qualidade
});
```

#### 3. Função de Debug
Nova função `checkCanvasTainted()` para verificar se o canvas está tainted:
```typescript
const checkCanvasTainted = useCallback(() => {
  try {
    const ctx = canvasElement.getContext('2d');
    ctx.getImageData(0, 0, 1, 1);
    console.log('✅ Canvas NÃO está tainted');
    return false;
  } catch (e) {
    console.error('❌ Canvas está tainted');
    return true;
  }
}, []);
```

### Requisitos de Configuração S3

Para que funcione corretamente, o bucket S3 DEVE ter CORS configurado:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

## Sistema de Loading Visual para Imagens

### Visão Geral
Implementado feedback visual durante o carregamento de imagens, melhorando a experiência do usuário.

### Implementações

#### 1. Loading no Grid de Imagens
**Arquivo**: `components/ImageGrid.tsx`

Quando uma imagem é clicada para ser adicionada ao canvas:
- Estado de loading individual por imagem
- Overlay escuro com spinner animado
- Texto "Aplicando..." para feedback claro
- Opacidade reduzida na imagem base

```typescript
const [loadingImageId, setLoadingImageId] = useState<number | null>(null);

// No clique da imagem
onClick={async () => {
  setLoadingImageId(image.id);
  try {
    await onImageClick(image.imageUrl, image.name);
    setTimeout(() => setLoadingImageId(null), 500);
  } catch (error) {
    setLoadingImageId(null);
  }
}}
```

#### 2. Promise no Hook useCanvas
**Arquivo**: `hooks/useCanvas.ts`

O método `addImageToCanvas` agora retorna uma Promise para controle assíncrono:
```typescript
const addImageToCanvas = useCallback((imageUrl: string, imageName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      canvasRef.addImageToCanvas(imageUrl, imageName);
      setTimeout(() => {
        setIsLoadingCanvas(false);
        resolve();
      }, 300);
    } catch (error) {
      setIsLoadingCanvas(false);
      reject(error);
    }
  });
}, []);
```

### Comportamento Visual

1. **Início do Carregamento**:
   - Imagem no grid fica com opacidade 50%
   - Aparece overlay escuro
   - Spinner animado com texto "Aplicando..."

2. **Durante o Carregamento**:
   - Imagem é processada e adicionada ao canvas
   - Loading permanece visível

3. **Fim do Carregamento**:
   - Loading é removido
   - Imagem volta à opacidade normal
   - Imagem aparece selecionada no canvas

4. **Em Caso de Erro**:
   - Loading é removido imediatamente
   - Mensagem de erro é exibida
   - Imagem volta ao estado normal

## Melhorias de Performance

### 1. Multiplier Aumentado
Qualidade de exportação PDF aumentada de 2x para 4x:
```typescript
multiplier: 4 // Maior qualidade na exportação
```

### 2. Tratamento de Erros Específicos
Mensagens de erro mais claras para problemas de CORS:
```typescript
if (error instanceof DOMException && error.name === 'SecurityError') {
  toast.error('Erro de CORS na página. Verifique configuração do servidor');
}
```

## Referências

- [Fabric.js Documentation](http://fabricjs.com/docs/)
- [Fabric.js v6 Migration Guide](http://fabricjs.com/v6-breaking-changes)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [CORS on AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)