import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, ChevronDown, ChevronUp, FileImage, Type } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/services/api';
import { toast } from 'sonner';
import { ImageFormData } from '../types';

interface ImageUploadFormProps {
  imageType: string;
  onUploadSuccess?: () => void;
}

const ImageUploadForm: React.FC<ImageUploadFormProps> = ({ imageType, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [isFormCollapsed, setIsFormCollapsed] = useState(true);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: ImageFormData) => {
      return await post<ImageFormData>('images', '', data);
    },
    onSuccess: () => {
      toast.success('Imagem enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setSelectedFile(null);
      setImageName('');
      onUploadSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao enviar imagem');
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setImageName(nameWithoutExtension);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !imageName) {
      toast.error('Por favor, selecione um arquivo e forneça um nome');
      return;
    }

    const formData: ImageFormData = {
      image: selectedFile,
      name: imageName,
      type: imageType
    };

    uploadMutation.mutate(formData);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setIsFormCollapsed(!isFormCollapsed)}
      >
        <h3 className="text-sm font-semibold">Adicionar Nova Imagem</h3>
        {isFormCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </div>
      {!isFormCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="flex text-xs font-medium mb-1 items-center gap-1">
              <FileImage className="w-3 h-3" />
              Arquivo
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FileImage className="w-4 h-4 flex-shrink-0" />
                {selectedFile ? (
                  <span className="truncate">{selectedFile.name}</span>
                ) : (
                  <span className="text-gray-500 whitespace-nowrap">Escolher imagem</span>
                )}
              </label>
            </div>
            {selectedFile && (
              <p className="text-xs text-gray-400 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
          
          <div>
            <label className="flex text-xs font-medium mb-1 items-center gap-1">
              <Type className="w-3 h-3" />
              Nome
            </label>
            <Input
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="Nome da imagem"
              className="text-xs h-8"
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !imageName || uploadMutation.isPending}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-3 h-3 mr-1.5" />
            )}
            Enviar
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ImageUploadForm;