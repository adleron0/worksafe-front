import { CertificateTemplate } from '../types';

export const honraMeritoTemplate: CertificateTemplate = {
  id: 'honra-merito-01',
  name: 'Honra ao Mérito',
  description: 'Certificado solene para reconhecimento e premiações especiais',
  category: 'reconhecimento',
  canvasWidth: 842,
  canvasHeight: 595,
  previewBackgroundColor: '#fffef7',
  fabricJsonFront: JSON.stringify({
    version: "6.7.1",
    width: 842,
    objects: [
      // Moldura dourada externa
      {
        type: "Rect",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 297.5,
        width: 820,
        height: 570,
        fill: "transparent",
        stroke: "#d4af37",
        strokeWidth: 4,
        rx: 0,
        ry: 0
      },
      // Moldura dourada interna
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
        stroke: "#d4af37",
        strokeWidth: 2,
        rx: 0,
        ry: 0
      },
      // Estrela decorativa superior
      {
        type: "Polygon",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 60,
        points: [
          {x: 0, y: -20},
          {x: 5.88, y: -8.09},
          {x: 19.02, y: -6.18},
          {x: 9.51, y: 3.09},
          {x: 11.76, y: 16.18},
          {x: 0, y: 10},
          {x: -11.76, y: 16.18},
          {x: -9.51, y: 3.09},
          {x: -19.02, y: -6.18},
          {x: -5.88, y: -8.09}
        ],
        fill: "#d4af37",
        stroke: "#b8941f",
        strokeWidth: 1,
        scaleX: 1.5,
        scaleY: 1.5
      },
      // Título principal
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 120,
        width: 500,
        height: 60,
        fill: "#8b4513",
        fontSize: 42,
        fontWeight: "bold",
        fontFamily: "Playfair Display",
        text: "CERTIFICADO",
        textAlign: "center",
        charSpacing: 100
      },
      // Subtítulo
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 170,
        width: 400,
        height: 30,
        fill: "#d4af37",
        fontSize: 24,
        fontFamily: "Playfair Display",
        text: "DE HONRA AO MÉRITO",
        textAlign: "center",
        charSpacing: 50
      },
      // Texto conferido a
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 230,
        width: 600,
        height: 25,
        fill: "#4a4a4a",
        fontSize: 16,
        fontFamily: "Open Sans",
        text: "É conferido a",
        textAlign: "center"
      },
      // Nome do homenageado
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 280,
        width: 650,
        height: 45,
        fill: "#8b4513",
        fontSize: 32,
        fontWeight: "bold",
        fontFamily: "Playfair Display",
        fontStyle: "italic",
        text: "{{aluno_nome}}",
        textAlign: "center"
      },
      // Motivo da homenagem
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 350,
        width: 700,
        height: 80,
        fill: "#4a4a4a",
        fontSize: 16,
        fontFamily: "Open Sans",
        text: "Pelo excepcional desempenho e dedicação demonstrados durante o curso {{curso_nome}}, contribuindo significativamente para o desenvolvimento da turma.",
        textAlign: "center",
        lineHeight: 1.6
      },
      // Data
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 421,
        top: 430,
        width: 400,
        height: 25,
        fill: "#6b6b6b",
        fontSize: 14,
        fontFamily: "Open Sans",
        fontStyle: "italic",
        text: "São Paulo, {{turma_data_fim_extenso}}",
        textAlign: "center"
      },
      // Linha assinatura esquerda
      {
        type: "Line",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 250,
        top: 500,
        x1: -80,
        x2: 80,
        y1: 0,
        y2: 0,
        stroke: "#b8941f",
        strokeWidth: 1
      },
      // Linha assinatura direita
      {
        type: "Line",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 592,
        top: 500,
        x1: -80,
        x2: 80,
        y1: 0,
        y2: 0,
        stroke: "#b8941f",
        strokeWidth: 1
      },
      // Texto assinatura esquerda
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 250,
        top: 520,
        width: 200,
        height: 40,
        fill: "#6b6b6b",
        fontSize: 12,
        fontFamily: "Open Sans",
        text: "{{instrutor_nome_1}} Instrutor",
        textAlign: "center",
        lineHeight: 1.4
      },
      // Texto assinatura direita
      {
        type: "Textbox",
        version: "6.7.1",
        originX: "center",
        originY: "center",
        left: 592,
        top: 520,
        width: 200,
        height: 40,
        fill: "#6b6b6b",
        fontSize: 12,
        fontFamily: "Open Sans",
        text: "{{instrutor_nome_2}} Coordenador",
        textAlign: "center",
        lineHeight: 1.4
      }
    ]
  }),
  fabricJsonBack: undefined,
  defaultVariables: {
    aluno_nome: 'Nome do Aluno',
    curso_nome: 'Nome do Curso',
    turma_data_fim_extenso: '20 de Dezembro de 2024',
    instrutor_nome_1: 'Nome do Instrutor',
    instrutor_nome_2: 'Nome do Coordenador'
  }
};