import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useGeneralContext } from "@/context/GeneralContext";
import Icon from "@/components/general-components/Icon";
import useVerify from "@/hooks/use-verify";

interface SidebarItemProps {
  title: string;
  ability?: string;
  isProduct?: string;
  icon: string; // Changed any to string
  path: string;
  subitems?: { title: string; path: string; icon: string; ability?: string }[]; // Changed any to string
  className?: string;
  activePath: string | null;
  setActivePath: (path: string | null) => void;
}

const SidebarItem = ({
  title,
  ability,
  isProduct,
  icon,
  path,
  subitems,
  className,
  activePath,
  setActivePath,
}: SidebarItemProps) => {
  const { can, has } = useVerify();
  const [isOpen, setIsOpen] = useState(false);
  const { setOpenSidebar } = useGeneralContext();

  const toggleCollapse = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setIsOpen(!isOpen);
  };

  const handleItemClick = (path: string, hasSubItems?: boolean) => {
    setActivePath(null);
    setActivePath(path);
    if (hasSubItems) return;
    setOpenSidebar(false);
  };

  const isActive = (path: string) => path === activePath;
  
  let canView: boolean = true;
  canView = isProduct ? has(isProduct) : canView;
  canView = ability ? can(`view_${ability}`) : canView;
  if (!canView) return;

  return (
    <div>
        <>
          {
            !subitems ?
            <Link
              to={path}
              className={`${className} w-full flex text-base items-center rounded-s gap-4 my-1 px-2.5 py-2 text-muted-foreground ease-in-out duration-100 
              ${isActive(path) ? "bg-primary text-inverse-foreground!" : "hover:text-inverse-foreground hover:bg-primary"}`}
              onClick={() => {
                handleItemClick(path);
              }}
            >
              <Icon name={icon} className="h-4 w-4" />
              {title}
            </Link> :
            <div
              className={`${className} w-full cursor-pointer flex text-base items-center rounded-s gap-4 my-1 px-2.5 py-2 text-muted-foreground ease-in-out duration-100 
              ${isActive(path) ? "hover:text-inverse-foreground hover:bg-primary" : "hover:text-inverse-foreground hover:bg-primary"}`}
              onClick={() => {
                const hasSubItems = subitems && subitems?.length > 0;
                handleItemClick(path, hasSubItems);
                setIsOpen(!isOpen);
              }}
            >
              <Icon name={icon} className="h-4 w-4" />
              {title}
              {subitems && subitems?.length > 0 &&
                <Button
                  variant="ghost"
                  size="mini"
                  className="ml-auto aspect-square rounded bg-muted hover:bg-background"
                  onClick={toggleCollapse}
                >
                  <ChevronRight className={`${isOpen ? "rotate-90" : ""} text-foreground duration-150 ease-linear w-3 h-3`} />
                </Button>
              }
            </div>
          }
          {subitems && (
            <div
              className={`transition-[max-height] duration-300 ease-in-out overflow-hidden ${
                isOpen ? `max-h-80` : "max-h-0"
              }`}
            >
              <div className="flex flex-col pl-8 border-y gap-1 py-1">
                {subitems.map((item) => {
                  // Check ability for subitem if it exists
                  const canViewSubitem = item.ability ? can(`view_${item.ability}`) : true;
                  if (!canViewSubitem) return null; // Don't render if cannot view

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                    className={`${className} flex text-sm items-center rounded-s gap-4 px-2.5 py-1 text-muted-foreground ease-in-out duration-100 
                      ${isActive(item.path) ? "bg-primary text-inverse-foreground!" : "hover:text-inverse-foreground hover:bg-primary"}`}
                    onClick={() => handleItemClick(item.path)}
                  >
                      <Icon name={item.icon} className="h-4 w-4" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
    </div>
  );
};

export default SidebarItem;
