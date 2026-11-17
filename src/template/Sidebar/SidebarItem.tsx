import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import Icon from "@/components/general-components/Icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isDivider, type SidebarSubitem } from "./items";

interface SidebarItemProps {
  title: string;
  icon: string;
  path: string;
  /** Já filtrados pelas permissões (ver Sidebar). */
  subitems?: SidebarSubitem[];
  activePath: string | null;
  onNavigate: () => void;
  /** Menu recolhido: só o ícone; nome no tooltip e submenu flutuando à direita. */
  collapsed?: boolean;
}

const linkBase =
  "flex items-center rounded-s gap-4 text-muted-foreground ease-in-out duration-100";
const linkState = (active: boolean) =>
  active ? "bg-primary text-inverse-foreground!" : "hover:text-inverse-foreground hover:bg-primary";
/** Botão quadrado do modo recolhido. */
const iconOnly = "flex items-center justify-center rounded-md h-9 w-9 my-1 mx-auto text-muted-foreground ease-in-out duration-100";

const Subitems = ({
  subitems,
  activePath,
  onNavigate,
}: Pick<SidebarItemProps, "activePath" | "onNavigate"> & { subitems: SidebarSubitem[] }) => (
  <>
    {subitems.map((item) =>
      isDivider(item) ? (
        <p
          key={`div-${item.divider}`}
          className="px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none"
        >
          {item.divider}
        </p>
      ) : (
        <Link
          key={item.path}
          to={item.path}
          className={`${linkBase} text-sm px-2.5 py-1 ${linkState(item.path === activePath)}`}
          onClick={onNavigate}
        >
          <Icon name={item.icon} className="h-4 w-4" />
          {item.title}
        </Link>
      ),
    )}
  </>
);

const CollapsedItem = ({ title, icon, path, subitems, activePath, onNavigate }: SidebarItemProps) => {
  const [open, setOpen] = useState(false);

  if (!subitems) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={path}
            aria-label={title}
            className={`${iconOnly} ${linkState(path === activePath)}`}
            onClick={onNavigate}
          >
            <Icon name={icon} className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{title}</TooltipContent>
      </Tooltip>
    );
  }

  if (subitems.length === 0) return null;
  const containsActive = subitems.some((s) => !isDivider(s) && s.path === activePath);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={title}
              className={`${iconOnly} cursor-pointer ${
                containsActive ? "bg-primary/15 text-primary" : ""
              } hover:text-inverse-foreground hover:bg-primary`}
            >
              <Icon name={icon} className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent side="right" sideOffset={8}>{title}</TooltipContent>}
      </Tooltip>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-60 p-2"
        // Sem devolver o foco ao ícone: senão o tooltip reabre sozinho depois de escolher.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <p className="px-2.5 pb-1 text-sm font-semibold text-foreground">{title}</p>
        <div className="flex flex-col gap-1">
          <Subitems
            subitems={subitems}
            activePath={activePath}
            onNavigate={() => {
              setOpen(false);
              onNavigate();
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SidebarItem = (props: SidebarItemProps) => {
  const { title, icon, path, subitems, activePath, onNavigate, collapsed } = props;
  const links = subitems?.filter((s) => !isDivider(s)) as { path: string }[] | undefined;
  const containsActive = !!links?.some((s) => s.path === activePath);
  const [isOpen, setIsOpen] = useState(containsActive);

  // Ao entrar numa tela deste menu (por link, voltar ou endereço), ele abre sozinho.
  useEffect(() => {
    if (containsActive) setIsOpen(true);
  }, [containsActive]);

  if (collapsed) return <CollapsedItem {...props} />;

  if (!subitems) {
    return (
      <Link
        to={path}
        className={`${linkBase} w-full text-base my-1 px-2.5 py-2 ${linkState(path === activePath)}`}
        onClick={onNavigate}
      >
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </Link>
    );
  }

  if (subitems.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        className={`${linkBase} w-full cursor-pointer text-base my-1 px-2.5 py-2 hover:text-inverse-foreground hover:bg-primary ${
          containsActive && !isOpen ? "text-primary" : ""
        }`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Icon name={icon} className="h-4 w-4" />
        {title}
        <span className="ml-auto aspect-square rounded bg-muted p-1">
          <ChevronRight className={`${isOpen ? "rotate-90" : ""} text-foreground duration-150 ease-linear w-3 h-3`} />
        </span>
      </button>
      {/* grid-rows 0fr→1fr anima a altura real, sem cortar submenus longos */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pl-8 border-y gap-1 py-1">
            <Subitems subitems={subitems} activePath={activePath} onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarItem;
