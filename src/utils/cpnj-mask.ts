// Função para formatar o CNPJ (somente para exibição)
export const formatCNPJ = (value: string) => {
  if (!value) return value;
  return value
    .replace(/\D/g, '') // Remove qualquer caractere que não seja número
    .replace(/^(\d{2})(\d)/, '$1.$2') // Insere o primeiro ponto
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3') // Insere o segundo ponto
    .replace(/\.(\d{3})(\d)/, '.$1/$2') // Insere a barra
    .replace(/(\d{4})(\d)/, '$1-$2') // Insere o traço
    .replace(/(-\d{2})\d+?$/, '$1'); // Limita ao tamanho máximo do CNPJ
};

// Função para remover a formatação e manter apenas números
export const unformatCNPJ = (value: string) => {
  return value.replace(/\D/g, ''); // Remove qualquer caractere que não seja número
};
