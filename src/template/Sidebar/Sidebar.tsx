import { useState, useEffect } from "react";
import { useGeneralContext } from "@/context/GeneralContext";
import SidebarItem from "./SidebarItem";
import { Button } from "../../components/ui/button";
import {
  X,
  Bell,
} from "lucide-react";
import { items } from "./items";
import Logo from "../../components/general-components/Logo";

const Sidebar = () => {
  const { openSidebar, setOpenSidebar } = useGeneralContext();
  const [activePath, setActivePath] = useState<string | null>(null);

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
            {/* <img
              src={adleronLogo}
              alt="Acme Inc"
              className="h-full rounded-full"
            /> */}
            <div className="flex gap-1 items-center">
              <Logo colorPath24="hsl(var(--foreground))" colorPath25="hsl(var(--primary))" className="h-8 w-8" />
              <div className="flex flex-col">
                <span className="font-black">WORKSAFE</span>
                <span className="text-xs -mt-1 font-semibold">Brasil</span>
              </div>
            </div>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8 rounded hidden md:flex">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>
          <nav className="flex flex-col h-full gap-2 text-lg font-medium pl-4 pt-4 justify-between overflow-y-scroll scrollbar-thin">
            <div>
              {items.map((item) => (
                <SidebarItem
                  key={item.title}
                  title={item.title}
                  icon={item.icon}
                  subitems={item.subitems}
                  isProduct={item.isProduct}
                  ability={item.ability}
                  path={item.path}
                  activePath={activePath}
                  setActivePath={setActivePath}
                />
              ))}
            </div>
            <SidebarItem
              title="Settings"
              icon="settings"
              path="/dashboard/settings"
              activePath={activePath}
              setActivePath={setActivePath}
            />
          </nav>
        </aside>
    </>
  );
};

export default Sidebar;

