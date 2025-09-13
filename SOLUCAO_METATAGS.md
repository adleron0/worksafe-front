# Solução para Meta Tags do LinkedIn sem SSR

## O Problema
O LinkedIn e outras redes sociais precisam de meta tags no HTML inicial (server-side), mas seu projeto usa CSR (Client-Side Rendering) com Vite + React.

## Solução Recomendada: Usar o Thumbnail Gerado

Como você já tem um sistema que gera e salva thumbnails dos certificados (campo `pdfUrl`), a melhor solução é:

### 1. Garantir que todos os certificados tenham thumbnail

O sistema já gera automaticamente quando alguém visualiza o certificado. Para certificados antigos, você pode criar um script no backend para gerar em lote.

### 2. Criar um endpoint no backend que retorna HTML com meta tags

No seu backend, crie este endpoint:

```javascript
// Rota: GET /api/certificate-meta/:id
app.get('/api/certificate-meta/:id', async (req, res) => {
  const { id } = req.params;

  // Buscar certificado no banco
  const certificate = await db.query(
    'SELECT * FROM certificates WHERE key = ? OR id = ?',
    [id, id]
  );

  if (!certificate) {
    return res.redirect('https://sistema.worksafebrasil.com.br');
  }

  // Decodificar variáveis
  let variables = {};
  if (certificate.variableToReplace) {
    try {
      const decoded = Buffer.from(certificate.variableToReplace, 'base64').toString();
      variables = JSON.parse(decoded);
    } catch (e) {
      variables = {};
    }
  }

  const studentName = variables.aluno_nome?.value || 'Aluno';
  const courseName = variables.curso_nome?.value || 'Certificado';
  const companyName = certificate.company_name || 'WorkSafe Brasil';

  // HTML com meta tags
  const html = `<!DOCTYPE html>
<html lang="pt-br" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <title>Certificado de ${studentName} - ${courseName}</title>
    <meta name="description" content="Certificado válido emitido por ${companyName}">

    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="Certificado de ${studentName} - ${courseName}">
    <meta property="og:description" content="Certificado válido emitido por ${companyName} para o curso de ${courseName}">
    <meta property="og:image" content="${certificate.pdfUrl || 'https://sistema.worksafebrasil.com.br/og-image.jpg'}">
    <meta property="og:url" content="https://sistema.worksafebrasil.com.br/certificados/${id}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="WorkSafe Brasil">

    <!-- Redirecionar para a página real -->
    <meta http-equiv="refresh" content="0; url=https://sistema.worksafebrasil.com.br/certificados/${id}">
    <script>
      window.location.href = 'https://sistema.worksafebrasil.com.br/certificados/${id}';
    </script>
</head>
<body>
    <p>Redirecionando...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
```

### 3. Configurar o NGINX ou servidor web

Configure seu servidor (NGINX, Apache, etc) para redirecionar requisições de bots para o endpoint do backend:

#### NGINX exemplo:
```nginx
location ~ ^/certificados/([a-f0-9-]+)$ {
    # Detectar bots de redes sociais
    if ($http_user_agent ~* (LinkedInBot|facebookexternalhit|Twitterbot|WhatsApp)) {
        # Redirecionar para o backend que retorna HTML com meta tags
        proxy_pass http://seu-backend/api/certificate-meta/$1;
        break;
    }

    # Para usuários normais, servir o SPA
    try_files $uri /index.html;
}
```

## Solução Alternativa: Cloudflare Workers

Se você usa Cloudflare, pode criar um Worker que intercepta requisições:

```javascript
// Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') || ''

  // Verificar se é um bot e se é página de certificado
  const isBot = /LinkedInBot|facebookexternalhit|Twitterbot/i.test(userAgent)
  const certMatch = url.pathname.match(/^\/certificados\/([a-f0-9-]+)$/)

  if (isBot && certMatch) {
    const certId = certMatch[1]

    // Buscar dados do certificado da sua API
    const response = await fetch(`https://api.worksafebrasil.com.br/trainee-certificate/get-trainee-certificate/${certId}`)
    const data = await response.json()
    const cert = data?.data?.rows?.[0]

    if (cert) {
      // Retornar HTML com meta tags
      return new Response(generateHTML(cert), {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      })
    }
  }

  // Para requisições normais, continuar
  return fetch(request)
}

function generateHTML(cert) {
  // ... gerar HTML com meta tags ...
}
```

## Solução Mais Simples: Imagem Estática

Se as soluções acima forem complexas, você pode:

1. Criar uma imagem padrão bonita (1200x630px) com o logo da WorkSafe
2. Salvar como `/public/og-certificate.jpg`
3. Usar sempre essa imagem nas meta tags

Pelo menos terá uma imagem profissional em vez de nenhuma.

## Próximos Passos

1. **Escolha uma das soluções acima**
2. **Implemente no backend/servidor**
3. **Teste no LinkedIn Post Inspector**

A solução do backend é a mais recomendada pois:
- Funciona com todos os certificados
- Mostra dados reais do certificado
- Usa o thumbnail já gerado
- É relativamente simples de implementar