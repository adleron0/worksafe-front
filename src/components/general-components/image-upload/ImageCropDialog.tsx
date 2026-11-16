import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut, Crosshair, FlipHorizontal2, FlipVertical2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ImagePreset } from "./presets";
import { removeWhiteBackground, renderCrop, type WorkingImage } from "./imageProcessing";

interface ImageCropDialogProps {
  open: boolean;
  image: WorkingImage | null;
  preset: ImagePreset;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

/** Xadrez atrás da imagem, para enxergar o que ficou transparente. */
const CHECKER: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  backgroundImage:
    "linear-gradient(45deg,#e4e4e7 25%,transparent 25%),linear-gradient(-45deg,#e4e4e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e4e7 75%),linear-gradient(-45deg,transparent 75%,#e4e4e7 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

function IconAction({ label, onClick, children, disabled, active }: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  /** Liga/desliga (espelhar): destaca quando ligado. */
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ImageCropDialog({ open, image, preset, onCancel, onConfirm }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [aspectIndex, setAspectIndex] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [trim, setTrim] = useState(!!preset.trim);
  const [bgRemoved, setBgRemoved] = useState(!!preset.removeBackgroundDefault);
  const [sensitivity, setSensitivity] = useState(45);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef<string | null>(null);

  // Nova imagem: volta tudo ao início.
  useEffect(() => {
    if (!image) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setAspectIndex(0);
    setTrim(!!preset.trim);
    setBgRemoved(!!preset.removeBackgroundDefault);
    setError(null);
  }, [image, preset]);

  // Remoção do fundo: refaz quando liga, ou quando muda a sensibilidade.
  useEffect(() => {
    if (!image || !bgRemoved || !preset.removeBackground) {
      setProcessedUrl(null);
      return;
    }
    let cancelled = false;
    setProcessing(true);
    const timer = window.setTimeout(async () => {
      try {
        const url = await removeWhiteBackground(image.url, sensitivity);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (processedRef.current) URL.revokeObjectURL(processedRef.current);
        processedRef.current = url;
        setProcessedUrl(url);
      } catch {
        if (!cancelled) setError("Não foi possível remover o fundo desta imagem.");
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [image, bgRemoved, sensitivity, preset.removeBackground]);

  useEffect(() => () => {
    if (processedRef.current) URL.revokeObjectURL(processedRef.current);
  }, []);

  const swap = rotation % 180 !== 0;
  const aspectOption = preset.aspects[aspectIndex] ?? preset.aspects[0];
  const aspect = useMemo(() => {
    if (!image) return 1;
    if (aspectOption.value !== "original") return aspectOption.value;
    return swap ? image.height / image.width : image.width / image.height;
  }, [aspectOption, image, swap]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const recenter = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const rotate = (delta: number) => {
    setRotation((r) => (r + delta + 360) % 360);
    recenter();
  };

  const confirm = async () => {
    if (!image || !area) return;
    setBusy(true);
    setError(null);
    try {
      const file = await renderCrop({
        src: processedUrl ?? image.url,
        area,
        rotation,
        flip,
        preset,
        trim,
        transparent: !!processedUrl,
        source: image,
      });
      onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível recortar a imagem.");
    } finally {
      setBusy(false);
    }
  };

  const src = processedUrl ?? image?.url ?? "";
  const transparentPreview = !!processedUrl || preset.format !== "jpeg";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent
        className="max-w-2xl w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 gap-3"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Ajustar imagem</DialogTitle>
          <DialogDescription>
            Arraste para enquadrar e use o zoom. No celular, dá para usar dois dedos.
          </DialogDescription>
        </DialogHeader>

        <div
          className="relative w-full h-[min(45dvh,420px)] min-h-[220px] overflow-hidden rounded-md border"
          style={transparentPreview ? CHECKER : { backgroundColor: "#18181b" }}
        >
          {image && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              transform={[
                `translate(${crop.x}px, ${crop.y}px)`,
                `rotateZ(${rotation}deg)`,
                `rotateY(${flip.horizontal ? 180 : 0}deg)`,
                `rotateX(${flip.vertical ? 180 : 0}deg)`,
                `scale(${zoom})`,
              ].join(" ")}
              aspect={aspect}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomSpeed={0.15}
              cropShape={preset.round ? "round" : "rect"}
              showGrid={!preset.round}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { background: "transparent" } }}
            />
          )}
          {processing && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/90 px-2 py-1 text-xs shadow">
              <Loader2 className="h-3 w-3 animate-spin" /> Removendo fundo…
            </div>
          )}
        </div>

        {preset.aspects.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Proporção">
            <span className="text-xs text-muted-foreground mr-1">Proporção</span>
            {preset.aspects.map((option, index) => (
              <Button
                key={option.label}
                type="button"
                size="sm"
                role="radio"
                aria-checked={index === aspectIndex}
                variant={index === aspectIndex ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  setAspectIndex(index);
                  recenter();
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <IconAction label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </IconAction>
            <Slider
              className="flex-1"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={[zoom]}
              onValueChange={([z]) => setZoom(z)}
              aria-label="Zoom"
            />
            <IconAction label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </IconAction>
          </div>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex items-center justify-center gap-2">
            <IconAction label="Girar para a esquerda" onClick={() => rotate(-90)}>
              <RotateCcw className="h-4 w-4" />
            </IconAction>
            <IconAction label="Girar para a direita" onClick={() => rotate(90)}>
              <RotateCw className="h-4 w-4" />
            </IconAction>
            <IconAction
              label="Espelhar na horizontal"
              active={flip.horizontal}
              onClick={() => setFlip((f) => ({ ...f, horizontal: !f.horizontal }))}
            >
              <FlipHorizontal2 className="h-4 w-4" />
            </IconAction>
            <IconAction
              label="Espelhar na vertical"
              active={flip.vertical}
              onClick={() => setFlip((f) => ({ ...f, vertical: !f.vertical }))}
            >
              <FlipVertical2 className="h-4 w-4" />
            </IconAction>
            <IconAction label="Centralizar" onClick={recenter}>
              <Crosshair className="h-4 w-4" />
            </IconAction>
          </div>
        </div>

        {(preset.removeBackground || preset.trim) && (
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            {preset.removeBackground && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="crop-remove-bg" className="cursor-pointer">
                    Remover fundo branco
                    <span className="block text-xs font-normal text-muted-foreground">
                      Deixa o papel transparente e mantém só a tinta.
                    </span>
                  </Label>
                  <Switch id="crop-remove-bg" checked={bgRemoved} onCheckedChange={setBgRemoved} />
                </div>
                {bgRemoved && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">Sensibilidade</span>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[sensitivity]}
                      onValueChange={([v]) => setSensitivity(v)}
                      aria-label="Sensibilidade da remoção de fundo"
                    />
                  </div>
                )}
              </div>
            )}
            {preset.trim && (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="crop-trim" className="cursor-pointer">
                  Aparar margens
                  <span className="block text-xs font-normal text-muted-foreground">
                    Corta as bordas vazias em volta do conteúdo.
                  </span>
                </Label>
                <Switch id="crop-trim" checked={trim} onCheckedChange={setTrim} />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* No celular o rodapé fica preso embaixo, para o Aplicar não sumir sob os controles. */}
        <DialogFooter className="sticky -bottom-4 z-10 -mx-4 -mb-4 gap-2 border-t bg-background px-4 py-3 sm:static sm:m-0 sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={busy || processing || !area}>
            {busy && <Loader2 className={cn("h-4 w-4 animate-spin")} />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
