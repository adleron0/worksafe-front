import { useAuth } from "@/context/AuthContext";

const useVerify = () => {
  const { user } = useAuth();

  const can = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const is = (role: string): boolean => {
    return user?.role === role;
  };

  const has = (product: string): boolean => {
    return user?.products?.includes(product) ?? false;
  };

  return { can, is, has };
};

export default useVerify;
