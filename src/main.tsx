import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from "@/components/ui/toast";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { AuthProvider } from '@/context/AuthContext';
import { GeneralProvider } from './context/GeneralContext';
import { routeTree } from './routeTree.gen';
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip";
import InnerApp from './InnerApp';
import './index.css';

const queryClient = new QueryClient();

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider router={router}>
        <GeneralProvider>
          <TooltipProvider>
            <Toaster />
            <ToastProvider />
            <InnerApp />
          </TooltipProvider>
        </GeneralProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
