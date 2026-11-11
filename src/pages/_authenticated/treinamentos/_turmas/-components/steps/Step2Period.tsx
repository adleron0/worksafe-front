import React, { useEffect, useRef } from "react";
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
  // Ref para rastrear se o campo foi carregado com valor inicial (modo edição)
  const initialLandingPagesDatesRef = useRef<string | null>(null);

  // Capturar o valor inicial quando o componente monta e limpar valores inválidos
  useEffect(() => {
    if (dataForm.landingPagesDates) {
      // Se o valor contém NaN, limpar e permitir regeneração
      if (dataForm.landingPagesDates.includes('NaN')) {
        console.warn('Valor inválido detectado em landingPagesDates, limpando...');
        setDataForm(prev => ({ ...prev, landingPagesDates: '' }));
        initialLandingPagesDatesRef.current = null;
      } else if (initialLandingPagesDatesRef.current === null) {
        // Valor válido, guardar como inicial
        initialLandingPagesDatesRef.current = dataForm.landingPagesDates;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas na montagem do componente

  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    // Se o usuário alterou as datas de início/fim, permitir auto-update
    if (name === "initialDate" || name === "finalDate") {
      initialLandingPagesDatesRef.current = null;
    }
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  // Função para formatar o intervalo de datas para texto
  const formatDateRange = (initialDate: string | null, finalDate: string | null): string => {
    if (!initialDate || !finalDate) return "";

    // Parse das datas de forma segura (evita problemas de timezone)
    const parseDate = (dateStr: string) => {
      try {
        // Extrair apenas a parte da data (YYYY-MM-DD), removendo timestamp se houver
        // Suporta formatos: '2025-10-08' e '2025-10-08T00:00:00.000Z'
        const datePart = dateStr.split('T')[0]; // Pega apenas a parte antes do 'T'

        const parts = datePart.split('-');
        if (parts.length !== 3) {
          console.error('Formato de data inválido:', dateStr);
          return null;
        }
        const [year, month, day] = parts.map(Number);

        // Validar que os números são válidos
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.error('Data com valores inválidos:', dateStr, { year, month, day });
          return null;
        }

        return { year, month, day };
      } catch (error) {
        console.error('Erro ao fazer parse da data:', dateStr, error);
        return null;
      }
    };

    const start = parseDate(initialDate);
    const end = parseDate(finalDate);

    // Se alguma data for inválida, retornar vazio
    if (!start || !end) {
      console.error('Datas inválidas:', { initialDate, finalDate, start, end });
      return "";
    }

    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];

    const startDay = start.day;
    const endDay = end.day;
    const startMonth = months[start.month - 1]; // month vem de 1-12, array é 0-11
    const endMonth = months[end.month - 1];
    const startYear = start.year;
    const endYear = end.year;

    // Mesmo dia
    if (initialDate === finalDate) {
      return `${startDay} de ${startMonth}`;
    }

    // Mesmo mês e ano
    if (start.month === end.month && start.year === end.year) {
      // Se for apenas 2 dias consecutivos
      if (endDay - startDay === 1) {
        return `${startDay} e ${endDay} de ${startMonth}`;
      }
      // Se for mais de 2 dias
      return `${startDay} a ${endDay} de ${startMonth}`;
    }

    // Meses diferentes mas mesmo ano
    if (start.year === end.year) {
      return `${startDay} de ${startMonth} a ${endDay} de ${endMonth}`;
    }

    // Anos diferentes
    return `${startDay} de ${startMonth} de ${startYear} a ${endDay} de ${endMonth} de ${endYear}`;
  };

  // Efeito para auto-preencher landingPagesDates quando as datas mudarem
  useEffect(() => {
    if (dataForm.initialDate && dataForm.finalDate && dataForm.periodClass === "LIMITED") {
      const formatted = formatDateRange(dataForm.initialDate, dataForm.finalDate);

      // Só atualiza se:
      // 1. Não há valor inicial protegido (modo criação OU usuário mudou as datas)
      // 2. E o campo está vazio OU o valor formatado é diferente do atual
      const hasInitialValue = initialLandingPagesDatesRef.current !== null;
      const shouldUpdate = !hasInitialValue && formatted && (!dataForm.landingPagesDates || formatted !== dataForm.landingPagesDates);

      if (shouldUpdate) {
        setDataForm(prev => ({ ...prev, landingPagesDates: formatted }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataForm.initialDate, dataForm.finalDate, dataForm.periodClass]);

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
                  Gerado automaticamente ou edite manualmente conforme necessário
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