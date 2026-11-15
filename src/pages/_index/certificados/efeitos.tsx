import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import FoilPreviewCard from "@/components/general-components/visualizadorCertificados/server/FoilPreviewCard";
import { certificateImageUrl, isIssuedCertificateKey } from "@/components/general-components/visualizadorCertificados/server/certificateRenderUrls";
import {
  buildFoilSettings,
  DEFAULT_PATTERN,
  HIGHLIGHT_PATTERNS,
  HIGHLIGHT_THEMES,
  HOLO_GLOW,
  type HighlightTheme,
} from "@/components/general-components/visualizadorCertificados/highlight";

// ============================================================================
// Vitrine dos efeitos de destaque: o mesmo certificado com cada padronagem,
// no tema escolhido. /certificados/efeitos?key=<chave>&tema=ouro&luz=1
// ============================================================================

const THEMES = HIGHLIGHT_THEMES.map((t) => t.id);

export const Route = createFileRoute("/_index/certificados/efeitos")({
  validateSearch: (search: Record<string, unknown>) => ({
    key: typeof search.key === "string" ? search.key : "",
    tema: (THEMES.includes(search.tema as HighlightTheme) ? search.tema : "ouro") as HighlightTheme,
    luz: search.luz === true || search.luz === "1" || search.luz === 1 || search.luz === "true",
  }),
  component: EfeitosDestaque,
});

function EfeitosDestaque() {
  const { key, tema, luz } = Route.useSearch();
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
          O tema define a cor; a padronagem, o desenho do centro. A borda sempre tem brilhos de
          formas e tamanhos variados. Passe o mouse para inclinar e mover a luz.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {HIGHLIGHT_THEMES.map((t) => (
            <Link
              key={t.id}
              to="/certificados/efeitos"
              search={{ key, tema: t.id, luz }}
              className={`rounded-full border px-3 py-1 text-sm ${
                t.id === tema ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
              }`}
            >
              {t.name}
            </Link>
          ))}
          <Link
            to="/certificados/efeitos"
            search={{ key, tema, luz: !luz }}
            className="ml-auto rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
          >
            {luz ? "Luz: acesa" : "Luz: passeando"}
          </Link>
        </div>

        {!valid && (
          <p className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
            Abra com <code>?key=</code> e a chave de um certificado emitido.
          </p>
        )}

        {valid && (
          <div className="mt-8 grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
            {HIGHLIGHT_PATTERNS.map((pattern) => (
              <div key={`${tema}-${pattern.id}`}>
                <FoilPreviewCard
                  src={src}
                  aspect={aspect}
                  settings={buildFoilSettings(tema, pattern.id)}
                  glow={HOLO_GLOW[tema]}
                  lit={luz}
                />
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{pattern.name}</p>
                    <p className="text-xs text-muted-foreground">{pattern.description}</p>
                  </div>
                  {DEFAULT_PATTERN[tema] === pattern.id && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      padrão do tema
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
