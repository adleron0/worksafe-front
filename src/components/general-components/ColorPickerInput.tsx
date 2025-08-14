import React, { useState, useEffect, useRef } from "react";
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
}

const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  value = "#000000",
  onChange,
  label = "Cor",
  className = "",
}) => {
  const [localColor, setLocalColor] = useState(value);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  // Monitor changes in the color picker
  useEffect(() => {
    if (!open || !pickerRef.current) return;

    const checkForChanges = () => {
      const colorOutput = pickerRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
      if (colorOutput && colorOutput.value !== localColor) {
        const newColor = colorOutput.value;
        setLocalColor(newColor);
        onChange(newColor);
      }
    };

    const interval = setInterval(checkForChanges, 100);
    return () => clearInterval(interval);
  }, [open, onChange, localColor]);

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
    setLocalColor(colorWithHash);
    
    // Validate and update if it's a valid color (3 or 6 characters)
    if (newValue.length === 3 || newValue.length === 6) {
      onChange(colorWithHash);
    }
  };

  // Monitor changes in the color picker - removed as we'll handle it directly in ColorPicker onChange

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label>
          {label}
        </Label>
      )}
      
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-9 h-9 rounded-md border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors shadow-sm"
              style={{ backgroundColor: localColor }}
              aria-label="Selecionar cor"
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div ref={pickerRef}>
              <ColorPicker 
                className="rounded-md border bg-background p-4"
                defaultValue={localColor}
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
          />
        </div>
      </div>
    </div>
  );
};

export default ColorPickerInput;