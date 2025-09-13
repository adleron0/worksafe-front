/**
 * Handler para compartilhamento em redes sociais
 * Este script deve ser integrado ao backend Express/Node.js
 *
 * COMO FUNCIONA:
 * 1. Intercepta requisições para /share/certificados/:id
 * 2. Busca dados do certificado no banco
 * 3. Gera HTML com meta tags específicas
 * 4. Redireciona usuários reais para a página do certificado
 * 5. Bots de redes sociais leem as meta tags
 */

const fs = require('fs');
const path = require('path');

/**
 * Middleware para processar compartilhamentos de certificados
 */
async function shareMiddleware(req, res, next) {
  // Verificar se é uma requisição para compartilhamento
  const sharePattern = /^\/share\/certificados\/([a-f0-9-]+)$/;
  const match = req.path.match(sharePattern);

  if (!match) {
    return next();
  }

  const certificateId = match[1];

  try {
    // Detectar se é um bot de rede social
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|crawler|spider|linkedin|facebook|twitter|whatsapp|telegram|slack|discord/i.test(userAgent);

    // Buscar dados do certificado
    const certificateData = await getCertificateData(certificateId);

    if (!certificateData) {
      // Se não encontrar o certificado, redirecionar para home
      return res.redirect('/');
    }

    // Preparar dados para as meta tags
    const metaData = generateMetaData(certificateData);

    // Ler o template HTML
    const templatePath = path.join(__dirname, 'public', 'share.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Substituir placeholders
    html = html.replace(/{{TITLE}}/g, escapeHtml(metaData.title));
    html = html.replace(/{{DESCRIPTION}}/g, escapeHtml(metaData.description));
    html = html.replace(/{{IMAGE}}/g, metaData.image);
    html = html.replace(/{{URL}}/g, metaData.shareUrl);
    html = html.replace(/{{REDIRECT_URL}}/g, metaData.redirectUrl);

    // Enviar HTML
    res.send(html);
  } catch (error) {
    console.error('Erro ao processar compartilhamento:', error);
    next();
  }
}

/**
 * Gerar meta dados baseados no certificado
 */
function generateMetaData(certificate) {
  const baseUrl = process.env.FRONTEND_URL || 'https://sistema.worksafebrasil.com.br';

  // Decodificar variáveis do certificado
  let variables = {};
  if (certificate.variableToReplace) {
    try {
      if (typeof certificate.variableToReplace === 'string') {
        // Se for base64, decodificar
        const decoded = Buffer.from(certificate.variableToReplace, 'base64').toString('utf-8');
        variables = JSON.parse(decoded);
      } else {
        variables = certificate.variableToReplace;
      }
    } catch (e) {
      variables = certificate.variableToReplace;
    }
  }

  const studentName = variables.aluno_nome?.value || 'Aluno';
  const courseName = variables.curso_nome?.value || 'Certificado';
  const companyName = certificate.company?.comercial_name || 'WorkSafe Brasil';
  const workload = variables.turma_carga_horaria?.value || '';

  // Gerar URL da imagem dinâmica
  let imageUrl = `${baseUrl}/api/certificate-image/${certificate.key || certificate.id}`;

  // Se já tiver thumbnail salvo, usar ele
  if (certificate.pdfUrl) {
    imageUrl = certificate.pdfUrl;
    // Garantir HTTPS
    if (imageUrl.startsWith('http://')) {
      imageUrl = imageUrl.replace('http://', 'https://');
    }
  }

  return {
    title: `Certificado de ${studentName} - ${courseName}`,
    description: `Certificado válido emitido por ${companyName} para o curso de ${courseName}${workload ? `. Carga horária: ${workload} horas` : ''}. Verifique a autenticidade no sistema oficial.`,
    image: imageUrl,
    shareUrl: `${baseUrl}/share/certificados/${certificate.key || certificate.id}`,
    redirectUrl: `${baseUrl}/certificados/${certificate.key || certificate.id}`
  };
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Buscar dados do certificado no banco
 * IMPORTANTE: Implementar esta função com sua lógica real
 */
async function getCertificateData(certificateId) {
  // Exemplo de implementação - adaptar para seu banco de dados
  /*
  const result = await db.query(`
    SELECT
      c.*,
      company.comercial_name,
      company.logoUrl
    FROM certificates c
    LEFT JOIN companies company ON c.companyId = company.id
    WHERE c.key = ? OR c.id = ?
  `, [certificateId, certificateId]);

  return result[0];
  */

  // Por enquanto, retornar null
  return null;
}

/**
 * ENDPOINT PARA GERAR IMAGEM DINÂMICA DO CERTIFICADO
 * Este endpoint gera uma imagem PNG do certificado em tempo real
 */
async function certificateImageEndpoint(req, res) {
  const certificateId = req.params.id;

  try {
    // Buscar dados do certificado
    const certificate = await getCertificateData(certificateId);

    if (!certificate) {
      // Retornar imagem padrão
      const defaultImagePath = path.join(__dirname, 'public', 'og-image.jpg');
      return res.sendFile(defaultImagePath);
    }

    // Gerar imagem usando Canvas ou Puppeteer
    const imageBuffer = await generateCertificateImage(certificate);

    // Configurar headers para cache
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    // Retornar imagem padrão em caso de erro
    const defaultImagePath = path.join(__dirname, 'public', 'og-image.jpg');
    res.sendFile(defaultImagePath);
  }
}

/**
 * Gerar imagem do certificado usando Node Canvas
 */
async function generateCertificateImage(certificate) {
  const { createCanvas, loadImage } = require('canvas');

  // Criar canvas 1200x630 (tamanho recomendado para OG)
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');

  // Fundo gradiente
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  // Decodificar variáveis
  let variables = {};
  if (certificate.variableToReplace) {
    try {
      if (typeof certificate.variableToReplace === 'string') {
        const decoded = Buffer.from(certificate.variableToReplace, 'base64').toString('utf-8');
        variables = JSON.parse(decoded);
      } else {
        variables = certificate.variableToReplace;
      }
    } catch (e) {
      variables = certificate.variableToReplace;
    }
  }

  const studentName = variables.aluno_nome?.value || 'Aluno';
  const courseName = variables.curso_nome?.value || 'Certificado';
  const companyName = certificate.company?.comercial_name || 'WorkSafe Brasil';

  // Configurar texto
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Título da empresa
  ctx.font = 'bold 48px Arial';
  ctx.fillText(companyName.toUpperCase(), 600, 150);

  // Linha decorativa
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 200);
  ctx.lineTo(900, 200);
  ctx.stroke();

  // "CERTIFICADO"
  ctx.font = '36px Arial';
  ctx.fillText('CERTIFICADO', 600, 250);

  // Nome do aluno
  ctx.font = 'bold 42px Arial';
  ctx.fillText(studentName, 600, 350);

  // Curso
  ctx.font = '32px Arial';
  ctx.fillText(courseName, 600, 430);

  // Badge de validação
  ctx.font = '24px Arial';
  ctx.fillStyle = '#90EE90';
  ctx.fillText('✓ Certificado Válido', 600, 530);

  return canvas.toBuffer('image/png');
}

/**
 * CONFIGURAÇÃO DO EXPRESS
 */
function setupShareRoutes(app) {
  // Middleware para compartilhamento
  app.use(shareMiddleware);

  // Endpoint para gerar imagem dinâmica
  app.get('/api/certificate-image/:id', certificateImageEndpoint);

  // Atualizar botões de compartilhamento no frontend para usar /share/
  // Em vez de compartilhar: https://sistema.worksafebrasil.com.br/certificados/ID
  // Compartilhar: https://sistema.worksafebrasil.com.br/share/certificados/ID
}

module.exports = {
  setupShareRoutes,
  shareMiddleware,
  certificateImageEndpoint,
  generateCertificateImage
};

/**
 * INSTRUÇÕES DE IMPLEMENTAÇÃO:
 *
 * 1. Instalar dependências:
 *    npm install canvas
 *
 * 2. No seu servidor Express:
 *
 *    const express = require('express');
 *    const { setupShareRoutes } = require('./backend-share-handler');
 *
 *    const app = express();
 *
 *    // Configurar rotas de compartilhamento
 *    setupShareRoutes(app);
 *
 *    // Resto da configuração...
 *
 * 3. Atualizar frontend para usar URLs de compartilhamento:
 *    - LinkedIn: /share/certificados/ID
 *    - Facebook: /share/certificados/ID
 *    - Twitter: /share/certificados/ID
 *
 * 4. Implementar getCertificateData() com sua lógica de banco
 *
 * 5. Testar com LinkedIn Post Inspector
 */