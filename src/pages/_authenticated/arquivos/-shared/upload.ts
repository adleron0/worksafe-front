import api from "@/services/api";

/**
 * Envio de arquivo grande: o conteúdo vai direto do navegador ao armazenamento,
 * em partes, sem passar pela API. A API só abre o envio, assina o endereço de
 * cada parte e fecha no fim; se algo falhar, o envio é desfeito.
 */
interface Started { id: number; partBytes: number; parts: number }
interface PartLink { partNumber: number; url: string }
const PARALLEL = 3;
const TRIES = 3;

/** Uma parte, direto ao armazenamento. Devolve a etiqueta (ETag) que o armazenamento dá a ela. */
function putPart(url: string, body: Blob, onProgress: (loaded: number) => void, signal: { cancelled: boolean; requests: Set<XMLHttpRequest> }): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    signal.requests.add(request);
    request.open("PUT", url);
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onload = () => {
      signal.requests.delete(request);
      const etag = request.getResponseHeader("ETag");
      if (request.status >= 200 && request.status < 300 && etag) resolve(etag);
      else reject(new Error(`O armazenamento recusou uma parte do arquivo (${request.status}).`));
    };
    request.onerror = () => { signal.requests.delete(request); reject(new Error("A conexão caiu durante o envio.")); };
    request.onabort = () => { signal.requests.delete(request); reject(new Error("Envio cancelado.")); };
    request.send(body);
  });
}

/**
 * Envia `file` em partes. `target` diz onde ele entra: numa pasta, ou como versão
 * nova de outro arquivo (`replaceId`). `onProgress` recebe de 0 a 100.
 */
export async function uploadLarge<T>(file: File, target: Record<string, unknown>, onProgress: (percent: number) => void): Promise<T> {
  const started = (await api.post<Started>("company-files/uploads", { ...target, fileName: file.name, mimeType: file.type, size: file.size })).data;
  const signal = { cancelled: false, requests: new Set<XMLHttpRequest>() };
  const loaded = new Map<number, number>();
  const report = () => onProgress(Math.min(99, Math.round(([...loaded.values()].reduce((sum, value) => sum + value, 0) / file.size) * 100)));
  const etags: Array<{ partNumber: number; etag: string }> = [];
  let next = 1;

  const worker = async () => {
    while (!signal.cancelled && next <= started.parts) {
      const partNumber = next++;
      const body = file.slice((partNumber - 1) * started.partBytes, partNumber * started.partBytes);
      let lastError: unknown;
      for (let attempt = 1; attempt <= TRIES && !signal.cancelled; attempt++) {
        try {
          // o endereço é pedido na hora de usar: um envio longo não esbarra na validade dele
          const link = (await api.post<{ parts: PartLink[] }>(`company-files/uploads/${started.id}/parts`, { partNumbers: [partNumber] })).data.parts[0];
          const etag = await putPart(link.url, body, (value) => { loaded.set(partNumber, value); report(); }, signal);
          loaded.set(partNumber, body.size); report();
          etags.push({ partNumber, etag });
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          loaded.set(partNumber, 0);
          if (attempt < TRIES) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }
      }
      if (lastError) { signal.cancelled = true; throw lastError; }
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(PARALLEL, started.parts) }, worker));
    const done = (await api.post<T>(`company-files/uploads/${started.id}/complete`, { parts: etags })).data;
    onProgress(100);
    return done;
  } catch (error) {
    signal.cancelled = true;
    signal.requests.forEach((request) => request.abort());
    // desfaz o envio para não deixar partes soltas no armazenamento (a API também descarta sozinha depois de um dia)
    await api.delete(`company-files/uploads/${started.id}`).catch(() => undefined);
    throw error;
  }
}

/** Um arquivo com a pasta de onde veio, quando a pessoa envia uma pasta inteira. */
export interface PickedFile { file: File; path: string[] }

interface Entry { isFile: boolean; isDirectory: boolean; name: string; file?: (done: (file: File) => void, fail: (error: unknown) => void) => void; createReader?: () => { readEntries: (done: (entries: Entry[]) => void, fail: (error: unknown) => void) => void } }

async function walk(entry: Entry, path: string[], out: PickedFile[]): Promise<void> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => entry.file?.(resolve, reject));
    // arquivos ocultos do sistema (.DS_Store, Thumbs.db) não entram
    if (!file.name.startsWith(".") && file.name !== "Thumbs.db") out.push({ file, path });
    return;
  }
  if (!entry.isDirectory || !entry.createReader) return;
  const reader = entry.createReader();
  // a leitura devolve as entradas aos poucos: repete até vir vazio
  for (;;) {
    const batch = await new Promise<Entry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    for (const child of batch) await walk(child, [...path, entry.name], out);
  }
}

/** O que foi arrastado para a tela: arquivos soltos e pastas inteiras, com as de dentro. */
export async function filesFromDrop(data: DataTransfer): Promise<PickedFile[]> {
  const entries = Array.from(data.items).map((item) => (item.kind === "file" ? (item as DataTransferItem & { webkitGetAsEntry?: () => Entry | null }).webkitGetAsEntry?.() ?? null : null));
  if (!entries.some(Boolean)) return Array.from(data.files).map((file) => ({ file, path: [] }));
  const out: PickedFile[] = [];
  for (const entry of entries) if (entry) await walk(entry, [], out);
  return out;
}

/** O que veio do seletor de pasta: cada arquivo traz o caminho relativo. */
export function filesFromPicker(list: FileList | null): PickedFile[] {
  return Array.from(list ?? []).filter((file) => !file.name.startsWith(".") && file.name !== "Thumbs.db").map((file) => {
    const parts = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || "").split("/").filter(Boolean);
    return { file, path: parts.slice(0, -1) };
  });
}
