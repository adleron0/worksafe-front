import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/general-components/Loader";
import { get } from "@/services/api";
import Form from "./UserForm";
import Icon from "@/components/general-components/Icon";
import { User } from "./interfaces/user.interface";
import { FC } from "react";

interface ProfileProps {
  showTrigger?: boolean;
  open: boolean;
  openChange?: () => void;
}

const Profile: FC<ProfileProps> = ({ showTrigger = true, open = false, openChange }) => {
  const searchParams ={
    limit: 10,
    page: 0,
  };

  interface UsersResponse {
    rows: User[];
    total: number;
  }
    
  const { data: usersData, isLoading: isLoadingSelf } = useQuery({
    queryKey: ['selfUser', searchParams],
    queryFn: (): Promise<UsersResponse | undefined> => {
      const params = Object.keys(searchParams).map((key) => ({ key, value: searchParams[key as keyof typeof searchParams] }));
      return get('user', 'self', params);
    },
    enabled: open,
    staleTime: 0,
  });

  if (isLoadingSelf) {
    return <Loader title="Carregando perfil..." />;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={openChange}>
        {
          showTrigger && (
            <SheetTrigger asChild>
              <Button variant="ghost" className="flex h-8 items-center font-normal justify-start gap-2 px-2 py-1 w-full rounded-sm">
                <Icon name="user-pen" className="h-4 w-4" />
                Editar Perfil
              </Button>
            </SheetTrigger>
          )
        }
        <SheetContent side="right" className="w-11/12 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Meu Perfil</SheetTitle>
            <SheetDescription>
              Por favor, preencha todas as informações necessárias para atualizar seu perfil.
            </SheetDescription>
          </SheetHeader>
          <Form openSheet={() => console.log("fechou")} self={true} formData={usersData?.rows[0]} onlyPassword={'both'} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Profile;
