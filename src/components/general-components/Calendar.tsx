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
  startDate?: Date | null;
  endDate?: Date | null;
  onDateChange?: (dates: DateRange | Date | Date[] | undefined) => void;
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
  disabled?: boolean;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const CalendarPicker = ({
  mode = "single",
  startDate = null,
  endDate = null,
  onDateChange,
  placeholder = "Selecione uma data",
  className,
  numberOfMonths = 1,
  disabled = false,
  buttonVariant = "outline",
}: CalendarPickerProps) => {
  const [date, setDate] = useState<Date | undefined>(
    startDate ? new Date(startDate) : undefined
  );
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  });

  useEffect(() => {
    if (mode === "single" && startDate) {
      setDate(new Date(startDate));
    } else if (mode === "range") {
      setDateRange({
        from: startDate ? new Date(startDate) : undefined,
        to: endDate ? new Date(endDate) : undefined,
      });
    }
  }, [startDate, endDate, mode]);

  // Separate handlers for each mode to ensure type safety
  const handleSingleDateSelect = (value: Date | undefined) => {
    setDate(value);
    onDateChange?.(value);
  };

  const handleRangeDateSelect = (value: DateRange | undefined) => {
    if (value) {
      setDateRange(value);
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
    onDateChange?.(value);
  };

  const handleMultipleDateSelect = (value: Date[] | undefined) => {
    onDateChange?.(value);
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
          selected={[]}
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
            !date && !dateRange.from && !dateRange.to && "text-muted-foreground",
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
