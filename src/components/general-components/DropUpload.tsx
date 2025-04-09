import { useCallback, useState, useEffect } from "react";
import { Label } from "../ui/label";
import { ImageUp, X } from "lucide-react";
import { Button } from "../ui/button";

const DropUpload = ({ setImage, EditPreview }: { setImage: any, EditPreview: string | null }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [errorFile, setErrorFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    if (EditPreview) {
      setPreview(EditPreview);
    }
  }, [EditPreview]);
  
  // Função para atualizar a prévia da imagem
  const handleImageChange = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setImage((prev: any) => ({ ...prev, image: file }));

      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setErrorFile("Arquivo inválido");
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
      handleImageChange(file);
    }
  }, []);

  const handleDragLeave = () => setIsDragging(false);
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {event.preventDefault(); setIsDragging(true)};

  return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`group relative hover:border-primary focus:border-primary border-dashed ${
          isDragging ? "border-primary" : "border-gray-300"
        } focus:border-primary border-2 max-h-56 aspect-square cursor-pointer p-2 rounded-md text-center`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageChange(e.target.files ? e.target.files[0] : null)}
          className="hidden"
          id="fileInput"
        />
        <Label htmlFor="fileInput" className="cursor-pointer">
          {preview ? (
            <div
              className="w-full group/image"
             >
              <div 
                style={{ backgroundImage: `url(${preview})` }}
                className="w-full h-51 mx-auto rounded-md bg-cover bg-center bg-no-repeat group-hover/image:blur-xs"
              />
              <div className="absolute top-0 bottom-0 left-0 right-0 flex flex-col items-center justify-center text-white text-sm rounded-md bg-black/45 opacity-0 hover:opacity-100 transition-opacity duration-200">
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
              setImage((prev: any) => ({ ...prev, imageUrl: null }))}
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
