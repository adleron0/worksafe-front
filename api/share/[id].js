/**
 * Vercel Serverless Function para servir meta tags dinâmicas
 * Esta função é executada no servidor da Vercel
 *
 * Caminho: /api/share/[id]
 */

export default async function handler(req, res) {
  const { id } = req.query;

  // Buscar dados do certificado da sua API
  let certificateData = null;
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.worksafebrasil.com.br';
    const response = await fetch(`${apiUrl}/trainee-certificate/get-trainee-certificate/${id}`);
    const data = await response.json();
    certificateData = data?.data?.rows?.[0];
  } catch (error) {
    console.error('Erro ao buscar certificado:', error);
  }

  // Preparar meta dados
  let title = 'Certificado - WorkSafe Brasil';
  let description = 'Certificado válido emitido pela WorkSafe Brasil';
  let image = 'https://sistema.worksafebrasil.com.br/og-image.jpg';

  if (certificateData) {
    // Decodificar variáveis
    let variables = {};
    try {
      if (certificateData.variableToReplace) {
        if (typeof certificateData.variableToReplace === 'string') {
          const decoded = Buffer.from(certificateData.variableToReplace, 'base64').toString('utf-8');
          variables = JSON.parse(decoded);
        } else {
          variables = certificateData.variableToReplace;
        }
      }
    } catch (e) {
      variables = certificateData.variableToReplace || {};
    }

    const studentName = variables.aluno_nome?.value || 'Aluno';
    const courseName = variables.curso_nome?.value || 'Certificado';
    const companyName = certificateData.company?.comercial_name || 'WorkSafe Brasil';

    title = `Certificado de ${studentName} - ${courseName}`;
    description = `Certificado válido emitido por ${companyName} para o curso de ${courseName}`;

    // Usar thumbnail se disponível
    if (certificateData.pdfUrl) {
      image = certificateData.pdfUrl;
      if (image.startsWith('http://')) {
        image = image.replace('http://', 'https://');
      }
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-br" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="https://sistema.worksafebrasil.com.br/certificados/${id}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="WorkSafe Brasil">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">

    <!-- Redirecionamento -->
    <meta http-equiv="refresh" content="0; url=https://sistema.worksafebrasil.com.br/certificados/${id}">
    <script>
        window.location.replace('https://sistema.worksafebrasil.com.br/certificados/${id}');
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: sans-serif;">
        <h1>Redirecionando...</h1>
        <p>Se você não for redirecionado, <a href="https://sistema.worksafebrasil.com.br/certificados/${id}">clique aqui</a>.</p>
    </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}