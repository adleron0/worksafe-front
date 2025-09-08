import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from '@tanstack/react-router';
import Profile from "@/pages/_authenticated/usuarios/_usuarios/-components/Profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "./Icon";
import { useAuth } from "@/context/AuthContext";
import Loader from "./Loader";
import useVerify from "@/hooks/use-verify";
import { useMutation } from "@tanstack/react-query";
import { logout } from "@/services/auth/loginService";

const AvatarMenu = () => {
  const navigate = useNavigate();
  const { setAccessTokenState, setIsLogged, user } = useAuth();
  const { can } = useVerify();
  const [openProfile, setOpenProfile] = useState(false);

  const handleOpenProfile = () => {
    setOpenProfile(!openProfile);
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
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{user?.username}</p>
              <p className="text-xs font-medium leading-none text-muted-foreground">
                {user?.profile || "Perfil não definido"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex gap-2"
            onClick={handleOpenProfile}
          >
            <Icon name="user-pen" className="h-4 w-4" />
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            className={`flex gap-2 ${can('view_company') ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            onClick={() => can('view_company') && navigate({ to: '/empresa' })}
            disabled={!can('view_company')}
          >
            <Icon name="settings" className="h-4 w-4" />
            Empresa
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex gap-2 text-red-500 focus:text-red-500"
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
