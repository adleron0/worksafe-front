import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { sizeText } from "@/lib/open-file";
import { cn } from "@/lib/utils";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { FILES_KEY, FileInfo, NameDialog, RecordFiles, ReplaceDialog, dateTimeBr, fileIcon, openFile } from "./files";
import { uploadLarge } from "./upload";

/**
 * O bloco "Arquivos" de um registro (cliente, proposta, ordem de serviço).
 * Os arquivos pertencem ao registro: quem vê o registro vê os arquivos, e quem
 * pode alterá-lo envia, renomeia, troca a versão e apaga. Não depende da
 * permissão do módulo Arquivos.
 */
export type RecordEntity = "customer" | "proposal" | "service_order";
const BASE = "record-files" as const;
interface Sending { key: string; name: string; progress: number; status: "enviando" | "erro"; error?: string }

export function RecordFilesPanel({ entity, entityId, title = "Arquivos", hint, className }: { entity: RecordEntity; entityId: number; title?: string; hint?: string; className?: string }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const key = [FILES_KEY, "record", entity, entityId];
  const [sending, setSending] = useState<Sending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState<FileInfo | null>(null);
  const [replacing, setReplacing] = useState<FileInfo | null>(null);
  const [versionsOf, setVersionsOf] = useState<number | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: async () => (await api.get<RecordFiles>(`${BASE}/${entity}/${entityId}`)).data });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
  const { mutate: trash } = useMutation({
    mutationFn: (file: FileInfo) => api.delete(`${BASE}/files/${file.id}`),
    onSuccess: () => { refresh(); toast({ title: "Arquivo na lixeira", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível mandar para a lixeira", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: restore, isPending: restoring } = useMutation({
    mutationFn: (file: FileInfo) => api.post(`${BASE}/files/${file.id}/restore`),
    onSuccess: () => { refresh(); toast({ title: "Arquivo restaurado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível restaurar", description: errorMessage(err), variant: "destructive" }),
  });

  // apagar de vez é de quem administra os Arquivos: o arquivo e as versões dele saem do sistema e do armazenamento
  const { mutate: purge, isPending: purging } = useMutation({
    mutationFn: (file: FileInfo) => api.delete(`company-files/files/${file.id}/purge`),
    onSuccess: () => { refresh(); toast({ title: "Arquivo apagado de vez", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível apagar", description: errorMessage(err), variant: "destructive" }),
  });

  /** Um arquivo por vez; o grande vai direto ao armazenamento, em partes. O que falha fica na lista com o motivo. */
  const send = async (list: File[]) => {
    if (!data?.canWrite || !list.length) return;
    for (const [index, file] of list.entries()) {
      const item: Sending = { key: `${Date.now()}-${index}`, name: file.name, progress: 0, status: "enviando" };
      const patch = (change: Partial<Sending>) => setSending((current) => current.map((entry) => (entry.key === item.key ? { ...entry, ...change } : entry)));
      setSending((current) => [...current, item]);
      if (!file.size || file.size > data.directMaxBytes) { patch({ status: "erro", error: file.size ? `Passa de ${sizeText(data.directMaxBytes)}.` : "Arquivo vazio." }); continue; }
      try {
        if (file.size > data.maxBytes) {
          await uploadLarge(file, { entity, entityId }, (progress) => patch({ progress }), BASE);
        } else {
          const form = new FormData();
          form.append("file", file);
          await api.post(`${BASE}/${entity}/${entityId}`, form, { onUploadProgress: (event) => patch({ progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0 }) });
        }
        setSending((current) => current.filter((entry) => entry.key !== item.key));
        refresh();
      } catch (err) {
        patch({ status: "erro", error: (err as { response?: unknown })?.response ? errorMessage(err) : (err as Error)?.message || "Não foi possível enviar." });
      }
    }
  };

  const canWrite = !!data?.canWrite;
  const action = "h-8 w-8 p-0";
  return (
    <section
      className={cn("rounded-lg border p-4", dragging && "outline outline-2 outline-dashed outline-primary", className)}
      onDragOver={(event) => { if (canWrite && event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={(event) => { if (!canWrite) return; event.preventDefault(); setDragging(false); send(Array.from(event.dataTransfer.files)); }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint ?? "Documentos e arquivos deste registro. Quem vê o registro vê os arquivos."}</p>
        </div>
        {canWrite && <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Icon name="upload" className="w-3 h-3 mr-1" /> Enviar arquivos</Button>}
      </div>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(event) => { send(Array.from(event.target.files ?? [])); event.target.value = ""; }} />

      {error && <p className="mt-3 text-sm text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="mt-3 h-16 w-full" />}
      {data && !data.files.length && !sending.length && <p className="mt-3 text-sm text-muted-foreground">Nenhum arquivo.{canWrite ? " Arraste arquivos para cá ou use o botão." : ""}</p>}

      {!!sending.length && (
        <div className="mt-3 grid gap-1" aria-live="polite">
          {sending.map((item) => (
            <div key={item.key} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{item.name}</span>
                {item.status === "enviando" ? <span className="shrink-0 text-xs text-muted-foreground">{item.progress}%</span>
                  : <button type="button" className="shrink-0 text-xs underline text-muted-foreground" onClick={() => setSending((current) => current.filter((entry) => entry.key !== item.key))}>fechar</button>}
              </div>
              {item.status === "enviando" && <div className="mt-1 h-1 rounded bg-muted"><div className="h-1 rounded bg-primary transition-all" style={{ width: `${item.progress}%` }} /></div>}
              {item.error && <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>}
            </div>
          ))}
        </div>
      )}

      {!!data?.files.length && (
        <div className="mt-3 rounded-lg border overflow-hidden">
          {data.files.map((file) => {
            const versions = file.versions ?? [];
            return (
              <div key={file.id} className="px-3 py-2 border-b last:border-b-0 text-sm hover:bg-muted/40">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-1 min-w-0 items-start gap-2">
                    <Icon name={fileIcon(file)} className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <button type="button" className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => openFile(file, !file.inline, BASE)}>{file.name}</button>
                      <p className="text-xs text-muted-foreground truncate">{sizeText(file.size)}{file.uploadedBy ? ` · enviado por ${file.uploadedBy}` : ""} · {dateBr(file.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {file.inline && <Tip text="Ver"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Ver ${file.name}`} onClick={() => openFile(file, false, BASE)}><Icon name="eye" className="w-4 h-4" /></Button></Tip>}
                    <Tip text="Baixar"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Baixar ${file.name}`} onClick={() => openFile(file, true, BASE)}><Icon name="download" className="w-4 h-4" /></Button></Tip>
                    {canWrite && <Tip text="Enviar versão nova"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Enviar versão nova de ${file.name}`} onClick={() => setReplacing(file)}><Icon name="refresh-cw" className="w-4 h-4" /></Button></Tip>}
                    {canWrite && <Tip text="Renomear"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Renomear ${file.name}`} onClick={() => setRenaming(file)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                    {canWrite && (
                      <ConfirmDialog title="Mandar para a lixeira?" description={`"${file.name}" fica ${data.trashDays} dias na lixeira deste registro e pode ser restaurado nesse prazo.`} onConfirm={() => trash(file)}>
                        <span><Tip text="Mandar para a lixeira"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Mandar ${file.name} para a lixeira`}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip></span>
                      </ConfirmDialog>
                    )}
                  </div>
                </div>
                {!!versions.length && (
                  <div className="mt-1 sm:pl-6">
                    <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setVersionsOf(versionsOf === file.id ? null : file.id)}>
                      {versionsOf === file.id ? "Esconder" : "Ver"} {versions.length} {versions.length === 1 ? "versão anterior" : "versões anteriores"}
                    </button>
                    {versionsOf === file.id && (
                      <ul className="mt-1 grid gap-1 border-l-2 pl-3">
                        {versions.map((old) => (
                          <li key={old.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="truncate">{old.fileName} · {sizeText(old.size)}</span>
                            <span>substituída em {dateTimeBr(old.replacedAt)}</span>
                            <button type="button" className="underline" onClick={() => openFile(old, !old.inline, BASE)}>{old.inline ? "ver" : "baixar"}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!!data?.trashed.length && (
        <div className="mt-3">
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setShowTrash(!showTrash)}>
            {showTrash ? "Esconder" : "Ver"} {data.trashed.length} {data.trashed.length === 1 ? "arquivo na lixeira" : "arquivos na lixeira"}
          </button>
          {showTrash && (
            <ul className="mt-2 grid gap-1 border-l-2 pl-3">
              {data.trashed.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="truncate">{file.name} · {sizeText(file.size)}</span>
                  <span>apagado em {dateBr(file.trashedAt)}{file.trashedBy ? ` por ${file.trashedBy}` : ""} · some em {file.daysLeft} {file.daysLeft === 1 ? "dia" : "dias"}</span>
                  {canWrite && <button type="button" className="underline" disabled={restoring} onClick={() => restore(file)}>restaurar</button>}
                  {data.canManage && (
                    <ConfirmDialog title="Apagar de vez?" description={`"${file.name}" e as versões anteriores dele saem do sistema e do armazenamento. Não dá para desfazer.`} slideLabel="Deslize para apagar de vez" onConfirm={() => purge(file)}>
                      <button type="button" className="underline text-red-600 dark:text-red-400" disabled={purging}>apagar de vez</button>
                    </ConfirmDialog>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {renaming && (
        <NameDialog title="Renomear o arquivo" description="Só o nome mostrado muda; o conteúdo continua o mesmo." label="Nome do arquivo" initial={renaming.name} confirm="Salvar"
          onSubmit={(name) => api.put(`${BASE}/files/${renaming.id}`, { name })} onClose={() => setRenaming(null)} />
      )}
      {replacing && data && <ReplaceDialog file={replacing} types={[]} maxBytes={data.maxBytes} directMaxBytes={data.directMaxBytes} base={BASE} onClose={() => setReplacing(null)} />}
    </section>
  );
}
