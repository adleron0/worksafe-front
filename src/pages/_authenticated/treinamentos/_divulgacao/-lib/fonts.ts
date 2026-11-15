/**
 * Fontes da arte: Anton (títulos e números, condensada e pesada como nos posts)
 * e Montserrat (textos). Carregadas do Google Fonts só quando a divulgação abre.
 */
export const DISPLAY_FONT = "Anton";
export const TEXT_FONT = "Montserrat";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@500;600;700;800;900&display=swap";

let loading: Promise<void> | null = null;

export function loadArtFonts(): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve) => {
    if (!document.getElementById("divulgacao-fonts")) {
      const link = document.createElement("link");
      link.id = "divulgacao-fonts";
      link.rel = "stylesheet";
      link.href = FONTS_URL;
      document.head.appendChild(link);
      link.onload = () => resolve();
      link.onerror = () => resolve();
      setTimeout(resolve, 4000);
    } else resolve();
  }).then(async () => {
    const specs = [
      `400 80px "${DISPLAY_FONT}"`,
      `500 40px "${TEXT_FONT}"`,
      `600 40px "${TEXT_FONT}"`,
      `700 40px "${TEXT_FONT}"`,
      `800 40px "${TEXT_FONT}"`,
      `900 40px "${TEXT_FONT}"`,
    ];
    await Promise.race([
      Promise.all(specs.map((s) => document.fonts.load(s, "ÁÉÍÓÚÇÃÕ0123456789"))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  });
  return loading;
}
