import React from "react";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import FaqGenerator from "@/components/general-components/FaqGenerator";
import WhyUsEditor from "../WhyUsEditor";
import { FormData } from "../TurmasFormSteps";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const Step6Media = ({ dataForm, setDataForm, errors, setErrors }: StepProps) => {
  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* URL do Vídeo */}
      <div className="space-y-2">
        <Label htmlFor="videoUrl">URL do vídeo</Label>
        <Input
          id="videoUrl"
          name="videoUrl"
          placeholder="Digite a URL do vídeo"
          value={dataForm.videoUrl || ""}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoUrl && (
          <p className="text-red-500 text-sm mt-1">{errors.videoUrl}</p>
        )}
      </div>

      {/* Título do Vídeo */}
      <div className="space-y-2">
        <Label htmlFor="videoTitle">Título do vídeo</Label>
        <Input
          id="videoTitle"
          name="videoTitle"
          placeholder="Digite o título do vídeo"
          value={dataForm.videoTitle}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoTitle && (
          <p className="text-red-500 text-sm mt-1">{errors.videoTitle}</p>
        )}
      </div>

      {/* Subtítulo do Vídeo */}
      <div className="space-y-2">
        <Label htmlFor="videoSubtitle">Subtítulo do vídeo</Label>
        <Input
          id="videoSubtitle"
          name="videoSubtitle"
          placeholder="Digite o subtítulo do vídeo"
          value={dataForm.videoSubtitle}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.videoSubtitle && (
          <p className="text-red-500 text-sm mt-1">{errors.videoSubtitle}</p>
        )}
      </div>

      {/* Descrição do Vídeo */}
      <div className="space-y-2">
        <Label htmlFor="videoDescription">Descrição do vídeo</Label>
        <Input
          id="videoDescription"
          name="videoDescription"
          placeholder="Digite a descrição do vídeo"
          value={dataForm.videoDescription}
          onValueChange={handleChange}
          type="textArea"
          className="mt-1 h-40"
        />
        {errors.videoDescription && (
          <p className="text-red-500 text-sm mt-1">{errors.videoDescription}</p>
        )}
      </div>

      {/* Por que nos escolher */}
      <div className="mt-6">
        <WhyUsEditor
          value={dataForm.whyUs || ""}
          onChange={(value) => handleChange("whyUs", value)}
          errors={errors}
        />
      </div>

      {/* FAQ */}
      <div className="mt-6">
        <FaqGenerator
          formData={dataForm}
          setFormData={setDataForm}
          fieldName="faq"
          errors={errors}
          setErrors={setErrors}
          title="Perguntas Frequentes (FAQ)"
          description="Adicione perguntas e respostas comuns sobre o curso"
        />
      </div>
    </div>
  );
};

export default Step6Media;