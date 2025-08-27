import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from "@/components/ui/toast";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { GeneralProvider } from './context/GeneralContext';
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip";
import { router } from './router';
import InnerApp from './InnerApp';
import './index.css';

const queryClient = new QueryClient();

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
