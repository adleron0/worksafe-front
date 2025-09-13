# 📚 Guia Completo - Geração de Certificados no Backend

## 🎯 Visão Geral

Este guia documenta como implementar a geração de imagens de certificados no backend Node.js, utilizando os mesmos dados do Fabric.js usados no frontend.

## 📋 Índice

1. [Conceitos Fundamentais](#conceitos-fundamentais)
2. [Estrutura de Dados](#estrutura-de-dados)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Implementação Passo a Passo](#implementação-passo-a-passo)
5. [API Endpoints](#api-endpoints)
6. [Casos Especiais](#casos-especiais)
7. [Otimizações](#otimizações)
8. [Troubleshooting](#troubleshooting)

---

## 🔑 Conceitos Fundamentais

### O que é o Fabric.js?
Fabric.js é uma biblioteca JavaScript que trabalha com Canvas HTML5. No backend, precisamos simular esse ambiente usando `node-canvas`.

### Fluxo de Processamento
```
1. Receber JSON do Fabric.js (template do certificado)
2. Receber variáveis para substituição
3. Processar substituições de texto e imagens
4. Renderizar em um canvas
5. Exportar como imagem (PNG/JPEG)
```

---

## 📊 Estrutura de Dados

### 1. CertificateData (Dados do Template)
```typescript
interface CertificateData {
  id: number;
  name: string;
  fabricJsonFront: string | object;  // JSON do Fabric.js da frente
  fabricJsonBack?: string | object;  // JSON do Fabric.js do verso (opcional)
  canvasWidth?: number;  // Largura do canvas (padrão: 842 para A4 landscape)
  canvasHeight?: number; // Altura do canvas (padrão: 595 para A4 landscape)
  certificateId?: string; // ID único para QR Code de validação
}
```

### 2. VariableToReplace (Dados Dinâmicos)
```typescript
interface VariableToReplace {
  [key: string]: {
    type: 'string' | 'url';
    value: string;
  };
}

// Exemplo:
const variables = {
  "nome_do_aluno": {
    "type": "string",
    "value": "João Silva Santos"
  },
  "nome_do_curso": {
    "type": "string",
    "value": "Segurança do Trabalho - NR 35"
  },
  "data_conclusao": {
    "type": "string",
    "value": "20/12/2024"
  },
  "instrutor_assinatura_url": {
    "type": "url",
    "value": "https://exemplo.com/assinatura.png"
  },
  "carga_horaria": {
    "type": "string",
    "value": "40 horas"
  }
};
```

### 3. Estrutura do JSON Fabric.js
```javascript
{
  "version": "6.0.0",
  "objects": [
    {
      "type": "Text",        // ou "Textbox", "Image", "Rect", etc.
      "text": "Certificado de {{nome_do_aluno}}",  // Variáveis com {{}}
      "left": 100,
      "top": 200,
      "fontSize": 24,
      "fontFamily": "Bebas Neue",
      // ... outras propriedades
    },
    {
      "type": "Group",
      "isPlaceholder": true,  // Indica placeholder de imagem
      "placeholderName": "instrutor_assinatura_url",
      // ... posição e tamanho
    }
  ],
  "background": "#ffffff"
}
```

---

## 🛠 Instalação e Configuração

### 1. Dependências Necessárias

```bash
# Dependências principais
npm install canvas fabric qrcode sharp

# Dependências opcionais (para melhor suporte)
npm install @canvas/image
```

### 2. Configuração do Sistema

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

#### macOS:
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

#### Docker:
```dockerfile
FROM node:18

# Instalar dependências do canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
```

### 3. Configuração de Fontes

```javascript
// fonts.config.js
const { registerFont } = require('canvas');
const path = require('path');

// Registrar fontes customizadas
function registerCustomFonts() {
  // Fontes Google Fonts baixadas localmente
  registerFont(path.join(__dirname, 'fonts/BebasNeue-Regular.ttf'), {
    family: 'Bebas Neue'
  });

  registerFont(path.join(__dirname, 'fonts/Roboto-Regular.ttf'), {
    family: 'Roboto',
    weight: '400'
  });

  registerFont(path.join(__dirname, 'fonts/Roboto-Bold.ttf'), {
    family: 'Roboto',
    weight: '700'
  });
}

module.exports = { registerCustomFonts };
```

---

## 💻 Implementação Passo a Passo

### 1. Serviço Principal - CertificateImageService

```javascript
// services/certificateImageService.js
const { createCanvas, loadImage, registerFont } = require('canvas');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { registerCustomFonts } = require('./fonts.config');

class CertificateImageService {
  constructor() {
    this.fontsLoaded = false;
    this.initializeFonts();
  }

  /**
   * Inicializa as fontes customizadas
   */
  initializeFonts() {
    if (!this.fontsLoaded) {
      registerCustomFonts();
      this.fontsLoaded = true;
    }
  }

  /**
   * Substitui variáveis {{nome}} no JSON do Fabric.js
   */
  replaceVariables(fabricJson, variables) {
    // Garantir que temos um objeto
    let json = typeof fabricJson === 'string'
      ? JSON.parse(fabricJson)
      : JSON.parse(JSON.stringify(fabricJson)); // Deep clone

    if (!json.objects || !Array.isArray(json.objects)) {
      return json;
    }

    json.objects = json.objects.map(obj => this.processObject(obj, variables));
    return json;
  }

  /**
   * Processa um objeto individual do canvas
   */
  processObject(obj, variables) {
    const processedObj = { ...obj };

    // 1. PROCESSAR TEXTOS - Substituir {{variáveis}}
    if (['text', 'i-text', 'textbox', 'Text', 'IText', 'Textbox'].includes(obj.type)) {
      if (obj.text && typeof obj.text === 'string') {
        processedObj.text = obj.text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const trimmedKey = key.trim();
          const variable = variables[trimmedKey];

          if (variable && variable.value) {
            return String(variable.value);
          }
          return match; // Manter placeholder se não encontrar variável
        });
      }
    }

    // 2. PROCESSAR PLACEHOLDERS DE IMAGEM
    if (obj.isPlaceholder && obj.placeholderName) {
      const variable = variables[obj.placeholderName];

      if (variable && variable.type === 'url' && variable.value) {
        // Converter placeholder em imagem
        return {
          type: 'Image',
          version: obj.version || '6.0.0',
          originX: 'center',
          originY: 'center',
          left: obj.left + (obj.width * obj.scaleX) / 2,
          top: obj.top + (obj.height * obj.scaleY) / 2,
          src: variable.value,
          // Preservar dimensões do placeholder
          targetWidth: obj.width * obj.scaleX,
          targetHeight: obj.height * obj.scaleY,
          placeholderNameDebug: obj.placeholderName,
          // Outras propriedades
          angle: obj.angle || 0,
          opacity: obj.opacity || 1,
          visible: true,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false
        };
      }
    }

    // 3. PROCESSAR PLACEHOLDERS DE QR CODE
    if (obj.isQRCodePlaceholder ||
        (obj.placeholderName && obj.placeholderName.toLowerCase().includes('qrcode'))) {
      return {
        ...processedObj,
        isQRCodePlaceholder: true,
        qrCodeName: obj.placeholderName || 'certificado_qrcode',
        preservedPosition: {
          left: obj.left,
          top: obj.top,
          width: obj.width,
          height: obj.height,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1
        }
      };
    }

    // 4. PROCESSAR GRUPOS (recursivamente)
    if (obj.objects && Array.isArray(obj.objects)) {
      processedObj.objects = obj.objects.map(childObj =>
        this.processObject(childObj, variables)
      );
    }

    return processedObj;
  }

  /**
   * Carrega e processa imagens externas
   */
  async loadExternalImages(objects) {
    const imagePromises = [];

    for (const obj of objects) {
      if (obj.type === 'Image' && obj.src) {
        imagePromises.push(this.loadImageObject(obj));
      }
      // Processar grupos recursivamente
      if (obj.objects && Array.isArray(obj.objects)) {
        await this.loadExternalImages(obj.objects);
      }
    }

    await Promise.all(imagePromises);
  }

  /**
   * Carrega uma imagem individual
   */
  async loadImageObject(obj) {
    try {
      const image = await loadImage(obj.src);
      obj._element = image;

      // Ajustar escala se tiver dimensões alvo
      if (obj.targetWidth && obj.targetHeight) {
        const scaleX = obj.targetWidth / image.width;
        const scaleY = obj.targetHeight / image.height;
        const scale = Math.min(scaleX, scaleY);

        obj.scaleX = scale;
        obj.scaleY = scale;
        obj.width = image.width;
        obj.height = image.height;
      }
    } catch (error) {
      console.error(`Erro ao carregar imagem: ${obj.src}`, error);
      // Criar imagem placeholder em caso de erro
      obj._element = null;
    }
  }

  /**
   * Gera QR Code para validação
   */
  async generateQRCode(certificateId, baseUrl) {
    const validationUrl = `${baseUrl}/certificados/${certificateId}`;

    const qrDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrDataUrl;
  }

  /**
   * Renderiza objetos no canvas
   */
  async renderObjects(ctx, objects, scale = 1) {
    for (const obj of objects) {
      ctx.save();

      // Aplicar transformações
      ctx.translate(obj.left || 0, obj.top || 0);
      ctx.rotate((obj.angle || 0) * Math.PI / 180);
      ctx.scale(obj.scaleX || 1, obj.scaleY || 1);
      ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1;

      // Renderizar por tipo
      switch (obj.type) {
        case 'Text':
        case 'text':
        case 'Textbox':
        case 'textbox':
        case 'IText':
        case 'i-text':
          await this.renderText(ctx, obj);
          break;

        case 'Image':
        case 'image':
          await this.renderImage(ctx, obj);
          break;

        case 'Rect':
        case 'rect':
          this.renderRect(ctx, obj);
          break;

        case 'Group':
        case 'group':
          if (obj.objects) {
            await this.renderObjects(ctx, obj.objects, scale);
          }
          break;
      }

      ctx.restore();
    }
  }

  /**
   * Renderiza texto
   */
  renderText(ctx, obj) {
    // Configurar fonte
    const fontSize = obj.fontSize || 20;
    const fontFamily = obj.fontFamily || 'Arial';
    const fontWeight = obj.fontWeight || 'normal';
    const fontStyle = obj.fontStyle || 'normal';

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = obj.fill || '#000000';
    ctx.textAlign = obj.textAlign || 'left';
    ctx.textBaseline = obj.textBaseline || 'top';

    // Renderizar texto (considerar quebras de linha)
    const lines = obj.text ? obj.text.split('\n') : [];
    const lineHeight = obj.lineHeight || fontSize * 1.16;

    lines.forEach((line, index) => {
      const y = index * lineHeight;

      // Aplicar sombra se existir
      if (obj.shadow) {
        ctx.shadowColor = obj.shadow.color || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = obj.shadow.blur || 5;
        ctx.shadowOffsetX = obj.shadow.offsetX || 2;
        ctx.shadowOffsetY = obj.shadow.offsetY || 2;
      }

      // Para Textbox com largura definida, implementar word wrap
      if ((obj.type === 'Textbox' || obj.type === 'textbox') && obj.width) {
        this.wrapText(ctx, line, 0, y, obj.width, lineHeight);
      } else {
        ctx.fillText(line, 0, y);
      }

      // Limpar sombra
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
  }

  /**
   * Implementa word wrap para Textbox
   */
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  /**
   * Renderiza imagem
   */
  async renderImage(ctx, obj) {
    if (obj._element) {
      const img = obj._element;

      // Ajustar origem para center/center se especificado
      let drawX = 0;
      let drawY = 0;

      if (obj.originX === 'center') {
        drawX = -(img.width / 2);
      }
      if (obj.originY === 'center') {
        drawY = -(img.height / 2);
      }

      ctx.drawImage(img, drawX, drawY, img.width, img.height);
    }
  }

  /**
   * Renderiza retângulo
   */
  renderRect(ctx, obj) {
    const width = obj.width || 100;
    const height = obj.height || 100;

    // Preencher
    if (obj.fill) {
      ctx.fillStyle = obj.fill;
      ctx.fillRect(0, 0, width, height);
    }

    // Contorno
    if (obj.stroke) {
      ctx.strokeStyle = obj.stroke;
      ctx.lineWidth = obj.strokeWidth || 1;
      ctx.strokeRect(0, 0, width, height);
    }
  }

  /**
   * FUNÇÃO PRINCIPAL - Gera imagem do certificado
   */
  async generateCertificateImage(certificateData, variables, options = {}) {
    try {
      const {
        format = 'png',      // 'png' ou 'jpeg'
        quality = 95,        // Qualidade para JPEG (0-100)
        dpi = 150,          // DPI da imagem
        baseUrl = 'https://exemplo.com' // URL base para QR Code
      } = options;

      // 1. Determinar dimensões
      const baseWidth = certificateData.canvasWidth || 842;
      const baseHeight = certificateData.canvasHeight || 595;
      const scale = dpi / 96; // 96 é o DPI padrão

      const width = Math.round(baseWidth * scale);
      const height = Math.round(baseHeight * scale);

      // 2. Criar canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // 3. Configurar fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 4. Aplicar escala
      ctx.scale(scale, scale);

      // 5. Processar JSON do Fabric.js
      let fabricJson;
      if (typeof certificateData.fabricJsonFront === 'string') {
        fabricJson = JSON.parse(certificateData.fabricJsonFront);
      } else {
        fabricJson = certificateData.fabricJsonFront;
      }

      // 6. Substituir variáveis
      const processedJson = this.replaceVariables(fabricJson, variables);

      // 7. Carregar imagens externas
      if (processedJson.objects) {
        await this.loadExternalImages(processedJson.objects);

        // 8. Processar QR Codes
        for (let i = 0; i < processedJson.objects.length; i++) {
          const obj = processedJson.objects[i];

          if (obj.isQRCodePlaceholder) {
            const qrDataUrl = await this.generateQRCode(
              certificateData.certificateId || 'CERT-001',
              baseUrl
            );

            const qrImage = await loadImage(qrDataUrl);
            const position = obj.preservedPosition || obj;

            // Substituir placeholder por imagem do QR Code
            processedJson.objects[i] = {
              type: 'Image',
              _element: qrImage,
              left: position.left,
              top: position.top,
              width: qrImage.width,
              height: qrImage.height,
              scaleX: (position.width * position.scaleX) / qrImage.width,
              scaleY: (position.height * position.scaleY) / qrImage.height
            };
          }
        }
      }

      // 9. Renderizar objetos
      await this.renderObjects(ctx, processedJson.objects || [], 1);

      // 10. Exportar imagem
      let buffer;
      if (format === 'jpeg') {
        buffer = canvas.toBuffer('image/jpeg', { quality: quality / 100 });
      } else {
        buffer = canvas.toBuffer('image/png');
      }

      // 11. Otimizar com Sharp (opcional)
      if (options.optimize) {
        const optimized = await sharp(buffer)
          .resize(baseWidth, baseHeight, {
            kernel: sharp.kernel.lanczos3,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          [format]({ quality, progressive: true })
          .toBuffer();

        return optimized;
      }

      return buffer;

    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      throw error;
    }
  }

  /**
   * Gera múltiplos certificados em lote
   */
  async generateBatch(certificateData, variablesList, options = {}) {
    const results = [];

    for (const variables of variablesList) {
      try {
        const image = await this.generateCertificateImage(
          certificateData,
          variables,
          options
        );

        results.push({
          success: true,
          data: image,
          studentName: variables.nome_do_aluno?.value
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          studentName: variables.nome_do_aluno?.value
        });
      }
    }

    return results;
  }
}

module.exports = new CertificateImageService();
```

---

## 🌐 API Endpoints

### 1. Endpoint para Gerar Imagem Individual

```javascript
// routes/certificates.js
const express = require('express');
const router = express.Router();
const certificateService = require('../services/certificateImageService');

/**
 * POST /api/certificates/generate-image
 * Gera imagem de certificado
 */
router.post('/generate-image', async (req, res) => {
  try {
    const {
      certificateData,
      variables,
      options = {}
    } = req.body;

    // Validações
    if (!certificateData || !certificateData.fabricJsonFront) {
      return res.status(400).json({
        error: 'Dados do certificado são obrigatórios'
      });
    }

    if (!variables || Object.keys(variables).length === 0) {
      return res.status(400).json({
        error: 'Variáveis são obrigatórias'
      });
    }

    // Gerar imagem
    const imageBuffer = await certificateService.generateCertificateImage(
      certificateData,
      variables,
      {
        format: options.format || 'png',
        quality: options.quality || 95,
        dpi: options.dpi || 150,
        baseUrl: process.env.BASE_URL || req.protocol + '://' + req.get('host'),
        optimize: options.optimize !== false
      }
    );

    // Configurar headers
    const contentType = options.format === 'jpeg'
      ? 'image/jpeg'
      : 'image/png';

    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });

    // Enviar imagem
    res.send(imageBuffer);

  } catch (error) {
    console.error('Erro ao gerar certificado:', error);
    res.status(500).json({
      error: 'Erro ao gerar certificado',
      message: error.message
    });
  }
});

/**
 * POST /api/certificates/generate-batch
 * Gera múltiplos certificados
 */
router.post('/generate-batch', async (req, res) => {
  try {
    const {
      certificateData,
      studentsList, // Array de variables
      options = {}
    } = req.body;

    if (!Array.isArray(studentsList)) {
      return res.status(400).json({
        error: 'Lista de estudantes deve ser um array'
      });
    }

    const results = await certificateService.generateBatch(
      certificateData,
      studentsList,
      {
        format: options.format || 'png',
        quality: options.quality || 95,
        dpi: options.dpi || 150,
        baseUrl: process.env.BASE_URL || req.protocol + '://' + req.get('host')
      }
    );

    // Retornar resultados
    res.json({
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results.map(r => ({
        studentName: r.studentName,
        success: r.success,
        error: r.error,
        size: r.data ? r.data.length : 0
      }))
    });

  } catch (error) {
    console.error('Erro ao gerar lote:', error);
    res.status(500).json({
      error: 'Erro ao gerar lote de certificados',
      message: error.message
    });
  }
});

/**
 * POST /api/certificates/preview
 * Gera preview em baixa resolução
 */
router.post('/preview', async (req, res) => {
  try {
    const { certificateData, variables } = req.body;

    const imageBuffer = await certificateService.generateCertificateImage(
      certificateData,
      variables,
      {
        format: 'jpeg',
        quality: 70,
        dpi: 72, // Baixa resolução para preview
        optimize: true
      }
    );

    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 2. Middleware de Validação

```javascript
// middleware/certificateValidation.js
const validateCertificateRequest = (req, res, next) => {
  const { certificateData, variables } = req.body;

  // Validar estrutura do certificateData
  if (!certificateData) {
    return res.status(400).json({
      error: 'certificateData é obrigatório'
    });
  }

  // Validar JSON do Fabric
  try {
    const json = typeof certificateData.fabricJsonFront === 'string'
      ? JSON.parse(certificateData.fabricJsonFront)
      : certificateData.fabricJsonFront;

    if (!json.objects || !Array.isArray(json.objects)) {
      throw new Error('JSON inválido: objects deve ser um array');
    }
  } catch (error) {
    return res.status(400).json({
      error: 'JSON do Fabric.js inválido',
      details: error.message
    });
  }

  // Validar variáveis
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      if (!value.type || !['string', 'url'].includes(value.type)) {
        return res.status(400).json({
          error: `Variável ${key} tem tipo inválido`
        });
      }
      if (value.value === undefined || value.value === null) {
        return res.status(400).json({
          error: `Variável ${key} não tem valor`
        });
      }
    }
  }

  next();
};

module.exports = { validateCertificateRequest };
```

---

## 🎯 Casos Especiais

### 1. Tratamento de Imagens Base64

```javascript
async loadImageObject(obj) {
  try {
    let imageSrc = obj.src;

    // Se for base64, processar diretamente
    if (imageSrc.startsWith('data:')) {
      const image = await loadImage(imageSrc);
      obj._element = image;
      return;
    }

    // Se for URL externa com CORS
    if (imageSrc.startsWith('http')) {
      // Opção 1: Baixar a imagem
      const response = await fetch(imageSrc);
      const buffer = await response.buffer();
      const image = await loadImage(buffer);
      obj._element = image;

      // Opção 2: Usar proxy (se configurado)
      // imageSrc = `${PROXY_URL}?url=${encodeURIComponent(imageSrc)}`;
    }

    // Carregar normalmente
    const image = await loadImage(imageSrc);
    obj._element = image;

  } catch (error) {
    console.error(`Erro ao carregar imagem: ${obj.src}`, error);
    // Criar placeholder em caso de erro
    this.createPlaceholderImage(obj);
  }
}
```

### 2. Suporte a Gradientes

```javascript
renderGradient(ctx, obj) {
  const gradient = obj.fill.gradient;
  let canvasGradient;

  if (gradient.type === 'linear') {
    canvasGradient = ctx.createLinearGradient(
      gradient.x1, gradient.y1,
      gradient.x2, gradient.y2
    );
  } else if (gradient.type === 'radial') {
    canvasGradient = ctx.createRadialGradient(
      gradient.x1, gradient.y1, gradient.r1,
      gradient.x2, gradient.y2, gradient.r2
    );
  }

  gradient.colorStops.forEach(stop => {
    canvasGradient.addColorStop(stop.offset, stop.color);
  });

  ctx.fillStyle = canvasGradient;
}
```

### 3. Cache de Templates

```javascript
class TemplateCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Máximo de templates em cache
  }

  get(certificateId) {
    const cached = this.cache.get(certificateId);
    if (cached) {
      // Atualizar LRU
      this.cache.delete(certificateId);
      this.cache.set(certificateId, cached);
      return cached;
    }
    return null;
  }

  set(certificateId, processedJson) {
    // Limitar tamanho do cache
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(certificateId, processedJson);
  }
}
```

---

## ⚡ Otimizações

### 1. Processamento em Paralelo

```javascript
// Para múltiplos certificados
async generateBatchOptimized(certificateData, variablesList, options = {}) {
  const BATCH_SIZE = 10; // Processar 10 por vez
  const results = [];

  for (let i = 0; i < variablesList.length; i += BATCH_SIZE) {
    const batch = variablesList.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(variables =>
      this.generateCertificateImage(certificateData, variables, options)
        .then(data => ({ success: true, data }))
        .catch(error => ({ success: false, error: error.message }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
```

### 2. Compressão Inteligente

```javascript
async optimizeImage(buffer, format, quality) {
  const sharpInstance = sharp(buffer);

  if (format === 'jpeg') {
    return sharpInstance
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true // Usar mozjpeg para melhor compressão
      })
      .toBuffer();
  } else if (format === 'png') {
    return sharpInstance
      .png({
        quality,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toBuffer();
  } else if (format === 'webp') {
    return sharpInstance
      .webp({
        quality,
        lossless: quality > 95
      })
      .toBuffer();
  }

  return buffer;
}
```

### 3. Pool de Workers

```javascript
// worker.js
const { parentPort } = require('worker_threads');
const certificateService = require('./certificateImageService');

parentPort.on('message', async ({ certificateData, variables, options }) => {
  try {
    const result = await certificateService.generateCertificateImage(
      certificateData,
      variables,
      options
    );
    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});

// main.js
const { Worker } = require('worker_threads');
const os = require('os');

class WorkerPool {
  constructor() {
    this.workers = [];
    this.queue = [];
    this.maxWorkers = os.cpus().length;
    this.initWorkers();
  }

  initWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker('./worker.js');
      this.workers.push({ worker, busy: false });
    }
  }

  async process(data) {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !w.busy);

      if (availableWorker) {
        this.runWorker(availableWorker, data, resolve, reject);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }

  runWorker(workerObj, data, resolve, reject) {
    workerObj.busy = true;

    workerObj.worker.once('message', (result) => {
      workerObj.busy = false;

      if (result.success) {
        resolve(result.data);
      } else {
        reject(new Error(result.error));
      }

      // Processar próximo da fila
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.runWorker(workerObj, next.data, next.resolve, next.reject);
      }
    });

    workerObj.worker.postMessage(data);
  }
}
```

---

## 🔧 Troubleshooting

### Problema 1: Fontes não aparecem corretamente

**Solução:**
```javascript
// Verificar se as fontes estão registradas
const { listFonts } = require('canvas');
console.log('Fontes disponíveis:', listFonts());

// Forçar carregamento de fonte
ctx.font = '20px "Bebas Neue"';
ctx.fillText('', 0, 0); // Forçar carregamento
```

### Problema 2: Imagens não carregam

**Solução:**
```javascript
// Adicionar timeout e retry
async loadImageWithRetry(src, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const image = await loadImage(src);
      return image;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Problema 3: Memória vazando em produção

**Solução:**
```javascript
// Limpar recursos após uso
class CertificateService {
  async generateCertificateImage(data, variables, options) {
    let canvas = null;
    try {
      canvas = createCanvas(width, height);
      // ... processar
      const buffer = canvas.toBuffer();
      return buffer;
    } finally {
      // Limpar canvas
      if (canvas) {
        canvas = null;
      }
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc();
      }
    }
  }
}
```

### Problema 4: Performance lenta

**Solução:**
```javascript
// 1. Usar cache Redis para templates processados
const redis = require('redis');
const client = redis.createClient();

async function getCachedTemplate(certificateId) {
  const cached = await client.get(`template:${certificateId}`);
  return cached ? JSON.parse(cached) : null;
}

// 2. Pré-processar templates comuns
async function preprocessTemplates() {
  const commonTemplates = await db.getCommonTemplates();
  for (const template of commonTemplates) {
    const processed = processTemplate(template);
    await client.set(`template:${template.id}`, JSON.stringify(processed));
  }
}
```

---

## 📦 Exemplo de Uso Completo

```javascript
// exemplo.js
const certificateService = require('./services/certificateImageService');

async function exemplo() {
  // Dados do template (vindo do banco de dados)
  const certificateData = {
    id: 1,
    name: "Certificado NR-35",
    canvasWidth: 842,
    canvasHeight: 595,
    certificateId: "CERT-2024-001",
    fabricJsonFront: {
      "version": "6.0.0",
      "objects": [
        {
          "type": "Text",
          "text": "CERTIFICADO",
          "left": 421,
          "top": 50,
          "fontSize": 48,
          "fontFamily": "Bebas Neue",
          "textAlign": "center",
          "fill": "#333333"
        },
        {
          "type": "Textbox",
          "text": "Certificamos que {{nome_do_aluno}} concluiu com êxito o curso de {{nome_do_curso}}",
          "left": 100,
          "top": 200,
          "width": 642,
          "fontSize": 20,
          "fontFamily": "Roboto",
          "textAlign": "center"
        },
        {
          "type": "Group",
          "isPlaceholder": true,
          "placeholderName": "instrutor_assinatura_url",
          "left": 300,
          "top": 400,
          "width": 200,
          "height": 80,
          "scaleX": 1,
          "scaleY": 1
        }
      ]
    }
  };

  // Variáveis do aluno
  const variables = {
    "nome_do_aluno": {
      "type": "string",
      "value": "João Silva Santos"
    },
    "nome_do_curso": {
      "type": "string",
      "value": "Segurança em Altura - NR 35"
    },
    "instrutor_assinatura_url": {
      "type": "url",
      "value": "https://exemplo.com/assinatura.png"
    }
  };

  // Gerar certificado
  const imageBuffer = await certificateService.generateCertificateImage(
    certificateData,
    variables,
    {
      format: 'png',
      quality: 95,
      dpi: 150,
      baseUrl: 'https://meusite.com',
      optimize: true
    }
  );

  // Salvar em arquivo
  const fs = require('fs');
  fs.writeFileSync('certificado.png', imageBuffer);

  console.log('Certificado gerado com sucesso!');
}

exemplo().catch(console.error);
```

---

## 🚀 Deploy

### Docker

```dockerfile
FROM node:18-alpine

# Instalar dependências do sistema para canvas
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    gif-dev \
    librsvg-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copiar arquivos
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Criar diretório para fontes
RUN mkdir -p /app/fonts

EXPOSE 3000

CMD ["node", "server.js"]
```

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'certificate-generator',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

---

## 📝 Notas Finais

1. **Segurança**: Sempre valide e sanitize as variáveis recebidas
2. **Performance**: Use cache para templates processados
3. **Escalabilidade**: Considere usar workers ou microserviços
4. **Monitoramento**: Implemente logs e métricas
5. **Testes**: Crie testes unitários e de integração

Este guia fornece uma base sólida para implementar a geração de certificados no backend. Adapte conforme suas necessidades específicas!