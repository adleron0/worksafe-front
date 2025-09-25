import React, { useState, useEffect } from "react";
import { Input as ShadInput } from "@/components/ui/input"; // Renamed to avoid conflict
import { Textarea } from "@/components/ui/textarea";
// Removed: import { NumericFormat, NumericFormatProps } from "react-number-format";

import { formatCPF, unformatCPF } from "@/utils/cpf-mask";
import { formatCNPJ, unformatCNPJ } from "@/utils/cpnj-mask";
import { formatPHONE } from "@/utils/phone-mask";
import { formatCEP } from "@/utils/cep-mask";
import Icon from "@/components/general-components/Icon";

// Create a union type that includes both input and textarea attributes
type InputAttributes = React.InputHTMLAttributes<HTMLInputElement>;
type TextareaAttributes = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// Omit conflicting properties from TextareaAttributes that are already in InputAttributes
type MergedAttributes = InputAttributes & Omit<TextareaAttributes, keyof InputAttributes>;

export interface FormattedInputProps extends MergedAttributes {
  format?: "cpf" | "cnpj" | "phone" | "cep" | "currency" | "none";
  onValueChange?: (name: string, value: string | number) => void; // Allow number for currency unformat
  unformat?: boolean;
  type?: string; // Include "textArea"
  icon?: string; // Nome do ícone Lucide
  iconPosition?: "left" | "right"; // Posição do ícone
  iconClassName?: string; // Classes adicionais para o ícone
}

// Helper function for currency formatting
const formatCurrencyValue = (val: number | string | undefined): string => {
  const numericValue = Number(val);
  if (isNaN(numericValue)) {
    // Return empty string or a default like "R$ 0,00" for invalid/NaN input
    return "R$ 0,00"; // Default to R$ 0,00 for display consistency
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};


const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, FormattedInputProps>(
  ({ className, format = "none", onValueChange, onChange, value, name = "", unformat = true, type, icon, iconPosition = "left", iconClassName, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>("");
    // Removed rawValue state as it wasn't used

    // Existing formatting function for non-currency types
    const formatDisplayValue = (val: string): string => {
      let formattedValue = val;
      switch (format) {
        case "cpf": formattedValue = formatCPF(val); break;
        case "cnpj": formattedValue = formatCNPJ(val); break;
        case "phone": formattedValue = formatPHONE(val); break;
        case "cep": formattedValue = formatCEP(val); break;
        default: formattedValue = val;
      }
      return formattedValue;
    };

    useEffect(() => {
      const stringValue = String(value ?? ""); // Handle undefined/null
      // Removed setRawValue call

      if (format === 'currency') {
        // Ensure value is string or number before formatting
        if (typeof value === 'string' || typeof value === 'number' || value === undefined || value === null) {
           setDisplayValue(formatCurrencyValue(value));
        } else {
           // Handle unexpected types (like arrays) gracefully, maybe display empty or an error indicator
           setDisplayValue("R$ 0,00"); // Default or indicate error
        }
      } else if (format !== 'none') {
        // Format other types
        const formatted = formatDisplayValue(stringValue); // Assumes stringValue is appropriate here
        setDisplayValue(formatted);
      } else {
        // No formatting
        setDisplayValue(stringValue);
      }
    }, [value, format]); // Rerun when value or format changes


    // Generic handleChange for non-currency formats
    const handleGenericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      let unformattedValue = "";

      switch (format) {
        case "cpf": unformattedValue = unformatCPF(inputValue).slice(0, 11); break;
        case "cnpj": unformattedValue = unformatCNPJ(inputValue).slice(0, 14); break;
        case "phone": unformattedValue = inputValue.replace(/\D/g, '').slice(0, 11); break;
        case "cep": unformattedValue = inputValue.replace(/\D/g, '').slice(0, 8); break;
        default: unformattedValue = inputValue; // 'none' format
      }

      // Removed setRawValue call
      const formattedValue = formatDisplayValue(unformattedValue); // Reformat for display
      setDisplayValue(formattedValue); // Update display state

      // Propagate change upwards
      const valueToEmit = unformat ? unformattedValue : formattedValue;
      if (onChange) {
        const syntheticEvent = { ...e, target: { ...e.target, value: valueToEmit, name: name } } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      if (onValueChange && name) {
        onValueChange(name, valueToEmit);
      }
    };

    // Specific handler for currency
    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // 1. Get raw digits
      const digits = inputValue.replace(/\D/g, '');

      // Prevent empty string from causing issues, default to 0
      const numericValue = digits === "" ? 0 : parseInt(digits, 10);

      // 2. Convert digits to float value (assuming input is in cents)
      const floatValue = numericValue / 100;
      const rawValueString = floatValue.toFixed(2); // Keep raw value as string with 2 decimals "x.xx"

      // 3. Format for display
      const formattedDisplay = formatCurrencyValue(floatValue);

      // 4. Update state
      // Removed setRawValue call
      setDisplayValue(formattedDisplay); // Update the display

      // 5. Propagate change
      // For standard onChange, always emit string (raw or formatted)
      const valueForOnChange = unformat ? Number(rawValueString) : formattedDisplay;
      if (onChange) {
        const syntheticEvent = { ...e, target: { ...e.target, value: valueForOnChange, name: name } } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      // For custom onValueChange, emit number if unformat is true, otherwise formatted string
      const valueForOnValueChange = unformat ? floatValue : formattedDisplay;
      if (onValueChange && name) {
        onValueChange(name, valueForOnValueChange);
      }
    };


    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);
      // Removed setRawValue call

      const valueToEmit = inputValue; // Textarea doesn't have unformat logic here
      if (onChange) {
        const syntheticEvent = { ...e, target: { ...e.target, value: valueToEmit, name: name } } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      if (onValueChange && name) {
        onValueChange(name, valueToEmit);
      }
    };

    // --- Rendering Logic ---

    // Helper para renderizar input com ícone opcional
    const renderInputWithIcon = (inputElement: React.ReactElement) => {
      if (!icon) return inputElement;

      return (
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
              <Icon name={icon} className={iconClassName || "w-4 h-4"} />
            </div>
          )}
          {React.cloneElement(inputElement, {
            className: `${inputElement.props.className || ''} ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''}`.trim()
          })}
          {icon && iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
              <Icon name={icon} className={iconClassName || "w-4 h-4"} />
            </div>
          )}
        </div>
      );
    };

    if (format === "currency") {
      // Spread all props, then override value and onChange
      const inputElement = (
        <ShadInput
          {...props} // Spread original props first
          ref={ref as React.Ref<HTMLInputElement>}
          className={className}
          value={displayValue} // Override value
          onChange={handleCurrencyChange} // Override onChange
          name={name}
          placeholder={props.placeholder || "R$ 0,00"}
          inputMode="decimal"
        />
      );
      return renderInputWithIcon(inputElement);
    }

    if (type === "textArea") {
      // Spread all props, then override value and onChange
      return (
        <Textarea
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} // Spread original props first
          className={className}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={displayValue} // Override value
          onChange={handleTextAreaChange} // Override onChange
          name={name}
        />
      );
    }

    // Default: Use generic handler for other formats or 'none'
    // Spread all props, then override value and onChange
    const inputElement = (
      <ShadInput
        {...props} // Spread original props first
        className={className}
        ref={ref as React.Ref<HTMLInputElement>}
        value={displayValue} // Override value
        onChange={handleGenericChange} // Override onChange
        name={name}
        type={type}
      />
    );
    return renderInputWithIcon(inputElement);
  }
);

Input.displayName = "Input";

export default Input;
