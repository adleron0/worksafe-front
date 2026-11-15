import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import DocumentFolder from "@/components/general-components/DocumentFolder";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { sizeText } from "@/lib/open-file";
import { cn } from "@/lib/utils";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { AccessDialog, Browse, FILES_ABILITY, FILES_KEY, FileInfo, FolderInfo, HistoryDialog, MoveDialog, NameDialog, PathItem, SearchResult, fileIcon, filesApi, openFile } from "../-shared/files";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/pastas")({
  component: FoldersPage,
  validateSearch: (search: Record<string, unknown>): { pasta?: number } => (Number(search.pasta) > 0 ? { pasta: Number(search.pasta) } : {}),
});

interface Sending { key: string; name: string; size: number; progress: number; status: "fila" | "enviando" | "ok" | "erro"; error?: string }
type Modal =
  | { kind: "nova-pasta" } | { kind: "renomear-pasta"; folder: FolderInfo } | { kind: "mover-pasta"; folder: FolderInfo } | { kind: "acesso"; folder: FolderInfo }
  | { kind: "renomear-arquivo"; file: FileInfo } | { kind: "mover-arquivo"; file: FileInfo } | { kind: "historico"; file: FileInfo };

const filesText = (count: number) => `${count} ${count === 1 ? "arquivo" : "arquivos"}`;

/** O caminho até a pasta: cada parte leva de volta para ela. */
function Crumbs({ path, last = true }: { path: PathItem[]; last?: boolean }) {
  return (
    <nav aria-label="Caminho da pasta" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link to="/arquivos/pastas" search={{}} className="hover:underline">Arquivos</Link>
      {path.map((item, index) => (
        <span key={item.id} className="flex items-center gap-1">
          <Icon name="chevron-right" className="w-3 h-3" />
          {last && index === path.length - 1 ? <span className="font-medium text-foreground">{item.name}</span> : <Link to="/arquivos/pastas" search={{ pasta: item.id }} className="hover:underline">{item.name}</Link>}
        </span>
      ))}
    </nav>
  );
}

