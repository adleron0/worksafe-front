import { useState } from "react";
import { encodeFace, moodOf, parseFace, traitsOf, type Traits } from "./avatar";
import type { BotsConfig } from "./bots";

/**
 * Personalidade de trabalho (Big Five): muda como o bot responde (o texto vai
 * para as instruções dele) e o jeito de o rosto se mexer. Fica guardada no
 * último pedaço do rosto: o id do perfil pronto ou "t" + os 5 níveis.
 */
export function PersonalityPicker({ value, config, onChange }: { value: string; config: BotsConfig; onChange: (avatar: string) => void }) {
  const face = parseFace(value);
  const traits = traitsOf(face.mood);
  const catalog = config.personalities;
  const [open, setOpen] = useState(face.mood.startsWith("t"));
  if (!catalog) return null;
  const profile = catalog.profiles.find((item) => item.id === face.mood);
  const setMood = (mood: string) => onChange(encodeFace({ ...face, mood }));
  const setTrait = (index: number, level: number) => setMood(moodOf(traits.map((v, i) => (i === index ? level : v)) as Traits));
  const lines = catalog.traits.map((trait, i) => trait.text[String(traits[i])]).filter(Boolean);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {catalog.profiles.map((item) => (
          <button
            key={item.id} type="button" onClick={() => setMood(item.id)} aria-pressed={face.mood === item.id}
            className={`flex cursor-pointer flex-col items-start rounded-lg border px-2.5 py-1 text-left ${face.mood === item.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
          >
            <span className="text-xs font-medium">{item.label}</span>
            <span className="text-[10px] text-muted-foreground">{item.fit}</span>
          </button>
        ))}
        {!profile && <span className="flex items-center rounded-lg border border-primary bg-primary/5 px-2.5 py-1 text-xs font-medium ring-1 ring-primary">Sob medida</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        {profile ? profile.why : "Traços ajustados à mão."}{" "}
        <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => setOpen(!open)}>{open ? "Esconder os traços" : "Ajustar os traços"}</button>
      </p>
      {open && (
        <div className="grid gap-1 rounded-lg border p-2">
          {catalog.traits.map((trait, i) => (
            <div key={trait.key} className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 text-xs max-sm:grid-cols-1">
              <span className="font-medium">{trait.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-24 text-right text-[10px] text-muted-foreground">{trait.low}</span>
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level} type="button" onClick={() => setTrait(i, level)} aria-label={`${trait.label}: nível ${level} de 5`} aria-pressed={traits[i] === level}
                    className={`h-5 w-5 cursor-pointer rounded-full border ${level <= traits[i] ? "border-primary bg-primary" : "hover:bg-muted"}`}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground">{trait.high}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {lines.length > 0 && (
        <div className="rounded-lg bg-muted/40 p-2 text-xs">
          <p className="mb-1 font-medium">Como ele trabalha</p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">{lines.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
