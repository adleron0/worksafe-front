import api from "@/services/api";

/** Tamanho de arquivo por extenso: 1,2 GB, 3,4 MB, 120 KB. */
export const sizeText = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Arquivo do armazenamento privado: só sai pela API, com o login da pessoa.
 * Busca o conteúdo e abre numa aba (ou baixa) a partir da memória do navegador.
 * Quem chama trata o erro.
 */
export async function openApiFile(path: string, fileName: string, download = false) {
  const response = await api.get<Blob>(path, { responseType: "blob", params: download ? { download: 1 } : undefined });
  const url = URL.createObjectURL(response.data);
  const link = window.document.createElement("a");
  link.href = url;
  if (download) link.download = fileName;
  else { link.target = "_blank"; link.rel = "noopener"; }
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
