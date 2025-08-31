import { useMutation } from '@tanstack/react-query';
import { post } from '@/services/api';

interface ImageUploadResponse {
  imageUrl: string;
}

export const useImageUpload = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await post<ImageUploadResponse, { image: File }>(
        'images',
        's3',
        { image: file }
      );
      
      if (!response?.imageUrl) {
        throw new Error('URL da imagem não retornada pelo servidor');
      }
      
      return response.imageUrl;
    }
  });
};