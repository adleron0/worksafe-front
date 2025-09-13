/**
 * Script para servidor Node.js/Express processar meta tags dinâmicas
 * Este script deve ser integrado ao servidor backend
 */

const fs = require('fs');
const path = require('path');

/**
 * Middleware para processar requisições de certificados e injetar meta tags
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function certificateMetaTagsMiddleware(req, res, next) {
  // Verificar se é uma requisição para certificado
  const certificatePattern = /^\/certificados\/([a-f0-9-]+)$/;
  const match = req.path.match(certificatePattern);

  if (!match) {
    // Não é uma página de certificado, continuar normalmente
    return next();
  }

  const certificateId = match[1];

  try {
    // Aqui você deve buscar os dados do certificado do banco
    // Este é um exemplo - substitua com sua lógica real
    const certificateData = await getCertificateData(certificateId); // Implementar esta função

    if (!certificateData) {
      return next();
    }

    // Ler o arquivo index.html
    const htmlPath = path.join(__dirname, 'dist', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Preparar meta tags dinâmicas
    const metaTags = generateMetaTags(certificateData);

    // Substituir as meta tags padrão pelas dinâmicas
    html = html.replace(
      '<meta property="og:title" content="WORKSAFE BRASIL - Trabalhos em Altura, Espaços Confinados e Resgate" />',
      `<meta property="og:title" content="${metaTags.title}" />`
    );

    html = html.replace(
      '<meta property="og:description" content="Sistema oficial de certificados da WorkSafe Brasil. Validação e verificação de certificados de treinamentos em segurança do trabalho." />',
      `<meta property="og:description" content="${metaTags.description}" />`
    );

    html = html.replace(
      '<meta property="og:url" content="https://sistema.worksafebrasil.com.br" />',
      `<meta property="og:url" content="${metaTags.url}" />`
    );

    if (metaTags.image) {
      html = html.replace(
        '<meta property="og:image" content="https://sistema.worksafebrasil.com.br/og-image.jpg" />',
        `<meta property="og:image" content="${metaTags.image}" />`
      );
    }

    // Atualizar também o título da página
    html = html.replace(
      '<title>WORKSAFE BRASIL - Trabalhos em Altura, Espaços Confinados e Resgate</title>',
      `<title>${metaTags.title}</title>`
    );

    // Enviar o HTML modificado
    res.send(html);
  } catch (error) {
    console.error('Erro ao processar meta tags:', error);
    next();
  }
}

/**
 * Gerar meta tags baseadas nos dados do certificado
 * @param {Object} certificateData - Dados do certificado
 * @returns {Object} Meta tags
 */
function generateMetaTags(certificateData) {
  const baseUrl = 'https://sistema.worksafebrasil.com.br';

  // Extrair informações do certificado
  const studentName = certificateData.variableToReplace?.aluno_nome?.value || 'Aluno';
  const courseName = certificateData.variableToReplace?.curso_nome?.value || 'Certificado';
  const companyName = certificateData.company?.comercial_name || 'WorkSafe Brasil';
  const certificateKey = certificateData.key || certificateData.id;

  return {
    title: `Certificado de ${studentName} - ${courseName}`,
    description: `Certificado válido emitido por ${companyName} para o curso de ${courseName}. Verifique a autenticidade deste certificado no sistema oficial.`,
    url: `${baseUrl}/certificados/${certificateKey}`,
    image: certificateData.pdfUrl || `${baseUrl}/og-image.jpg`
  };
}

/**
 * Exemplo de função para buscar dados do certificado
 * IMPORTANTE: Substitua esta função com sua implementação real
 * @param {string} certificateId - ID do certificado
 * @returns {Promise<Object>} Dados do certificado
 */
async function getCertificateData(certificateId) {
  // Implementar a busca real no banco de dados
  // Este é apenas um exemplo

  // const certificate = await db.query('SELECT * FROM certificates WHERE key = ?', [certificateId]);
  // return certificate;

  // Por enquanto, retornar null para usar o fallback
  return null;
}

module.exports = {
  certificateMetaTagsMiddleware,
  generateMetaTags
};

/**
 * INSTRUÇÕES DE USO:
 *
 * 1. No seu servidor Express, adicione este middleware ANTES de servir arquivos estáticos:
 *
 * const express = require('express');
 * const { certificateMetaTagsMiddleware } = require('./server-meta-tags');
 *
 * const app = express();
 *
 * // Adicionar o middleware
 * app.use(certificateMetaTagsMiddleware);
 *
 * // Servir arquivos estáticos
 * app.use(express.static('dist'));
 *
 * // Fallback para SPA
 * app.get('*', (req, res) => {
 *   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
 * });
 *
 * 2. Implemente a função getCertificateData() para buscar dados reais do banco
 *
 * 3. Certifique-se de que o servidor tem acesso aos arquivos da pasta 'dist'
 *
 * 4. Teste com o LinkedIn Post Inspector após implementar
 */