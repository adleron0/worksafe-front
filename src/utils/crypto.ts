import CryptoJS from 'crypto-js'; // Importa o pacote completo
import { IPayload } from '@/general-interfaces/auth.interface';

// Converte a chave para um WordArray, como no back-end
const SECRET_KEY = CryptoJS.enc.Utf8.parse(
  import.meta.env.VITE_PAYLOAD_ACCESS_SECRET?.slice(0, 32) || '12345678901234567890123456789012'
);

// Função para descriptografar o payload
function decryptPayload(ciphertext: string): IPayload {
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = CryptoJS.enc.Hex.parse(ivHex); // Converte IV de Hex para WordArray

  // Descriptografa o texto criptografado
  const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Converte de WordArray para string UTF-8
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

  try {
    const result = JSON.parse(decryptedText);
    return result;
  } catch (error) {
    console.error('❌ Erro ao parsear o payload:', error);
    throw new Error('Payload inválido');
  }
}

export { decryptPayload };
