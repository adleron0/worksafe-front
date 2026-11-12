// ============================================================================
// URLs do certificado renderizado na API (worksafe-api, CertificateRenderService).
// O desenho (Fabric), fontes, assinaturas e QR são montados no servidor; o
// navegador só exibe a imagem. `v` (updatedAt) deixa o navegador cachear por
// um dia sem servir versão velha depois de uma edição.
// ============================================================================

const API_URL = (import.meta.env.VITE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só certificados emitidos (chave UUID) são renderizados na API. */
export const isIssuedCertificateKey = (key?: string | null): key is string =>
  !!key && UUID.test(key);

const versionParam = (version?: string | number | Date | null) => {
  if (!version) return '';
  const time = version instanceof Date ? version.getTime() : new Date(version).getTime();
  return Number.isNaN(time) ? `v=${encodeURIComponent(String(version))}` : `v=${time}`;
};

const withQuery = (base: string, ...params: string[]) => {
  const query = params.filter(Boolean).join('&');
  return query ? `${base}?${query}` : base;
};

const root = (key: string) => `${API_URL}/trainee-certificate/public/${key}`;

export function certificateImageUrl(
  key: string,
  side: 'front' | 'back' = 'front',
  version?: string | number | Date | null,
  /** Multiplicador do A4 (2 = 1684 px de largura; 4 para impressão). */
  scale?: 2 | 3 | 4,
) {
  return withQuery(
    `${root(key)}/image.png`,
    side === 'back' ? 'side=back' : '',
    scale && scale !== 2 ? `scale=${scale}` : '',
    versionParam(version),
  );
}

export function certificateThumbUrl(key: string, version?: string | number | Date | null) {
  return withQuery(`${root(key)}/thumb.jpg`, versionParam(version));
}

export function certificatePdfUrl(
  key: string,
  options: { download?: boolean; version?: string | number | Date | null } = {},
) {
  return withQuery(
    `${root(key)}/certificate.pdf`,
    options.download === false ? 'download=0' : '',
    versionParam(options.version),
  );
}

/** Tem verso desenhado? (mesma regra da API) */
export function hasBackSide(fabricJsonBack: unknown) {
  let back = fabricJsonBack;
  if (typeof back === 'string') {
    try {
      back = JSON.parse(back);
    } catch {
      return false;
    }
  }
  const objects = (back as { objects?: unknown[] } | null)?.objects;
  return Array.isArray(objects) && objects.length > 0;
}

/**
 * Dispara o download de um arquivo da API. A resposta vem com
 * `Content-Disposition: attachment`, então o navegador baixa e fica na página
 * (o atributo `download` é ignorado entre origens; o cabeçalho resolve).
 */
export function triggerApiDownload(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
