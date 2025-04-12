"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DateRange } from "react-day-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SlidersHorizontal } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";

const areaSearchSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  createdAt: z.tuple([z.date().optional(), z.date().optional()]).optional(),
});

type AreaSearchFormData = z.infer<typeof areaSearchSchema>;

interface AreaSearchFormProps {
  onSubmit: (data: AreaSearchFormData) => void;
  onClear: () => void;
}

const AreaSearchForm: React.FC<AreaSearchFormProps> = ({ onSubmit, onClear }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const form = useForm<AreaSearchFormData>({
    resolver: zodResolver(areaSearchSchema),
    defaultValues: {
      name: "",
      active: undefined,
      createdAt: undefined,
    },
  });

  const handleStatusChange = (value: string) => {
    form.setValue("active", value === "true" ? true : false);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setStartDate(range?.from);
    setEndDate(range?.to);
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="default" className="text-muted h-9 bg-primary flex items-center">
          <SlidersHorizontal className="w-3 h-3 md:mr-2" />
          <span className="hidden md:block">Filtro Avançado</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-11/12 md:w-[300px] p-6">
        <SheetHeader>
          <SheetTitle>Buscar Áreas</SheetTitle>
        </SheetHeader>
        <DialogDescription className="mb-4">
          Preencha os campos abaixo para filtrar as áreas.
        </DialogDescription>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              const createdAt: [Date | undefined, Date | undefined] | undefined =
                startDate && endDate ? [startDate, endDate] : undefined;

              onSubmit({ ...data, ...(createdAt ? { createdAt } : {}) });
              setIsSheetOpen(false);
            })}
            className="space-y-4"
          >
            {/* Status */}
            <div>
              <FormLabel htmlFor="active">Status</FormLabel>
              <Select
                onValueChange={handleStatusChange}
                value={form.watch("active")?.toString() || ""}
              >
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
                          ? `${format(startDate, "dd/MM/yyyy")} - ${format(
                              endDate,
                              "dd/MM/yyyy"
                            )}`
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
                  setIsSheetOpen(false);
                }}
              >
                Limpar
              </Button>
            </div>
          </form>
        </Form>
        {/* <Button
          variant="ghost"
          className="md:hidden"
          onClick={() => setIsSheetOpen(false)}
        >
          <ChevronLeft className="fixed -right-2 top-1/2 h-6 w-6 text-primary" />
        </Button> */}
      </SheetContent>
    </Sheet>
  );
};

export default AreaSearchForm;
