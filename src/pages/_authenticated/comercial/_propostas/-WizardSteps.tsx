import { useEffect, useRef } from "react";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";

export type StepKey = "cliente" | "proposta" | "itens" | "pagamento" | "documento" | "envio";
export const STEPS: Array<{ key: StepKey; title: string; heading: string; description: string }> = [
  { key: "cliente", title: "Cliente", heading: "Para quem é a proposta", description: "Escolha o tipo e o cliente. Dá para filtrar pelo nome ou pelo CNPJ." },
  { key: "proposta", title: "Proposta", heading: "O que está sendo proposto", description: "Título, prazo e validade. É o cabeçalho da planilha." },
  { key: "itens", title: "Itens", heading: "Itens e valores", description: "Uma linha por item. O sistema sugere o valor; digite o valor final só se quiser outro." },
  { key: "pagamento", title: "Pagamento", heading: "Como o cliente vai pagar", description: "Use um atalho ou monte as parcelas. Elas viram as contas a receber quando houver contrato." },
  { key: "documento", title: "Documento", heading: "O documento que o cliente recebe", description: "Já sai pronto com o modelo padrão. Aqui você acrescenta imagens e, se quiser, ajusta o texto." },
  { key: "envio", title: "Enviar", heading: "Revisão e envio", description: "Confira o que falta, veja como o cliente vai ver e envie." },
];

export type StepState = "done" | "attention" | "todo";

interface Props {
  current: StepKey;
  /** situação de cada passo; os que não vierem ficam como "a fazer" */
  states?: Partial<Record<StepKey, StepState>>;
  /** passos em que dá para clicar; sem isso, todos */
  enabled?: StepKey[];
  titles?: Partial<Record<StepKey, string>>;
  onGo?: (key: StepKey) => void;
}

/**
 * Passos em uma linha só: ponto + nome, ligados por um traço. Em tela estreita
 * a linha rola de lado sem barra visível e o passo atual fica sempre à vista.
 */
export default function WizardSteps({ current, states, enabled, titles, onGo }: Props) {
  const active = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // centraliza o passo atual só na horizontal (sem mexer na rolagem da página)
  useEffect(() => {
    const row = list.current, button = active.current;
    if (!row || !button) return;
    const left = button.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    row.scrollTo({ left: left - (row.clientWidth - button.clientWidth) / 2, behavior: "smooth" });
  }, [current]);
  const index = STEPS.findIndex((step) => step.key === current);

  return (
    <nav aria-label="Passos da proposta" className="my-4">
      <p className="sm:hidden text-xs text-muted-foreground mb-1">Passo {index + 1} de {STEPS.length}</p>
      <ol ref={list} className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEPS.map((step, i) => {
          const isCurrent = step.key === current;
          const state = states?.[step.key] ?? "todo";
          const clickable = Boolean(onGo) && !isCurrent && (!enabled || enabled.includes(step.key));
          return (
            <li key={step.key} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <span aria-hidden className={cn("h-px w-4 sm:w-7", i <= index ? "bg-primary" : "bg-border")} />}
              <button type="button" ref={isCurrent ? active : undefined} disabled={!clickable && !isCurrent} aria-current={isCurrent ? "step" : undefined}
                onClick={() => { if (clickable) onGo?.(step.key); }}
                className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 text-sm whitespace-nowrap transition-colors",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground", clickable && "hover:bg-muted hover:text-foreground", !clickable && !isCurrent && "cursor-default opacity-60")}>
                {isCurrent ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                ) : state === "done" ? (
                  <Icon name="check" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <span className={cn("h-2 w-2 rounded-full", state === "attention" ? "bg-amber-500" : "bg-muted-foreground/40")} />
                )}
                {titles?.[step.key] ?? step.title}
                {state === "attention" && !isCurrent && <span className="sr-only"> (falta preencher)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
