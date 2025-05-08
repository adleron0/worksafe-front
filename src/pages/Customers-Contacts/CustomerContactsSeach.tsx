// React and external libraries
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {

  const form = useForm<SearchFormData>({
    resolver: zodResolver(SearchSchema),
    defaultValues: {
      name: "",
      active: undefined,
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
      }
    });
  }, []);

  const handleStatusChange = (value: string) => {
    form.setValue("active",  value === "true" ? true : false);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          onSubmit({ ...data });
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
