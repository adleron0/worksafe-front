import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface UseFormDraftOptions<T> {
  // Chave do localStorage. Passe null para desabilitar (ex: modo edição).
  storageKey: string | null;
  dataForm: T;
  setDataForm: (updater: (prev: T) => T) => void;
  // Campos a ignorar na serialização (ex: ["image"] para arquivos File).
  excludeKeys?: (keyof T)[];
  // Debounce em ms para salvar (padrão 500).
  debounceMs?: number;
}

export function useFormDraft<T extends Record<string, unknown>>({
  storageKey,
  dataForm,
  setDataForm,
  excludeKeys = [],
  debounceMs = 500,
}: UseFormDraftOptions<T>) {
  const restoredRef = useRef(false);
  const excludeKeysRef = useRef(excludeKeys);
  excludeKeysRef.current = excludeKeys;

  // ── Restaura rascunho na montagem ─────────────────────────────────────────
  useEffect(() => {
    if (!storageKey || restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<T>;
      if (!draft || typeof draft !== "object") return;

      setDataForm((prev) => ({ ...prev, ...draft }));
      toast({
        title: "Rascunho restaurado",
        description:
          "Continuamos de onde você parou. Reenvie a imagem se necessário.",
        variant: "default",
      });
    } catch {
      localStorage.removeItem(storageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // ── Salva rascunho (debounced) ────────────────────────────────────────────
  useEffect(() => {
    if (!storageKey || !restoredRef.current) return;

    const timeout = setTimeout(() => {
      try {
        const serializable: Record<string, unknown> = {};
        for (const key of Object.keys(dataForm)) {
          if (excludeKeysRef.current.includes(key as keyof T)) continue;
          const value = (dataForm as Record<string, unknown>)[key];
          if (value instanceof File) continue;
          serializable[key] = value;
        }
        localStorage.setItem(storageKey, JSON.stringify(serializable));
      } catch {
        // quota cheia ou serialização falhou — ignora
      }
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [dataForm, storageKey, debounceMs]);

  const clearDraft = () => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
  };

  return { clearDraft };
}
