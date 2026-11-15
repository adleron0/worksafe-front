/**
 * Fontes da arte, escolhidas na identidade visual (white label). Títulos e
 * números numa fonte pesada/condensada; textos numa sans legível. Carregadas
 * do Google Fonts só quando a divulgação abre.
 */
export const TITLE_FONTS: { name: string; css: string; weight: number }[] = [
  { name: "Anton", css: "Anton", weight: 400 },
  { name: "Bebas Neue", css: "Bebas+Neue", weight: 400 },
  { name: "Oswald", css: "Oswald:wght@700", weight: 700 },
  { name: "Archivo Black", css: "Archivo+Black", weight: 400 },
  { name: "Barlow Condensed", css: "Barlow+Condensed:wght@800", weight: 800 },
];
export const TEXT_FONTS: { name: string; css: string }[] = [
  { name: "Montserrat", css: "Montserrat:wght@500;600;700;800;900" },
  { name: "Poppins", css: "Poppins:wght@500;600;700;800;900" },
  { name: "Inter", css: "Inter:wght@500;600;700;800;900" },
  { name: "Roboto", css: "Roboto:wght@500;700;900" },
  { name: "Barlow", css: "Barlow:wght@500;600;700;800;900" },
];

export interface ArtFonts {
  title: string;
  titleWeight: number;
  text: string;
}

export function resolveFonts(title?: string, text?: string): ArtFonts {
  const t = TITLE_FONTS.find((f) => f.name === title) ?? TITLE_FONTS[0];
  const x = TEXT_FONTS.find((f) => f.name === text) ?? TEXT_FONTS[0];
  return { title: t.name, titleWeight: t.weight, text: x.name };
}

const loading = new Map<string, Promise<void>>();

export function loadArtFonts(fonts: ArtFonts = resolveFonts()): Promise<void> {
  const key = `${fonts.title}|${fonts.text}`;
  const hit = loading.get(key);
  if (hit) return hit;
  const t = TITLE_FONTS.find((f) => f.name === fonts.title) ?? TITLE_FONTS[0];
  const x = TEXT_FONTS.find((f) => f.name === fonts.text) ?? TEXT_FONTS[0];
  const id = `divulgacao-fonts-${key.replace(/\W+/g, "-")}`;
  const promise = new Promise<void>((resolve) => {
    if (document.getElementById(id)) return resolve();
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${t.css}&family=${x.css}&display=swap`;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
    setTimeout(resolve, 4000);
  }).then(async () => {
    const specs = [
      `${t.weight} 80px "${t.name}"`,
      ...[500, 600, 700, 800, 900].map((w) => `${w} 40px "${x.name}"`),
    ];
    await Promise.race([
      Promise.all(specs.map((s) => document.fonts.load(s, "ÁÉÍÓÚÇÃÕ0123456789"))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  });
  loading.set(key, promise);
  return promise;
}
