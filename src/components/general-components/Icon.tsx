import * as LucideIcons from "lucide-react";
import { toPascalCase } from "@/utils/to-pascal-case";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string
}

const Icon = ({ name, ...props }: IconProps) => {
  const iconKey = toPascalCase(name) as keyof typeof LucideIcons;
  const IconComponent = LucideIcons[iconKey] as React.ComponentType<any>;
  if (!IconComponent) {
    return <LucideIcons.Bird {...props} />;
  }
  return <IconComponent {...props} />;
};

export default Icon;
