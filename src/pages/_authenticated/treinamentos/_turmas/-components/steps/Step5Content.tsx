import React from "react";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import TagInput from "@/components/general-components/TagInput";
import { FormData } from "../TurmasFormSteps";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const Step5Content = ({ dataForm, setDataForm, errors }: StepProps) => {
  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Descrição <span className="text-red-500">*</span>
        </Label>
        <Input
          id="description"
          name="description"
          placeholder="Digite a descrição da turma"
          value={dataForm.description}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Grade Curricular Teórica */}
      <div className="space-y-2">
        <Label htmlFor="gradeTheory">
          Grade curricular teórica <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-muted-foreground font-medium">
          Adicione os itens da grade curricular teórica
        </p>
        <TagInput
          value={dataForm.gradeTheory}
          onChange={(value) => handleChange("gradeTheory", value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradeTheory && (
          <p className="text-red-500 text-sm mt-1">{errors.gradeTheory}</p>
        )}
      </div>

      {/* Grade Curricular Prática */}
      <div className="space-y-2">
        <Label htmlFor="gradePracticle">Grade curricular prática</Label>
        <p className="text-xs text-muted-foreground font-medium">
          Adicione os itens da grade curricular prática
        </p>
        <TagInput
          value={dataForm.gradePracticle}
          onChange={(value) => handleChange("gradePracticle", value)}
          separator="#"
          placeholder="Digite um item da grade e pressione Enter"
          className="mt-1"
        />
        {errors.gradePracticle && (
          <p className="text-red-500 text-sm mt-1">{errors.gradePracticle}</p>
        )}
      </div>

      {/* Brindes do Curso */}
      <div>
        <Label htmlFor="gifts">Brindes do Curso</Label>
        <p className="text-xs text-muted-foreground font-medium">
          Adicione os brindes oferecidos no curso
        </p>
        <TagInput
          value={dataForm.gifts ?? ""}
          onChange={(value) => handleChange("gifts", value)}
          separator="#"
          placeholder="Digite um brinde e pressione Enter"
          className="mt-1"
        />
        {errors.gifts && <p className="text-red-500 text-sm mt-1">{errors.gifts}</p>}
      </div>
    </div>
  );
};

export default Step5Content;