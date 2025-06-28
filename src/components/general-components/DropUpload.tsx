import React, { useCallback, useState, useEffect, useId } from "react"; // Keep this one
import { Label } from "../ui/label";
import { ImageUp, X } from "lucide-react";
import { Button } from "../ui/button";

// Define the generic props interface
interface DropUploadProps<T> {
  setImage: React.Dispatch<React.SetStateAction<T>>; // Use standard React state setter type
  EditPreview: string | null;
  acceptedFiles?: string; // Add optional acceptedFiles prop
  itemFormData?: string;
  cover?: boolean;
}

const DropUpload = <T extends object>({ 
  setImage, 
  EditPreview, 
  acceptedFiles = "image/*",
  itemFormData = "image",
  cover = true,
}: DropUploadProps<T>) => { // Make component generic
  const [preview, setPreview] = useState<string | null>(null);
  const [errorFile, setErrorFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputId = useId(); // id único para cada instância

  useEffect(() => {
    if (EditPreview) {
      setPreview(EditPreview);
    }
  }, [EditPreview]);
  
  // Função para atualizar a prévia da imagem
  const handleImageChange = (file: File | null) => {
    if (file) {
      // Validate file type
      if (acceptedFiles !== "image/*" && !acceptedFiles.split(',').map(type => type.trim()).includes(file.type)) {
        setErrorFile(`Tipo de arquivo inválido. Aceitos: ${acceptedFiles}`);
        setTimeout(() => {
          setErrorFile(null);
        }, 3000);
        // Clear the file input if it's invalid
        const fileInput = document.getElementById(inputId) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return;
      }

      // Update state by merging the new file into the previous state object
      setImage((prev: T) => ({ ...prev, [itemFormData]: file }));

      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setErrorFile(null); // Clear any previous error
    } else {
      setErrorFile("Nenhum arquivo selecionado.");
      setTimeout(() => {
        setErrorFile(null);
      }, 3000);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      // You might add validation here based on acceptedFiles if needed
      handleImageChange(file);
    }
  }, [acceptedFiles]); // Add acceptedFiles to dependency array if validation logic uses it

  const handleDragLeave = () => setIsDragging(false);
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {event.preventDefault(); setIsDragging(true)};

  return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`group relative hover:border-primary focus:border-primary border-dashed ${
          isDragging ? "border-primary" : "border-gray-300"
        } focus:border-primary border-2 h-56 cursor-pointer p-2 rounded-md text-center`}
      >
        <input
          type="file"
          accept={acceptedFiles} // Use the acceptedFiles prop here
          onChange={(e) => handleImageChange(e.target.files ? e.target.files[0] : null)}
          className="hidden"
          id={inputId} // id dinâmico
        />
        <Label htmlFor={inputId} className="cursor-pointer">
          {preview ? (
            <div
              className="w-full group/image"
             >
              <div 
                style={{ backgroundImage: `url(${preview})` }}
                className={`w-full h-51 mx-auto rounded-md ${cover ? "bg-cover" : "bg-contain"} bg-center bg-no-repeat group-hover/image:blur-xs`}
              />
              <div style={{ pointerEvents: 'none' }} className="absolute top-0 bottom-0 left-0 right-0 flex flex-col items-center justify-center text-white text-sm rounded-md bg-black/45 opacity-0 hover:opacity-100 transition-opacity duration-200">
                <ImageUp/>
                <p>Arraste uma imagem aqui ou</p>
                <p>clique para selecionar</p>
              </div>
            </div>
          ) : (
            errorFile ? <p className="text-red-500">{errorFile}</p> :
            <div
              className="text-xs h-full text-gray-300 group-hover:text-primary ease-in-out duration-150 flex flex-col items-center justify-center"
            >
              <ImageUp/>
              <p>Arraste uma imagem aqui ou</p>
              <p>clique para selecionar</p>
            </div>
          )}
        </Label>
        
        { preview && 
          <Button
            onClick={() => {
              setPreview(null);
              // Reset the input field value if needed
              const fileInput = document.getElementById(inputId) as HTMLInputElement;
              if (fileInput) fileInput.value = '';
              // Update state by merging null values into the previous state object
              setImage((prev: T) => ({ ...prev, image: null, imageUrl: null }))} 
            }
            size="mini"
            variant="destructive"
            title="Descartar Imagem"
            className="md:hidden md:group-hover:flex items-center justify-center text-white rounded cursor-pointe absolute top-1 right-1"
          >
            <X className="h-3 w-3" />
          </Button>
        }
      </div>
  );
};

export default DropUpload;
