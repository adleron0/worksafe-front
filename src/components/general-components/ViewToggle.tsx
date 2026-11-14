import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";

export type ListView = "lista" | "kanban";

/** A visão escolhida (lista ou kanban) fica guardada neste navegador, por tela. */
export function useStoredView(storageKey: string, fallback: ListView = "kanban") {
  const [view, setView] = useState<ListView>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "lista" || saved === "kanban" ? saved : fallback;
    } catch { return fallback; }
  });
  const change = (next: ListView) => {
    setView(next);
    try { localStorage.setItem(storageKey, next); } catch { /* sem armazenamento: vale só nesta visita */ }
  };
  return [view, change] as const;
}

/** Seletor Lista / Kanban, igual em todas as telas de esteira. */
export default function ViewToggle({ view, onChange }: { view: ListView; onChange: (view: ListView) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
      <Button variant={view === "lista" ? "default" : "ghost"} size="sm" onClick={() => onChange("lista")} className="gap-2">
        <Icon name="list" className="w-4 h-4" /> Lista
      </Button>
      <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => onChange("kanban")} className="gap-2">
        <Icon name="columns" className="w-4 h-4" /> Kanban
      </Button>
    </div>
  );
}
