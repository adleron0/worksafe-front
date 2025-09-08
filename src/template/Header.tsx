import { useGeneralContext } from "@/context/GeneralContext";
import { useAuth } from "@/context/AuthContext";
import { PanelLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import AvatarMenu from "../components/general-components/AvatarMenu";
import { ThemeToggle } from "../components/general-components/ThemeToggle";

const Header = () => {
  const { setOpenSidebar } = useGeneralContext();
  const { user } = useAuth();

  return (
    <header className="w-full min-h-16 max-h-16 bg-background flex justify-between items-center px-4 border-b p-safe-top">
      <Button
        size="icon"
        variant="outline"
        className="md:hidden rounded aspect-square text-gray-700"
        onClick={() => setOpenSidebar((prev: boolean) => !prev)}
      >
        <PanelLeft className="w-5 h-5 text-primary" />
      </Button>
      <div className="w-full mx-4 flex flex-col items-start md:flex-row md:items-baseline md:gap-1">
        <div className="text-md md:text-xl font-bold">Bem vindo,</div>
        <div className="text-md md:text-lg font-light -mt-1 md:mt-0">
          { user?.username?.split(" ")[0] }
          {" "}
          { user?.username?.split(" ")[1] }
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle variant="ghost" />
        <AvatarMenu />
      </div>
    </header>
  );
};

export default Header;
