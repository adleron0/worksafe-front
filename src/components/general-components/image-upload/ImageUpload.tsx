import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Crop, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./ImageCropDialog";
import { resolvePreset, type ImagePreset, type ImagePresetName } from "./presets";
import {
  formatBytes,
  matchesAccept,
  prepareFile,
  prepareRemote,
  renderCrop,
  type WorkingImage,
} from "./imageProcessing";

export interface ImageUploadProps {
  /**
   * Arquivo escolhido, se o formulário controla. Quando passa a `null` (reset do
   * formulário), o componente limpa a imagem local. Opcional.
   */
  value?: File | null;
  /** Imagem já salva (URL da API), mostrada até a pessoa trocar ou remover. */
  previewUrl?: string | null;
  /** Recebe o arquivo final, já recortado e reduzido, ou `null` ao remover. */
  onChange: (file: File | null) => void;
  /** Proporções, tamanho e formato. Ver presets.ts. */
  preset?: ImagePresetName | ImagePreset;
  /** Tipos aceitos (validados também ao arrastar e colar). */
  accept?: string;
  /** Tamanho máximo do arquivo de origem. O enviado fica bem menor. */
  maxSizeMB?: number;
  /** Abre o recorte ao escolher a imagem (padrão: sim). */
  crop?: boolean;
  /** Sobrepõe o enquadramento da predefinição no quadro. */
  fit?: "cover" | "contain";
  disabled?: boolean;
  className?: string;
}

const CHECKER: React.CSSProperties = {
  backgroundColor: "#fafafa",
  backgroundImage:
    "linear-gradient(45deg,#ececec 25%,transparent 25%),linear-gradient(-45deg,#ececec 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ececec 75%),linear-gradient(-45deg,transparent 75%,#ececec 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
};

function acceptLabel(accept: string) {
  if (accept.includes("image/*")) return "JPG, PNG, WebP ou HEIC";
  return accept
    .split(",")
    .map((t) => t.trim().replace("image/", "").replace(/^\./, "").toUpperCase())
    .join(", ");
}

