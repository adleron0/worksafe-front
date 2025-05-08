// React and external libraries
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateRange } from "react-day-picker";

// UI Components
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import CalendarPicker from "@/components/general-components/Calendar";
import Select from "@/components/general-components/Select";

// Utils
import { formatCPF, unformatCPF } from "@/utils/cpf-mask";

const userSearchSchema = z.object({
  searchName: z.string().optional(),
  active: z.boolean().optional(),
  cpf: z.string().optional(),
  profileId: z.union([z.number(), z.array(z.number())]).optional(),
  createdAt: z.tuple([z.date().optional(), z.date().optional()]).optional(),
});

type UserSearchFormData = z.infer<typeof userSearchSchema>;

interface UserSearchFormProps {
  onSubmit: (data: UserSearchFormData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
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
      profileId: undefined,
      createdAt: undefined,
    },
  });

  useEffect(() => {
    Object.keys(params).forEach((key) => {
      const paramKey = key as keyof UserSearchFormData;
      const value = params[key];
      
      // Type checking for each field
      if (paramKey === 'active' && (typeof value === 'boolean' || value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'searchName' && (typeof value === 'string' || value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'cpf' && (typeof value === 'string' || value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'profileId' && 
                (typeof value === 'number' || 
                 (Array.isArray(value) && value.every(item => typeof item === 'number')) || 
                 value === undefined)) {
        form.setValue(paramKey, value);
      } else if (paramKey === 'createdAt' && (Array.isArray(value) || value === undefined)) {
        if (Array.isArray(value) && value.length === 2) {
          const [start, end] = value as [Date | undefined, Date | undefined];
          setStartDate(start);
          setEndDate(end);
        }
        form.setValue(paramKey, value as [Date | undefined, Date | undefined] | undefined);
      }
    });
  }, [params, form]); // Add form to dependency array as setValue is used

  // Options for selects
  const statusOptions = [
    { id: "true", name: "Ativo" },
    { id: "false", name: "Inativo" }
  ];

  const roleOptions = [
    { id: "1", name: "Admin" },
    { id: "2", name: "Manager" },
    { id: "3", name: "User" },
  ];

  const handleRoleChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      form.setValue("profileId", Number(value));
    } else if (Array.isArray(value)) {
      // Convert array of strings to array of numbers
      form.setValue("profileId", value.map(v => Number(v)));
    }
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      form.setValue("active", value === "true" ? true : false);
    }
  };

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
            onChange={handleStatusChange}
            placeholder="Selecione status"
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

        {/* Função (Select com multiple) */}
        <div>
          <FormLabel htmlFor="profileId">Função</FormLabel>
          <Select 
            name="profileId"
            options={roleOptions}
            state={(() => {
              const profileId = form.watch("profileId");
              if (profileId && Array.isArray(profileId)) {
                return profileId.map((id: number) => id.toString());
              }
              return profileId?.toString() || "";
            })()}
            onChange={handleRoleChange}
            placeholder="Selecione a função"
            multiple
          />
        </div>

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

export default UserSearchForm;
