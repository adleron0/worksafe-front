import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useGeneralContext } from "@/context/GeneralContext";
import useVerify from "@/hooks/use-verify";
import SidebarItem from "./SidebarItem";
import { Button } from "../../components/ui/button";
import { X, Bell } from "lucide-react";
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

const GroupLabel = ({ label }: { label: string }) => (
  <p className="px-2.5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
    {label}
  </p>
);

const Sidebar = () => {
  const { openSidebar, setOpenSidebar } = useGeneralContext();
  const { can, has } = useVerify();
  const { pathname } = useLocation();

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
      {group.label && <GroupLabel label={group.label} />}
      {group.items.map((item) => (
        <SidebarItem
          key={item.path}
          title={item.title}
          icon={item.icon}
          path={item.path}
          subitems={item.subitems}
          activePath={activePath}
          onNavigate={() => setOpenSidebar(false)}
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
      <aside className={`${openSidebar ? "fixed translate-x-0 duration-300 ease-linear left-0 top-0 z-50"
          : "fixed left-0 top-0 z-50 -translate-x-full duration-300 ease-linear"}
          md:translate-x-0 md:static w-3/4 md:w-64 md:min-w-64 h-full bg-background flex flex-col border-r`}>
          <div className="relative flex px-4 md:justify-between items-center w-full max-h-16 min-h-16 border-b">
            <Button
              size="icon"
              variant="outline"
              className="md:hidden absolute top-2 right-2 h-6 w-6 border-2 border-gray-300 rounded"
              onClick={() => setOpenSidebar(false)}
            >
              <X className="h-4 w-4 text-primary" />
            </Button>
            <div className="flex gap-1 items-center">
              <DynamicLogo width={180} height={50} />
            </div>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8 rounded hidden md:flex">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>
          <nav className="flex flex-col h-full gap-2 text-lg font-medium pl-4 pt-2 pb-2 justify-between overflow-y-scroll scrollbar-thin">
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
