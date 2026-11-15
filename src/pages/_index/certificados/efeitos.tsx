import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import FoilPreviewCard from "@/components/general-components/visualizadorCertificados/server/FoilPreviewCard";
import { certificateImageUrl, isIssuedCertificateKey } from "@/components/general-components/visualizadorCertificados/server/certificateRenderUrls";
import { HIGHLIGHT_EFFECTS, THEME_EFFECT, HIGHLIGHT_THEMES } from "@/components/general-components/visualizadorCertificados/highlight";

// ============================================================================
// Vitrine dos efeitos de destaque: o mesmo certificado com cada efeito, para
// comparar e escolher quais viram os temas (Ouro, Prata, Holográfico).
// /certificados/efeitos?key=<chave de um certificado emitido>
// ============================================================================

export const Route = createFileRoute("/_index/certificados/efeitos")({
  validateSearch: (search: Record<string, unknown>) => ({
    key: typeof search.key === "string" ? search.key : "",
    luz: search.luz === "1" || search.luz === 1,
  }),
  component: EfeitosDestaque,
});

const themeUsing = (effectId: string) =>
  HIGHLIGHT_THEMES.find((t) => THEME_EFFECT[t.id] === effectId)?.name ?? null;

function EfeitosDestaque() {
  const { key, luz } = Route.useSearch();
  const [aspect, setAspect] = useState(842 / 595);
  const valid = isIssuedCertificateKey(key);
  const src = valid ? certificateImageUrl(key, "front") : "";

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => img.naturalWidth && setAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
  }, [src]);

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-24">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">Efeitos de destaque</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O mesmo certificado com cada efeito. Passe o mouse para inclinar e mover a luz; sem
          mouse, a luz passeia sozinha. Os marcados com um tema são os que estão em uso hoje.
        </p>

        {!valid && (
          <p className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
            Abra com <code>?key=</code> e a chave de um certificado emitido.
          </p>
        )}

        {valid && (
          <div className="mt-8 grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
            {HIGHLIGHT_EFFECTS.map((effect) => {
              const theme = themeUsing(effect.id);
              return (
                <div key={effect.id}>
                  <FoilPreviewCard src={src} aspect={aspect} settings={effect.settings} glow={effect.glow} lit={luz} />
                  <div className="mt-4 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{effect.name}</p>
                      <p className="text-xs text-muted-foreground">{effect.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{effect.id}</code>
                      {theme && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          tema {theme}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
