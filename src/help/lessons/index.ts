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
];
