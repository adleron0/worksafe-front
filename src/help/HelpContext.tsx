import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { helpApi } from "./api";
import { LESSONS } from "./lessons";
import { matchesAny } from "./pages";
import { HelpEvent, Lesson, LessonState } from "./types";

const FLUSH_MS = 4000;

interface HelpContextValue {
  path: string;
  /** os tutoriais da tela aberta que a pessoa pode ver (permissão) */
  here: Lesson[];
  states: Record<string, LessonState>;
  open: boolean;
  setOpen: (open: boolean) => void;
  markDone: (id: string) => void;
  track: (event: HelpEvent) => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useHelp() {
  const value = useContext(HelpContext);
  if (!value) throw new Error("useHelp precisa estar dentro do HelpProvider");
  return value;
}

/**
 * Tutoriais da área logada. Tudo nasce do botão "?", que só existe nas telas
 * com tutorial: nada aparece sozinho na tela de trabalho. Guarda os tutoriais
 * assistidos (na API, vale em qualquer aparelho) e registra o uso em lote.
 */
export function HelpProvider({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const queue = useRef<HelpEvent[]>([]);

  const { data: states = {} } = useQuery({ queryKey: ["help-state"], queryFn: helpApi.state, staleTime: 5 * 60_000, retry: 1 });

  // registro de uso: em lote, nunca atrapalha a tela
  const flush = useCallback(() => {
    if (!queue.current.length) return;
    helpApi.events(queue.current.splice(0, 50)).catch(() => { /* medir nunca derruba nada */ });
  }, []);
  useEffect(() => {
    const timer = window.setInterval(flush, FLUSH_MS);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onHide); flush(); };
  }, [flush]);
  const track = useCallback((event: HelpEvent) => { queue.current.push(event); }, []);

  // `can` muda de identidade a cada render: a chave é a lista de ids liberados nesta tela
  const hereKey = LESSONS
    .filter((lesson) => matchesAny(lesson.routes, path) && (!lesson.requires.length || lesson.requires.some((permission) => can(permission))))
    .map((lesson) => lesson.id).join(",");
  const here = useMemo(() => LESSONS.filter((lesson) => hereKey.split(",").includes(lesson.id)), [hereKey]);

  // trocou para uma tela sem tutorial: fecha
  useEffect(() => { if (!here.length) setOpen(false); }, [here.length]);

  const markDone = useCallback((id: string) => {
    helpApi.setState(id, "complete")
      .then((saved) => queryClient.setQueryData<Record<string, LessonState>>(["help-state"], (old) => ({ ...(old ?? {}), [id]: { completedAt: saved.completedAt, dismissedAt: saved.dismissedAt } })))
      .catch(() => undefined);
  }, [queryClient]);

  const setOpenAndFlush = useCallback((value: boolean) => { setOpen(value); if (!value) flush(); }, [flush]);

  const value: HelpContextValue = { path, here, states, open, setOpen: setOpenAndFlush, markDone, track };
  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}
