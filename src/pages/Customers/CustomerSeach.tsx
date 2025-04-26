import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DateRange } from "react-day-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import Select from "@/components/general-components/Select";
import { formatCNPJ, unformatCNPJ } from "@/utils/cpnj-mask";
import { Controller } from "react-hook-form";
import CalendarPicker from "@/components/general-components/Calendar";

const SearchSchema = z.object({
  searchName: z.string().optional(),
  active: z.boolean().optional(),
  cnpj: z.string().optional(),
  createdAt: z.tuple([z.date().optional(), z.date().optional()]).optional(),
});

type SearchFormData = z.infer<typeof SearchSchema>;

interface SearchFormProps {
  onSubmit: (data: SearchFormData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const form = useForm<SearchFormData>({
    resolver: zodResolver(SearchSchema),
    defaultValues: {
      searchName: "",
      active: undefined,
      cnpj: "",
      createdAt: undefined,
    },
  });

  useEffect(() => {
    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof SearchFormData;
      const value = params[key];
      
      // Type checking for each field
      if (paramKey === 'active' && (typeof value === 'boolean' || value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'searchName' && (typeof value === 'string' || value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'cnpj' && (typeof value === 'string' || value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'createdAt' && (Array.isArray(value) || value === undefined)) {
        form.setValue(paramKey, value as [Date | undefined, Date | undefined] | undefined);
      }
    });
  }, []);

  const handleStatusChange = (value: string | string[]) => {
    if (typeof value === 'string') {
      form.setValue("active", value === "true" ? true : false);
    }
  };

  const statusOptions = [
    { id: "true", name: "Ativo" },
    { id: "false", name: "Inativo" }
  ];

  const handleDateSelect = (value: DateRange | Date | Date[] | undefined) => {
    if (value && !Array.isArray(value) && !(value instanceof Date) && 'from' in value) {
      setStartDate(value.from);
      setEndDate(value.to);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          const createdAt: [Date | undefined, Date | undefined] | undefined =
            startDate && endDate ? [startDate, endDate] : undefined;
        
          onSubmit({ ...data, ...(createdAt ? { createdAt } : {}) });
          openSheet(false);
        })}
        className="space-y-4"
      >
        
        {/* Status */}
        <div>
          <FormLabel htmlFor="active">Status</FormLabel>
          <Select 
            name="active"
            options={statusOptions}
            state={form.watch("active")?.toString() || ""}
            placeholder="Selecione status"
            onChange={handleStatusChange}
          />
        </div>

        {/* Nome */}
        <FormField
          name="searchName"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CNPJ */}
        <Controller
          name="cnpj"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={field.value ? formatCNPJ(field.value) : ""}
                  onChange={(e) => {
                    const unformatted = unformatCNPJ(e.target.value);
                    field.onChange(unformatted);
                  }}
                  onBlur={() => {
                    // Opcional: Garantir que o CNPJ esteja desformatado ao perder o foco
                    if (field.value) {
                      form.setValue("cnpj", unformatCNPJ(field.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Data de Criação (Range Picker) */}
        <FormField
          name="createdAt"
          control={form.control}
          render={() => (
            <FormItem>
              <FormLabel>Data de Criação</FormLabel>
              <CalendarPicker
                mode="range"
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateSelect}
                placeholder="Selecione uma data"
                numberOfMonths={1}
              />
            </FormItem>
          )}
        />

          {/* Botões */}
          <div className="flex w-full space-x-2">
          <Button className="w-1/2" type="submit">
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-1/2"
            onClick={() => {
              form.reset();
              setStartDate(undefined);
              setEndDate(undefined);
              onClear();
              openSheet(false);
            }}
          >
            Limpar
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SearchForm;
