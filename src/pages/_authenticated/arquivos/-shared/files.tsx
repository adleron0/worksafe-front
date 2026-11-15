import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { openApiFile } from "@/lib/open-file";
import { errorMessage } from "../../comercial/-shared/commercial";

/** Arquivos da empresa: tipos (espelham a API), chamadas e os diálogos de pasta e de arquivo. */
export interface FolderInfo { id: number; parentId: number | null; name: string; restricted: boolean; profileIds: number[]; locked: boolean; files: number; folders: number }
export interface FileInfo { id: number; folderId: number; name: string; fileName: string; mimeType: string; size: number; notes: string | null; inline: boolean; uploadedBy: string | null; createdAt: string }
export interface PathItem { id: number; name: string }
export interface Browse { folder: FolderInfo | null; path: PathItem[]; folders: FolderInfo[]; files: FileInfo[]; maxBytes: number; trashDays: number }
export interface SearchResult { folders: Array<PathItem & { path: PathItem[] }>; files: Array<FileInfo & { path: PathItem[] }>; total: number }
export interface FolderOption { id: number; parentId: number | null; name: string; path: string }
export interface TrashList {
  trashDays: number;
  folders: Array<{ id: number; name: string; from: string; trashedAt: string; trashedBy: string | null; daysLeft: number; files: number }>;
  files: Array<FileInfo & { from: string; trashedAt: string; trashedBy: string | null; daysLeft: number }>;
}
export interface FileHistory { file: PathItem; rows: Array<{ id: number; type: string; note: string | null; user: string | null; createdAt: string }> }

export const FILES_KEY = "companyFiles";
export const FILES_ABILITY = "arquivos";

