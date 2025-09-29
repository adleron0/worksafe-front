import { CertificateTemplate } from '../types';

export const participacaoEventoTemplate: CertificateTemplate = {
  id: 'participacao-evento-01',
  name: 'Participação em Evento',
  description: 'Certificado elegante para participação em eventos, workshops e seminários',
  category: 'evento',
  canvasWidth: 842,
  canvasHeight: 595,
  previewBackgroundColor: '#f8f8f8',
  fabricJsonFront: JSON.stringify({
    version: "6.7.1",
    width: 842,
    objects: [
      // Borda decorativa
      {
        type: "Rect",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 297.5,
        width: 800,
        height: 550,
        fill: "transparent",
        stroke: "#1e40af",
        strokeWidth: 3,
        strokeDashArray: [10, 5],
        rx: 10,
        ry: 10
      },
      // Título principal
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 100,
        width: 600,
        height: 50,
        fill: "#1e40af",
        fontSize: 36,
        fontWeight: "bold",
        fontFamily: "Montserrat",
        text: "CERTIFICADO DE PARTICIPAÇÃO",
        textAlign: "center",
        charSpacing: 50
      },
      // Texto introdutório
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 180,
        width: 700,
        height: 30,
        fill: "#4b5563",
        fontSize: 18,
        fontFamily: "Open Sans",
        text: "Certificamos que",
        textAlign: "center"
      },
      // Nome do participante
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 230,
        width: 600,
        height: 40,
        fill: "#1e40af",
        fontSize: 28,
        fontWeight: "bold",
        fontFamily: "Open Sans",
        text: "{{aluno_nome}}",
        textAlign: "center",
        underline: true
      },
      // Texto do evento
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 310,
        width: 700,
        height: 80,
        fill: "#4b5563",
        fontSize: 16,
        fontFamily: "Open Sans",
        text: "Participou do evento {{curso_nome}} realizado por {{inscricao_empresa}}, com duração de {{turma_carga_horaria}} horas.",
        textAlign: "center",
        lineHeight: 1.5
      },
      // Data e local
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 380,
        width: 600,
        height: 30,
        fill: "#6b7280",
        fontSize: 14,
        fontFamily: "Open Sans",
        text: "São Paulo, {{turma_data_fim_extenso}}",
        textAlign: "center"
      },
      // Linha para assinatura
      {
        type: "Line",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 480,
        x1: -150,
        x2: 150,
        y1: 0,
        y2: 0,
        stroke: "#9ca3af",
        strokeWidth: 1
      },
      // Texto da assinatura
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 500,
        width: 300,
        height: 20,
        fill: "#6b7280",
        fontSize: 12,
        fontFamily: "Open Sans",
        text: "{{instrutor_nome_1}}",
        textAlign: "center"
      },
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 520,
        width: 300,
        height: 20,
        fill: "#6b7280",
        fontSize: 12,
        fontFamily: "Open Sans",
        text: "Organizador do Evento",
        textAlign: "center"
      }
    ]
  }),
  fabricJsonBack: undefined,
  defaultVariables: {
    aluno_nome: 'Nome do Aluno',
    curso_nome: 'Workshop de Inovação',
    inscricao_empresa: 'Empresa Organizadora',
    turma_carga_horaria: '8',
    turma_data_fim_extenso: '15 de Janeiro de 2025',
    instrutor_nome_1: 'Nome do Responsável'
  }
};