/** Uma linha de arquivo: o que é, de quem, e o que dá para fazer com ele. */
function FileRow({ file, where, canWrite, canManage, onModal, onTrash }: {
  file: FileInfo; where?: PathItem[]; canWrite: boolean; canManage: boolean; onModal: (modal: Modal) => void; onTrash: (file: FileInfo) => void;
}) {
  const action = "h-8 w-8 p-0";
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
      <div className="flex flex-1 min-w-0 items-start gap-3">
        <Icon name={fileIcon(file)} className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <button type="button" className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => openFile(file, !file.inline)}>{file.name}</button>
          <p className="text-xs text-muted-foreground truncate">{sizeText(file.size)}{file.uploadedBy ? ` · enviado por ${file.uploadedBy}` : ""} · {dateBr(file.createdAt)}</p>
          {file.notes && <p className="text-xs text-muted-foreground truncate">{file.notes}</p>}
          {where && <div className="mt-1"><Crumbs path={where} last={false} /></div>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {file.inline && <Tip text="Ver"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Ver ${file.name}`} onClick={() => openFile(file)}><Icon name="eye" className="w-4 h-4" /></Button></Tip>}
        <Tip text="Baixar"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Baixar ${file.name}`} onClick={() => openFile(file, true)}><Icon name="download" className="w-4 h-4" /></Button></Tip>
        {canWrite && <Tip text="Renomear"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Renomear ${file.name}`} onClick={() => onModal({ kind: "renomear-arquivo", file })}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
        {canWrite && <Tip text="Mover para outra pasta"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Mover ${file.name}`} onClick={() => onModal({ kind: "mover-arquivo", file })}><Icon name="folder-input" className="w-4 h-4" /></Button></Tip>}
        {canManage && <Tip text="Histórico de acesso"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Histórico de ${file.name}`} onClick={() => onModal({ kind: "historico", file })}><Icon name="history" className="w-4 h-4" /></Button></Tip>}
        {canWrite && (
          <ConfirmDialog title="Mandar para a lixeira?" description={`"${file.name}" fica 30 dias na lixeira e pode ser restaurado nesse prazo.`} onConfirm={() => onTrash(file)}>
            <span><Tip text="Mandar para a lixeira"><Button type="button" variant="ghost" size="sm" className={action} aria-label={`Mandar ${file.name} para a lixeira`}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip></span>
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
}

/** Arquivos da empresa: as pastas em árvore, o que há na pasta aberta, o envio e a busca pelo nome. */
function FoldersPage() {
  const { can } = useVerify();
  const { pasta } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [typed, setTyped] = useState("");
  const [term, setTerm] = useState("");
  const [sending, setSending] = useState<Sending[]>([]);
  const [dragging, setDragging] = useState(false);
  const canWrite = can(`update_${FILES_ABILITY}`) || can(`manage_${FILES_ABILITY}`);
  const canManage = can(`manage_${FILES_ABILITY}`);

  // a busca espera a pessoa parar de digitar
  useEffect(() => { const timer = setTimeout(() => setTerm(typed.trim()), 300); return () => clearTimeout(timer); }, [typed]);
  const searching = term.length >= 2;

  const { data, isLoading, error } = useQuery({ queryKey: [FILES_KEY, "browse", pasta ?? 0], queryFn: () => filesApi.get<Browse>("browse", pasta ? { folderId: pasta } : undefined), placeholderData: (previous) => previous });
  const found = useQuery({ queryKey: [FILES_KEY, "search", term], queryFn: () => filesApi.get<SearchResult>("search", { q: term }), enabled: searching });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [FILES_KEY] });

  const { mutate: trashFile } = useMutation({
    mutationFn: (file: FileInfo) => filesApi.delete(`files/${file.id}`),
    onSuccess: () => { refresh(); toast({ title: "Arquivo na lixeira", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível mandar para a lixeira", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: trashFolder } = useMutation({
    mutationFn: (folder: FolderInfo) => filesApi.delete<{ parentId: number | null }>(`folders/${folder.id}`),
    onSuccess: (result) => { refresh(); toast({ title: "Pasta na lixeira", variant: "success" }); navigate({ search: result.parentId ? { pasta: result.parentId } : {} }); },
    onError: (err) => toast({ title: "Não foi possível mandar para a lixeira", description: errorMessage(err), variant: "destructive" }),
  });

  /** Envia um arquivo por vez, cada um com o seu andamento; o que falha fica na lista com o motivo. */
  const send = async (list: File[]) => {
    const folder = data?.folder;
    if (!folder || !list.length) return;
    const max = data.maxBytes;
    const batch = list.map((file, index) => ({ file, item: { key: `${Date.now()}-${index}`, name: file.name, size: file.size, progress: 0, status: "fila" } as Sending }));
    setSending((current) => [...current.filter((item) => item.status !== "ok"), ...batch.map((entry) => entry.item)]);
    const patch = (key: string, change: Partial<Sending>) => setSending((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
    for (const { file, item } of batch) {
      if (file.size > max) { patch(item.key, { status: "erro", error: `Passa de ${sizeText(max)}.` }); continue; }
      patch(item.key, { status: "enviando" });
      try {
        const form = new FormData();
        form.append("folderId", String(folder.id));
        form.append("file", file);
        await api.post("company-files/files", form, { onUploadProgress: (event) => patch(item.key, { progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0 }) });
        patch(item.key, { status: "ok", progress: 100 });
        refresh();
      } catch (err) {
        patch(item.key, { status: "erro", error: errorMessage(err) });
      }
    }
  };

  if (!can(`view_${FILES_ABILITY}`)) return null;
  const folder = data?.folder ?? null;
  const atRoot = !pasta;
  const failed = sending.filter((item) => item.status === "erro").length;
  const busy = sending.some((item) => item.status === "fila" || item.status === "enviando");

  return (
    <div
      onDragOver={(event) => { if (folder && canWrite && event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={(event) => { if (!folder || !canWrite) return; event.preventDefault(); setDragging(false); send(Array.from(event.dataTransfer.files)); }}
      className={cn("rounded-lg", dragging && "outline outline-2 outline-dashed outline-primary outline-offset-4")}
    >
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Arquivos da empresa</h1>
          <p className="text-sm text-muted-foreground">Documentos e arquivos gerais, em pastas. Cada pasta pode ser aberta a todos ou restrita a alguns perfis.</p>
        </div>
        <div className="w-full xl:w-96">
          <Input name="search" value={typed} onValueChange={(_, value) => setTyped(String(value))} placeholder="Buscar pelo nome do arquivo ou da pasta..." icon="search" />
        </div>
      </div>

      {error && <p className="mt-4 p-4 text-destructive font-medium">Erro: {errorMessage(error)} {pasta ? <Link to="/arquivos/pastas" search={{}} className="underline">Voltar para o início</Link> : null}</p>}

      {searching && (
        <section className="mt-4 rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="font-semibold">Resultado da busca por "{term}"</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setTyped("")}><Icon name="x" className="w-3 h-3 mr-1" /> Limpar</Button>
          </div>
          {found.isLoading && <Skeleton className="h-24 w-full" />}
          {found.error && <p className="p-4 text-destructive text-sm">Erro: {errorMessage(found.error)}</p>}
          {found.data && !found.data.folders.length && !found.data.files.length && <p className="p-6 text-sm text-muted-foreground">Nada encontrado com esse nome nas pastas a que você tem acesso.</p>}
          {found.data?.folders.map((item) => (
            <Link key={`p${item.id}`} to="/arquivos/pastas" search={{ pasta: item.id }} onClick={() => setTyped("")} className="flex items-start gap-3 px-4 py-3 border-b text-sm hover:bg-muted/40">
              <Icon name="folder" className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0"><span className="block font-medium truncate">{item.name}</span><span className="block text-xs text-muted-foreground truncate">{item.path.map((part) => part.name).join(" › ")}</span></span>
            </Link>
          ))}
          {found.data?.files.map((file) => <FileRow key={file.id} file={file} where={file.path} canWrite={canWrite} canManage={canManage} onModal={setModal} onTrash={trashFile} />)}
          {found.data && found.data.total > found.data.files.length && <p className="p-3 text-xs text-muted-foreground">Mostrando {found.data.files.length} de {found.data.total} arquivos. Digite mais do nome para chegar aos demais.</p>}
        </section>
      )}

      {!searching && !error && (isLoading || !data) && <div className="mt-4 grid gap-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>}

      {!searching && data && atRoot && (
        <section className="mt-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Pastas</h2>
              <p className="text-xs text-muted-foreground">Abra uma pasta para ver e enviar arquivos. O cadeado marca as pastas restritas a alguns perfis.</p>
            </div>
            {canManage && <Button type="button" onClick={() => setModal({ kind: "nova-pasta" })}><Icon name="folder-plus" className="w-4 h-4 mr-1" /> Nova pasta</Button>}
          </div>
          {!data.folders.length && <p className="mt-4 text-sm text-muted-foreground">{canManage ? "Nenhuma pasta. Crie a primeira." : "Nenhuma pasta disponível para o seu perfil."}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {data.folders.map((item) => (
              <DocumentFolder key={item.id} name={item.name} count={item.files} statusLabel={item.locked ? "restrita" : undefined} onSelect={() => navigate({ search: { pasta: item.id } })} />
            ))}
          </div>
        </section>
      )}

      {!searching && data && folder && (
        <>
          <section className="mt-4 rounded-lg border p-4">
            <Crumbs path={data.path} />
            <div className="mt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <span className="truncate">{folder.name}</span>
                  {folder.locked && <Tip text={folder.restricted ? "Pasta restrita a alguns perfis" : "Restrita porque a pasta de cima é restrita"}><span><Icon name="lock" className="w-4 h-4 text-muted-foreground" /></span></Tip>}
                </h2>
                <p className="text-xs text-muted-foreground">{filesText(folder.files)}{folder.folders ? ` · ${folder.folders} ${folder.folders === 1 ? "pasta dentro" : "pastas dentro"}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canWrite && <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="upload" className="w-4 h-4 mr-1" /> Enviar arquivos</Button>}
                {canWrite && <Button type="button" variant="outline" onClick={() => setModal({ kind: "nova-pasta" })}><Icon name="folder-plus" className="w-4 h-4 mr-1" /> Nova pasta</Button>}
                {canWrite && (folder.parentId || canManage) && (
                  <>
                    <Tip text="Renomear a pasta"><Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Renomear a pasta" onClick={() => setModal({ kind: "renomear-pasta", folder })}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>
                    <Tip text="Mover a pasta"><Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Mover a pasta" onClick={() => setModal({ kind: "mover-pasta", folder })}><Icon name="folder-input" className="w-4 h-4" /></Button></Tip>
                    {canManage && <Tip text="Quem acessa esta pasta"><Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Quem acessa esta pasta" onClick={() => setModal({ kind: "acesso", folder })}><Icon name="lock" className="w-4 h-4" /></Button></Tip>}
                    <ConfirmDialog title="Mandar a pasta para a lixeira?" description={`"${folder.name}" e tudo o que há dentro dela (${filesText(folder.files)}) ficam 30 dias na lixeira e podem ser restaurados nesse prazo.`} onConfirm={() => trashFolder(folder)}>
                      <span><Tip text="Mandar a pasta para a lixeira"><Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Mandar a pasta para a lixeira"><Icon name="trash-2" className="w-4 h-4" /></Button></Tip></span>
                    </ConfirmDialog>
                  </>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(event) => { send(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
            {canWrite && <p className="mt-2 text-xs text-muted-foreground">Arraste arquivos para esta tela ou use "Enviar arquivos". Qualquer tipo de arquivo, até {sizeText(data.maxBytes)} cada.</p>}
          </section>

          {!!sending.length && (
            <section className="mt-4 rounded-lg border" aria-live="polite">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
                <h3 className="text-sm font-semibold">{busy ? "Enviando..." : failed ? `Envio terminado: ${failed} ${failed === 1 ? "arquivo não foi" : "arquivos não foram"}` : "Envio terminado"}</h3>
                {!busy && <Button type="button" variant="ghost" size="sm" onClick={() => setSending([])}>Fechar</Button>}
              </div>
              {sending.map((item) => (
                <div key={item.key} className="px-4 py-2 border-b last:border-b-0 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{item.name} <span className="text-xs text-muted-foreground">· {sizeText(item.size)}</span></span>
                    <span className={cn("shrink-0 text-xs", item.status === "erro" ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                      {item.status === "fila" ? "na fila" : item.status === "enviando" ? `${item.progress}%` : item.status === "ok" ? "enviado" : "não enviado"}
                    </span>
                  </div>
                  {item.status === "enviando" && <div className="mt-1 h-1 rounded bg-muted"><div className="h-1 rounded bg-primary transition-all" style={{ width: `${item.progress}%` }} /></div>}
                  {item.error && <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>}
                </div>
              ))}
            </section>
          )}

          <section className="mt-4 rounded-lg border overflow-hidden">
            {!data.folders.length && !data.files.length && <p className="p-6 text-sm text-muted-foreground">Pasta vazia.{canWrite ? " Arraste arquivos para cá ou crie uma pasta dentro dela." : ""}</p>}
            {data.folders.map((item) => (
              <Link key={item.id} to="/arquivos/pastas" search={{ pasta: item.id }} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/40">
                <Icon name="folder" className="w-5 h-5 shrink-0 text-muted-foreground" />
                <span className="flex-1 min-w-0 truncate font-medium">{item.name}</span>
                {item.restricted && <Icon name="lock" className="w-3 h-3 text-muted-foreground" />}
                <span className="shrink-0 text-xs text-muted-foreground">{filesText(item.files)}</span>
                <Icon name="chevron-right" className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
            {data.files.map((file) => <FileRow key={file.id} file={file} canWrite={canWrite} canManage={canManage} onModal={setModal} onTrash={trashFile} />)}
          </section>
        </>
      )}

      {modal?.kind === "nova-pasta" && (
        <NameDialog title="Nova pasta" description={folder ? `Dentro de "${folder.name}".` : "No primeiro nível."} label="Nome da pasta" confirm="Criar"
          onSubmit={(name) => filesApi.post("folders", { name, parentId: folder?.id ?? null })} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "renomear-pasta" && (
        <NameDialog title="Renomear a pasta" label="Nome da pasta" initial={modal.folder.name} confirm="Salvar" onSubmit={(name) => filesApi.put(`folders/${modal.folder.id}`, { name })} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "mover-pasta" && (
        <MoveDialog title={`Mover a pasta "${modal.folder.name}"`} currentId={modal.folder.parentId} excludeId={modal.folder.id} allowRoot={canManage}
          onSubmit={(parentId) => filesApi.put(`folders/${modal.folder.id}`, { parentId })} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "acesso" && <AccessDialog folder={modal.folder} onClose={() => setModal(null)} />}
      {modal?.kind === "renomear-arquivo" && (
        <NameDialog title="Renomear o arquivo" description="Só o nome mostrado muda; o conteúdo continua o mesmo." label="Nome do arquivo" initial={modal.file.name} confirm="Salvar"
          onSubmit={(name) => filesApi.put(`files/${modal.file.id}`, { name })} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "mover-arquivo" && (
        <MoveDialog title={`Mover "${modal.file.name}"`} currentId={modal.file.folderId} onSubmit={(folderId) => filesApi.put(`files/${modal.file.id}`, { folderId })} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "historico" && <HistoryDialog file={modal.file} onClose={() => setModal(null)} />}
    </div>
  );
}
