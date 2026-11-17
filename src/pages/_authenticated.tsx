/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, createFileRoute } from '@tanstack/react-router'
import Sidebar from '@/template/Sidebar/Sidebar';
import Header from '@/template/Header';
import BreadCrumbs from '@/components/general-components/BreadCrumbs';
import Loader from '@/components/general-components/Loader';
import Footer from '@/template/Footer';
import { HelpProvider } from '@/help/HelpContext';
import { HelpCenter } from '@/help/HelpCenter';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.accessToken) {
      await context.auth.refreshTokenMutation();
    };
  },
  loader: ({ context }) => {
    context.auth.verifyLocalAccessToken();
  },

  pendingComponent: () => <Loader title={'Validando Sessão...'}/>,
  
  component: () => (
    <HelpProvider>
    <div className='flex h-dvh w-screen overflow-x-hidden'>
      <Sidebar />
      <section id='main' className='w-full h-full flex flex-col bg-muted/40'>
        <Header />
        <BreadCrumbs />
        <main className='w-full h-full p-4 overflow-y-scroll'>
          <Outlet />
        </main>
        <Footer />
      </section>
      <HelpCenter />
    </div>
    </HelpProvider>
  ),
})