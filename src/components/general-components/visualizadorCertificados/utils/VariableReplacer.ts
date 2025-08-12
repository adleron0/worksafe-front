import { StudentData, VariableToReplace } from '../types';

export class VariableReplacer {
  /**
   * Substitui variáveis no formato {{chave}} por valores reais nos dados do canvas
   * Versão nova que trabalha com VariableToReplace
   */
  static replaceInCanvasJSON(jsonData: any, variables: VariableToReplace): any {
    if (!jsonData || !variables) {
      return jsonData;
    }

    // Clone profundo do JSON para não modificar o original
    const processed = JSON.parse(JSON.stringify(jsonData));
    
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

    // Substituir em textos
    if (obj.type === 'textbox' || obj.type === 'i-text') {
      if (obj.text && typeof obj.text === 'string') {
        processedObj.text = this.replaceVariables(obj.text, variables);
      }
    }

    // Converter placeholders de imagem em imagens reais
    if (obj.isPlaceholder && obj.placeholderName) {
      const variable = variables[obj.placeholderName];
      if (variable && variable.type === 'url' && variable.value) {
        // Converter placeholder em imagem real
        processedObj.type = 'image';
        processedObj.src = variable.value;
        
        // Remover propriedades de placeholder
        delete processedObj.isPlaceholder;
        delete processedObj.placeholderName;
        
        // Configurar como imagem não editável
        processedObj.selectable = false;
        processedObj.evented = false;
        processedObj.hasControls = false;
        processedObj.hasBorders = false;
      }
    }

    // Se for um grupo, processar objetos filhos
    if (obj.objects && Array.isArray(obj.objects)) {
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
    
    if (!jsonData) return [];
    
    const extractFromObject = (obj: any) => {
      // Extrair de textos
      if ((obj.type === 'textbox' || obj.type === 'i-text') && obj.text) {
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

    if (jsonData.objects && Array.isArray(jsonData.objects)) {
      jsonData.objects.forEach(extractFromObject);
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
    const requiredVariables = this.extractVariables(jsonData);
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