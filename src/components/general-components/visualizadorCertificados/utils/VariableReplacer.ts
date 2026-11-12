import { StudentData, VariableToReplace } from '../types';
import { isTextObjectType, isTextboxType } from './fabricSetup';

export class VariableReplacer {
  /**
   * Substitui variáveis no formato {{chave}} por valores reais nos dados do canvas
   * Versão nova que trabalha com VariableToReplace
   */
  static replaceInCanvasJSON(jsonData: any, variables: VariableToReplace): any {
    if (!jsonData) {
      return jsonData;
    }
    
    // Se não há variáveis ou está vazio, retornar JSON original
    if (!variables || Object.keys(variables).length === 0) {
      // Ainda assim, garantir que é um objeto
      if (typeof jsonData === 'string') {
        try {
          return JSON.parse(jsonData);
        } catch (e) {
          return jsonData;
        }
      }
      return jsonData;
    }

    // Clone profundo do JSON para não modificar o original
    let processed;
    if (typeof jsonData === 'string') {
      try {
        processed = JSON.parse(jsonData);
      } catch (e) {
        return jsonData;
      }
    } else {
      processed = JSON.parse(JSON.stringify(jsonData));
    }
    
    
    if (processed.objects && Array.isArray(processed.objects)) {
      processed.objects = processed.objects.map((obj: any) => {
        return this.processObject(obj, variables);
      });
    }
    
    return processed;
  }

