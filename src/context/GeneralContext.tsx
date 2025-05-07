/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import Loader from '@/components/general-components/Loader';

interface GeneralContextProps {
  openSidebar: boolean;
  setOpenSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  showLoader: (title: string) => void;
  hideLoader: () => void;
  isLoading: boolean;
}

const GeneralContext = createContext<GeneralContextProps | undefined>(undefined);

export const useGeneralContext = () => {
  const context = useContext(GeneralContext);
  if (!context) {
    throw new Error('useGeneralContext must be used within a GeneralProvider');
  }
  return context;
};

// Custom hook for loader functionality
export const useLoader = () => {
  const { showLoader, hideLoader } = useGeneralContext();
  return { showLoader, hideLoader };
};

export const GeneralProvider = ({ children }: { children: ReactNode }) => {
  const [openSidebar, setOpenSidebar] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loaderTitle, setLoaderTitle] = useState<string>('Carregando...');

  const showLoader = (title: string) => {
    setLoaderTitle(title);
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
  };

  const value = useMemo(
    () => ({
      openSidebar,
      setOpenSidebar,
      showLoader,
      hideLoader,
      isLoading,
    }),
    [openSidebar, isLoading]
  );

  return (
    <GeneralContext.Provider value={value}>
      {isLoading && <Loader title={loaderTitle} />}
      {children}
    </GeneralContext.Provider>
  );
};
