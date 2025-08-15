/**
 * Decodifica variáveis em base64 com suporte a UTF-8
 * @param encodedString - String em base64 contendo as variáveis
 * @returns Objeto decodificado ou objeto vazio em caso de erro
 */
export function decodeBase64Variables(encodedString: string | any): any {
  // Se já for um objeto, retorna como está
  if (typeof encodedString === 'object' && encodedString !== null) {
    return encodedString;
  }

  // Se não for string, retorna objeto vazio
  if (typeof encodedString !== 'string') {
    return {};
  }

  try {
    // Decodifica o base64 com suporte a UTF-8
    // Primeiro decodifica o base64 para bytes
    const binaryString = atob(encodedString);
    
    // Converte bytes para UTF-8
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decodifica UTF-8 para string
    const decoder = new TextDecoder('utf-8');
    const decodedString = decoder.decode(bytes);
    
    // Faz o parse do JSON
    const decodedObject = JSON.parse(decodedString);
    return decodedObject;
  } catch (error) {
    console.error('Erro ao decodificar variáveis:', error);
    return {};
  }
}