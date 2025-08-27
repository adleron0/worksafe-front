// src/InnerApp.tsx
import { useAuth } from '@/context/AuthContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useEffect } from 'react';

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
  return <RouterProvider router={router} context={{ auth }} />;
}

export default InnerApp;
