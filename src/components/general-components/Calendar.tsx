import { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
  mode?: "single" | "range" | "multiple" | "natural";
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
  // Parse the string date value to Date object
  const parseDate = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
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
    } else if (mode === "range" && value) {
      try {
        // Expect value to be in format "startDate|endDate"
        const [startStr, endStr] = value.split('|');
        setDateRange({
          from: startStr ? new Date(startStr) : undefined,
          to: endStr ? new Date(endStr) : undefined,
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
            try { return new Date(d); } 
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
      onValueChange(name, selectedDate ? selectedDate.toISOString() : null);
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
        const rangeStr = `${range.from ? range.from.toISOString() : ''}|${range.to ? range.to.toISOString() : ''}`;
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
        const datesStr = selectedDates.map(d => d.toISOString()).join(',');
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
          onValueChange(name, parsedDate.toISOString());
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
      onValueChange(name, selectedDate ? selectedDate.toISOString() : null);
    }
    
    if (form && formField) {
      form.setValue(formField, selectedDate);
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
    }
    return placeholder;
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
          className={cn("pr-10", className)}
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
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          className={cn(
            "w-full justify-start text-left font-normal",
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
  );
};

export default CalendarPicker;
