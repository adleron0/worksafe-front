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

## Futuras Melhorias Sugeridas

1. **Undo/Redo**: Implementar histórico de ações
2. **Templates**: Sistema de templates pré-definidos
3. **Export**: Adicionar opções de export (PDF, PNG em alta resolução)
4. **Guias de Alinhamento**: Snap to grid e smart guides
5. **Camadas Bloqueadas**: Melhorar o sistema de bloqueio de objetos
6. **Performance**: Otimizar renderização para muitos objetos

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

## Referências

- [Fabric.js Documentation](http://fabricjs.com/docs/)
- [Fabric.js v6 Migration Guide](http://fabricjs.com/v6-breaking-changes)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)