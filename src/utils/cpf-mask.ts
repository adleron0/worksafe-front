// Função para formatar o CPF (somente para exibição)
export const formatCPF = (value: string): string => {
  // Remove caracteres não numéricos e limita a 11 dígitos
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2') // Insere o primeiro ponto
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3') // Insere o segundo ponto
    .replace(/(\d{3})(\d{2})$/, '$1-$2'); // Insere o traço no final
};

// Função para remover a formatação e manter apenas números
export const unformatCPF = (value: string): string => {
  return value.replace(/\D/g, ''); // Remove qualquer caractere que não seja número
};
