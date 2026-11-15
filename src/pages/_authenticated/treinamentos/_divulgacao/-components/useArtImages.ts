import { useEffect, useState } from "react";
import { loadImage, SEALS } from "../-lib/art";
import { canvasSafeUrl } from "../-lib/data";

/**
 * Carrega a foto escolhida e os selos para o canvas. Foto de fora tenta direto
 * (com CORS) e, se falhar, pelo proxy da API; se nada funcionar, a arte sai sem
 * foto (fundo com a marca) e o aviso aparece na tela.
 */
export function useArtImages(photoUrl: string | null, sealIds: string[], light: boolean) {
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [seals, setSeals] = useState<{ img: HTMLImageElement; tint: boolean }[]>([]);

  useEffect(() => {
    let alive = true;
    setPhotoError(false);
    if (!photoUrl) {
      setPhoto(null);
      return;
    }
    const tries = Array.from(new Set([canvasSafeUrl(photoUrl), photoUrl]));
    (async () => {
      for (const src of tries) {
        try {
          const img = await loadImage(src);
          if (alive) setPhoto(img);
          return;
        } catch {
          /* tenta a próxima */
        }
      }
      if (alive) {
        setPhoto(null);
        setPhotoError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [photoUrl]);

  const sealKey = `${sealIds.join(",")}|${light}`;
  useEffect(() => {
    let alive = true;
    const wanted = SEALS.filter((s) => sealIds.includes(s.id));
    Promise.all(
      wanted.map((s) =>
        loadImage(light ? s.light : s.dark)
          .then((img) => ({ img, tint: !!s.tintLight }))
          .catch(() => null),
      ),
    ).then((list) => {
      if (alive) setSeals(list.filter(Boolean) as { img: HTMLImageElement; tint: boolean }[]);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealKey]);

  return { photo, photoError, seals };
}
