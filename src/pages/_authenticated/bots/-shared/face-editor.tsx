import { useState, type ReactNode } from "react";
import { ACCESSORIES, BotAvatar, BotStatus, COLORS, EYES, MOODS, PRESETS, SHAPES, STATUS_TEXT, encodeFace, parseFace, type Face } from "./avatar";

/**
 * Mini-editor do rosto, do tamanho da antiga fileira de rostos: abas (modelo,
 * forma, cor, acessório, olhos, jeito) com botões pequenos e a prévia animada ao
 * lado. Clicar na prévia troca o estado (disponível, trabalhando...). Guarda a
 * chave do modelo, se a combinação for igual a um, ou "r:forma.cor.acessorio.olhos.jeito".
 */

const STATES: BotStatus[] = ["disponivel", "trabalhando", "aguardando", "sem_chave", "desligado"];
const TABS = [
  { id: "modelo", label: "Modelos" },
  { id: "forma", label: "Forma" },
  { id: "cor", label: "Cor" },
  { id: "acessorio", label: "Acessório" },
  { id: "olhos", label: "Olhos" },
  { id: "jeito", label: "Jeito" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Small({ selected, label, onClick, children }: { selected: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} aria-pressed={selected}
      className={`flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border px-1 text-xs ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

export function FaceEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const face = parseFace(value);
  const [tab, setTab] = useState<Tab>("modelo");
  const [status, setStatus] = useState<BotStatus>("disponivel");
  const set = (part: Partial<Face>) => onChange(encodeFace({ ...face, ...part }));
  const look = (part: Partial<Face>) => encodeFace({ ...face, ...part });
  const presetKey = Object.keys(PRESETS).find((key) => key === value);
  const current: Record<Tab, string> = {
    modelo: presetKey ? PRESETS[presetKey].label : "Montado",
    forma: SHAPES[face.shape].label,
    cor: COLORS[face.color].label,
    acessorio: ACCESSORIES[face.accessory].label,
    olhos: EYES[face.eyes].label,
    jeito: `${MOODS[face.mood].label}: ${MOODS[face.mood].hint.toLowerCase()}`,
  };
  const thumb = (part: Partial<Face>) => <BotAvatar look={look(part)} size={30} still />;

  return (
    <div className="flex items-start gap-3">
      <button
        type="button" onClick={() => setStatus(STATES[(STATES.indexOf(status) + 1) % STATES.length])}
        aria-label={`Prévia no estado ${STATUS_TEXT[status]}. Clique para ver o próximo estado`}
        className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl border bg-muted/40 px-1 pb-1 pt-2 hover:bg-muted"
      >
        <BotAvatar look={value} size={56} status={status} />
        <span className="text-[10px] leading-tight text-muted-foreground">{STATUS_TEXT[status]} ›</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b text-xs">
          {TABS.map((item) => (
            <button
              key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id}
              className={`-mb-px cursor-pointer border-b-2 pb-1 ${tab === item.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto truncate pb-1 text-[11px] text-muted-foreground">{current[tab]}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {tab === "modelo" && Object.entries(PRESETS).map(([key, preset]) => (
            <Small key={key} selected={presetKey === key} label={`Modelo ${preset.label}`} onClick={() => onChange(key)}><BotAvatar look={key} size={30} still /></Small>
          ))}
          {tab === "forma" && Object.entries(SHAPES).map(([key, shape]) => (
            <Small key={key} selected={face.shape === key} label={`Forma ${shape.label}`} onClick={() => set({ shape: key })}>{thumb({ shape: key, accessory: "nenhum" })}</Small>
          ))}
          {tab === "cor" && Object.entries(COLORS).map(([key, color]) => (
            <Small key={key} selected={face.color === key} label={`Cor ${color.label}`} onClick={() => set({ color: key })}>
              <span className="block h-6 w-6 rounded-full" style={{ background: `radial-gradient(circle at 30% 25%, ${color.colors[0]}, ${color.colors[1]} 80%)` }} />
            </Small>
          ))}
          {tab === "acessorio" && Object.entries(ACCESSORIES).map(([key, acc]) => (
            <Small key={key} selected={face.accessory === key} label={`Acessório ${acc.label}`} onClick={() => set({ accessory: key })}>{thumb({ accessory: key })}</Small>
          ))}
          {tab === "olhos" && Object.entries(EYES).map(([key, eyes]) => (
            <Small key={key} selected={face.eyes === key} label={`Olhos ${eyes.label}`} onClick={() => set({ eyes: key })}>{thumb({ eyes: key, accessory: "nenhum" })}</Small>
          ))}
          {tab === "jeito" && Object.entries(MOODS).map(([key, mood]) => (
            <Small key={key} selected={face.mood === key} label={`Jeito ${mood.label}`} onClick={() => set({ mood: key })}><span className="px-2">{mood.label}</span></Small>
          ))}
        </div>
      </div>
    </div>
  );
}
