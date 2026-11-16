import React, { useCallback } from "react";
import { ImageUpload } from "./image-upload/ImageUpload";
import type { ImagePreset, ImagePresetName } from "./image-upload/presets";

/**
 * Camada de compatibilidade sobre o ImageUpload para formulários que guardam a
 * imagem num objeto de estado (`setDataForm(prev => ({ ...prev, image }))`).
 * Telas novas devem usar o ImageUpload direto, com `onChange`.
 */
interface DropUploadProps<T> {
  setImage: React.Dispatch<React.SetStateAction<T>>;
  EditPreview: string | null;
  acceptedFiles?: string;
  /** Campo do estado que recebe o File. */
  itemFormData?: string;
  /** Enquadramento no quadro; por padrão vem da predefinição. */
  cover?: boolean;
  /** Campos zerados junto ao remover a imagem (ex.: imageUrl). */
  clearFields?: string[];
  /** Proporção, tamanho e formato do recorte. Ver image-upload/presets.ts. */
  preset?: ImagePresetName | ImagePreset;
  className?: string;
  disabled?: boolean;
}

function DropUpload<T extends object>({
  setImage,
  EditPreview,
  acceptedFiles = "image/*",
  itemFormData = "image",
  cover,
  clearFields = [],
  preset = "free",
  className,
  disabled,
}: DropUploadProps<T>) {
  const handleChange = useCallback(
    (file: File | null) => {
      const updates: Record<string, unknown> = { [itemFormData]: file };
      if (!file) clearFields.forEach((field) => (updates[field] = null));
      setImage((prev: T) => ({ ...prev, ...updates }));
    },
    // clearFields costuma vir como literal novo a cada render; a chave basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setImage, itemFormData, clearFields.join(",")],
  );

  return (
    <ImageUpload
      previewUrl={EditPreview}
      onChange={handleChange}
      preset={preset}
      accept={acceptedFiles}
      fit={cover === undefined ? undefined : cover ? "cover" : "contain"}
      className={className}
      disabled={disabled}
    />
  );
}

export default DropUpload;
