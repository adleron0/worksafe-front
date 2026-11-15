import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import type { CaptionTemplate, MarketingClass, MarketingSettingsResponse } from "./types";

export const SETTINGS_KEY = ["marketing-settings"];
export const CAPTIONS_KEY = ["marketing-captions"];

export function useMarketingSettings(enabled = true) {
  return useQuery({
    queryKey: SETTINGS_KEY,
    enabled,
    queryFn: async () => (await get<MarketingSettingsResponse>("marketing", "settings")) ?? null,
  });
}

export function useCaptionTemplates(enabled = true) {
  return useQuery({
    queryKey: CAPTIONS_KEY,
    enabled,
    queryFn: async () => {
      const res = await get<{ rows: CaptionTemplate[] }>("marketing-captions", "", [
        { key: "limit", value: 100 },
        { key: "active", value: "true" },
        { key: "order-sortOrder", value: "asc" },
      ]);
      return res?.rows ?? [];
    },
  });
}

export function useMarketingClass(classId: number | null | undefined) {
  return useQuery({
    queryKey: ["marketing-class", classId],
    enabled: !!classId,
    // a listagem traz curso e contagem de inscrições (o getById não aceita `show`)
    queryFn: async () =>
      (await get<{ rows: MarketingClass[] }>("classes", "", [
        { key: "id", value: classId },
        { key: "limit", value: 1 },
        { key: "show", value: ["course", "_count"] },
      ]))?.rows?.[0] ?? null,
  });
}

/** Fotos do banco (copiadas do site) para quando a turma não tem imagem boa. */
export const PHOTO_BANK: { src: string; label: string }[] = [
  { src: "/divulgacao/fotos/resgate-corda-instrutor-02.jpg", label: "Instrutor na corda" },
  { src: "/divulgacao/fotos/resgate-corda-aluno.jpg", label: "Aluno na corda" },
  { src: "/divulgacao/fotos/instrutor-nao-vendemos-seguranca.jpg", label: "Instrutor" },
  { src: "/divulgacao/fotos/servicos-torre-transmissao.jpg", label: "Torre" },
  { src: "/divulgacao/fotos/resgate-turma-rto.jpg", label: "Turma de resgate" },
  { src: "/divulgacao/fotos/ct-salao-treinamento-cordas.jpg", label: "Centro de treinamento" },
  { src: "/divulgacao/fotos/resgate-maca-equipe-vermelha.jpg", label: "Resgate com maca" },
  { src: "/divulgacao/fotos/espaco-confinado-treino-mascara.jpg", label: "Espaço confinado" },
  { src: "/divulgacao/fotos/ascensao-silhueta-bandeira.jpg", label: "Ascensão" },
  { src: "/divulgacao/fotos/ct-mural-turma-rto.jpg", label: "Mural da turma" },
];

/** Imagens do S3 passam pelo proxy da API para o canvas poder exportar (CORS). */
export function canvasSafeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return url;
  if (url.startsWith(window.location.origin)) return url;
  if (/amazonaws\.com/i.test(url)) {
    const base = String(import.meta.env.VITE_BASE_URL ?? "").replace(/\/$/, "");
    return `${base}/images/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
