/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import Sidebar from '@/template/Sidebar/Sidebar';
import Header from '@/template/Header';
import BreadCrumbs from '@/components/general-components/BreadCrumbs';
import Loader from '@/components/general-components/Loader';
import Footer from '@/template/Footer';
import { HelpProvider } from '@/help/HelpContext';
import { HelpCenter } from '@/help/HelpCenter';
import { BotChatProvider, BotQuickChat } from '@/pages/_authenticated/bots/-shared/bot-chat';

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
  
  component: AuthenticatedLayout,
})

/**
 * Telas "de aplicativo" (conversa com os bots e caixa do Instagram): no celular e tablet
 * elas ocupam a tela toda, sem breadcrumb nem rodapé; com a conversa aberta,
 * nem o cabeçalho do sistema (a própria conversa tem botão de voltar).
 */
function AuthenticatedLayout() {
  const location = useRouterState({ select: (state) => state.location });
  const inbox = location.pathname === '/conversas/caixa';
  const appScreen = location.pathname === '/bots/conversas' || location.pathname === '/bots/instagram' || inbox;
  const search = location.search as { bot?: number; conversa?: string; aba?: string };
  const chatOpen = location.pathname === '/bots/conversas' ? !!search.bot : appScreen && !!search.conversa && search.aba !== 'comentarios';
  return (
    <HelpProvider>
    <BotChatProvider>
    <div className='flex h-dvh w-screen overflow-x-hidden'>
      <Sidebar />
      <section id='main' className='w-full h-full min-w-0 flex flex-col bg-muted/40'>
        <div className={chatOpen ? 'max-lg:hidden' : ''}><Header /></div>
        <div className={appScreen ? 'max-lg:hidden' : ''}><BreadCrumbs /></div>
        <main className={`w-full h-full p-4 overflow-y-scroll ${appScreen ? 'max-lg:p-0 max-lg:overflow-hidden' : ''} ${inbox ? 'lg:overflow-hidden' : ''}`}>
          <Outlet />
        </main>
        <div className={appScreen ? 'max-lg:hidden' : ''}><Footer /></div>
      </section>
      <HelpCenter />
      <BotQuickChat />
    </div>
    </BotChatProvider>
    </HelpProvider>
  );
}
