// React and external libraries
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateRange } from "react-day-picker";

// UI Components
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import CalendarPicker from "@/components/general-components/Calendar";
import Select from "@/components/general-components/Select";

const SearchSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
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
      name: "",
      active: undefined,
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
      } else if (paramKey === 'name' && (typeof value === 'string' || value === undefined)) {
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
          name="name"
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
