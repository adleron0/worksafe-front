import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import type { DocStatus } from "@/components/general-components/DocStatusBadge";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { openApiFile, openUrl, sizeText } from "@/lib/open-file";
import { FilesBase, uploadLarge } from "./upload";
import { NumField, errorMessage, todayIso } from "../../comercial/-shared/commercial";

/** Arquivos da empresa: tipos (espelham a API), chamadas e os diálogos de pasta e de arquivo. */
export interface FolderInfo { id: number; parentId: number | null; name: string; restricted: boolean; profileIds: number[]; locked: boolean; files: number; folders: number; status: DocStatus; statusLabel: string }
export interface FileInfo {
  id: number; folderId: number | null; entity?: string | null; entityId?: number | null; name: string; fileName: string; mimeType: string; size: number; notes: string | null; inline: boolean; uploadedBy: string | null; createdAt: string;
  typeId: number | null; typeName: string | null; issueDate: string | null; expiryDate: string | null; warnDays: number | null; status: DocStatus; statusLabel: string;
  versions?: Array<FileInfo & { replacedAt: string }>;
}
export interface FileType { id: number; name: string; expires: boolean; validityMonths: number | null; warnDays: number; required: boolean; inactive: boolean }
export interface ExpiringRow {
  key: string; fileId: number | null; folderId: number | null; name: string; where: string; typeId: number | null; typeName: string | null; status: DocStatus; statusLabel: string; expiryDate: string | null; days: number | null;
}
export interface ExpiringList { today: string; summary: { vencido: number; a_vencer: number; faltando: number }; total: number; rows: ExpiringRow[]; types: PathItem[] }
export interface PathItem { id: number; name: string }
export interface Browse { folder: FolderInfo | null; path: PathItem[]; folders: FolderInfo[]; files: FileInfo[]; types: FileType[]; maxBytes: number; directMaxBytes: number; trashDays: number }
export interface SearchResult { folders: Array<PathItem & { path: PathItem[] }>; files: Array<FileInfo & { path: PathItem[] }>; total: number }
export interface FolderOption { id: number; parentId: number | null; name: string; path: string }
export interface TrashList {
  trashDays: number;
  folders: Array<{ id: number; name: string; from: string; trashedAt: string; trashedBy: string | null; daysLeft: number; files: number }>;
  files: Array<FileInfo & { from: string; trashedAt: string; trashedBy: string | null; daysLeft: number }>;
}
export interface RecordFiles {
  record: { entity: string; id: number; label: string }; canWrite: boolean; canManage: boolean; files: FileInfo[];
  trashed: Array<FileInfo & { trashedAt: string; trashedBy: string | null; daysLeft: number }>; maxBytes: number; directMaxBytes: number; trashDays: number;
}
export interface CustomerFiles { rows: Array<{ id: number; name: string; files: number; canOpen: boolean; records: Array<{ entity: "proposal" | "service_order"; id: number; label: string; files: number }> }> }
export interface FileHistory { file: PathItem; rows: Array<{ id: number; type: string; note: string | null; user: string | null; createdAt: string }> }

export const FILES_KEY = "companyFiles";
export const FILES_ABILITY = "arquivos";

