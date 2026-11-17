import { Lesson } from "../types";

/** Onde ficam os vídeos (bucket público). Em teste local dá para apontar para outra pasta. */
const BASE = (import.meta.env.VITE_TUTORIAIS_URL as string | undefined) ?? "https://worksafe-brasil.s3.us-east-1.amazonaws.com/tutoriais";

/** Todos os tutoriais. Um por tela; os capítulos saem da gravação (arquivo .chapters.json). */
export const LESSONS: Lesson[] = [
  {
    id: "comercial.propostas",
    title: "Propostas: do rascunho ao envio",
    screen: "Propostas",
    minutes: 14,
    requires: ["view_comercial"],
    routes: ["/comercial/propostas", "/comercial/propostas/nova", "/comercial/propostas/:proposalId"],
    video: { src: `${BASE}/propostas.mp4`, captions: `${BASE}/propostas.vtt` },
    chapters: [
      { title: "A lista de propostas", start: 0 },
      { title: "Tipo e cliente", start: 80.7 },
      { title: "Os dados da proposta", start: 119.2 },
      { title: "Itens e valores", start: 301.7 },
      { title: "Resumo, custos e margem", start: 462.8 },
      { title: "Pagamento", start: 574.7 },
      { title: "O documento", start: 623.4 },
      { title: "Revisão e envio", start: 693 },
      { title: "Depois do envio", start: 727.7 },
    ],
  },
  {
    id: "comercial.acompanhamento",
    title: "Acompanhamento: retornos com o cliente",
    screen: "Acompanhamento",
    minutes: 3,
    requires: ["view_comercial"],
    routes: ["/comercial/acompanhamento"],
    video: { src: `${BASE}/acompanhamento.mp4`, captions: `${BASE}/acompanhamento.vtt` },
    chapters: [
      { title: "A agenda", start: 0 },
      { title: "Cada atividade", start: 30.5 },
      { title: "Concluir e marcar o próximo", start: 63.4 },
      { title: "Editar, cancelar e reabrir", start: 91.4 },
      { title: "Registrar e agendar", start: 115.8 },
    ],
  },
  {
    id: "servicos.rdo",
    title: "Diário de obra (RDO) no celular",
    screen: "Diário de obra",
    minutes: 4,
    requires: ["view_ordens_de_servico"],
    routes: ["/servicos/diario-de-obra", "/servicos/ordens-de-servico/:orderId/rdo/:reportId"],
    video: { src: `${BASE}/rdo.mp4`, portrait: `${BASE}/rdo-vertical.mp4`, captions: `${BASE}/rdo.vtt` },
    chapters: [
      { title: "As obras do dia", start: 0 },
      { title: "Começo do dia", start: 23.4 },
      { title: "Equipe do dia", start: 52.5 },
      { title: "O trabalho do dia", start: 85 },
      { title: "Fim do dia", start: 109.9 },
      { title: "Salvar e fechar", start: 147.3 },
    ],
  },
];
