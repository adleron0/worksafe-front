/**
 * Vercel Routing Middleware — preview de certificado em redes sociais.
 *
 * O front é uma SPA: o index.html é o mesmo para qualquer rota e as og tags
 * específicas só seriam montadas via JavaScript, que os robôs de preview
 * (LinkedIn, WhatsApp, Facebook, X, Telegram, Slack…) não executam. Aqui,
 * quando quem pede /certificados/:key (ou /certificados/:nome/:key) é um robô,
 * devolvemos um HTML mínimo com as og tags do certificado, montadas pela API:
 *   GET {API}/trainee-certificate/public/:key/meta
 * cuja imagem é o cartão 1200×630 gerado em
 *   GET {API}/trainee-certificate/public/:key/og.png
 *
 * Pessoas (e qualquer falha) seguem para a SPA normalmente via next().
 */
import { next } from '@vercel/functions';

export const config = {
  matcher: ['/certificados/:path*'],
};

const API_URL = (
  process.env.API_PUBLIC_URL ||
  process.env.VITE_BASE_URL ||
  'https://api.worksafebrasil.com.br'
).replace(/\/$/, '');

const BOT_UA =
  /linkedinbot|facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|applebot|googlebot|bingbot|embedly|quora link preview|vkshare|w3c_validator|iframely/i;

const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ShareMeta {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  studentName: string;
}

export default async function middleware(request: Request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return next();

  const key = new URL(request.url).pathname.split('/').filter(Boolean).pop() || '';
  if (!KEY_RE.test(key)) return next();

  try {
    const res = await fetch(`${API_URL}/trainee-certificate/public/${key}/meta`, {
      signal: AbortSignal.timeout(4000),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return next();
    const meta = (await res.json()) as ShareMeta;
    if (!meta?.title || !meta?.imageUrl) return next();

    return new Response(renderHtml(meta), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // os robôs revisitam pouco; 1h na CDN é suficiente e absorve picos
        'cache-control': 'public, max-age=0, s-maxage=3600',
        vary: 'user-agent',
      },
    });
  } catch {
    return next();
  }
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(meta: ShareMeta) {
  const title = esc(meta.title);
  const description = esc(meta.description);
  const image = esc(meta.imageUrl.replace(/^http:\/\//, 'https://'));
  const url = esc(meta.url);
  const alt = esc(`Certificado de ${meta.studentName}`);
  return `<!doctype html>
<html lang="pt-BR" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WorkSafe Brasil">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<p><a href="${url}">Ver certificado</a></p>
</body>
</html>`;
}
