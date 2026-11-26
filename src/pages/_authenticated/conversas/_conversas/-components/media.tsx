import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../../comercial/-shared/commercial";
import { CHAT_KEY, ChatMessage, chatApi } from "../../-shared/chat";

/** Mídia das conversas: o que aparece no balão e as ferramentas de anexo e áudio. */

export const MEDIA_ICON: Record<string, string> = { image: "image", audio: "mic", video: "video", document: "file-text", sticker: "sticker", location: "map-pin", contact: "contact-round", other: "message-square" };
export const MEDIA_LABEL: Record<string, string> = { image: "Foto", audio: "Áudio", video: "Vídeo", document: "Documento", sticker: "Figurinha", location: "Localização", contact: "Contato", other: "Mensagem" };

export const fileSize = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
};
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

// ---------------------------------------------------------------- no balão

export function MessageMedia({ message, out, onRetry, retrying, conversationId }: { message: ChatMessage; out: boolean; onRetry?: () => void; retrying?: boolean; conversationId?: number }) {
  const media = message.media ?? {};
  const [viewer, setViewer] = useState(false);
  const [broken, setBroken] = useState(false);
  const type = message.type;

  if (type === "location" && typeof media.lat === "number") {
    return (
      <a href={`https://www.google.com/maps?q=${media.lat},${media.lng}`} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 rounded-lg bg-foreground/5 px-2.5 py-2 text-xs font-medium hover:bg-foreground/10">
        <Icon name="map-pin" className="h-4 w-4 text-primary" />Abrir localização no mapa<Icon name="external-link" className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
      </a>
    );
  }
  if (media.state === "pending") {
    return (
      <span className="mb-1 flex items-center gap-2 rounded-lg bg-foreground/5 px-2.5 py-2 text-xs text-muted-foreground">
        <Icon name="loader-circle" className="h-4 w-4 animate-spin" />Baixando {MEDIA_LABEL[type]?.toLowerCase() ?? "arquivo"}…
      </span>
    );
  }
  if (!media.url || broken) {
    if (media.state === "history" && onRetry) {
      return (
        <button type="button" disabled={retrying} onClick={onRetry} className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded-lg bg-foreground/5 px-2.5 py-2 text-left text-xs text-muted-foreground hover:bg-foreground/10">
          <Icon name={MEDIA_ICON[type] ?? "paperclip"} className="h-4 w-4" />
          <span className="truncate">{media.fileName || MEDIA_LABEL[type] || "Anexo"}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary"><Icon name={retrying ? "loader-circle" : "download"} className={cn("h-3 w-3", retrying && "animate-spin")} />baixar</span>
        </button>
      );
    }
    const why = broken ? "não deu para abrir" : media.state === "too_big" ? "grande demais para baixar" : media.state === "failed" ? "não deu para baixar" : "abre no celular";
    return (
      <span className="mb-1 flex items-center gap-2 rounded-lg bg-foreground/5 px-2.5 py-2 text-xs text-muted-foreground">
        <Icon name={MEDIA_ICON[type] ?? "paperclip"} className="h-4 w-4" />
        <span className="truncate">{media.fileName || MEDIA_LABEL[type] || "Anexo"}</span>
        {onRetry && (media.state === "failed" || broken) ? (
          <button type="button" disabled={retrying} onClick={() => { setBroken(false); onRetry(); }} className="ml-auto flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            <Icon name={retrying ? "loader-circle" : "rotate-ccw"} className={cn("h-3 w-3", retrying && "animate-spin")} />{why} · tentar de novo
          </button>
        ) : <span className="ml-auto shrink-0 text-[10px] opacity-70">{why}</span>}
      </span>
    );
  }

  if (type === "image" || type === "sticker") {
    return (
      <>
        <button type="button" onClick={() => type === "image" && setViewer(true)} className={cn("-mx-1.5 -mt-0.5 mb-1 block overflow-hidden rounded-xl", type === "image" ? "cursor-zoom-in" : "cursor-default bg-transparent")}>
          <img src={media.url} alt={MEDIA_LABEL[type]} loading="lazy" onError={() => setBroken(true)} className={cn("block object-cover", type === "sticker" ? "h-32 w-32 object-contain" : "max-h-80 w-full min-w-48 max-w-xs")} />
        </button>
        <Dialog open={viewer} onOpenChange={setViewer}>
          <DialogContent className="max-w-[min(64rem,95vw)] border-0 bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">Foto</DialogTitle>
            <img src={media.url} alt="Foto" className="max-h-[85dvh] w-full rounded-xl object-contain" />
            <div className="flex justify-center">
              <Button asChild size="sm" variant="secondary"><a href={media.url} target="_blank" rel="noreferrer" download><Icon name="download" className="mr-1.5 h-4 w-4" />Baixar</a></Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  if (type === "video") {
    return <video src={media.url} controls preload="metadata" className="-mx-1.5 -mt-0.5 mb-1 block max-h-80 w-full min-w-56 max-w-xs rounded-xl bg-black" />;
  }
  if (type === "audio") {
    return (
      <>
        <AudioPlayer src={media.url} seconds={media.seconds ?? null} voice={!!media.ptt} out={out} />
        {!out && conversationId ? <Transcript message={message} conversationId={conversationId} /> : null}
      </>
    );
  }
  return (
    <a href={media.url} target="_blank" rel="noreferrer" download={media.fileName ?? undefined} className="mb-1 flex min-w-56 items-center gap-3 rounded-lg bg-foreground/5 px-2.5 py-2 transition-colors hover:bg-foreground/10">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-primary"><Icon name="file-text" className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{media.fileName || "Documento"}</span>
        <span className="text-[11px] text-muted-foreground">{[fileSize(media.size), String(media.mimetype ?? "").split("/")[1]?.toUpperCase()].filter(Boolean).join(" · ")}</span>
      </span>
      <Icon name="download" className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

/** Player de áudio no padrão do sistema: tocar/pausar, barra e tempo. */
export function AudioPlayer({ src, seconds, voice, out }: { src: string; seconds: number | null; voice: boolean; out: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(seconds ?? 0);
  const [speed, setSpeed] = useState(1);
  const pct = length ? Math.min(100, (time / length) * 100) : 0;

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play(); else el.pause();
  };
  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = audio.current;
    if (!el || !length) return;
    const box = event.currentTarget.getBoundingClientRect();
    el.currentTime = ((event.clientX - box.left) / box.width) * length;
  };
  const cycle = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  return (
    <div className="mb-1 flex w-64 max-w-full items-center gap-2.5 py-0.5">
      <audio ref={audio} src={src} preload="metadata"
        onLoadedMetadata={(event) => { const d = event.currentTarget.duration; if (Number.isFinite(d) && d > 0) setLength(d); }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); }} />
      <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"}
        className={cn("grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors", out ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-foreground/10 hover:bg-foreground/15")}>
        <Icon name={playing ? "pause" : "play"} className={cn("h-4 w-4", !playing && "translate-x-px")} />
      </button>
      <div className="min-w-0 flex-1">
        <div role="slider" aria-label="Posição do áudio" aria-valuemin={0} aria-valuemax={Math.round(length)} aria-valuenow={Math.round(time)} tabIndex={0} onClick={seek}
          className="relative h-5 cursor-pointer">
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/15" />
          <span className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-xs" style={{ left: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
          <span className="flex items-center gap-1">{voice && <Icon name="mic" className="h-2.5 w-2.5" />}{clock(playing || time ? time : length)}</span>
          <button type="button" onClick={cycle} className="cursor-pointer rounded px-1 font-semibold hover:bg-foreground/10">{speed}×</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- no compositor

export const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/3gpp,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";
export const MAX_FILE = 16 * 1024 * 1024;

/** Arquivo escolhido, antes de enviar: miniatura (ou ícone), nome, tamanho e tirar. */
export function PendingFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document";
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border bg-background p-2 pr-3">
      {preview ? <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-primary"><Icon name={MEDIA_ICON[kind]} className="h-5 w-5" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="text-xs text-muted-foreground">{MEDIA_LABEL[kind]} · {fileSize(file.size)}{kind !== "audio" ? " · o texto vai como legenda" : ""}</span>
      </span>
      <Tip text="Tirar o arquivo"><button type="button" onClick={onRemove} aria-label="Tirar o arquivo" className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted"><Icon name="x" className="h-4 w-4" /></button></Tip>
    </div>
  );
}

/** Formato que o navegador grava (Chrome: webm/opus; Safari: mp4). */
const recorderType = () => ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";

/** Gravação de voz: começa ao montar; cancelar descarta, enviar devolve o arquivo. */
export function VoiceRecorder({ onCancel, onDone }: { onCancel: () => void; onDone: (file: File) => void }) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [levels, setLevels] = useState<number[]>(() => Array(28).fill(0.08));
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const finish = useRef<"send" | "cancel">("cancel");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let frame = 0;
    let ctx: AudioContext | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const type = recorderType();
        const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
        recorder.current = rec;
        rec.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
        rec.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop());
          if (finish.current !== "send" || !chunks.current.length) return;
          const mime = (rec.mimeType || type || "audio/webm").split(";")[0];
          const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
          onDone(new File(chunks.current, `audio-${Date.now()}.${ext}`, { type: mime }));
        };
        rec.start(250);
        const started = Date.now();
        timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
        // ondas simples a partir do volume
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let last = 0;
        const tick = (now: number) => {
          frame = requestAnimationFrame(tick);
          if (now - last < 90) return;
          last = now;
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
          setLevels((list) => [...list.slice(1), Math.max(0.08, Math.min(1, peak * 2.2))]);
        };
        frame = requestAnimationFrame(tick);
      } catch {
        setError("Não deu para usar o microfone. Libere o acesso ao microfone para este site no navegador.");
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      cancelAnimationFrame(frame);
      void ctx?.close();
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = (how: "send" | "cancel") => {
    finish.current = how;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    if (how === "cancel") onCancel();
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Icon name="mic-off" className="h-4 w-4 shrink-0" /><span className="flex-1">{error}</span>
        <Button size="sm" variant="ghost" onClick={onCancel}>Voltar</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Tip text="Descartar a gravação">
        <Button type="button" variant="ghost" className="h-11 w-11 shrink-0 rounded-full p-0 text-muted-foreground hover:text-red-600" onClick={() => stop("cancel")} aria-label="Descartar"><Icon name="trash-2" className="h-5 w-5" /></Button>
      </Tip>
      <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-background px-3">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
        <span className="w-10 shrink-0 text-sm font-medium tabular-nums">{clock(seconds)}</span>
        <span className="flex h-6 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
          {levels.map((level, i) => <span key={i} className="w-[3px] shrink-0 rounded-full bg-primary/70" style={{ height: `${Math.round(level * 100)}%` }} />)}
        </span>
      </div>
      <Button type="button" onClick={() => stop("send")} disabled={seconds < 1} className="h-11 w-11 shrink-0 rounded-full p-0" aria-label="Enviar áudio">
        <Icon name="send-horizontal" className="h-5 w-5" />
      </Button>
    </div>
  );
}

/** Texto do áudio (transcrito sozinho ou pedido aqui). */
function Transcript({ message, conversationId }: { message: ChatMessage; conversationId: number }) {
  const queryClient = useQueryClient();
  const media = message.media ?? {};
  const [open, setOpen] = useState(true);
  const ask = useMutation({
    mutationFn: () => chatApi.post(`conversations/${conversationId}/messages/${message.id}/transcribe`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "conversation", conversationId] }),
    onError: (err) => toast({ title: "Não deu para transcrever", description: errorMessage(err), variant: "destructive" }),
  });
  if (media.transcriptState === "pending" || ask.isPending) {
    return <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon name="loader-circle" className="h-3 w-3 animate-spin" />Transcrevendo…</p>;
  }
  if (media.transcript) {
    return (
      <div className="mt-1 max-w-xs">
        <button type="button" onClick={() => setOpen(!open)} className="flex cursor-pointer items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
          <Icon name="captions" className="h-3 w-3" />Transcrição<Icon name={open ? "chevron-up" : "chevron-down"} className="h-3 w-3" />
        </button>
        {open && <p className="mt-0.5 text-[13px] italic leading-snug text-foreground/80">{media.transcript}</p>}
      </div>
    );
  }
  return (
    <button type="button" onClick={() => ask.mutate()} className="mt-1 flex cursor-pointer items-center gap-1 text-[11px] font-medium text-primary hover:underline">
      <Icon name="captions" className="h-3 w-3" />{media.transcriptState === "failed" ? "Transcrição falhou · tentar de novo" : "Transcrever"}
    </button>
  );
}
