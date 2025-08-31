import React, { useState, useEffect } from "react";
import Color from 'color';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/ui/kibo-ui/color-picker';

interface ColorPickerInputProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  value = "#000000",
  onChange,
  label = "Cor",
  className = "",
  disabled = false,
}) => {
  const [localColor, setLocalColor] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  const handleColorChange = (value: any) => {
    // Handle both array and string formats
    if (Array.isArray(value)) {
      // Convert RGBA array to hex string
      const color = Color.rgb(value[0], value[1], value[2]);
      const hexColor = color.hex();
      setLocalColor(hexColor);
      onChange(hexColor);
    } else if (typeof value === 'string') {
      setLocalColor(value);
      onChange(value);
    }
  };

  const handleHexChange = (newColor: string) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Remove any # characters from the input
    newValue = newValue.replace(/#/g, '');
    
    // Only allow hex characters
    newValue = newValue.replace(/[^0-9A-Fa-f]/g, '');
    
    // Limit to 6 characters
    newValue = newValue.slice(0, 6);
    
    // Always add # at the beginning
    const colorWithHash = `#${newValue}`;
    handleHexChange(colorWithHash);
  };


  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label>
          {label}
        </Label>
      )}
      
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`w-9 h-9 rounded-md border-2 transition-colors shadow-sm ${
                disabled 
                  ? "border-gray-200 cursor-not-allowed opacity-50" 
                  : "border-gray-300 cursor-pointer hover:border-gray-400"
              }`}
              style={{ backgroundColor: localColor }}
              aria-label="Selecionar cor"
              disabled={disabled}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div>
              <ColorPicker 
                className="rounded-md border bg-background p-4"
                defaultValue={localColor}
                onChange={handleColorChange}
              >
                <ColorPickerSelection className="h-40 w-64 rounded-md" />
                <div className="flex items-center gap-4 mt-3">
                  <ColorPickerEyeDropper />
                  <div className="grid w-full gap-1">
                    <ColorPickerHue />
                    <ColorPickerAlpha />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <ColorPickerOutput 
                    className="flex-1"
                  />
                  <ColorPickerFormat />
                </div>
              </ColorPicker>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono pointer-events-none">
            #
          </span>
          <Input
            type="text"
            value={localColor.slice(1)}
            onChange={handleInputChange}
            placeholder="000000"
            className="pl-7 font-mono"
            maxLength={6}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorPickerInput;