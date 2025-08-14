import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SwitchCustomProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

const SwitchCustom = ({ 
  label, 
  checked, 
  onChange, 
  disabled = false,
  id = "switch"
}: SwitchCustomProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label 
        htmlFor={id} 
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {label}
      </Label>
    </div>
  );
};

export default SwitchCustom;