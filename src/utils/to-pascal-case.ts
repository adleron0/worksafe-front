export const toPascalCase = (input: any) => {
  const str = String(input); // converte o input para string
  if (str.length === 0) return '';

  if (str.indexOf('-') === -1) {
    return str[0].toUpperCase() + str.slice(1);
  }

  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};
