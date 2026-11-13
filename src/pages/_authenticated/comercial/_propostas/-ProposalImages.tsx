import React, { useRef, useState } from "react";
import { post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input as ShadInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { Annotation, ProposalImage } from "../-shared/proposals";

interface Props {
  images: ProposalImage[];
  setImages: (updater: (images: ProposalImage[]) => ProposalImage[]) => void;
  readOnly: boolean;
}

const MAX_IMAGES = 12;
const MARK = "#E11D48";
type Tool = "circulo" | "seta";
const round = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;

/** Imagens da proposta: foto ou desenho, com título, descrição e marcações numeradas. */
export default function ProposalImages({ images, setImages, readOnly }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return toast({ title: `No máximo ${MAX_IMAGES} imagens por proposta`, variant: "destructive" });
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) { toast({ title: `${file.name} não é uma imagem`, variant: "destructive" }); continue; }
        const response = await post<{ imageUrl: string }, { image: File }>("images", "s3", { image: file });
        if (!response?.imageUrl) throw new Error("sem endereço");
        const url = response.imageUrl;
        setImages((list) => [...list, { url, title: "", description: "", annotations: [] }]);
      }
    } catch {
      toast({ title: "Não foi possível enviar a imagem", description: "Tente de novo. Se continuar, confira o tamanho e o formato do arquivo.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };
  const update = (index: number, patch: Partial<ProposalImage>) => setImages((list) => list.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  const move = (index: number, delta: number) => setImages((list) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return (
    <section className="rounded-lg border p-4 grid gap-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Imagens</h3>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Fotos do local, desenhos ou referências. Em cada uma dá para escrever uma descrição e marcar detalhes com círculos e setas numerados.
            Elas aparecem no documento onde o modelo tem o bloco de imagens.
          </p>
        </div>
        {!readOnly && (
          <>
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(event) => upload(event.target.files)} />
            <Button type="button" variant="outline" className="shrink-0" disabled={uploading || images.length >= MAX_IMAGES} onClick={() => input.current?.click()}>
              <Icon name="image-plus" className="w-4 h-4 mr-1" /> {uploading ? "Enviando..." : "Adicionar imagem"}
            </Button>
          </>
        )}
      </div>
      {images.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem nesta proposta.</p>}
      <div className="grid gap-4">
        {images.map((image, index) => (
          <ImageEditor key={`${image.url}-${index}`} image={image} index={index} total={images.length} readOnly={readOnly}
            onChange={(patch) => update(index, patch)} onMove={(delta) => move(index, delta)}
            onRemove={() => setImages((list) => list.filter((_, i) => i !== index))} />
        ))}
      </div>
    </section>
  );
}

interface EditorProps {
  image: ProposalImage; index: number; total: number; readOnly: boolean;
  onChange: (patch: Partial<ProposalImage>) => void; onMove: (delta: number) => void; onRemove: () => void;
}

function ImageEditor({ image, index, total, readOnly, onChange, onMove, onRemove }: EditorProps) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [drawing, setDrawing] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const point = (event: React.PointerEvent) => {
    const rect = stage.current!.getBoundingClientRect();
    return { x: round(((event.clientX - rect.left) / rect.width) * 100), y: round(((event.clientY - rect.top) / rect.height) * 100) };
  };
  const start = (event: React.PointerEvent) => {
    if (!tool || readOnly) return;
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    const p = point(event);
    setDrawing({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const drag = (event: React.PointerEvent) => {
    if (!drawing) return;
    const p = point(event);
    setDrawing((d) => (d ? { ...d, x2: p.x, y2: p.y } : d));
  };
  const finish = () => {
    if (!drawing || !tool) return setDrawing(null);
    const { x1, y1, x2, y2 } = drawing;
    setDrawing(null);
    // clique sem arrastar não vira marcação
    if (Math.abs(x2 - x1) < 2 && Math.abs(y2 - y1) < 2) return;
    if (image.annotations.length >= 20) return toast({ title: "No máximo 20 marcações por imagem", variant: "destructive" });
    const mark: Annotation = tool === "circulo"
      ? { type: "circulo", x: Math.min(x1, x2), y: Math.min(y1, y2), w: round(Math.abs(x2 - x1)), h: round(Math.abs(y2 - y1)), label: "" }
      : { type: "seta", x1, y1, x2, y2, label: "" };
    onChange({ annotations: [...image.annotations, mark] });
  };
  const preview: Annotation | null = drawing && tool
    ? (tool === "circulo"
      ? { type: "circulo", x: Math.min(drawing.x1, drawing.x2), y: Math.min(drawing.y1, drawing.y2), w: Math.abs(drawing.x2 - drawing.x1), h: Math.abs(drawing.y2 - drawing.y1), label: "" }
      : { type: "seta", ...drawing, label: "" })
    : null;
  const marks = preview ? [...image.annotations, preview] : image.annotations;

  return (
    <article className="rounded-md border p-3 grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
      <div className="grid gap-2 content-start">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Marcar:</span>
            {([["circulo", "Círculo", "circle"], ["seta", "Seta", "move-up-right"]] as const).map(([value, label, icon]) => (
              <Button key={value} type="button" size="sm" variant={tool === value ? "default" : "outline"} aria-pressed={tool === value}
                onClick={() => setTool(tool === value ? null : value)}>
                <Icon name={icon} className="w-4 h-4 mr-1" /> {label}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground">
              {tool === "circulo" ? "Arraste sobre a imagem para circular o detalhe." : tool === "seta" ? "Arraste do número até o detalhe que quer apontar." : "Escolha uma ferramenta e arraste sobre a imagem."}
            </span>
          </div>
        )}
        <div ref={stage} className={cn("relative select-none overflow-hidden rounded-md border leading-none", tool && !readOnly ? "cursor-crosshair touch-none" : "")}
          onPointerDown={start} onPointerMove={drag} onPointerUp={finish} onPointerCancel={() => setDrawing(null)}>
          <img src={image.url} alt={image.title || `Imagem ${index + 1}`} className="block w-full h-auto pointer-events-none" draggable={false} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {marks.map((mark, i) => mark.type === "circulo" ? (
              <g key={i}>
                <ellipse cx={mark.x + mark.w / 2} cy={mark.y + mark.h / 2} rx={mark.w / 2} ry={mark.h / 2} fill="none" stroke="#FFF" strokeWidth={6} vectorEffect="non-scaling-stroke" />
                <ellipse cx={mark.x + mark.w / 2} cy={mark.y + mark.h / 2} rx={mark.w / 2} ry={mark.h / 2} fill="none" stroke={MARK} strokeWidth={3} vectorEffect="non-scaling-stroke" />
              </g>
            ) : (
              <g key={i}>
                <line x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} stroke="#FFF" strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <line x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} stroke={MARK} strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
          {marks.map((mark, i) => {
            const left = mark.type === "circulo" ? mark.x + mark.w / 2 : mark.x1;
            const top = mark.type === "circulo" ? mark.y : mark.y1;
            return (
              <React.Fragment key={i}>
                <span className="absolute -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full border-2 border-white text-white text-[13px] font-bold leading-[22px] text-center shadow pointer-events-none"
                  style={{ left: `${left}%`, top: `${top}%`, background: MARK }}>{i + 1}</span>
                {mark.type === "seta" && (
                  <span className="absolute -translate-x-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full border-2 border-white shadow pointer-events-none"
                    style={{ left: `${mark.x2}%`, top: `${mark.y2}%`, background: MARK }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 content-start">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Imagem {index + 1} de {total}</p>
          {!readOnly && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === 0} aria-label="Mover a imagem para cima" onClick={() => onMove(-1)}><Icon name="arrow-up" className="w-4 h-4" /></Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === total - 1} aria-label="Mover a imagem para baixo" onClick={() => onMove(1)}><Icon name="arrow-down" className="w-4 h-4" /></Button>
              <ConfirmDialog title="Remover esta imagem da proposta?" description="A imagem, a descrição e as marcações dela saem da proposta." onConfirm={onRemove}>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Remover a imagem"><Icon name="trash-2" className="w-4 h-4" /></Button>
              </ConfirmDialog>
            </div>
          )}
        </div>
        <ShadInput value={image.title} maxLength={120} disabled={readOnly} placeholder="Título (ex.: Costado norte do tanque 3)" aria-label={`Título da imagem ${index + 1}`}
          onChange={(event) => onChange({ title: event.target.value })} />
        <Textarea value={image.description} rows={3} maxLength={600} disabled={readOnly} placeholder="Descrição: o que a imagem mostra e por que importa para o serviço."
          aria-label={`Descrição da imagem ${index + 1}`} onChange={(event) => onChange({ description: event.target.value })} />
        {image.annotations.length > 0 && <p className="text-xs font-medium mt-1">Marcações</p>}
        {image.annotations.map((mark, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold leading-6 text-center" style={{ background: MARK }}>{i + 1}</span>
            <ShadInput value={mark.label} maxLength={160} disabled={readOnly} placeholder={mark.type === "circulo" ? "O que está circulado" : "O que a seta aponta"}
              aria-label={`Texto da marcação ${i + 1}`}
              onChange={(event) => onChange({ annotations: image.annotations.map((m, j) => (j === i ? { ...m, label: event.target.value } : m)) })} />
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" aria-label={`Remover a marcação ${i + 1}`}
                onClick={() => onChange({ annotations: image.annotations.filter((_, j) => j !== i) })}><Icon name="x" className="w-4 h-4" /></Button>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
