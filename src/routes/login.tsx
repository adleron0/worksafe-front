import { createFileRoute, redirect } from '@tanstack/react-router'
import Login from '@/pages/Login'
import Loader from '@/components/general-components/Loader';

export const Route = createFileRoute('/login')({
  loader: async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      return redirect({
        to: '/home',
      });
    }
  },
  pendingComponent: () => <Loader title={'Verificando Sessão...'}/>,
  component: Auth,
});

function Auth() {
  return (
    <>
      <Login />
    </>
  );
}
