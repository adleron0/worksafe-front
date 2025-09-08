import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { getStudentToken, isTokenValid } from '@/utils/studentAuth';
import { StudentAuthProvider } from '@/context/StudentAuthContext';
import { StudentHeader } from '@/pages/student/-components/StudentHeader';
import { StudentSidebar } from '@/pages/student/-components/StudentSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Loader from '@/components/general-components/Loader';

export const Route = createFileRoute('/student')({
  beforeLoad: async ({ location }) => {
    // Verifica se tem token de aluno
    const token = getStudentToken();
    
    // Se não tem token, redireciona para login
    if (!token) {
      throw redirect({
        to: '/auth/student/login',
        search: {
          redirect: location.href,
        },
      });
    }
    
    // Se tem token mas é inválido, também redireciona
    // (as requisições vão falhar, mas permite carregar a página para dar feedback)
    if (!isTokenValid(token)) {
      console.warn('Token de aluno inválido ou expirado');
    }
  },
  
  pendingComponent: () => <Loader title={'Carregando área do aluno...'}/>,
  
  component: StudentLayout,
});

function StudentLayout() {
  return (
    <StudentAuthProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <StudentSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <StudentHeader />
            <main className="flex-1 overflow-y-auto bg-background">
              <div className="container mx-auto p-6">
                <Outlet />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </StudentAuthProvider>
  );
}