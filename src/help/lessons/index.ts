import { Lesson } from "../types";

/** Onde ficam os vídeos (bucket público). Em teste local dá para apontar para outra pasta. */
const BASE = (import.meta.env.VITE_TUTORIAIS_URL as string | undefined) ?? "https://worksafe-brasil.s3.us-east-1.amazonaws.com/tutoriais";

/** Todos os tutoriais. Um por tela; os capítulos saem da gravação (arquivo .chapters.json). */
export const LESSONS: Lesson[] = [
  {
    id: "comercial.propostas",
    title: "Propostas: do rascunho ao envio",
    screen: "Propostas",
    minutes: 13,
    requires: ["view_comercial"],
    routes: ["/comercial/propostas", "/comercial/propostas/nova", "/comercial/propostas/:proposalId"],
    video: { src: `${BASE}/propostas.mp4`, captions: `${BASE}/propostas.vtt` },
    chapters: [
      { title: "A lista de propostas", start: 0 },
      { title: "Tipo e cliente", start: 57 },
      { title: "Os dados da proposta", start: 95.5 },
      { title: "Itens e valores", start: 278 },
      { title: "Resumo, custos e margem", start: 439.1 },
      { title: "Pagamento", start: 550.9 },
      { title: "O documento", start: 599.7 },
      { title: "Revisão e envio", start: 669.3 },
      { title: "Depois do envio", start: 704.1 },
    ],
  },
];