export const filesApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`company-files/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`company-files/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`company-files/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`company-files/${path}`)).data,
};

/** O ícone diz o que é o arquivo, pelo tipo e pela extensão. */
export function fileIcon(file: Pick<FileInfo, "mimeType" | "fileName">): string {
  const extension = (file.fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "").toLowerCase();
  if (file.mimeType.startsWith("image/")) return "file-image";
  if (file.mimeType.startsWith("video/")) return "file-video";
  if (file.mimeType.startsWith("audio/")) return "file-audio";
  if (file.mimeType === "application/pdf" || ["doc", "docx", "odt", "txt"].includes(extension)) return "file-text";
  if (["xls", "xlsx", "csv", "ods"].includes(extension)) return "file-spreadsheet";
  if (["zip", "rar", "7z", "gz"].includes(extension)) return "file-archive";
  return "file";
}

export const dateTimeBr = (value: string) => new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export async function openFile(file: Pick<FileInfo, "id" | "name">, download = false) {
  try {
    await openApiFile(`company-files/files/${file.id}/file`, file.name, download);
  } catch (err) {
    toast({ title: "Não foi possível abrir o arquivo", description: errorMessage(err), variant: "destructive" });
  }
}

/** Um diálogo de um campo só: nome de pasta nova, renomear pasta, renomear arquivo. */
export function NameDialog({ title, description, label, initial = "", confirm, onSubmit, onClose }: {
  title: string; description?: string; label: string; initial?: string; confirm: string; onSubmit: (name: string) => Promise<unknown>; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => onSubmit(name.trim()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError("Informe o nome.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label htmlFor="file-name">{label} <span>*</span></Label>
            <Input id="file-name" name="name" value={name} autoFocus onValueChange={(_, value) => { setName(String(value)); setError(""); }} className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : confirm}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Mover um arquivo ou uma pasta: escolhe o destino entre as pastas que a pessoa vê. */
export function MoveDialog({ title, currentId, excludeId, allowRoot = false, onSubmit, onClose }: {
  title: string; currentId: number | null; /** a pasta que está sendo movida: ela e as de dentro não podem ser o destino */ excludeId?: number; allowRoot?: boolean;
  onSubmit: (folderId: number | null) => Promise<unknown>; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({ queryKey: [FILES_KEY, "folders"], queryFn: () => filesApi.get<{ rows: FolderOption[] }>("folders") });
  const blocked = new Set<number>();
  if (excludeId && data) {
    blocked.add(excludeId);
    // as de dentro da pasta movida: o caminho delas começa pelo caminho dela
    const own = data.rows.find((row) => row.id === excludeId)?.path;
    if (own) for (const row of data.rows) if (row.path.startsWith(`${own} › `)) blocked.add(row.id);
  }
  const options = [
    ...(allowRoot && currentId !== null ? [{ id: "root", name: "Primeiro nível (sem pasta de cima)" }] : []),
    ...(data?.rows ?? []).filter((row) => !blocked.has(row.id) && row.id !== currentId).map((row) => ({ id: String(row.id), name: row.path })),
  ];
  const { mutate, isPending } = useMutation({
    mutationFn: () => onSubmit(target === "root" ? null : Number(target)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); toast({ title: "Movido", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Escolha a pasta de destino.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Destino <span>*</span></Label>
            {isLoading ? <Skeleton className="h-9 w-full mt-1" /> : <Select name="target" options={options} state={target} modal placeholder="Selecione a pasta" onChange={(_, value) => { setTarget(String(value ?? "")); setError(""); }} />}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={isPending || !target} onClick={() => mutate()}>{isPending ? "Movendo..." : "Mover"}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Quem acessa a pasta: todos que usam o módulo, ou só os perfis escolhidos. As pastas de dentro seguem esta. */
export function AccessDialog({ folder, onClose }: { folder: FolderInfo; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [restricted, setRestricted] = useState(folder.restricted);
  const [profileIds, setProfileIds] = useState<string[]>(folder.profileIds.map(String));
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({ queryKey: [FILES_KEY, "profiles"], queryFn: () => filesApi.get<{ rows: PathItem[] }>("profiles") });
  const { mutate, isPending } = useMutation({
    mutationFn: () => filesApi.put(`folders/${folder.id}`, { restricted, profileIds: restricted ? profileIds.map(Number) : [] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); toast({ title: "Acesso atualizado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = () => {
    if (restricted && !profileIds.length) return setError("Escolha pelo menos um perfil.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quem acessa "{folder.name}"</DialogTitle>
          <DialogDescription>As pastas de dentro seguem esta. Quem administra os arquivos vê todas as pastas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox className="mt-0.5" aria-label="Restringir a alguns perfis" checked={restricted} onCheckedChange={(checked) => { setRestricted(checked === true); setError(""); }} />
            <span>
              <span className="font-medium">Restringir a alguns perfis</span>
              <span className="block text-xs text-muted-foreground">Desmarcada, a pasta aparece para todos que usam os Arquivos.</span>
            </span>
          </label>
          {restricted && (
            <div>
              <Label>Perfis com acesso <span>*</span></Label>
              {isLoading ? <Skeleton className="h-9 w-full mt-1" /> : (
                <Select name="profileIds" multiple modal options={(data?.rows ?? []).map((row) => ({ id: String(row.id), name: row.name }))} state={profileIds} placeholder="Selecione os perfis"
                  onChange={(_, value) => { setProfileIds(Array.isArray(value) ? value.map(String) : value ? [String(value)] : []); setError(""); }} />
              )}
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={isPending} onClick={submit}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EVENT_LABEL: Record<string, string> = {
  envio: "Enviou", visualizado: "Abriu", download: "Baixou", renomeado: "Renomeou", movido: "Moveu", lixeira: "Mandou para a lixeira", restaurado: "Restaurou", excluido: "Apagou de vez",
};

/** Para quem administra: quem enviou, abriu, baixou e mudou o arquivo. */
export function HistoryDialog({ file, onClose }: { file: Pick<FileInfo, "id" | "name">; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: [FILES_KEY, "history", file.id], queryFn: () => filesApi.get<FileHistory>(`files/${file.id}/history`) });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de acesso</DialogTitle>
          <DialogDescription className="truncate">{file.name}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-sm">Erro: {errorMessage(error)}</p>}
        {isLoading && <Skeleton className="h-32 w-full" />}
        {data && !data.rows.length && <p className="text-sm text-muted-foreground">Nenhum registro.</p>}
        {!!data?.rows.length && (
          <ul className="max-h-[60vh] overflow-y-auto divide-y text-sm">
            {data.rows.map((row) => (
              <li key={row.id} className="py-2">
                <p><span className="font-medium">{row.user ?? "Sistema"}</span> · {EVENT_LABEL[row.type] ?? row.type}</p>
                <p className="text-xs text-muted-foreground">{dateTimeBr(row.createdAt)}{row.note && row.type !== "envio" ? ` · ${row.note}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
