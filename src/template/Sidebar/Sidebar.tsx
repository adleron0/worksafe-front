import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useGeneralContext } from "@/context/GeneralContext";
import useVerify from "@/hooks/use-verify";
import SidebarItem from "./SidebarItem";
import { Button } from "../../components/ui/button";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";
import useWindowSize from "@/hooks/use-windowSize";
import {
  groups,
  footerGroup,
  isDivider,
  type SidebarAccess,
  type SidebarEntry,
  type SidebarGroup,
  type SidebarSubitem,
} from "./items";
import DynamicLogo from "../../components/general-components/DynamicLogo";

type Can = (permission: string) => boolean;

/**
 * Mesma regra de sempre: a última regra presente decide
 * (permissions > ability > isProduct).
 */
const canAccess = (access: SidebarAccess, can: Can, has: Can) => {
  if (access.permissions) return access.permissions.some((p) => can(p));
  if (access.ability) return can(`view_${access.ability}`);
  if (access.isProduct) return has(access.isProduct);
  return true;
};

/** Subitens visíveis, sem rótulos de divisão órfãos (no começo, no fim ou repetidos). */
const visibleSubitems = (subitems: SidebarSubitem[], can: Can, has: Can) => {
  const links = subitems.filter((s) => isDivider(s) || canAccess(s, can, has));
  return links.filter((s, i) => {
    if (!isDivider(s)) return true;
    const next = links[i + 1];
    const hasBefore = links.slice(0, i).some((p) => !isDivider(p));
    return hasBefore && next !== undefined && !isDivider(next);
  });
};

/** Grupo só com o que a pessoa pode ver; vazio some. */
const visibleGroup = (group: SidebarGroup, can: Can, has: Can): SidebarGroup => ({
  ...group,
  items: group.items
    .filter((item) => canAccess(item, can, has))
    .map((item) => (item.subitems ? { ...item, subitems: visibleSubitems(item.subitems, can, has) } : item)),
});

/** Caminho do menu que melhor corresponde à rota atual (o prefixo mais longo). */
const findActivePath = (pathname: string, allGroups: SidebarGroup[]) => {
  const paths = allGroups.flatMap((g) =>
    g.items.flatMap((item: SidebarEntry) =>
      item.subitems ? item.subitems.filter((s) => !isDivider(s)).map((s) => (s as { path: string }).path) : [item.path],
    ),
  );
  return paths
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0] ?? null;
};

const COLLAPSED_KEY = "ws:sidebar-recolhida";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
};

/** Logo do modo recolhido: o ícone (favicon) da empresa; sem ele, a inicial. */
const CompactLogo = () => {
  const { theme } = useTheme();
  const [error, setError] = useState(false);
  if (theme.faviconUrl && !error) {
    return <img src={theme.faviconUrl} alt="Logo" className="h-8 w-8 object-contain" onError={() => setError(true)} />;
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
      {(theme.companyData?.comercial_name || "W").charAt(0).toUpperCase()}
    </span>
  );
};

const GroupLabel = ({ label }: { label: string }) => (
  <p className="px-2.5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
    {label}
  </p>
);

const Sidebar = () => {
  const { openSidebar, setOpenSidebar } = useGeneralContext();
  const { can, has } = useVerify();
  const { pathname } = useLocation();
  const { width } = useWindowSize();
  const [collapsedPref, setCollapsedPref] = useState(readCollapsed);
  // No celular o menu é gaveta e abre sempre inteiro.
  const isDesktop = (width ?? window.innerWidth) >= 768;
  const collapsed = collapsedPref && isDesktop;

  const toggleCollapsed = () => {
    setCollapsedPref((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        /* sem armazenamento: vale só nesta visita */
      }
      return next;
    });
  };

  useEffect(() => {
    // Adiciona o efeito de desfoque ao documento principal
    const main = document.getElementById("main");
    if (openSidebar && main) {
      main.style.overflow = "hidden";
      main.style.filter = "blur(4px)";
    } else if (!openSidebar && main) {
      main.style.overflow = "auto";
      main.style.filter = "";
    }
  }, [openSidebar]);

  const visibleGroups = groups.map((g) => visibleGroup(g, can, has)).filter((g) => g.items.length > 0);
  const visibleFooter = visibleGroup(footerGroup, can, has);
  const activePath = findActivePath(pathname, [...visibleGroups, visibleFooter]);

  const renderGroup = (group: SidebarGroup) => (
    <div key={group.label ?? "topo"}>
      {group.label &&
        (collapsed ? <div className="mx-3 my-2 border-t" /> : <GroupLabel label={group.label} />)}
      {group.items.map((item) => (
        <SidebarItem
          key={item.path}
          title={item.title}
          icon={item.icon}
          path={item.path}
          subitems={item.subitems}
          activePath={activePath}
          onNavigate={() => setOpenSidebar(false)}
          collapsed={collapsed}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Overlay que cobre a tela e fecha o Sidebar ao clicar */}
      {openSidebar && (
        <div
          className="fixed inset-0 cursor-pointer bg-black/10 z-50"
          onClick={() => setOpenSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${openSidebar ? "fixed translate-x-0 left-0 top-0 z-50"
          : "fixed left-0 top-0 z-50 -translate-x-full"}
          transition-[translate,width,min-width] duration-300 ease-in-out
          md:translate-x-0 md:static w-3/4 ${collapsed ? "md:w-16 md:min-w-16" : "md:w-64 md:min-w-64"}
          h-full bg-background flex flex-col border-r`}>
          <div className={`relative flex items-center w-full max-h-16 min-h-16 border-b ${
            collapsed ? "justify-center px-2" : "px-4 md:justify-between"
          }`}>
            <Button
              size="icon"
              variant="outline"
              className="md:hidden absolute top-2 right-2 h-6 w-6 border-2 border-gray-300 rounded"
              onClick={() => setOpenSidebar(false)}
            >
              <X className="h-4 w-4 text-primary" />
            </Button>
            {collapsed ? (
              // Recolhida: o ícone da empresa é o próprio botão de expandir (troca no hover).
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Expandir menu"
                    className="group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
                    onClick={toggleCollapsed}
                  >
                    <span className="group-hover:opacity-0 group-focus-visible:opacity-0">
                      <CompactLogo />
                    </span>
                    <PanelLeftOpen className="absolute h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Expandir menu</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className="flex gap-1 items-center min-w-0">
                  <DynamicLogo width={150} height={50} />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="ml-auto h-8 w-8 rounded hidden md:flex text-muted-foreground"
                      aria-label="Recolher menu"
                      onClick={toggleCollapsed}
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Recolher menu</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
          <nav className={`flex flex-col h-full gap-2 text-lg font-medium pt-2 pb-2 justify-between overflow-y-auto overflow-x-hidden scrollbar-thin ${
            collapsed ? "px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "pl-4"
          }`}>
            <div>{visibleGroups.map(renderGroup)}</div>
            {visibleFooter.items.length > 0 && (
              <div className="border-t mt-2">{renderGroup(visibleFooter)}</div>
            )}
          </nav>
        </aside>
    </>
  );
};

export default Sidebar;
