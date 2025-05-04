import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "./Icon";
import { cn } from "@/lib/utils";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (name: string, value: string | number) => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

const Number = React.forwardRef<HTMLDivElement, NumberInputProps>(
  (
    {
      min,
      max,
      step = 1,
      value: controlledValue,
      defaultValue = min || 0,
      onValueChange,
      className,
      inputClassName,
      buttonClassName,
      onChange,
      ...props
    },
    ref
  ) => {
    // Internal numeric value for calculations
    const [value, setValue] = useState<number>(
      controlledValue !== undefined ? controlledValue : defaultValue
    );
    
    // String value for the input field
    const [inputText, setInputText] = useState<string>(
      value.toString()
    );
    
    // Update when controlled value changes
    useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue);
        setInputText(controlledValue.toString());
      }
    }, [controlledValue]);

    const handleIncrement = () => {
      const newValue = value + step;
      if (max !== undefined && newValue > max) return;
      updateValue(newValue);
    };

    const handleDecrement = () => {
      const newValue = value - step;
      if (min !== undefined && newValue < min) return;
      updateValue(newValue);
    };

    // This function only updates the input text as the user types
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      
      // Allow empty input or valid numbers (including partial numbers like "1." or "-")
      if (newText === "" || /^-?\d*\.?\d*$/.test(newText)) {
        setInputText(newText);
      }
      
      if (onChange) {
        onChange(e);
      }
    };
    
    // This function converts the text to a number when the user is done typing
    const handleInputBlur = () => {
      if (inputText === "" || inputText === "-" || inputText === ".") {
        // Handle empty or invalid input
        const defaultVal = min !== undefined ? min : 0;
        updateValue(defaultVal);
        return;
      }
      
      const numValue = parseFloat(inputText);
      if (isNaN(numValue)) {
        // Revert to previous valid value if not a number
        setInputText(value.toString());
        return;
      }
      
      // Apply constraints
      let constrainedValue = numValue;
      if (min !== undefined && numValue < min) constrainedValue = min;
      if (max !== undefined && numValue > max) constrainedValue = max;
      
      updateValue(constrainedValue);
    };
    
    // Handle Enter key to confirm input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleInputBlur();
      }
    };

    const updateValue = (newValue: number) => {
      setValue(newValue);
      setInputText(newValue.toString());
      
      if (onValueChange) {
        onValueChange(props.name || "", newValue);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center rounded-md border border-input overflow-hidden",
          className
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-none border-r border-input",
            buttonClassName
          )}
          onClick={handleDecrement}
          disabled={min !== undefined && value <= min}
        >
          <Icon name="minus" className="h-4 w-4" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-9 border-0 rounded-none text-center focus-visible:ring-0",
            inputClassName
          )}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-none border-l border-input",
            buttonClassName
          )}
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
        >
          <Icon name="plus" className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

Number.displayName = "Number";

export default Number;
