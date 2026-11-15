import { useEffect, useMemo, useState } from "react";
import { loadImage, resolveLabels, SEALS, type ArtBrand } from "../-lib/art";
import { canvasSafeUrl, PHOTO_BANK } from "../-lib/data";
import { loadArtFonts, resolveFonts } from "../-lib/fonts";
import { availableThemes, type ArtTheme } from "../-lib/themes";
import type { MarketingCompany, MarketingSettings } from "../-lib/types";

/** Imagem de fora tenta direto (CORS) e, se falhar, pelo proxy da API. */
async function loadAny(url: string): Promise<HTMLImageElement> {
  const tries = Array.from(new Set([canvasSafeUrl(url), url]));
  let last: unknown;
  for (const src of tries) {
    try {
      return await loadImage(src);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/** O que vem das configurações da empresa e não depende da turma. */
export function useIdentity(settings: MarketingSettings, company: MarketingCompany) {
  const themes = useMemo(
    () => availableThemes({ temas: settings.temas, temasOcultos: settings.temasOcultos, primaryColor: company.primaryColor, secondaryColor: company.secondaryColor }),
    [settings.temas, settings.temasOcultos, company.primaryColor, company.secondaryColor],
  );
  const labels = useMemo(() => resolveLabels(settings.rotulos), [settings.rotulos]);
  const fonts = useMemo(() => resolveFonts(settings.fonteTitulo, settings.fonteTexto), [settings.fonteTitulo, settings.fonteTexto]);
  const photoBank = useMemo(
    () => [
      ...(settings.fotos ?? []).map((f) => ({ src: f.url, label: f.nome || "Foto da empresa" })),
      ...(settings.usarFotosPadrao ? PHOTO_BANK : []),
    ],
    [settings.fotos, settings.usarFotosPadrao],
  );
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    setFontsReady(false);
    loadArtFonts(fonts).then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, [fonts]);
  return { themes, labels, fonts, photoBank, fontsReady };
}

/**
 * Carrega a foto, os selos (da biblioteca e os enviados) e o logo certo para o
 * fundo (claro ou escuro). Se a foto não carregar, a arte sai sem foto.
 */
export function useArtResources(settings: MarketingSettings, company: MarketingCompany, theme: ArtTheme, photoUrl: string | null) {
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [seals, setSeals] = useState<{ img: HTMLImageElement; tint: boolean }[]>([]);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const light = !!theme.light;

  useEffect(() => {
    let alive = true;
    setPhotoError(false);
    if (!photoUrl) {
      setPhoto(null);
      return;
    }
    loadAny(photoUrl)
      .then((img) => alive && setPhoto(img))
      .catch(() => {
        if (!alive) return;
        setPhoto(null);
        setPhotoError(true);
      });
    return () => {
      alive = false;
    };
  }, [photoUrl]);

  const sealKey = JSON.stringify([settings.selos ?? [], (settings.selosPersonalizados ?? []).map((s) => s.url), light]);
  useEffect(() => {
    let alive = true;
    const builtIn = SEALS.filter((s) => (settings.selos ?? []).includes(s.id)).map((s) =>
      loadImage(light ? s.light : s.dark).then((img) => ({ img, tint: !!s.tintLight })).catch(() => null),
    );
    const own = (settings.selosPersonalizados ?? []).map((s) => loadAny(s.url).then((img) => ({ img, tint: false })).catch(() => null));
    Promise.all([...own, ...builtIn]).then((list) => {
      if (alive) setSeals(list.filter(Boolean) as { img: HTMLImageElement; tint: boolean }[]);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealKey]);

  const marca = settings.marca ?? { tipo: "texto" as const };
  const logoUrl = marca.tipo === "logo" ? (light ? marca.logoEscuroUrl || marca.logoClaroUrl : marca.logoClaroUrl || marca.logoEscuroUrl) || company.logoUrl || "" : "";
  useEffect(() => {
    let alive = true;
    if (!logoUrl) {
      setLogo(null);
      return;
    }
    loadAny(logoUrl)
      .then((img) => alive && setLogo(img))
      .catch(() => alive && setLogo(null));
    return () => {
      alive = false;
    };
  }, [logoUrl]);

  const brand: ArtBrand = useMemo(
    () => ({ tipo: marca.tipo === "logo" && !logo ? "texto" : marca.tipo, texto: marca.texto || "", logo }),
    [marca.tipo, marca.texto, logo],
  );

  return { photo, photoError, seals, brand };
}
