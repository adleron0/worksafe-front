import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from '@tanstack/react-router';
import Profile from "@/pages/_authenticated/usuarios/_usuarios/-components/Profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "./Icon";
import { useAuth } from "@/context/AuthContext";
import Loader from "./Loader";
import { useMutation } from "@tanstack/react-query";
import { logout } from "@/services/loginService";

const AvatarMenu = () => {
  const navigate = useNavigate();
  const { setAccessTokenState, setIsLogged, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false); // Estado do modo escuro
  const [openProfile, setOpenProfile] = useState(false);

  const handleOpenProfile = () => {
    setOpenProfile(!openProfile);
  };

  // Recupera a preferência do modo escuro do localStorage
  useEffect(() => {
    const darkModePreference = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(darkModePreference);

    // Adiciona ou remove a classe 'dark' com base na preferência
    if (darkModePreference) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());

    // Alterna a classe 'dark' no elemento <html>
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const { mutate: logoutMutation, isPending } = useMutation<
    { accessToken: string },
    Error
  >({
    mutationFn: logout,
    onSuccess: async () => {
      await handleLogout();
    },
    onError: async (error) => {
      await handleLogout(error);
    },
  });

  const handleLogout = async (error?: unknown) => {
    setAccessTokenState(null);
    localStorage.removeItem("accessToken");
    setIsLogged(false);
    if (!error) {
      localStorage.removeItem("secretWord");
    }

    setTimeout(() => {
      navigate({
        to: '/',
        replace: true,
      });
    }, 100);
  };

  return (
    <div className="cursor-pointer">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Avatar>
            <AvatarImage src={ user?.imageUrl || undefined } alt={user?.username} />
            <AvatarFallback>{ user?.username[0] }</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          <DropdownMenuItem
            className="cursor-pointer flex gap-2"
            onClick={handleOpenProfile}
          >
            <Icon name="user-pen" className="h-4 w-4" />
            Editar Perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer flex gap-2"
            onClick={handleDarkMode}
          >
            {isDarkMode ? (
              <>
                <Icon name="sun" className="h-4 w-4" />
                Modo Claro
              </>
            ) : (
              <>
                <Icon name="moon" className="h-4 w-4" />
                Modo Escuro
              </>
            )}
          </DropdownMenuItem>
          {/* <DropdownMenuItem className="cursor-pointer flex gap-2">
            <ShieldAlert className="h-4 w-4" />
            Suporte
          </DropdownMenuItem> */}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex gap-2"
            onClick={() => logoutMutation()}
          >
            <Icon name="log-out" className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isPending && <Loader title={"Deslogando..."} />}
      <Profile showTrigger={false} open={openProfile} openChange={handleOpenProfile} />
    </div>
  );
};

export default AvatarMenu;
