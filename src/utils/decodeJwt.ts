export const decodeJwtPayload = (token: string) => {
  try {
    const payloadBase64Url = token.split('.')[1]; // Segunda parte é o payload
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/'); // Corrige Base64Url
    const decodedPayload = atob(payloadBase64); // Decodifica de Base64 para string
    const payload = JSON.parse(decodedPayload); // Converte para objeto JSON

    return payload;
  } catch (error) {
    console.error('❌ Erro ao decodificar o JWT:', error);
    throw new Error('Token JWT inválido');
  }
}