export const filesApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`company-files/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`company-files/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`company-files/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`company-files/${path}`, body ?? {})).data,
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

/** Acima disto o arquivo não passa pela memória do navegador nem pela API: abre por um link temporário do armazenamento. */
const LINK_FROM_BYTES = 20 * 1024 * 1024;

export async function openFile(file: Pick<FileInfo, "id" | "name"> & { size?: number }, download = false, base: FilesBase = "company-files") {
  try {
    if ((file.size ?? 0) > LINK_FROM_BYTES) {
      const link = (await api.get<{ url: string }>(`${base}/files/${file.id}/link`, { params: download ? { download: 1 } : undefined })).data;
      return openUrl(link.url, download);
    }
    await openApiFile(`${base}/files/${file.id}/file`, file.name, download);
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
  envio: "Enviou", substituido: "Enviou uma versão nova", visualizado: "Abriu", download: "Baixou", renomeado: "Renomeou", movido: "Moveu", lixeira: "Mandou para a lixeira", restaurado: "Restaurou", excluido: "Apagou de vez",
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

/** Emissão + validade em meses, no mesmo dia (31/01 + 1 mês = último dia de fevereiro): a mesma conta da API. */
const addMonths = (date: string, months: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const total = month - 1 + months;
  const targetYear = year + Math.floor(total / 12);
  const targetMonth = total % 12;
  const last = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, last))).toISOString().slice(0, 10);
};

/**
 * Tipo de documento, emissão, vencimento e aviso: os mesmos campos ao ajustar um
 * arquivo e ao enviar uma versão nova. Enquanto a pessoa não mexer no vencimento,
 * ele acompanha a emissão e a validade do tipo.
 */
function useExpiryFields(types: FileType[], initial: { typeId: number | null; issueDate: string | null; expiryDate: string | null }, lockType = false) {
  const [type, setType] = useState(initial.typeId ? String(initial.typeId) : "");
  const [issueDate, setIssueDate] = useState(initial.issueDate ?? "");
  const [expiryDate, setExpiryDate] = useState(initial.expiryDate ?? "");
  const [touched, setTouched] = useState(!!initial.expiryDate);
  const current = types.find((item) => String(item.id) === type);
  const suggested = current?.expires && current.validityMonths && issueDate ? addMonths(issueDate, current.validityMonths) : "";
  const expiry = touched ? expiryDate : suggested;
  const problem = current?.expires && !expiry ? `${current.name} tem validade: informe o vencimento.` : issueDate && expiry && expiry < issueDate ? "O vencimento não pode ser antes da emissão." : "";
  const fields = (
    <>
      <div>
        <Label>Tipo de documento</Label>
        <Select name="type" options={types.map((item) => ({ id: String(item.id), name: item.name }))} state={type} modal clearable disabled={lockType} placeholder="Nenhum (arquivo comum)"
          onChange={(_, value) => { setType(String(value ?? "")); setTouched(false); setExpiryDate(""); }} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Emissão</Label>
          <CalendarPicker mode="single" name="issueDate" className="mt-1 w-full" value={issueDate} placeholder="Não informada" fromYear={2000} toYear={2040} onValueChange={(_, value) => setIssueDate(String(value ?? ""))} />
        </div>
        <div>
          <Label>Vencimento {current?.expires && <span>*</span>}</Label>
          <CalendarPicker mode="single" name="expiryDate" className="mt-1 w-full" value={expiry} placeholder={current?.expires ? "Escolha" : "Não vence"} fromYear={2000} toYear={2060}
            onValueChange={(_, value) => { setExpiryDate(String(value ?? "")); setTouched(true); }} />
        </div>
      </div>
      {current?.expires && current.validityMonths && !touched && issueDate && <p className="-mt-2 text-xs text-muted-foreground">{current.name} vale {current.validityMonths} {current.validityMonths === 1 ? "mês" : "meses"}: o vencimento foi calculado pela emissão. Corrija se o documento disser outra data.</p>}
    </>
  );
  return { fields, problem, values: { typeId: type ? Number(type) : null, issueDate: issueDate || null, expiryDate: expiry || null } };
}

/** Ajustar um arquivo: tipo de documento, emissão, vencimento, dias de aviso e a observação. */
export function DetailsDialog({ file, types, onClose }: { file: FileInfo; types: FileType[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const expiry = useExpiryFields(types, file);
  const [ownWarn, setOwnWarn] = useState(file.warnDays !== null);
  const [warnDays, setWarnDays] = useState(file.warnDays ?? 30);
  const [notes, setNotes] = useState(file.notes ?? "");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => filesApi.put(`files/${file.id}`, { ...expiry.values, warnDays: ownWarn ? warnDays : null, notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); toast({ title: "Arquivo atualizado", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (expiry.problem) return setError(expiry.problem);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vencimento e detalhes</DialogTitle>
          <DialogDescription className="truncate">{file.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {expiry.fields}
          {expiry.values.expiryDate && (
            <div className="grid gap-2 rounded-card border bg-card p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox aria-label="Aviso próprio para este arquivo" checked={ownWarn} onCheckedChange={(checked) => setOwnWarn(checked === true)} />
                <span>Aviso próprio para este arquivo (o padrão é o do tipo, ou 30 dias)</span>
              </label>
              {ownWarn && (
                <div>
                  <Label className="text-xs">Avisar quantos dias antes</Label>
                  <NumField value={warnDays} digits={0} ariaLabel="Dias de antecedência do aviso" onChange={(value) => setWarnDays(Math.max(0, Math.min(365, Math.round(value))))} />
                </div>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="file-notes">Observação</Label>
            <Input id="file-notes" name="notes" value={notes} maxLength={500} onValueChange={(_, value) => setNotes(String(value))} className="mt-1" placeholder="Opcional" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Substituir por uma versão nova: o arquivo atual fica guardado como versão anterior. */
export function ReplaceDialog({ file, types, maxBytes, directMaxBytes, base = "company-files", onClose }: { file: FileInfo; types: FileType[]; maxBytes: number; directMaxBytes: number; base?: FilesBase; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  // a validade do arquivo novo não herda a do antigo: começa pela emissão de hoje
  const expiry = useExpiryFields(types, { typeId: file.typeId, issueDate: file.typeId || file.expiryDate ? todayIso() : null, expiryDate: null }, true);
  const [error, setError] = useState("");
  const [percent, setPercent] = useState(0);
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const chosen = picked as File;
      // arquivo grande vai direto ao armazenamento, em partes
      if (chosen.size > maxBytes) return uploadLarge(chosen, { replaceId: file.id, issueDate: expiry.values.issueDate, expiryDate: expiry.values.expiryDate }, setPercent, base);
      const form = new FormData();
      form.append("file", chosen);
      if (expiry.values.issueDate) form.append("issueDate", expiry.values.issueDate);
      if (expiry.values.expiryDate) form.append("expiryDate", expiry.values.expiryDate);
      return (await api.post(`${base}/files/${file.id}/replace`, form, { onUploadProgress: (event) => setPercent(event.total ? Math.round((event.loaded / event.total) * 100) : 0) })).data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); toast({ title: "Versão nova enviada", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!picked) return setError("Escolha o arquivo.");
    if (picked.size > directMaxBytes) return setError(`O arquivo passa de ${sizeText(directMaxBytes)}.`);
    if (expiry.problem) return setError(expiry.problem);
    setError(""); setPercent(0); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar versão nova</DialogTitle>
          <DialogDescription>"{file.name}": o arquivo atual fica guardado como versão anterior.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label>Arquivo <span>*</span></Label>
            <input ref={fileRef} type="file" className="hidden" onChange={(event) => { setPicked(event.target.files?.[0] ?? null); setError(""); }} />
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Icon name="paperclip" className="w-3 h-3 mr-1" /> {picked ? "Trocar arquivo" : "Escolher arquivo"}</Button>
              <span className="min-w-0 truncate text-sm text-muted-foreground">{picked ? `${picked.name} · ${sizeText(picked.size)}` : `Até ${sizeText(directMaxBytes)}`}</span>
            </div>
          </div>
          {(file.typeId || file.expiryDate) && expiry.fields}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? `Enviando... ${percent}%` : "Enviar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
