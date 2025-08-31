// src/InnerApp.tsx
import { useAuth } from '@/context/AuthContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './main';
import { useEffect } from 'react';
// TODO: Remover em produção - apenas para debug
import { ThemeDebug } from '@/components/ThemeDebug';

function InnerApp() {
  // Recupera a preferência do modo escuro do localStorage
  useEffect(() => {
    const darkModePreference = localStorage.getItem("darkMode") === "true";

    // Adiciona ou remove a classe 'dark' com base na preferência
    if (darkModePreference) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const auth = useAuth();
  return (
    <>
      <RouterProvider router={router} context={{ auth }} />
      {/* TODO: Remover em produção - apenas para debug */}
      {process.env.NODE_ENV === 'development' && <ThemeDebug />}
    </>
  );
}

export default InnerApp;
