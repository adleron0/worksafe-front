import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DateRange } from "react-day-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const SearchSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
});

type SearchFormData = z.infer<typeof SearchSchema>;

interface SearchFormProps {
  onSubmit: (data: SearchFormData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: any;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const form = useForm<SearchFormData>({
    resolver: zodResolver(SearchSchema),
    defaultValues: {
      name: "",
      active: undefined,
    },
  });

  useEffect(() => {
    Object.keys(params).forEach((key) => {
      form.setValue(key as keyof SearchFormData, params[key]);
    });
  }, []);

  const handleStatusChange = (value: string) => {
    form.setValue("active",  value === "true" ? true : false);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setStartDate(range?.from);
    setEndDate(range?.to);
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
          <Select onValueChange={handleStatusChange} value={form.watch("active")?.toString() || ""}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ativo</SelectItem>
              <SelectItem value="false">Inativo</SelectItem>
            </SelectContent>
          </Select>
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
