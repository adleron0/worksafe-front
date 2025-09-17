import { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface CalendarPickerProps {
  mode?: "single" | "range" | "multiple" | "natural" | "month";
  name: string;
  value?: string | null;
  onValueChange?: (name: string, value: string | null) => void;
  // Form integration props
  formField?: string; // The name of the field in the form to update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: { setValue: (name: any, value: any) => void }; // The form object from react-hook-form (using any to accommodate different form libraries)
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
  disabled?: boolean;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  fromYear?: number;
  toYear?: number;
}

const CalendarPicker = ({
  mode = "single",
  name,
  value = null,
  onValueChange,
  formField,
  form,
  placeholder = "Selecione uma data",
  className,
  numberOfMonths = 1,
  disabled = false,
  buttonVariant = "outline",
  fromYear,
  toYear,
}: CalendarPickerProps) => {
  // Parse the string date value to Date object without timezone conversion
  const parseDate = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      // If it's an ISO string with timezone, extract just the date part
      if (dateStr.includes('T')) {
        // Extract YYYY-MM-DD from the ISO string
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        // Create a date in local timezone with the exact date values at midnight
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      // If it's already in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      // Fallback to regular parsing
      return new Date(dateStr);
    } catch {
      console.error("Invalid date format:", dateStr);
      return undefined;
    }
  };

  // For single mode
  const [date, setDate] = useState<Date | undefined>(parseDate(value));
  
  // For range mode - we'll need to parse the value differently
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  // For multiple mode
  const [dates, setDates] = useState<Date[]>([]);

  // For natural mode
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [month, setMonth] = useState<Date | undefined>(date);
  const inputRef = useRef<HTMLInputElement>(null);

  // For month mode
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | undefined>(() => {
    if (mode === "month" && value) {
      // Parse YYYY-MM format
      const match = value.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // month is 0-indexed
        return { month, year };
      }
    }
    return undefined;
  });
  const [yearForMonth, setYearForMonth] = useState<number>(
    selectedMonth?.year || new Date().getFullYear()
  );

  // Date mask function for DD/MM/YYYY format
  const applyDateMask = (value: string): string => {
    // Remove non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Apply mask
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  // Parse DD/MM/YYYY string to Date
  const parseBrazilianDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr.length !== 10) return undefined;
    
    try {
      const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
      return isValid(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };

  // Update internal state when value prop changes
  useEffect(() => {
    if (mode === "single") {
      setDate(parseDate(value));
    } else if (mode === "natural") {
      if (value) {
        const parsedDate = parseDate(value);
        setDate(parsedDate);
        setMonth(parsedDate);
        setInputValue(parsedDate ? format(parsedDate, "dd/MM/yyyy") : "");
      } else {
        setDate(undefined);
        setMonth(undefined);
        setInputValue("");
      }
    } else if (mode === "month") {
      if (value) {
        // Parse YYYY-MM format
        const match = value.match(/^(\d{4})-(\d{2})$/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // month is 0-indexed
          setSelectedMonth({ month, year });
          setYearForMonth(year);
        }
      } else {
        setSelectedMonth(undefined);
      }
    } else if (mode === "range" && value) {
      try {
        // Expect value to be in format "startDate|endDate"
        const [startStr, endStr] = value.split('|');
        setDateRange({
          from: startStr ? parseDate(startStr) : undefined,
          to: endStr ? parseDate(endStr) : undefined,
        });
      } catch {
        console.error("Invalid date range format:", value);
      }
    } else if (mode === "multiple" && value) {
      try {
        // Expect value to be in format "date1,date2,date3"
        const dateStrings = value.split(',');
        const parsedDates = dateStrings
          .map(d => {
            try { return parseDate(d); }
            catch { return null; }
          })
          .filter((d): d is Date => d !== null);
        setDates(parsedDates);
      } catch {
        console.error("Invalid multiple dates format:", value);
      }
    }
  }, [value, mode]);

  // Handlers for each mode
  const handleSingleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);

    // Update via onValueChange callback
    if (onValueChange) {
      // Format as YYYY-MM-DD to maintain consistency
      if (selectedDate) {
        // Create a new date at midnight to ensure consistent formatting
        const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        onValueChange(name, `${year}-${month}-${day}`);
      } else {
        onValueChange(name, null);
      }
    }

    // Update form directly if form and formField are provided
    if (form && formField) {
      form.setValue(formField, selectedDate);
    }
  };

  const handleRangeDateSelect = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);

      // Update via onValueChange callback
      if (onValueChange) {
        // Format dates as YYYY-MM-DD
        const formatDate = (date: Date | undefined) => {
          if (!date) return '';
          // Create a new date at midnight to ensure consistent formatting
          const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const rangeStr = `${formatDate(range.from)}|${formatDate(range.to)}`;
        onValueChange(name, rangeStr);
      }

      // Update form directly if form and formField are provided
      if (form && formField) {
        // For range mode, we expect the form field to be an array of two dates
        form.setValue(formField, [range.from, range.to]);
      }
    } else {
      setDateRange({ from: undefined, to: undefined });

      if (onValueChange) {
        onValueChange(name, null);
      }

      if (form && formField) {
        form.setValue(formField, undefined);
      }
    }
  };

  const handleMultipleDateSelect = (selectedDates: Date[] | undefined) => {
    if (selectedDates) {
      setDates(selectedDates);

      // Update via onValueChange callback
      if (onValueChange) {
        // Format dates as YYYY-MM-DD
        const datesStr = selectedDates.map(d => {
          // Create a new date at midnight to ensure consistent formatting
          const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }).join(',');
        onValueChange(name, datesStr || null);
      }

      // Update form directly if form and formField are provided
      if (form && formField) {
        form.setValue(formField, selectedDates);
      }
    } else {
      setDates([]);

      if (onValueChange) {
        onValueChange(name, null);
      }

      if (form && formField) {
        form.setValue(formField, undefined);
      }
    }
  };

  // Handler for natural mode input change
  const handleNaturalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyDateMask(e.target.value);
    setInputValue(masked);

    // Try to parse date when complete
    if (masked.length === 10) {
      const parsedDate = parseBrazilianDate(masked);
      if (parsedDate) {
        setDate(parsedDate);
        setMonth(parsedDate);

        if (onValueChange) {
          // Format as YYYY-MM-DD to maintain consistency
          // Create a new date at midnight to ensure consistent formatting
          const localDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          onValueChange(name, `${year}-${month}-${day}`);
        }

        if (form && formField) {
          form.setValue(formField, parsedDate);
        }
      }
    }
  };

  // Handler for natural mode calendar select
  const handleNaturalDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setInputValue(selectedDate ? format(selectedDate, "dd/MM/yyyy") : "");
    setOpen(false);

    if (onValueChange) {
      // Format as YYYY-MM-DD to maintain consistency
      if (selectedDate) {
        // Create a new date at midnight to ensure consistent formatting
        const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        onValueChange(name, `${year}-${month}-${day}`);
      } else {
        onValueChange(name, null);
      }
    }

    if (form && formField) {
      form.setValue(formField, selectedDate);
    }
  };

  // Handler for month mode selection
  const handleMonthSelect = (month: number, year: number) => {
    setSelectedMonth({ month, year });

    if (onValueChange) {
      // Format as YYYY-MM
      const monthStr = String(month + 1).padStart(2, '0');
      onValueChange(name, `${year}-${monthStr}`);
    }

    if (form && formField) {
      // Pass the formatted string YYYY-MM
      const monthStr = String(month + 1).padStart(2, '0');
      form.setValue(formField, `${year}-${monthStr}`);
    }
  };

  const getDisplayText = () => {
    if (mode === "single" && date) {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } else if (mode === "range") {
      if (dateRange.from && dateRange.to) {
        return `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
      } else if (dateRange.from) {
        return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR });
      }
    } else if (mode === "multiple" && dates.length > 0) {
      return dates.length === 1
        ? format(dates[0], "dd/MM/yyyy", { locale: ptBR })
        : `${dates.length} datas selecionadas`;
    } else if (mode === "month" && selectedMonth) {
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      return `${monthNames[selectedMonth.month]} ${selectedMonth.year}`;
    }
    return placeholder;
  };

  // Função para limpar todas as seleções
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o popover abra/feche

    if (mode === "single" || mode === "natural") {
      setDate(undefined);
      setInputValue("");
    } else if (mode === "range") {
      setDateRange({ from: undefined, to: undefined });
    } else if (mode === "multiple") {
      setDates([]);
    } else if (mode === "month") {
      setSelectedMonth(undefined);
    }

    // Chamar callback para notificar o componente pai
    if (onValueChange) {
      onValueChange(name, null);
    }

    // Atualizar form se fornecido
    if (form && formField) {
      form.setValue(formField, undefined);
    }
  };

  // Verificar se há alguma seleção ativa
  const hasValue = () => {
    if (mode === "single" || mode === "natural") {
      return !!date;
    } else if (mode === "range") {
      return !!(dateRange.from || dateRange.to);
    } else if (mode === "multiple") {
      return dates.length > 0;
    } else if (mode === "month") {
      return !!selectedMonth;
    }
    return false;
  };

  const renderCalendar = () => {
    if (mode === "single") {
      return (
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSingleDateSelect}
          numberOfMonths={numberOfMonths}
          initialFocus
          locale={ptBR}
          style={{ pointerEvents: "auto" }}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
        />
      );
    } else if (mode === "range") {
      return (
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleRangeDateSelect}
          numberOfMonths={numberOfMonths}
          initialFocus
          locale={ptBR}
          style={{ pointerEvents: "auto" }}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
        />
      );
    } else if (mode === "multiple") {
      return (
        <Calendar
          mode="multiple"
          selected={dates}
          onSelect={handleMultipleDateSelect}
          numberOfMonths={numberOfMonths}
          initialFocus
          locale={ptBR}
          style={{ pointerEvents: "auto" }}
          fromYear={fromYear}
          toYear={toYear}
        />
      );
    } else if (mode === "month") {
      const monthNames = [
        "Jan", "Fev", "Mar", "Abr",
        "Mai", "Jun", "Jul", "Ago",
        "Set", "Out", "Nov", "Dez"
      ];

      return (
        <div className="p-3">
          {/* Navegação de ano */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setYearForMonth(yearForMonth - 1)}
              disabled={fromYear !== undefined && yearForMonth <= fromYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-medium text-sm">{yearForMonth}</div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setYearForMonth(yearForMonth + 1)}
              disabled={toYear !== undefined && yearForMonth >= toYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((monthName, index) => {
              const isSelected = selectedMonth?.month === index &&
                selectedMonth?.year === yearForMonth;
              const isCurrentMonth = new Date().getMonth() === index &&
                new Date().getFullYear() === yearForMonth;

              return (
                <Button
                  key={index}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-10 text-sm",
                    isCurrentMonth && !isSelected && "border-primary",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleMonthSelect(index, yearForMonth)}
                >
                  {monthName}
                </Button>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Render natural mode with input and calendar icon
  if (mode === "natural") {
    return (
      <div className="relative flex gap-2">
        <Input
          ref={inputRef}
          id={name}
          value={inputValue}
          placeholder={placeholder || "DD/MM/AAAA"}
          className={cn("pr-16", className)} // Aumentado padding para dar espaço aos dois botões
          onChange={handleNaturalInputChange}
          disabled={disabled}
          maxLength={10}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        {/* Botão de limpar */}
        {hasValue() && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="absolute top-1/2 right-8 h-4 w-4 -translate-y-1/2 p-0 hover:bg-destructive/10"
            disabled={disabled}
            title="Limpar data"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            <span className="sr-only">Limpar data</span>
          </Button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
              disabled={disabled}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Selecionar data</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleNaturalDateSelect}
              numberOfMonths={numberOfMonths}
              locale={ptBR}
              fromYear={fromYear}
              toYear={toYear}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Original render for other modes
  return (
    <div className="relative">
      <Popover modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant={buttonVariant}
            className={cn(
              "w-full justify-start text-left font-normal pr-10",
              !date && !dateRange.from && !dateRange.to && dates.length === 0 && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-auto p-0">
          {renderCalendar()}
        </PopoverContent>
      </Popover>
      {/* Botão de limpar */}
      {hasValue() && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleClear}
          className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-destructive/10"
          disabled={disabled}
          title="Limpar seleção"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          <span className="sr-only">Limpar seleção</span>
        </Button>
      )}
    </div>
  );
};

export default CalendarPicker;
