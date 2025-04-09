/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
interface GeneralContextProps {
  openSidebar: boolean;
  setOpenSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}

const GeneralContext = createContext<GeneralContextProps | undefined>(undefined);

export const useGeneralContext = () => {
  const context = useContext(GeneralContext);
  if (!context) {
    throw new Error('useGeneralContext must be used within an AuthProvider');
  }
  return context;
};

export const GeneralProvider = ({ children }: { children: ReactNode }) => {
  const [openSidebar, setOpenSidebar] = useState<boolean>(false);

  const value = useMemo(
    () => ({
      openSidebar,
      setOpenSidebar,
    }),
    [openSidebar]
  );

  return (
    <GeneralContext.Provider value={value}>
      {children}
    </GeneralContext.Provider>
  );
};
