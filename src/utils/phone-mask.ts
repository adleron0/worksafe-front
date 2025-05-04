// Função para formatar o TELEFONE (somente para exibição)
export const formatPHONE = (value: string | undefined): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')       // Adiciona parênteses e espaço
    .replace(/(\d{5})(\d{4})$/, '$1-$2')      // Formato para celular (11 dígitos)
    .replace(/(\d{4})(\d{4})$/, '$1-$2');     // Formato para fixo (10 dígitos)
};
