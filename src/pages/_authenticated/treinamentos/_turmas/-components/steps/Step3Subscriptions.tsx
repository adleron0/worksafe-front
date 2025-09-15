import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpCircle } from "lucide-react";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { FormData } from "../TurmasFormSteps";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const Step3Subscriptions = ({ dataForm, setDataForm, errors }: StepProps) => {
  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Habilitar Inscrições */}
      <div className={`p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowSubscriptions ? "pb-4" : ""}`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="allowSubscriptions"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Inscrições
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Habilita subscrições na turma e configura período e limites.
            </p>
          </div>
          <Switch
            id="allowSubscriptions"
            name="allowSubscriptions"
            checked={dataForm.allowSubscriptions ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({
                ...prev,
                allowSubscriptions: !prev.allowSubscriptions,
              }))
            }
          />
        </div>

        {dataForm.allowSubscriptions && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
            {/* Período de Inscrição */}
            <div className="space-y-2">
              <Label htmlFor="periodSubscriptionsType">
                Período de Inscrição
              </Label>
              <Select
                name="periodSubscriptionsType"
                options={[
                  { id: "LIMITED", name: "Por Período" },
                  { id: "UNLIMITED", name: "Ilimitado" },
                ]}
                state={dataForm.periodSubscriptionsType || "LIMITED"}
                onChange={(name, value) => handleChange(name, value)}
                placeholder="Selecione o tipo de inscrição"
              />
              {errors.periodSubscriptionsType && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.periodSubscriptionsType}
                </p>
              )}
            </div>

            {/* Datas do período de inscrição */}
            {dataForm.periodSubscriptionsType === "LIMITED" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="periodSubscriptionsInitialDate">
                    Data Inicial do Período <span className="text-red-500">*</span>
                  </Label>
                  <CalendarPicker
                    mode="single"
                    name="periodSubscriptionsInitialDate"
                    value={dataForm.periodSubscriptionsInitialDate}
                    onValueChange={(name, value) => handleChange(name, value)}
                    formField="periodSubscriptionsInitialDate"
                    placeholder="Selecione a data inicial"
                    className="mt-1"
                  />
                  {errors.periodSubscriptionsInitialDate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.periodSubscriptionsInitialDate}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="periodSubscriptionsFinalDate">
                    Data Final do Período <span className="text-red-500">*</span>
                  </Label>
                  <CalendarPicker
                    mode="single"
                    name="periodSubscriptionsFinalDate"
                    value={dataForm.periodSubscriptionsFinalDate}
                    onValueChange={(name, value) => handleChange(name, value)}
                    formField="periodSubscriptionsFinalDate"
                    placeholder="Selecione a data final"
                    className="mt-1"
                  />
                  {errors.periodSubscriptionsFinalDate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.periodSubscriptionsFinalDate}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quorum Mínimo */}
      <div>
        <Label htmlFor="minimumQuorum">Quorum Mínimo</Label>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Mínimo de inscritos para confirmação da turma
        </p>
        <NumberInput
          id="minimumQuorum"
          name="minimumQuorum"
          min={0}
          max={100}
          value={dataForm.minimumQuorum}
          onValueChange={handleChange}
        />
        {errors.minimumQuorum && (
          <p className="text-red-500 text-sm mt-1">{errors.minimumQuorum}</p>
        )}
      </div>

      {/* Inscrições Ilimitadas */}
      <div className="flex justify-between items-center p-4 bg-background rounded-lg border">
        <div className="flex flex-col">
          <Label
            htmlFor="unlimitedSubscriptions"
            className="cursor-pointer"
          >
            Inscrições Ilimitadas
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Permite inscrições sem limite de vagas
          </p>
        </div>
        <Switch
          id="unlimitedSubscriptions"
          name="unlimitedSubscriptions"
          checked={dataForm.unlimitedSubscriptions ? true : false}
          onCheckedChange={() =>
            setDataForm((prev) => ({
              ...prev,
              unlimitedSubscriptions: !prev.unlimitedSubscriptions,
            }))
          }
        />
      </div>

      {/* Máximo de Inscrições */}
      {!dataForm.unlimitedSubscriptions && (
        <div>
          <Label htmlFor="maxSubscriptions">
            Máximo de Inscrições <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted-foreground font-medium mb-2">
            Máximo de participantes que podem se inscrever na turma
          </p>
          <NumberInput
            id="maxSubscriptions"
            name="maxSubscriptions"
            min={0}
            max={1000}
            value={dataForm.maxSubscriptions}
            onValueChange={handleChange}
          />
          {errors.maxSubscriptions && (
            <p className="text-red-500 text-sm mt-1">
              {errors.maxSubscriptions}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Step3Subscriptions;