import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from "@/components/ui/toaster";
import NotFound from '@/pages/NotFound';

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
    return <NotFound />
  },
})