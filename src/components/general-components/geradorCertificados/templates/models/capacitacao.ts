import { CertificateTemplate } from '../types';

export const capacitacaoTemplate: CertificateTemplate = {
  id: 'capacitacao-01',
  name: 'Capacitação Profissional',
  description: 'Certificado moderno e profissional para treinamentos e capacitações',
  category: 'capacitacao',
  canvasWidth: 842,
  canvasHeight: 595,
  previewBackgroundColor: '#f0f9ff',
  fabricJsonFront: JSON.stringify({
    version: "6.7.1",
    width: 842,
    objects: [
      // Faixa lateral esquerda
      {
        type: "Rect",
        version: "6.7.1",
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        width: 100,
        height: 595,
        fill: "#0369a1",
        stroke: null
      },
      // Logo/Círculo decorativo
      {
        type: "Circle",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 50,
        top: 80,
        radius: 30,
        fill: "#ffffff",
        stroke: null,
        opacity: 0.2
      },
      // Título CERTIFICADO
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 80,
        width: 400,
        height: 40,
        fill: "#0369a1",
        fontSize: 36,
        fontWeight: "bold",
        fontFamily: "Inter",
        text: "CERTIFICADO",
        textAlign: "left"
      },
      // Subtítulo
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 120,
        width: 400,
        height: 25,
        fill: "#0891b2",
        fontSize: 18,
        fontFamily: "Inter",
        text: "DE CAPACITAÇÃO PROFISSIONAL",
        textAlign: "left"
      },
      // Texto certificamos
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 200,
        width: 600,
        height: 25,
        fill: "#374151",
        fontSize: 16,
        fontFamily: "Open Sans",
        text: "Certificamos que",
        textAlign: "left"
      },
      // Nome do participante
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 240,
        width: 600,
        height: 35,
        fill: "#0369a1",
        fontSize: 26,
        fontWeight: "bold",
        fontFamily: "Inter",
        text: "{{aluno_nome}}",
        textAlign: "left"
      },
      // CPF
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 275,
        width: 400,
        height: 20,
        fill: "#6b7280",
        fontSize: 14,
        fontFamily: "Open Sans",
        text: "CPF: {{aluno_cpf}}",
        textAlign: "left"
      },
      // Texto descritivo
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 330,
        width: 650,
        height: 80,
        fill: "#374151",
        fontSize: 15,
        fontFamily: "Open Sans",
        text: "Concluiu com aproveitamento o treinamento de {{curso_nome}}, realizado no período de {{turma_data_inicio}} a {{turma_data_fim}}, com carga horária de {{turma_carga_horaria}} horas.",
        textAlign: "left",
        lineHeight: 1.6
      },
      // Divisor
      {
        type: "Line",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 420,
        x1: 0,
        x2: 650,
        y1: 0,
        y2: 0,
        stroke: "#e5e7eb",
        strokeWidth: 1
      },
      // Conteúdo programático
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 440,
        width: 150,
        height: 20,
        fill: "#6b7280",
        fontSize: 12,
        fontWeight: "bold",
        fontFamily: "Open Sans",
        text: "CONTEÚDO:",
        textAlign: "left"
      },
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "top",
        left: 250,
        top: 440,
        width: 550,
        height: 40,
        fill: "#6b7280",
        fontSize: 12,
        fontFamily: "Open Sans",
        text: "Legislação • EPIs • Análise de Riscos • Procedimentos de Segurança",
        textAlign: "left",
        lineHeight: 1.4
      },
      // Assinatura e QR Code lado a lado
      // Linha assinatura
      {
        type: "Line",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 300,
        top: 520,
        x1: -75,
        x2: 75,
        y1: 0,
        y2: 0,
        stroke: "#9ca3af",
        strokeWidth: 1
      },
      // Texto assinatura
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 300,
        top: 540,
        width: 200,
        height: 40,
        fill: "#6b7280",
        fontSize: 11,
        fontFamily: "Open Sans",
        text: "{{instrutor_nome_1}} Instrutor",
        textAlign: "center",
        lineHeight: 1.4
      },
      // QR Code Placeholder
      {
        type: "Group",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 700,
        top: 510,
        width: 122,
        height: 122,
        fill: "rgb(0,0,0)",
        stroke: null,
        strokeWidth: 0,
        scaleX: 0.6,
        scaleY: 0.6,
        subTargetCheck: false,
        interactive: false,
        name: "placeholder",
        selectable: true,
        evented: true,
        layoutManager: {type: "layoutManager", strategy: "fit-content"},
        objects: [
          {
            type: "Rect",
            version: "6.7.1",
            originX: "center",
            originY: "center",
            left: 0,
            top: 0,
            width: 120,
            height: 120,
            rx: 8,
            ry: 8,
            fill: "#f8f8f8",
            stroke: "#333333",
            strokeWidth: 2,
            strokeDashArray: [3, 3]
          },
          {
            type: "Path",
            version: "6.7.1",
            originX: "center",
            originY: "center",
            left: 0,
            top: -12,
            width: 24,
            height: 24,
            fill: "#333333",
            scaleX: 1.5,
            scaleY: 1.5,
            path: [["M", 0, 0], ["L", 10, 0], ["L", 10, 10], ["L", 0, 10], ["Z"], ["M", 14, 0], ["L", 24, 0], ["L", 24, 10], ["L", 14, 10], ["Z"], ["M", 0, 14], ["L", 10, 14], ["L", 10, 24], ["L", 0, 24], ["Z"], ["M", 3, 3], ["L", 7, 3], ["L", 7, 7], ["L", 3, 7], ["Z"], ["M", 17, 3], ["L", 21, 3], ["L", 21, 7], ["L", 17, 7], ["Z"], ["M", 3, 17], ["L", 7, 17], ["L", 7, 21], ["L", 3, 21], ["Z"], ["M", 14, 14], ["L", 18, 14], ["L", 18, 18], ["L", 14, 18], ["Z"], ["M", 20, 14], ["L", 24, 14], ["L", 24, 18], ["L", 20, 18], ["Z"], ["M", 14, 20], ["L", 18, 20], ["L", 18, 24], ["L", 14, 24], ["Z"], ["M", 20, 20], ["L", 24, 20], ["L", 24, 24], ["L", 20, 24], ["Z"]]
          },
          {
            type: "Text",
            version: "6.7.1",
            originX: "center",
            originY: "center",
            left: 0,
            top: 30,
            width: 47.0562,
            height: 12.43,
            text: "QR Code",
            fontSize: 11,
            fontWeight: "bold",
            fontFamily: "Arial",
            fill: "#333333"
          }
        ],
        placeholderName: "qr_code",
        isPlaceholder: true,
        placeholderType: "qrcode"
      },
      // Código de validação
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "left",
        originY: "center",
        left: 150,
        top: 570,
        width: 300,
        height: 15,
        fill: "#9ca3af",
        fontSize: 10,
        fontFamily: "monospace",
        text: "Código: CERT-2025-{{certificado_codigo}}",
        textAlign: "left"
      }
    ]
  }),
  fabricJsonBack: undefined,
  defaultVariables: {
    aluno_nome: 'Nome do Aluno',
    aluno_cpf: '000.000.000-00',
    curso_nome: 'Segurança do Trabalho',
    turma_data_inicio: '01/01/2025',
    turma_data_fim: '05/01/2025',
    turma_carga_horaria: '40',
    instrutor_nome_1: 'Nome do Instrutor',
    certificado_codigo: '001234'
  }
};