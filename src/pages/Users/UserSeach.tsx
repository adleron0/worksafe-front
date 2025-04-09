import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DateRange } from "react-day-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { formatCPF, unformatCPF } from "@/utils/cpf-mask";
import { Controller } from "react-hook-form";
import { format } from "date-fns";

const userSearchSchema = z.object({
  searchName: z.string().optional(),
  active: z.boolean().optional(),
  cpf: z.string().optional(),
  roleId: z.number().optional(),
  createdAt: z.tuple([z.date().optional(), z.date().optional()]).optional(),
});

type UserSearchFormData = z.infer<typeof userSearchSchema>;

interface UserSearchFormProps {
  onSubmit: (data: UserSearchFormData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: any;
}

const UserSearchForm: React.FC<UserSearchFormProps> = ({ onSubmit, onClear, openSheet, params }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const form = useForm<UserSearchFormData>({
    resolver: zodResolver(userSearchSchema),
    defaultValues: {
      searchName: "",
      active: undefined,
      cpf: "",
      roleId: undefined,
      createdAt: undefined,
    },
  });

  useEffect(() => {
    Object.keys(params).forEach((key) => {
      form.setValue(key as keyof UserSearchFormData, params[key]);
    });
  }, []);

  const handleRoleChange = (value: string) => {
    form.setValue("roleId", Number(value));
  };

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

        {/* CPF */}
        <Controller
          name="cpf"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite o CPF"
                  value={field.value ? formatCPF(field.value) : ""}
                  onChange={(e) => {
                    const unformatted = unformatCPF(e.target.value);
                    field.onChange(unformatted);
                  }}
                  onBlur={() => {
                    // Opcional: Garantir que o CPF esteja desformatado ao perder o foco
                    if (field.value) {
                      form.setValue("cpf", unformatCPF(field.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Função (Select) */}
        <div>
          <FormLabel htmlFor="roleId">Função</FormLabel>
          <Select onValueChange={handleRoleChange} value={form.watch("roleId")?.toString() || ""}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Admin</SelectItem>
              <SelectItem value="2">Manager</SelectItem>
              <SelectItem value="3">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data de Criação (Range Picker) */}
        <FormField
          name="createdAt"
          control={form.control}
          render={() => (
            <FormItem>
              <FormLabel>Data de Criação</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate && endDate
                      ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
                      : startDate
                      ? format(startDate, "dd/MM/yyyy")
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={{ from: startDate, to: endDate }}
                    onSelect={handleDateSelect}
                    numberOfMonths={1}
                    initialFocus
                    style={{ pointerEvents: "auto" }}
                  />
                </PopoverContent>
              </Popover>
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

export default UserSearchForm;
