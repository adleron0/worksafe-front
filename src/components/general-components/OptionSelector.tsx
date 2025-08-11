import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Option {
  [key: string]: any;
}

interface OptionSelectorProps<T extends Option> {
  currentValue: string | number;
  onChange: (value: string | number) => void;
  options: T[];
  valueKey?: string;
  labelKey?: string;
  colorKey?: string;
  className?: string;
  children?: (option: T) => React.ReactNode;
  disabled?: boolean;
}

export default function OptionSelector<T extends Option>({
  currentValue,
  onChange,
  options,
  valueKey = "value",
  labelKey = "label",
  colorKey = "color",
  className,
  children,
  disabled = false,
}: OptionSelectorProps<T>) {
  const currentOption = options.find(
    (option) => option[valueKey] === currentValue
  );

  const renderDefaultItem = (option: T) => (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: option[colorKey] || "#6b7280" }}
        />
        <div
          className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
          style={{ backgroundColor: option[colorKey] || "#6b7280" }}
        />
      </div>
      <span className="text-xs">{option[labelKey]}</span>
    </div>
  );

  const renderItem = children || renderDefaultItem;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto p-1 px-2 justify-start hover:bg-accent/50",
            className
          )}
          disabled={disabled}
        >
          {currentOption && renderItem(currentOption)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          {options.map((option) => (
            <Button
              key={option[valueKey]}
              variant="ghost"
              className={cn(
                "justify-start h-auto py-2 px-3 rounded-none",
                option[valueKey] === currentValue && "bg-accent"
              )}
              onClick={() => {
                onChange(option[valueKey]);
              }}
            >
              {renderItem(option)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}