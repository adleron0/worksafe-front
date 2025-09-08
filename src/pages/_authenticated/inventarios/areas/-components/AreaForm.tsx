import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createArea, updateArea } from "@/services/specific/areaService";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import { DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { Plus, Edit3 } from "lucide-react";
import { Area } from "../-interfaces/area.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import DropUpload from "@/components/general-components/DropUpload";

const AreaForm = ({ areaToEdit }: { areaToEdit?: Area }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); 
  const companyId = user?.companyId || 1;

  // Schema atualizado para validar image como File ou null
  const areaSchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    description: z.string().min(2, { message: "Descrição deve ter pelo menos 10 caracteres" }),
    companyId: z.number(),
    imageUrl: z.string().nullable(),
    // subArea: z.array(z.string()),
    image: z.instanceof(File).nullable().or(z.literal(null)).refine(
      (value) => value === null || value instanceof File,
      {
        message: "Imagem deve ser um arquivo ou nulo.",
      }
    ),
  })

  type AreaFormData = z.infer<typeof areaSchema>;

  // Controle de abertura do Sheet
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState<AreaFormData>({
    name: "",
    companyId,
    description: "",
    // subArea: [],
    image: null,
    imageUrl: null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [preview, setPreview] = useState<string | null>(null);

  // Efeito para pré-preencher o formulário quando areaToEdit for fornecido
  useEffect(() => {
    if (areaToEdit) {
      setFormData({
        name: areaToEdit.name || "",
        description: areaToEdit.description || "",
        companyId: areaToEdit.companyId || companyId,
        // subArea: areaToEdit.subArea || [],
        image: null,
        imageUrl: areaToEdit.imageUrl || null,
      });
      if (areaToEdit.imageUrl) {
        setPreview(areaToEdit.imageUrl);
      }
    }
  }, [areaToEdit, companyId, isSheetOpen]);

  useEffect(() => {
    if (!areaToEdit) {
      setFormData({
        name: "",
        description: "",
        companyId,
        // subArea: [],
        image: null,
        imageUrl: null,
      });
    }
  }, []);

  const { mutate: registerArea, isPending } = useMutation({
    mutationFn: (newArea: AreaFormData) => createArea(newArea),
    onSuccess: () => {
      toast({
        title: "Área registrada!",
        description: "Nova Área criada com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listAreasCompany"] });
      // Limpa o formulário e fecha o Sheet
      setFormData({
        name: "",
        description: "",
        companyId,
        // subArea: [],
        image: null,
        imageUrl: null,
      });
      setIsSheetOpen(false);
    },
    onError: (error: ApiError) => {
      toast({
        title: "Erro ao registrar área",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  // Função para remover itens vazios do formulário
  const removeEmptyValues = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach((key) => {
      if (newObj[key] === "") {
        delete newObj[key];
      }
    });
    return newObj;
  };

  const { mutate: updateAreaMutation, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedArea: AreaFormData) => updateArea(removeEmptyValues(updatedArea), areaToEdit?.id),
    onSuccess: () => {
      toast({
        title: "Área atualizada!",
        description: "Área atualizada com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listAreasCompany"] });
      // Limpa o formulário e fecha o Sheet
      setFormData({
        name: "",
        description: "",
        companyId,
        // subArea: [],
        image: null,
        imageUrl: null,
      });
      setIsSheetOpen(false);
    },
    onError: (error: ApiError) => {
      toast({
        title: "Erro ao atualizar área",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = areaSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors: any = result.error.format();
      const newErrors: { [key: string]: string } = {};
      for (const key in formattedErrors) {
        if (key !== "_errors") {
          newErrors[key] = formattedErrors[key]?._errors[0] || "";
        }
      }
      setErrors(newErrors);
      return;
    }

    if (areaToEdit) {
      updateAreaMutation(formData);
    } else {
      registerArea(formData);
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        {
          areaToEdit ? (
            <Button variant="default" className={`flex p-2 items-center w-1/2 h-7`}>
              <Edit3 className="w-3 h-3 mr-2"/>
              <p>Editar</p>
            </Button>
          ) : (
            <Button variant="outline" className={`flex aspect-square md:aspect-auto md:gap-2 items-center md:items-baseline`}>
              <Plus className="w-3 h-3" /> <p className="hidden md:block">Nova Área</p>
            </Button>
          )
        }
        
      </SheetTrigger>
      <SheetContent side="right" className="w-11/12 md:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{areaToEdit ? `Editar Área ${areaToEdit.name}` : "Nova Área"}</SheetTitle>
          <DialogDescription>
            Por favor, preencha todas as informações necessárias para {areaToEdit ? "atualizar" : "registrar"} a Área.
          </DialogDescription>
        </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4">
            <DropUpload
              setImage={setFormData}
              EditPreview={preview}
            />
            <div>
              <Label htmlFor="name">Nome da Área</Label>
              <Input
                id="name"
                name="name"
                placeholder="Digite nome da Área"
                value={formData.name}
                onChange={(e) => handleChange(e.target.name, e.target.value)}
                className="mt-1"
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                type="description"
                placeholder="Descreva a área"
                value={formData.description}
                onChange={(e) => handleChange(e.target.name, e.target.value)}
                className="mt-1"
              />
              {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            </div>
            <Button
              type="submit"
              className="w-full my-4"
              disabled={isPending || isPendingUpdate}
            >
              {isPending || isPendingUpdate
                ? areaToEdit
                  ? "Atualizando..."
                  : "Registrando..."
                : areaToEdit
                ? "Atualizar Área"
                : "Registrar Área"}
            </Button>
            {(isPending || isPendingUpdate) && (
              <Loader title={areaToEdit ? "Atualizando Área..." : "Registrando Área..."} />
            )}
          </form>
        {/* <Button 
          variant="ghost"
          className="md:hidden"
          onClick={() => setIsSheetOpen(false)}
        >
          <ChevronRight className="fixed -left-2 top-1/2 h-6 w-6 text-primary" />
        </Button> */}

      </SheetContent>
    </Sheet>
  );
};

export default AreaForm;
