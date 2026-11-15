import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import DocumentFolder, { DocumentFolderTone } from "@/components/general-components/DocumentFolder";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { openApiFile, sizeText } from "@/lib/open-file";
import { Tip, dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { EMPLOYEES_KEY } from "./employees";

/** Documentos do funcionário: tipos (espelham a API), pastas, envio e o arquivo. */
export type DocStatus = "em_dia" | "a_vencer" | "vencido" | "sem_validade" | "faltando" | "vazia";
export interface DocType {
  id: number; name: string; folder: string; folderName: string; expires: boolean; validityMonths: number | null; warnDays: number;
  required: boolean; requiredProfessionalIds: number[]; inIntegration: boolean; inactive: boolean;
}
export interface EmployeeDoc {
  id: number; typeId: number; typeName: string; folder: string; issueDate: string | null; expiryDate: string | null; status: DocStatus; statusLabel: string;
  fileName: string; mimeType: string; size: number; notes: string | null; uploadedBy: string | null; createdAt: string; replacedAt: string | null;
  versions?: EmployeeDoc[];
}
export interface DocFolder { id: string; name: string; count: number; status: DocStatus; statusLabel: string; documents: EmployeeDoc[]; missing: Array<{ typeId: number; typeName: string }> }
export interface EmployeeDocs { employee: { id: number; name: string }; status: DocStatus; statusLabel: string; folders: DocFolder[]; types: DocType[] }
export interface DocTypes { folders: Array<{ id: string; name: string }>; professionals: Array<{ id: number; name: string }>; rows: DocType[] }
export interface ExpiringRow {
  key: string; documentId: number | null; employee: { id: number; name: string }; typeId: number; typeName: string; status: DocStatus; statusLabel: string; expiryDate: string | null; days: number | null;
}
export interface ExpiringList { today: string; summary: { vencido: number; a_vencer: number; faltando: number }; total: number; rows: ExpiringRow[]; types: Array<{ id: number; name: string }> }

export const DOCS_KEY = "hrEmployeeDocs";
export const DOC_TYPES_KEY = "hrDocTypes";
export const DOCS_EXPIRING_KEY = "hrDocsExpiring";
export const DOCS_ABILITY = "documentos_funcionarios";

export const documentsApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`hr-documents/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`hr-documents/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`hr-documents/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`hr-documents/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`hr-documents/${path}`)).data,
};

const STATUS_STYLE: Record<DocStatus, string> = {
  em_dia: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  a_vencer: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  vencido: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  faltando: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  sem_validade: "bg-muted text-muted-foreground",
  vazia: "bg-muted text-muted-foreground",
};
export const STATUS_TONE: Record<DocStatus, DocumentFolderTone> = { em_dia: "ok", a_vencer: "warn", vencido: "danger", faltando: "danger", sem_validade: "neutral", vazia: "neutral" };

