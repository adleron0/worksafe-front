import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useHelp } from "./HelpContext";
import { Lesson } from "./types";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * O único ponto de entrada: um "?" discreto no cabeçalho, que só aparece nas
 * telas que têm tutorial e diz de qual tela é. Tela com um tutorial: abre
 * direto. Tela com vários (um por fluxo): abre um menu pequeno para escolher.
 */
export function HelpButton() {
  const { here, openLesson, track, path, states } = useHelp();
  if (!here.length) return null;
  const many = here.length > 1;
  const label = many ? `Tutoriais desta tela: ${here[0].screen}` : `Tutorial desta tela: ${here[0].screen}`;
  const button = (
    <Button variant="ghost" size="icon" aria-label={label}
      onClick={many ? undefined : () => { openLesson(here[0].id); track({ event: "help_open", route: path }); }}>
      <CircleHelp className="w-5 h-5" />
    </Button>
  );
  if (!many) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <DropdownMenu onOpenChange={(value) => { if (value) track({ event: "help_open", route: path }); }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1rem)] max-h-[min(32rem,calc(100dvh-5rem))] overflow-y-auto">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-primary">Tutoriais · {here[0].screen}</DropdownMenuLabel>
        {here.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => openLesson(item.id)} className="gap-2 py-2 cursor-pointer">
            <Icon name="play" className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="flex-1 min-w-0">{item.title}</span>
            {states[item.id]?.completedAt
              ? <Icon name="check" className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-400" aria-label="assistido" />
              : <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.minutes} min</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Janela do tutorial da tela aberta: o vídeo, com legenda, e os capítulos para pular. */
export function HelpCenter() {
  const { here, open, setOpen, pickedId, openLesson } = useHelp();
  // um só: vai direto para o vídeo; vários: o escolhido no menu (ou a lista, se nenhum)
  const lesson = here.length === 1 ? here[0] : here.find((item) => item.id === pickedId) ?? null;

  return (
    <Dialog open={open && here.length > 0} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {here.length > 1 && lesson
              ? <button type="button" onClick={() => openLesson(null)} className="inline-flex items-center gap-1 uppercase hover:underline focus-visible:outline-none focus-visible:underline">
                  <Icon name="chevron-left" className="w-3.5 h-3.5" /> Tutoriais desta tela · {here[0]?.screen}
                </button>
              : <>{here.length > 1 ? "Tutoriais desta tela" : "Tutorial desta tela"} · {here[0]?.screen}</>}
          </p>
          <DialogTitle>{lesson ? lesson.title : "Escolha o tutorial"}</DialogTitle>
          <DialogDescription>
            {lesson ? `${lesson.minutes} min, com legenda. Use os capítulos para ir direto ao que precisa; assista quantas vezes quiser.` : "Esta tela tem um tutorial para cada caminho."}
          </DialogDescription>
        </DialogHeader>
        {lesson ? <Player key={lesson.id} lesson={lesson} /> : (
          <ul className="grid gap-1">
            {here.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openLesson(item.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon name="play" className="w-4 h-4" /></span>
                  <span className="flex-1 text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.minutes} min</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Player({ lesson }: { lesson: Lesson }) {
  const { track, markDone, states } = useHelp();
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const chapters = lesson.chapters ?? [];
  const current = chapters.reduce((found, chapter, index) => (time + 0.25 >= chapter.start ? index : found), -1);
  const done = Boolean(states[lesson.id]?.completedAt);
  // tutorial gravado no celular, visto no celular: a versão em pé ocupa a tela em vez de uma faixa
  const [portrait] = useState(() => Boolean(lesson.video.portrait) && window.matchMedia("(max-width: 640px)").matches);

  useEffect(() => { track({ event: "lesson_start", tourId: lesson.id }); return () => track({ event: "lesson_exit", tourId: lesson.id }); }, [lesson.id, track]);

  const jump = (index: number) => {
    const element = video.current;
    if (!element) return;
    element.currentTime = chapters[index].start;
    void element.play().catch(() => undefined);
    track({ event: "chapter_jump", tourId: lesson.id, step: index });
  };

  return (
    <div className={cn("grid gap-4", chapters.length > 0 && "lg:grid-cols-[minmax(0,1fr)_16rem]")}>
      <video ref={video} src={portrait ? lesson.video.portrait : lesson.video.src} poster={lesson.video.poster} controls autoPlay playsInline preload="metadata" crossOrigin="anonymous"
        className={cn("rounded-lg border bg-black", portrait ? "mx-auto h-[60vh] w-auto max-w-full aspect-[462/1000]" : "w-full aspect-video")}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onPlay={() => track({ event: "video_play", tourId: lesson.id })}
        onEnded={() => { markDone(lesson.id); track({ event: "lesson_complete", tourId: lesson.id }); }}>
        {lesson.video.captions && <track kind="subtitles" src={lesson.video.captions} srcLang="pt-BR" label="Português" default />}
      </video>
      {chapters.length > 0 && (
        <nav aria-label="Capítulos do tutorial" className="min-w-0">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capítulos</p>
          <ol className="grid gap-0.5">
            {chapters.map((chapter, index) => (
              <li key={chapter.start}>
                <button type="button" onClick={() => jump(index)} aria-current={index === current ? "step" : undefined}
                  className={cn("w-full flex items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    index === current && "bg-primary/10 text-primary font-medium")}>
                  <span className="w-10 shrink-0 tabular-nums text-xs text-muted-foreground">{clock(chapter.start)}</span>
                  <span className="min-w-0">{chapter.title}</span>
                </button>
              </li>
            ))}
          </ol>
          {done && <p className="mt-3 flex items-center gap-1 px-2 text-xs text-muted-foreground"><Icon name="check" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> Você já assistiu até o fim.</p>}
        </nav>
      )}
    </div>
  );
}
