import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import ConfirmDialog from '@/components/general-components/ConfirmDialog';
import { Image } from '../types';

interface ImageGridProps {
  images: Image[];
  deletingImageId: number | null;
  onImageClick: (imageUrl: string, imageName: string) => void;
  onImageDelete: (id: number) => void;
  onDragStart: (e: React.DragEvent, imageUrl: string, imageName: string) => void;
  onDragEnd: () => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  deletingImageId,
  onImageClick,
  onImageDelete,
  onDragStart,
  onDragEnd
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((image) => (
        <div key={image.id} className="group">
          <div 
            className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden border cursor-pointer"
            draggable
            onDragStart={(e) => onDragStart(e, image.imageUrl, image.name)}
            onDragEnd={onDragEnd}
            onClick={() => onImageClick(image.imageUrl, image.name)}
          >
            <img 
              src={image.imageUrl} 
              alt={image.name}
              className={`w-full h-full object-contain transition-opacity duration-200 ${
                deletingImageId === image.id ? 'opacity-50' : ''
              }`}
              loading="lazy"
            />
            {deletingImageId === image.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            <ConfirmDialog
              title="Excluir Imagem"
              description={`Tem certeza que deseja excluir a imagem "${image.name}"? Esta ação não pode ser desfeita.`}
              onConfirm={() => onImageDelete(image.id)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded"
                onClick={(e) => e.stopPropagation()}
                disabled={deletingImageId === image.id}
              >
                <Trash2 className="w-3 h-3 text-gray-600" />
              </Button>
            </ConfirmDialog>
          </div>
          <div className="mt-2">
            <p className="text-xs font-medium truncate">{image.name}</p>
            <p className="text-xs text-gray-500">{image.type}</p>
            {image.fileSize && (
              <p className="text-xs text-gray-400">
                {(image.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;