export function DocStatusBadge({ status, label }: { status: DocStatus; label: string }) {
  return <span className={cn("inline-flex rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLE[status])}>{label}</span>;
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

/** O arquivo só sai pela API, com o login da pessoa (a peça é a mesma dos Arquivos da empresa). */
export async function openDocument(document: Pick<EmployeeDoc, "id" | "fileName">, download = false) {
  try {
    await openApiFile(`hr-documents/${document.id}/file`, document.fileName, download);
  } catch (err) {
    toast({ title: "Não foi possível abrir o documento", description: errorMessage(err), variant: "destructive" });
  }
}

/** Enviar (ou substituir) um documento: tipo, arquivo, emissão e vencimento sugerido pela validade do tipo. */
export function DocumentUploadDialog({ employee, types, typeId, folder, onClose }: { employee: { id: number; name: string }; types: DocType[]; typeId?: number; folder?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(typeId ? String(typeId) : "");
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState(todayIso());
  const [expiryDate, setExpiryDate] = useState("");
  // enquanto a pessoa não mexer no vencimento, ele acompanha a emissão e a validade do tipo
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [error, setError] = useState("");
  const current = types.find((item) => String(item.id) === type);
  const suggested = current?.expires && current.validityMonths && issueDate ? addMonths(issueDate, current.validityMonths) : "";
  const expiry = expiryTouched ? expiryDate : suggested;
  // os tipos da pasta aberta vêm primeiro
  const options = [...types].sort((a, b) => Number(b.folder === folder) - Number(a.folder === folder)).map((item) => ({ id: item.id, name: item.folder === folder || !folder ? item.name : `${item.name} (${item.folderName})` }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("file", file as File);
      form.append("typeId", type);
      if (issueDate) form.append("issueDate", issueDate);
      if (expiry) form.append("expiryDate", expiry);
      return (await api.post<EmployeeDocs>(`hr-documents/employee/${employee.id}`, form)).data;
    },
    onSuccess: (result) => {
      queryClient.setQueryData([DOCS_KEY, String(employee.id)], result);
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      queryClient.invalidateQueries({ queryKey: [DOCS_EXPIRING_KEY] });
      toast({ title: "Documento enviado", variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!type) return setError("Escolha o tipo do documento.");
    if (!file) return setError("Escolha o arquivo.");
    if (file.size > 10 * 1024 * 1024) return setError("O arquivo passa de 10 MB.");
    if (current?.expires && !expiry) return setError(`${current.name} tem validade: informe o vencimento.`);
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{typeId ? "Substituir documento" : "Enviar documento"}</DialogTitle>
          <DialogDescription>{employee.name}{typeId ? " · o documento atual fica guardado como versão anterior" : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label>Tipo de documento <span>*</span></Label>
            <Select name="type" options={options} state={type} modal disabled={!!typeId} onChange={(_, value) => { setType(String(value ?? "")); setExpiryTouched(false); setError(""); }} placeholder="Selecione" />
          </div>
          <div>
            <Label>Arquivo <span>*</span></Label>
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden"
              onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} />
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Icon name="paperclip" className="w-3 h-3 mr-1" /> {file ? "Trocar arquivo" : "Escolher arquivo"}</Button>
              <span className="min-w-0 truncate text-sm text-muted-foreground">{file ? `${file.name} · ${sizeText(file.size)}` : "PDF ou imagem, até 10 MB"}</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Emissão</Label>
              <CalendarPicker mode="single" name="issueDate" className="mt-1 w-full" value={issueDate} placeholder="Não informada" fromYear={2000} toYear={2040} onValueChange={(_, value) => setIssueDate(String(value ?? ""))} />
            </div>
            <div>
              <Label>Vencimento {current?.expires && <span>*</span>}</Label>
              <CalendarPicker mode="single" name="expiryDate" className="mt-1 w-full" value={expiry} placeholder={current?.expires ? "Escolha" : "Não vence"} fromYear={2000} toYear={2060}
                onValueChange={(_, value) => { setExpiryDate(String(value ?? "")); setExpiryTouched(true); }} />
            </div>
          </div>
          {current?.expires && current.validityMonths && !expiryTouched && <p className="-mt-2 text-xs text-muted-foreground">{current.name} vale {current.validityMonths} {current.validityMonths === 1 ? "mês" : "meses"}: o vencimento foi calculado pela emissão. Corrija se o documento disser outra data.</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A aba Documentos da ficha: as pastas e, embaixo, o que há na pasta aberta. */
export function EmployeeDocuments({ employeeId }: { employeeId: number }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [folderId, setFolderId] = useState("saude");
  const [uploading, setUploading] = useState<{ typeId?: number } | null>(null);
  const [versionsOf, setVersionsOf] = useState<number | null>(null);
  const canWrite = can(`update_${DOCS_ABILITY}`);

  const { data, isLoading, error } = useQuery({ queryKey: [DOCS_KEY, String(employeeId)], queryFn: () => documentsApi.get<EmployeeDocs>(`employee/${employeeId}`) });
  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => documentsApi.delete<EmployeeDocs>(String(id)),
    onSuccess: (result) => {
      queryClient.setQueryData([DOCS_KEY, String(employeeId)], result);
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      queryClient.invalidateQueries({ queryKey: [DOCS_EXPIRING_KEY] });
      toast({ title: "Documento retirado", variant: "success" });
    },
    onError: (err) => toast({ title: "Não foi possível retirar o documento", description: errorMessage(err), variant: "destructive" }),
  });

  if (error) return <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>;
  if (isLoading || !data) return <div className="grid gap-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>;
  const folder = data.folders.find((item) => item.id === folderId) ?? data.folders[0];

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Pastas</h2>
            <p className="text-xs text-muted-foreground">A cor da pasta mostra o pior caso dentro dela: vermelho para vencido ou faltando, amarelo para a vencer, verde para em dia.</p>
          </div>
          {canWrite && <Button type="button" onClick={() => setUploading({})}><Icon name="upload" className="w-4 h-4 mr-1" /> Enviar documento</Button>}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {data.folders.map((item) => (
            <DocumentFolder key={item.id} name={item.name} count={item.count} tone={STATUS_TONE[item.status]} statusLabel={item.status === "vazia" || item.status === "sem_validade" ? undefined : item.statusLabel}
              papers={item.documents.map((doc) => doc.typeName)} selected={item.id === folder.id} onSelect={() => setFolderId(item.id)} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="font-semibold">{folder.name}</h2>
          {folder.status !== "vazia" && folder.status !== "sem_validade" && <DocStatusBadge status={folder.status} label={folder.statusLabel} />}
        </div>
        {!folder.documents.length && !folder.missing.length && <p className="p-6 text-sm text-muted-foreground">Nenhum documento nesta pasta.</p>}
        {folder.missing.map((missing) => (
          <div key={`m${missing.typeId}`} className="flex flex-wrap items-center justify-between gap-2 border-b last:border-b-0 px-4 py-3 text-sm">
            <div className="flex items-center gap-2"><Icon name="file-question" className="w-4 h-4 text-muted-foreground" /> <span className="font-medium">{missing.typeName}</span> <DocStatusBadge status="faltando" label="Faltando" /></div>
            {canWrite && <Button type="button" variant="outline" size="sm" onClick={() => setUploading({ typeId: missing.typeId })}><Icon name="upload" className="w-3 h-3 mr-1" /> Enviar</Button>}
          </div>
        ))}
        {folder.documents.map((doc) => (
          <div key={doc.id} className="border-b last:border-b-0 px-4 py-3 text-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{doc.typeName}</span> <DocStatusBadge status={doc.status} label={doc.statusLabel} /></div>
                <p className="text-xs text-muted-foreground truncate">{doc.fileName} · {sizeText(doc.size)}{doc.uploadedBy ? ` · enviado por ${doc.uploadedBy}` : ""}</p>
              </div>
              <div className="lg:w-56 text-xs text-muted-foreground">
                <p>Emissão: {dateBr(doc.issueDate)}</p>
                <p>Vencimento: {doc.expiryDate ? dateBr(doc.expiryDate) : "não vence"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Tip text="Ver"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Ver ${doc.typeName}`} onClick={() => openDocument(doc)}><Icon name="eye" className="w-4 h-4" /></Button></Tip>
                <Tip text="Baixar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Baixar ${doc.typeName}`} onClick={() => openDocument(doc, true)}><Icon name="download" className="w-4 h-4" /></Button></Tip>
                {canWrite && <Tip text="Substituir por um novo"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Substituir ${doc.typeName}`} onClick={() => setUploading({ typeId: doc.typeId })}><Icon name="refresh-cw" className="w-4 h-4" /></Button></Tip>}
                {canWrite && (
                  <ConfirmDialog title="Retirar este documento?" description={doc.versions?.length ? "A versão anterior volta a valer." : "Use quando o documento foi enviado por engano."} onConfirm={() => remove(doc.id)}>
                    <span><Tip text="Retirar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Retirar ${doc.typeName}`}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip></span>
                  </ConfirmDialog>
                )}
              </div>
            </div>
            {!!doc.versions?.length && (
              <div className="mt-2">
                <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setVersionsOf(versionsOf === doc.id ? null : doc.id)}>
                  {versionsOf === doc.id ? "Esconder" : "Ver"} {doc.versions.length} {doc.versions.length === 1 ? "versão anterior" : "versões anteriores"}
                </button>
                {versionsOf === doc.id && (
                  <ul className="mt-2 grid gap-1 border-l-2 pl-3">
                    {doc.versions.map((old) => (
                      <li key={old.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{old.fileName}</span>
                        <span>emissão {dateBr(old.issueDate)}{old.expiryDate ? ` · vencia em ${dateBr(old.expiryDate)}` : ""}</span>
                        <button type="button" className="underline" onClick={() => openDocument(old)}>ver</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {uploading && <DocumentUploadDialog employee={data.employee} types={data.types} typeId={uploading.typeId} folder={folder.id} onClose={() => setUploading(null)} />}
    </div>
  );
}
