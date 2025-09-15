import React from "react";
import { Label } from "@/components/ui/label";
import { HelpCircle } from "lucide-react";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import Input from "@/components/general-components/Input";
import { FormData } from "../TurmasFormSteps";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const Step2Period = ({ dataForm, setDataForm, errors }: StepProps) => {
  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Carga Horária */}
      <div>
        <Label htmlFor="hoursDuration">
          Carga Horária (Horas) <span className="text-red-500">*</span>
        </Label>
        <NumberInput
          id="hoursDuration"
          name="hoursDuration"
          min={1}
          max={1000}
          value={dataForm.hoursDuration}
          onValueChange={handleChange}
        />
        {errors.hoursDuration && (
          <p className="text-red-500 text-sm mt-1">{errors.hoursDuration}</p>
        )}
      </div>

      {/* Dias de Duração */}
      <div>
        <Label htmlFor="daysDuration">
          Dias de Duração <span className="text-red-500">*</span>
        </Label>
        <NumberInput
          id="daysDuration"
          name="daysDuration"
          min={1}
          max={365}
          value={dataForm.daysDuration}
          onValueChange={handleChange}
        />
        {errors.daysDuration && (
          <p className="text-red-500 text-sm mt-1">{errors.daysDuration}</p>
        )}
      </div>

      {/* Período da Turma */}
      <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex flex-col mb-4">
          <Label htmlFor="periodClass" className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Período da Turma
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Define o período de duração da turma
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="periodClass">Tipo de Período</Label>
            <Select
              name="periodClass"
              options={[
                { id: "LIMITED", name: "Por Período" },
                { id: "UNLIMITED", name: "Ilimitado" },
              ]}
              state={dataForm.periodClass || "UNLIMITED"}
              onChange={(name, value) => handleChange(name, value)}
              placeholder="Selecione o tipo de período"
            />
            {errors.periodClass && (
              <p className="text-red-500 text-sm mt-1">{errors.periodClass}</p>
            )}
          </div>

          {dataForm.periodClass === "LIMITED" && (
            <>
              <div>
                <Label htmlFor="initialDate">
                  Data de Início <span className="text-red-500">*</span>
                </Label>
                <CalendarPicker
                  mode="single"
                  name="initialDate"
                  value={dataForm.initialDate}
                  onValueChange={(name, value) => handleChange(name, value)}
                  formField="initialDate"
                  placeholder="Selecione a data de início"
                  className="mt-1"
                />
                {errors.initialDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.initialDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="finalDate">
                  Data de Fim <span className="text-red-500">*</span>
                </Label>
                <CalendarPicker
                  mode="single"
                  name="finalDate"
                  value={dataForm.finalDate}
                  onValueChange={(name, value) => handleChange(name, value)}
                  formField="finalDate"
                  placeholder="Selecione a data de fim"
                  className="mt-1"
                />
                {errors.finalDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.finalDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landingPagesDates">
                  Datas Exatas para Divulgação <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="landingPagesDates"
                  name="landingPagesDates"
                  placeholder="Ex: 12, 13 e 14 de janeiro"
                  value={dataForm.landingPagesDates ?? ""}
                  onValueChange={handleChange}
                  className="mt-1"
                />
                {errors.landingPagesDates && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.landingPagesDates}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Informe as datas que aparecerão na divulgação da turma
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step2Period;