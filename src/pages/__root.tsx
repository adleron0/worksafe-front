import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from "@/components/ui/toaster";
import question from "../assets/questions-animate.svg";

interface MyRouterContext {
  auth: {
    user: any;
    accessToken: string | null,
    refreshTokenMutation: any,
    verifyLocalAccessToken: () => void,
    setIsLogged: (isLogged: boolean) => void,
  }
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
      <Toaster />
    </>
  ),
  notFoundComponent: () => {
    return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
      <p className="font-black text-5xl text-primary">ERRO !</p>
      <p className="font-normal text-md text-primary">Página Não Encontrada</p>
      <img src={question} alt="login-safety" className="md:max-w-xl h-1/2 md:h-auto object-contain" />
    </div>
  );
  },
})