function ActionButton({ label, onClick, children, destructive }: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={destructive ? "destructive" : "secondary"}
          aria-label={label}
          className="h-7 w-7 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ImageUpload({
  value,
  previewUrl,
  onChange,
  preset: presetProp,
  accept = "image/*",
  maxSizeMB = 30,
  crop = true,
  fit,
  disabled,
  className,
}: ImageUploadProps) {
  const preset = useMemo(() => resolvePreset(presetProp), [presetProp]);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const dragDepth = useRef(0);

  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [original, setOriginal] = useState<WorkingImage | null>(null);
  const [pending, setPending] = useState<WorkingImage | null>(null);
  const [removed, setRemoved] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para liberar os objectURLs certos sem depender de closures antigas.
  const urls = useRef({ local: null as string | null, original: null as string | null });

  const clearLocal = useCallback(() => {
    if (urls.current.local) URL.revokeObjectURL(urls.current.local);
    if (urls.current.original) URL.revokeObjectURL(urls.current.original);
    urls.current = { local: null, original: null };
    setLocalFile(null);
    setLocalUrl(null);
    setOriginal(null);
    setDims(null);
  }, []);

  useEffect(() => () => {
    if (urls.current.local) URL.revokeObjectURL(urls.current.local);
    if (urls.current.original) URL.revokeObjectURL(urls.current.original);
  }, []);

  // A imagem salva mudou (outro registro, reset do formulário): começa de novo.
  useEffect(() => {
    setRemoved(false);
    setError(null);
    clearLocal();
  }, [previewUrl, clearLocal]);

  // Formulário controlado voltou para vazio.
  useEffect(() => {
    if (value === null && localFile) clearLocal();
  }, [value, localFile, clearLocal]);

  const showError = useCallback((message: string) => {
    setError(message);
    window.setTimeout(() => setError((current) => (current === message ? null : current)), 5000);
  }, []);

  const commit = useCallback((file: File, source: WorkingImage) => {
    if (urls.current.local) URL.revokeObjectURL(urls.current.local);
    if (urls.current.original && urls.current.original !== source.url) {
      URL.revokeObjectURL(urls.current.original);
    }
    const url = URL.createObjectURL(file);
    urls.current = { local: url, original: source.url };
    setLocalFile(file);
    setLocalUrl(url);
    setOriginal(source);
    setRemoved(false);
    setError(null);
    onChange(file);
  }, [onChange]);

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file || disabled) return;
    if (!matchesAccept(file, accept)) {
      showError(`Arquivo não aceito. Envie ${acceptLabel(accept)}.`);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`Arquivo de ${formatBytes(file.size)}. O limite é ${maxSizeMB} MB.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const working = await prepareFile(file);
      if (crop) {
        setPending(working);
      } else {
        const out = await renderCrop({
          src: working.url,
          area: { x: 0, y: 0, width: working.width, height: working.height },
          rotation: 0,
          preset,
          trim: false,
          transparent: false,
          source: working,
        });
        commit(out, working);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Não foi possível abrir a imagem.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [accept, commit, crop, disabled, maxSizeMB, preset, showError]);

  // Colar (Ctrl+V) com o mouse em cima ou o quadro focado. Texto colado passa direto.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const focused = containerRef.current?.contains(document.activeElement);
      if (!hoveredRef.current && !focused) return;
      const item = Array.from(event.clipboardData?.items ?? []).find(
        (i) => i.kind === "file" && i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      handleFile(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const openPicker = () => {
    if (!disabled && !loading) inputRef.current?.click();
  };

  const recrop = async () => {
    if (original) {
      setPending(original);
      return;
    }
    if (!displayUrl) return;
    setLoading(true);
    try {
      const working = await prepareRemote(displayUrl);
      urls.current.original = working.url;
      setOriginal(working);
      setPending(working);
    } catch {
      showError("Não deu para abrir a imagem atual para recortar. Envie o arquivo de novo.");
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    clearLocal();
    setRemoved(true);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };

  const cancelCrop = () => {
    if (pending && pending.url !== urls.current.original) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const confirmCrop = (file: File) => {
    if (pending) commit(file, pending);
    setPending(null);
  };

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  const displayUrl = localUrl ?? (!removed ? previewUrl || null : null);
  const objectFit = fit ?? preset.fit;
  const showChecker = objectFit === "contain" || preset.format !== "jpeg";

  return (
    <>
      <div
        ref={containerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={displayUrl ? "Trocar imagem" : "Escolher imagem"}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onMouseEnter={() => (hoveredRef.current = true)}
        onMouseLeave={() => (hoveredRef.current = false)}
        onDragEnter={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current = 0;
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group relative flex h-full min-h-[8rem] w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed text-center outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary",
          dragging ? "border-primary bg-primary/5" : "border-input",
          displayUrl && !dragging && "border-solid border-border",
          className,
        )}
      >
        <input
          ref={inputRef}
          id={`image-upload-${inputId}`}
          type="file"
          accept={accept.includes("image/*") ? `${accept},.heic,.heif` : accept}
          className="hidden"
          tabIndex={-1}
          onChange={(e) => handleFile(e.target.files?.[0])}
          onClick={(e) => e.stopPropagation()}
        />

        {displayUrl ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={showChecker ? CHECKER : undefined}
          >
            <img
              src={displayUrl}
              alt="Imagem selecionada"
              draggable={false}
              onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className={cn(
                preset.round
                  ? "aspect-square h-[calc(100%-1rem)] max-w-[calc(100%-1rem)] rounded-full object-cover"
                  : cn("h-full w-full", objectFit === "cover" ? "object-cover" : "object-contain p-2"),
              )}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 px-3 py-4 text-xs text-muted-foreground transition-colors group-hover:text-primary">
            <ImagePlus className="h-6 w-6" />
            <p className="font-medium">Arraste, cole ou clique para escolher</p>
            {preset.hint && <p className="opacity-80">{preset.hint}</p>}
            <p className="opacity-60">{acceptLabel(accept)} · até {maxSizeMB} MB</p>
          </div>
        )}

        {displayUrl && !disabled && (
          <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <ActionButton label="Recortar" onClick={recrop}>
              <Crop className="h-3.5 w-3.5" />
            </ActionButton>
            <ActionButton label="Trocar imagem" onClick={openPicker}>
              <RefreshCw className="h-3.5 w-3.5" />
            </ActionButton>
            <ActionButton label="Remover imagem" onClick={remove} destructive>
              <Trash2 className="h-3.5 w-3.5" />
            </ActionButton>
          </div>
        )}

        {displayUrl && localFile && dims && (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {dims.w}×{dims.h} · {formatBytes(localFile.size)}
          </span>
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-primary/10 text-sm font-medium text-primary backdrop-blur-[1px]">
            <ImagePlus className="h-6 w-6" />
            Solte para usar esta imagem
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="absolute inset-x-0 bottom-0 bg-destructive px-2 py-1 text-xs text-destructive-foreground"
          >
            {error}
          </div>
        )}
      </div>

      <ImageCropDialog
        open={!!pending}
        image={pending}
        preset={preset}
        onCancel={cancelCrop}
        onConfirm={confirmCrop}
      />
    </>
  );
}

export default ImageUpload;
