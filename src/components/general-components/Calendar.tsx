import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface CalendarPickerProps {
  mode?: "single" | "range" | "multiple";
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

  // Update internal state when value prop changes
  useEffect(() => {
    if (mode === "single") {
      setDate(parseDate(value));
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

  const getDisplayText = () => {
    if (mode === "single" && date) {
      return format(date, "dd/MM/yyyy");
    } else if (mode === "range") {
      if (dateRange.from && dateRange.to) {
        return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
      } else if (dateRange.from) {
        return format(dateRange.from, "dd/MM/yyyy");
      }
    } else if (mode === "multiple" && dates.length > 0) {
      return dates.length === 1 
        ? format(dates[0], "dd/MM/yyyy")
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
          style={{ pointerEvents: "auto" }}
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
          style={{ pointerEvents: "auto" }}
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
          style={{ pointerEvents: "auto" }}
        />
      );
    }
    return null;
  };

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
