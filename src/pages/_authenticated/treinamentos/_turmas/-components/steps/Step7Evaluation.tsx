import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Input from "@/components/general-components/Input";
import {
  HelpCircle,
  RefreshCw,
  ChevronDown,
  MapPin,
  Loader2
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FormData } from "../TurmasFormSteps";
import { toast } from "@/hooks/use-toast";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  generateClassCode: () => string;
}

const Step7Evaluation = ({
  dataForm,
  setDataForm,
  errors,
  generateClassCode
}: StepProps) => {
  const [isAddressOpen, setIsAddressOpen] = useState<boolean>(
    !!(dataForm as any)?.address || false
  );
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [lastFetchedCep, setLastFetchedCep] = useState<string>("");

  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  // Função para buscar CEP
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) return;
    if (cleanCep === lastFetchedCep) return;

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setDataForm(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          addressNumber: prev.addressNumber,
          addressComplement: prev.addressComplement,
        }));

        setIsAddressOpen(true);
        setLastFetchedCep(cleanCep);

        toast({
          title: "CEP encontrado!",
          description: "Endereço preenchido automaticamente.",
          variant: "success",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (name: string, value: string | number | null | string[]) => {
    const cepValue = String(value);
    handleChange(name, cepValue);

    const cleanCep = cepValue.replace(/\D/g, "");

    if (cleanCep.length === 8 && cleanCep !== lastFetchedCep) {
      fetchAddressByCep(cepValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* Habilitar Prova Virtual */}
      <div className={`p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowExam ? "pb-4" : ""}`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="allowExam"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Prova Virtual
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Habilita exame/prova de Avaliação virtual sobre os conhecimentos
              adquiridos
            </p>
          </div>
          <Switch
            id="allowExam"
            name="allowExam"
            checked={dataForm.allowExam ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({ ...prev, allowExam: !prev.allowExam }))
            }
          />
        </div>

        {dataForm.allowExam && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="classCode">
              Código de Acesso à Prova <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Código de acesso a prova
            </p>
            <div className="flex gap-2">
              <Input
                id="classCode"
                name="classCode"
                placeholder="Ex: A3B9"
                value={dataForm.classCode || ""}
                onValueChange={handleChange}
                className="flex-1"
                required={dataForm.allowExam}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newCode = generateClassCode();
                  handleChange("classCode", newCode);
                }}
                title="Gerar novo código"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {errors.classCode && (
              <p className="text-red-500 text-sm mt-1">{errors.classCode}</p>
            )}
          </div>
        )}
      </div>

      {/* Habilitar Avaliação */}
      <div className="p-4 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center">
        <div className="flex flex-col">
          <Label
            htmlFor="allowReview"
            className="cursor-pointer flex items-center gap-2"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Habilitar Avaliação
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Permite coleta de avaliação dos alunos sobre o curso ao final do
            exame
          </p>
        </div>
        <Switch
          id="allowReview"
          name="allowReview"
          checked={dataForm.allowReview ? true : false}
          onCheckedChange={() =>
            setDataForm((prev) => ({ ...prev, allowReview: !prev.allowReview }))
          }
        />
      </div>

      {/* Endereço do Curso Presencial */}
      <Collapsible
        open={isAddressOpen}
        onOpenChange={setIsAddressOpen}
        className="mt-4"
      >
        <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
            <div className="flex flex-col text-left">
              <Label className="flex items-center gap-2 cursor-pointer">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Endereço do Curso Presencial
                {dataForm.address && (
                  <span className="text-xs text-green-600 font-medium ml-2">
                    • Preenchido
                  </span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground font-medium">
                Informações opcionais do local onde o curso presencial será realizado
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isAddressOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 border-t border-border/50 pt-4">
              <div className="md:col-span-2">
                <Label htmlFor="zipCode" className="flex items-center gap-2">
                  CEP
                  {isLoadingCep && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  placeholder="00000-000"
                  format="cep"
                  value={dataForm.zipCode || ""}
                  onValueChange={handleCepChange}
                  className="mt-1"
                  disabled={isLoadingCep}
                />
                {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o CEP para buscar o endereço automaticamente
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Rua, Avenida, etc..."
                  value={dataForm.address || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
              </div>

              <div>
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  name="addressNumber"
                  placeholder="Número"
                  value={dataForm.addressNumber || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.addressNumber && <p className="text-red-500 text-sm">{errors.addressNumber}</p>}
              </div>

              <div>
                <Label htmlFor="addressComplement">Complemento</Label>
                <Input
                  id="addressComplement"
                  name="addressComplement"
                  placeholder="Apartamento, Sala, etc..."
                  value={dataForm.addressComplement || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.addressComplement && <p className="text-red-500 text-sm">{errors.addressComplement}</p>}
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  placeholder="Bairro"
                  value={dataForm.neighborhood || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.neighborhood && <p className="text-red-500 text-sm">{errors.neighborhood}</p>}
              </div>

              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Cidade"
                  value={dataForm.city || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
              </div>

              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="Ex: SP, RJ, MG"
                  value={dataForm.state || ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.state && <p className="text-red-500 text-sm">{errors.state}</p>}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default Step7Evaluation;