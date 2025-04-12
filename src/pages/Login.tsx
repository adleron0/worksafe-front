import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { postLogin } from "@/services/loginService";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EyeOpenIcon, EyeClosedIcon  } from "@radix-ui/react-icons";
import { VscLoading } from "react-icons/vsc";
import { LoginData } from "@/general-interfaces/auth.interface";
import { useAuth } from '@/context/AuthContext';
import { formatCNPJ, unformatCNPJ } from "@/utils/cpnj-mask";
import loginSafety from "../assets/building-safety-animate.svg";

const Login = () => {
  const { setAccessTokenState, setIsLogged, reloadUser, accessToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit } = useForm<LoginData>({
    defaultValues: {
      email: '',
      password: '',
      cnpj: ''
    }
  });

  useEffect(() => {
    if (accessToken) {
      navigate({
        to: '/home',
      })
      reloadUser();
    }
  }, [accessToken, navigate, reloadUser]);

  const { mutate: executeLogin, isPending } = useMutation<
    { accessToken: string },
    Error,
    LoginData
  >({
    mutationFn: postLogin,
    onSuccess: (data) => {
      setAccessTokenState(data.accessToken);
      localStorage.removeItem("secretWord");
      localStorage.setItem("accessToken", data.accessToken);
      setIsLogged(true);
      reloadUser();
      navigate({
        to: '/home',
      })
      toast({
        title: "Bem Vindo!",
        description: "Login realizado com sucesso",
        variant: "success",
        duration: 1500
      })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Erro ao realizar login",
        description: `${err.response?.data?.message}`,
        variant: "destructive",
        duration: 5000
      })
    },
  });

  const onSubmit = (data: LoginData) => {
    executeLogin(data);
  };

  return (
    <main className="h-screen flex flex-col md:flex-row w-full">
      <div className="bg-primary-foreground w-full h-1/3 md:h-full flex items-center justify-center p-4 md:p-16">
        <img src={loginSafety} alt="login-safety" className="max-w-xl h-full md:h-auto object-contain" />
      </div>
      <section className="flex items-center justify-center bg-background h-full max-w-3xl w-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="-mb-4">
            <CardTitle className="text-primary text-2xl font-bold tracking-tighter">
              Entre com sua conta
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="email" 
                      placeholder="exemple@email.com" 
                      type="email" 
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="mt-1 relative">
                <Label htmlFor="password">Senha</Label>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="password"
                      placeholder="sua senha secreta"
                      type={showPassword ? "text" : "password"}
                      {...field}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-6 right-0 p-2 h-9 flex items-center border border-gray-200 bg-primary-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOpenIcon className="w-4 h-4" /> : <EyeClosedIcon className="w-4 h-4" />}
                </Button>
              </div>
              <div className="mt-1">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      type="text"
                      value={formatCNPJ(field.value || '')} // Exibe o CNPJ formatado
                      onChange={(e) => field.onChange(unformatCNPJ(e.target.value))} // Envia o valor sem formatação
                    />
                  )}
                />
              </div>
              <Button disabled={isPending} type="submit" className="mt-4 w-full">
                {isPending ? <VscLoading className="animate-spin" /> : "Entrar"}
              </Button>
              <div className="flex items-center gap-6 mt-4">
                <Separator />
                <span className="text-xs text-muted-foreground">OU</span>
                <Separator />
              </div>
              <Button variant="outline" className="mt-4 w-full">Suporte</Button>
            </CardContent>
          </form>
          <CardFooter>
            <p className="text-muted-foreground text-center text-xs md:text-sm">Ao entrar em nossa plataforma você concorda com nossos Termos de Uso e Política de Privacidade.</p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
};

export default Login;