  /**
   * Versão de compatibilidade com StudentData (deprecated)
   */
  static replaceInCanvasJSONLegacy(jsonData: any, variables: StudentData): any {
    if (!jsonData || !variables) {
      return jsonData;
    }

    // Converter StudentData para VariableToReplace
    const convertedVariables: VariableToReplace = {};
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Determinar tipo baseado na chave ou conteúdo
        const isUrl = key.includes('url') || key.includes('assinatura') || 
                     (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:')));
        
        convertedVariables[key] = {
          type: isUrl ? 'url' : 'string',
          value: String(value)
        };
      }
    });

    return this.replaceInCanvasJSON(jsonData, convertedVariables);
  }

  /**
   * Processa um objeto individual do canvas
   */
  private static processObject(obj: any, variables: VariableToReplace): any {
    const processedObj = { ...obj };



    // Substituir em textos (incluindo todos os tipos de texto do Fabric.js)
    if (isTextObjectType(obj.type)) {
      if (obj.text && typeof obj.text === 'string') {
        // Apenas substituir o texto, mantendo todas as outras propriedades originais
        processedObj.text = this.replaceVariables(obj.text, variables);
        
        // IMPORTANTE: Para Textbox com largura fixa, precisamos garantir que as propriedades
        // de quebra de linha sejam preservadas corretamente
        if (isTextboxType(obj.type)) {
          // Preservar a largura original se existir
          if (obj.width !== undefined) {
            processedObj.width = obj.width;
          }
          
          // Preservar splitByGrapheme se existir (importante para fontes especiais)
          if (obj.splitByGrapheme !== undefined) {
            processedObj.splitByGrapheme = obj.splitByGrapheme;
          }
          
          // Marcar que o textbox precisa recalcular suas dimensões após carregar
          processedObj.dirty = true;
        }
        
        // IMPORTANTE: Manter o originY original do objeto
        // O usuário define isso no editor, então devemos respeitar
        // Não fazer nenhuma modificação automática no alinhamento vertical
      }
    }

    // Converter placeholders de imagem em imagens reais
    // O placeholder é um Group com propriedades especiais
    // Verificar também pelo name='placeholder' caso as propriedades customizadas tenham sido perdidas
    if ((obj.isPlaceholder && obj.placeholderName) || 
        (obj.type === 'Group' && obj.name === 'placeholder') ||
        (obj.type === 'group' && obj.name === 'placeholder')) {
      
      // Tentar extrair o nome do placeholder de várias formas
      let placeholderName = obj.placeholderName;
      
      // Se não tem placeholderName, tentar extrair do ID ou dos objetos filhos
      if (!placeholderName && obj.id) {
        // Formato esperado: "placeholder_NOME_timestamp_random"
        const idParts = obj.id.split('_');
        if (idParts[0] === 'placeholder' && idParts.length >= 2) {
          placeholderName = idParts[1]; // Pegar o nome após "placeholder_"
        }
      }
      
      // Se ainda não tem, tentar extrair do texto dentro do grupo
      if (!placeholderName && obj.objects && Array.isArray(obj.objects)) {
        const textObj = obj.objects.find((o: any) => (o.type === 'text' || o.type === 'i-text' || o.type === 'Text' || o.type === 'IText') && o.text);
        if (textObj && textObj.text) {
          // O texto pode conter algo como "📷 assinatura_instrutor"
          const match = textObj.text.match(/📷\s*(.+)/);
          if (match) {
            placeholderName = match[1].trim();
          } else {
            // Ou pode ser apenas o nome direto
            placeholderName = textObj.text.replace('📷', '').trim();
          }
        }
      }
      
      // Se ainda não conseguiu, tentar do __uniqueID
      if (!placeholderName && obj.__uniqueID) {
        const idParts = obj.__uniqueID.split('_');
        if (idParts[0] === 'placeholder' && idParts.length >= 2) {
          placeholderName = idParts[1];
        }
      }
      
      // Verificar se é um placeholder de QR Code
      // Normalizar o nome removendo espaços e convertendo para lowercase
      const normalizedName = placeholderName?.toLowerCase().replace(/\s+/g, '');
      const isQRCode = obj.placeholderType === 'qrcode' || 
                       normalizedName?.includes('qrcode') ||
                       placeholderName?.toLowerCase().includes('qr code');
      
      if (isQRCode) {
        // QR Code será tratado de forma especial - não precisa de variável URL
        // Retornar um marcador especial para ser processado depois
        return {
          ...obj,
          isQRCodePlaceholder: true,
          qrCodeName: placeholderName || 'certificado_qrcode',
          // Manter as dimensões e posição originais
          preservedPosition: {
            left: obj.left,
            top: obj.top,
            width: obj.width,
            height: obj.height,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY
          }
        };
      }
      
      const variable = variables[placeholderName];
      if (variable && variable.type === 'url' && variable.value) {
        
        // Converter grupo placeholder em imagem real
        // Preservar posição e tamanho do grupo original
        
        // Calcular o tamanho final desejado do placeholder
        const placeholderWidth = (obj.width || 200) * (obj.scaleX || 1);
        const placeholderHeight = (obj.height || 100) * (obj.scaleY || 1);
        
        // Usar a URL diretamente - o proxy será aplicado depois no processImagesInJSON
        const imageUrl = variable.value;
        
        // IMPORTANTE: Não podemos calcular a escala correta sem saber o tamanho real da imagem
        // O Fabric.js precisa carregar a imagem primeiro para sabermos suas dimensões
        // Por enquanto, vamos usar uma escala inicial conservadora
        // O ideal seria que o Fabric.js carregasse a imagem e ajustasse depois
        
        // IMPORTANTE: Assinaturas digitais geralmente são imagens grandes
        // Vamos assumir um tamanho típico de uma assinatura digitalizada
        // Muitas vezes são escaneadas em alta resolução
        
        // Assumir que a imagem original tem cerca de 800x400px
        // (tamanho comum para assinaturas escaneadas)
        const estimatedImageWidth = 800;  
        const estimatedImageHeight = 400;
        
        // Calcular escala para fazer a imagem caber no placeholder
        const scaleByHeight = placeholderHeight / estimatedImageHeight;
        const scaleByWidth = placeholderWidth / estimatedImageWidth;
        
        // Usar a menor escala para garantir que caiba completamente
        // Multiplicar por 0.9 para dar uma pequena margem
        const initialScale = Math.min(scaleByHeight, scaleByWidth) * 0.9;
        
        // Calcular o centro do placeholder para posicionar a imagem
        const placeholderCenterX = obj.left + (placeholderWidth / 2);
        const placeholderCenterY = obj.top + (placeholderHeight / 2);
        
        
        // Criar objeto de imagem compatível com Fabric.js 6.x
        // IMPORTANTE: usar 'Image' com I maiúsculo como visto nos logs
        const imageObj = {
          type: 'Image', // Maiúsculo como no Fabric.js
          version: '6.7.1',
          originX: 'center', // Centralizar horizontalmente
          originY: 'center', // Centralizar verticalmente
          left: placeholderCenterX, // Posição X do centro
          top: placeholderCenterY, // Posição Y do centro
          // Não definir width/height - deixar o Fabric.js calcular
          fill: 'rgb(0,0,0)',
          stroke: null,
          strokeWidth: 0,
          strokeDashArray: null,
          strokeLineCap: 'butt',
          strokeDashOffset: 0,
          strokeLineJoin: 'miter',
          strokeUniform: false,
          strokeMiterLimit: 4,
          // Marcar com propriedades especiais para ajuste posterior
          scaleX: initialScale,
          scaleY: initialScale,
          // IMPORTANTE: Adicionar propriedades customizadas diretamente no objeto
          // O Fabric.js preserva propriedades customizadas que não começam com underscore
          targetHeight: placeholderHeight, // Altura desejada
          targetWidth: placeholderWidth, // Largura máxima
          placeholderNameDebug: placeholderName, // Nome para debug
          angle: obj.angle || 0,
          flipX: false,
          flipY: false,
          opacity: obj.opacity || 1,
          shadow: null,
          visible: true,
          backgroundColor: '',
          fillRule: 'nonzero',
          paintFirst: 'fill',
          globalCompositeOperation: 'source-over',
          skewX: 0,
          skewY: 0,
          cropX: 0,
          cropY: 0,
          src: imageUrl, // URL será processada com proxy depois
          crossOrigin: 'anonymous',
          filters: [],
          // Configurar como não editável
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          lockSkewingX: true,
          lockSkewingY: true,
          hoverCursor: 'default',
          moveCursor: 'default',
          name: `image_${placeholderName}` // Nome para identificar
        };
        
        return imageObj;
      }
    }

    // Se for um grupo (MAS NÃO um placeholder), processar objetos filhos
    // Se for um placeholder, não processar os filhos pois será convertido em imagem
    if (obj.objects && Array.isArray(obj.objects) && 
        !(obj.type === 'Group' && obj.name === 'placeholder') &&
        !(obj.type === 'group' && obj.name === 'placeholder')) {
      processedObj.objects = obj.objects.map((childObj: any) => 
        this.processObject(childObj, variables)
      );
    }

    return processedObj;
  }

  /**
   * Substitui variáveis no formato {{chave}} em um texto
   */
  private static replaceVariables(text: string, variables: VariableToReplace): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const variable = variables[trimmedKey];
      
      if (variable && variable.value !== undefined && variable.value !== null) {
        // Para textos, usar apenas variáveis do tipo 'string'
        // URLs em placeholders de texto podem ser usadas também
        return String(variable.value);
      }
      
      // Se não encontrar a variável, manter o placeholder original
      return match;
    });
  }

  /**
   * Extrai todas as variáveis encontradas em um JSON do canvas
   */
  static extractVariables(jsonData: any): string[] {
    const variables = new Set<string>();
    
    // Parsear se for string
    let data = jsonData;
    if (typeof jsonData === 'string') {
      try {
        data = JSON.parse(jsonData);
      } catch (e) {
        return [];
      }
    }
    
    if (!data) return [];
    
    const extractFromObject = (obj: any) => {
      // Extrair de textos (incluindo todos os tipos de texto do Fabric.js)
      if (isTextObjectType(obj.type) && obj.text) {
        const matches = obj.text.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach((match: string) => {
            const key = match.replace(/[{}]/g, '').trim();
            variables.add(key);
          });
        }
      }

      // Extrair de placeholders de imagem
      if (obj.isPlaceholder && obj.placeholderName) {
        variables.add(obj.placeholderName);
      }

      // Processar objetos filhos (grupos)
      if (obj.objects && Array.isArray(obj.objects)) {
        obj.objects.forEach(extractFromObject);
      }
    };

    if (data.objects && Array.isArray(data.objects)) {
      data.objects.forEach(extractFromObject);
    }

    return Array.from(variables).sort();
  }

  /**
   * Valida se todas as variáveis necessárias estão presentes nos dados
   */
  static validateRequiredVariables(
    jsonData: any, 
    variables: VariableToReplace
  ): { isValid: boolean; missingVariables: string[] } {
    // Parsear se for string
    let data = jsonData;
    if (typeof jsonData === 'string') {
      try {
        data = JSON.parse(jsonData);
      } catch (e) {
        return { isValid: true, missingVariables: [] };
      }
    }
    
    const requiredVariables = this.extractVariables(data);
    const missingVariables = requiredVariables.filter(
      variable => !(variable in variables) || 
                  !variables[variable] ||
                  variables[variable].value === undefined || 
                  variables[variable].value === null ||
                  variables[variable].value === ''
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * Versão legacy para compatibilidade
   */
  static validateRequiredVariablesLegacy(
    jsonData: any, 
    studentData: StudentData
  ): { isValid: boolean; missingVariables: string[] } {
    const requiredVariables = this.extractVariables(jsonData);
    const missingVariables = requiredVariables.filter(
      variable => !(variable in studentData) || 
                  studentData[variable] === undefined || 
                  studentData[variable] === null ||
                  studentData[variable] === ''
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * Cria dados de exemplo para teste (nova estrutura)
   */
  static createSampleVariableToReplace(): VariableToReplace {
    return {
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
      instrutor_assinatura_url: {
        type: 'url',
        value: 'https://example.com/assinatura.png'
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
      data_emissao: {
        type: 'string',
        value: '15/12/2024'
      },
      logo_empresa: {
        type: 'url',
        value: 'https://example.com/logo.png'
      },
      certificado_numero: {
        type: 'string',
        value: '2024-001234'
      }
    };
  }

  /**
   * Cria dados de exemplo para teste (versão legacy)
   */
  static createSampleStudentData(): StudentData {
    return {
      nome_do_aluno: 'João Silva Santos',
      nome_do_curso: 'Segurança do Trabalho - NR 35',
      data_conclusao: '15/12/2024',
      instrutor_assinatura_url: 'https://example.com/assinatura.png',
      carga_horaria: '40 horas',
      nome_empresa: 'Adleron Tecnologia',
      instrutor_nome: 'Dr. Carlos Eduardo',
      data_emissao: '15/12/2024'
    };
  }
}