import { useAuth } from "@/context/AuthContext";
import Pako from "pako";

const useVerify = () => {
  const { user } = useAuth();
  
  // Verificar se user e user.permissions existem antes de tentar descomprimir
  let permissions: string[] = [];
  try {
    if (user?.permissions && typeof user.permissions === 'string') {
      // Converter base64 para Uint8Array usando APIs do navegador
      const binaryString = atob(user.permissions);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Descomprimir com Pako.inflateRaw para corresponder ao deflateRawSync do backend
      permissions = JSON.parse(Pako.inflateRaw(bytes, { to: 'string' }));
    } else if (user?.permissions && Array.isArray(user.permissions)) {
      // Se já for um array, use diretamente
      permissions = user.permissions;
    }
  } catch (error) {
    console.error("Erro ao descomprimir permissões: ", error);
  }

  // Função para verificar se o usuário tem uma permissão específica
  const can = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  // Função para verificar o perfil do usuário
  const is = (profile: string): boolean => {
    return user?.profile === profile;
  };

  // Função para verificar os produtos do usuário
  const has = (product: string): boolean => {
    return user?.products?.includes(product) ?? false;
  };

  return { can, is, has };
};

export default useVerify;
