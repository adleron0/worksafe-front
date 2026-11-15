import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { errorMessage } from "../_authenticated/comercial/-shared/commercial";

interface Search { t?: string }
interface LinkImage { id: number; url: string; name: string; width: number | null; height: number | null }
interface LinkInfo { purpose: string; company: string | null; expiresAt: string; expired: boolean; maxFiles: number; images: LinkImage[] }

export const Route = createFileRoute("/_index/enviar-imagens")({
  validateSearch: (search: Record<string, unknown>): Search => ({ t: typeof search.t === "string" ? search.t : undefined }),
  component: SendImagesPage,
});

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Página do link de envio de imagens gerado pelo assistente (Claude, bots).
 * O app de IA não consegue repassar o arquivo anexado no chat: a pessoa
 * arrasta as imagens aqui e volta para a conversa. O token do link é a
 * autenticação (vale 30 minutos).
 */
function SendImagesPage() {
  const { t: token } = Route.useSearch();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const key = ["uploadLink", token];
  const { data, isLoading, error } = useQuery({
    queryKey: key, enabled: !!token, retry: false,
    queryFn: async () => (await api.get<LinkInfo>(`ai/upload-links/${token}`)).data,
  });
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      return (await api.post<{ images: LinkImage[] }>(`ai/upload-links/${token}/images`, form)).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const remaining = data ? data.maxFiles - data.images.length : 0;
  const send = (list: FileList | File[] | null) => {
    setLocalError("");
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) { setLocalError("Escolha arquivos de imagem (JPG, PNG ou WEBP)."); return; }
    const big = files.find((file) => file.size > MAX_BYTES);
    if (big) { setLocalError(`${big.name} passa de 20 MB.`); return; }
    if (files.length > remaining) { setLocalError(`Este link aceita mais ${remaining} imagem(ns).`); return; }
    upload.mutate(files);
  };
  const closed = !data || data.expired || remaining <= 0;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name="image-up" className="h-5 w-5" /></span>
          <div>
            <h1 className="text-lg font-semibold">Enviar imagens</h1>
            {data?.company && <p className="text-xs text-muted-foreground">{data.company}</p>}
          </div>
        </div>
        {!token && <p className="mt-4 text-sm text-muted-foreground">Link incompleto. Peça um novo link ao assistente.</p>}
        {token && isLoading && <Skeleton className="mt-4 h-40" />}
        {error && <p className="mt-4 text-sm text-destructive">{errorMessage(error)}</p>}
        {data && (
          <>
            <p className="mt-4 text-sm">Para: <strong>{data.purpose}</strong></p>
            {data.expired ? (
              <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">Este link expirou. Peça um novo ao assistente.</p>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => !closed && input.current?.click()}
                onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !closed) input.current?.click(); }}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); if (!closed) send(event.dataTransfer.files); }}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/50"} ${closed ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <Icon name={upload.isPending ? "loader-circle" : "upload"} className={`h-8 w-8 text-muted-foreground ${upload.isPending ? "animate-spin" : ""}`} />
                <span className="font-medium">{upload.isPending ? "Enviando..." : remaining > 0 ? "Arraste as imagens aqui ou toque para escolher" : "Limite de imagens atingido"}</span>
                <span className="text-xs text-muted-foreground">JPG, PNG ou WEBP, até 20 MB cada · faltam {Math.max(0, remaining)} de {data.maxFiles}</span>
              </div>
            )}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(event) => { send(event.target.files); event.target.value = ""; }} />
            {(localError || upload.error) && <p className="mt-2 text-sm text-destructive">{localError || errorMessage(upload.error)}</p>}
            {data.images.length > 0 && (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {data.images.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-md border">
                      <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                      <p className="truncate px-1.5 py-1 text-[11px] text-muted-foreground">{image.name}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <Icon name="circle-check" className="h-4 w-4 shrink-0" />
                  {data.images.length} imagem(ns) recebida(s). Volte à conversa e avise o assistente que terminou.
                </p>
              </>
            )}
            {!data.expired && remaining > 0 && data.images.length > 0 && (
              <Button type="button" variant="outline" className="mt-3 w-full" disabled={upload.isPending} onClick={() => input.current?.click()}>Enviar mais</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
