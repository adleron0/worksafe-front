// ============================================================================
// URLs do certificado renderizado na API (worksafe-api, CertificateRenderService).
// O desenho (Fabric), fontes, assinaturas e QR são montados no servidor; o
// navegador só exibe a imagem. `v` (updatedAt) deixa o navegador cachear por
// um dia sem servir versão velha depois de uma edição.
// ============================================================================

import { get } from '@/services/api';

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

/**
 * Selo de desbloqueio (`u`, 22 caracteres) devolvido pela API: sem ele os CPFs
 * do certificado saem mascarados (LGPD). Nunca vai na URL da barra do navegador.
 */
const unlockParam = (unlock?: string | null) => (unlock ? `u=${encodeURIComponent(unlock)}` : '');

const root = (key: string) => `${API_URL}/trainee-certificate/public/${key}`;

export function certificateImageUrl(
  key: string,
  side: 'front' | 'back' = 'front',
  version?: string | number | Date | null,
  /** Multiplicador do A4 (2 = 1684 px de largura; 4 para impressão). */
  scale?: 2 | 3 | 4,
  /** Selo `u` — sem ele os CPFs vêm mascarados. */
  unlock?: string | null,
) {
  return withQuery(
    `${root(key)}/image.png`,
    side === 'back' ? 'side=back' : '',
    scale && scale !== 2 ? `scale=${scale}` : '',
    versionParam(version),
    unlockParam(unlock),
  );
}

export function certificateThumbUrl(key: string, version?: string | number | Date | null) {
  return withQuery(`${root(key)}/thumb.jpg`, versionParam(version));
}

export function certificatePdfUrl(
  key: string,
  options: { download?: boolean; version?: string | number | Date | null; unlock?: string | null } = {},
) {
  return withQuery(
    `${root(key)}/certificate.pdf`,
    options.download === false ? 'download=0' : '',
    versionParam(options.version),
    unlockParam(options.unlock),
  );
}

/**
 * Área logada (permissão list_classes): busca o selo que libera os CPFs da
 * imagem/PDF. Se falhar, devolve `undefined` e o certificado abre mascarado.
 */
export async function fetchCertificateUnlock(key: string): Promise<string | undefined> {
  try {
    const res = await get<{ u?: string }>('trainee-certificate', `unlock/${key}`);
    return res?.u || undefined;
  } catch (error) {
    console.warn('Selo do certificado indisponível, abrindo mascarado:', error);
    return undefined;
  }
}

/**
 * Abre uma URL que depende de uma busca assíncrona (o selo) sem cair no
 * bloqueador de pop-up: abre a aba já no clique e só depois define o endereço.
 */
export async function openAfter(buildUrl: () => Promise<string>) {
  const win = window.open('', '_blank');
  const url = await buildUrl();
  if (win && !win.closed) {
    win.location.href = url;
  } else {
    window.open(url, '_blank');
  }
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

/**
 * Baixa um arquivo da API com nome definido. Entre origens o atributo
 * `download` é ignorado, então busca como blob (a API libera CORS para o
 * front) e salva localmente; se falhar, abre em nova aba.
 */
export async function downloadFromApi(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch (error) {
    console.warn('Download direto falhou, abrindo em nova aba:', error);
    window.open(url, '_blank', 'noopener');
  }
}

/** Nome de arquivo seguro: "certificado-nome-do-aluno-curso". */
export function certificateFileName(...parts: (string | undefined | null)[]) {
  const slug = parts
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `certificado${slug ? `-${slug}` : ''}`;
}

/**
 * Baixa um certificado emitido já renderizado pela API (com o efeito estático
 * de destaque embutido). Usado pela página pública e pelo admin — mesmos arquivos.
 */
export async function downloadIssuedCertificate(
  key: string,
  format: 'pdf' | 'png-front' | 'png-back',
  options: { version?: string | number | Date | null; fileName: string; unlock?: string | null },
) {
  if (format === 'pdf') {
    await downloadFromApi(
      certificatePdfUrl(key, { version: options.version, unlock: options.unlock }),
      `${options.fileName}.pdf`,
    );
    return;
  }
  const side = format === 'png-back' ? 'back' : 'front';
  await downloadFromApi(
    certificateImageUrl(key, side, options.version, 4, options.unlock),
    `${options.fileName}${side === 'back' ? '-verso' : ''}.png`,
  );
}
