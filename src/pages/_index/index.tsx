import { createFileRoute, redirect } from "@tanstack/react-router";
import Loader from "@/components/general-components/Loader";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { postLogin } from "@/services/loginService";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { VscLoading } from "react-icons/vsc";
import { LoginData } from "@/general-interfaces/auth.interface";
import { useAuth } from "@/context/AuthContext";
import { formatCNPJ, unformatCNPJ } from "@/utils/cpnj-mask";
import DynamicLogo from "@/components/general-components/DynamicLogo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_index/")({
  loader: async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      return redirect({
        to: "/home",
      });
    }
  },
  pendingComponent: () => <Loader title={"Verificando Sessão..."} />,
  component: Login,
});

function Login() {
  const { setAccessTokenState, setIsLogged, reloadUser, accessToken } =
    useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit } = useForm<LoginData>({
    defaultValues: {
      email: "",
      password: "",
      cnpj: "",
    },
  });

  useEffect(() => {
    if (accessToken) {
      navigate({
        to: "/home",
      });
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
        to: "/home",
      });
      toast({
        title: "Bem Vindo!",
        description: "Login realizado com sucesso",
        variant: "success",
        duration: 1500,
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Erro ao realizar login",
        description: `${err.response?.data?.message}`,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    executeLogin(data);
  };

  return (
    <main className="h-screen flex flex-col md:flex-row w-full">
      <div className="relative bg-muted/50 w-full h-1/3 md:h-full flex flex-col gap-8 items-center justify-center p-4 md:p-16">
        {/* Botão de Voltar para Home */}
        {/*<Button
          variant="default"
          onClick={() => navigate({ to: "/" })}
          className="absolute top-4 left-4 bg-transparent hover:bg-primary-light border border-primary text-primary p-2 hover:scale-110 hover:text-white rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>*/}
        <div className="bg-muted md:bg-transparent p-4 rounded-md">
          <div className="flex w-full max-w-3xl">
            <div className="flex gap-3 items-center justify-center w-full">
              <DynamicLogo width={220} height={80} />
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center justify-center w-full max-w-3xl">
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              Bem-vindo de volta!
            </h1>
            <p className="text-foreground text-sm max-w-4/5 md:text-base mt-2">
              Aqui você acessa o sistema de gerenciamento de turmas e gestão de
              treinamentos.
            </p>
            <p className="hidden md:block text-muted-foreground font-light max-w-4/5 text-sm md:text-base mt-2">
              Se ainda não possui acesso ao sistema, entre em contato com seu
              superior ou suporte para avaliarmos seus caso e liberação do
              acesso.
            </p>
          </div>
        </div>
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
                  {showPassword ? (
                    <EyeOpenIcon className="w-4 h-4" />
                  ) : (
                    <EyeClosedIcon className="w-4 h-4" />
                  )}
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
                      value={formatCNPJ(field.value || "")} // Exibe o CNPJ formatado
                      onChange={(e) =>
                        field.onChange(unformatCNPJ(e.target.value))
                      } // Envia o valor sem formatação
                    />
                  )}
                />
              </div>
              <Button
                disabled={isPending}
                type="submit"
                className="mt-4 w-full"
              >
                {isPending ? <VscLoading className="animate-spin" /> : "Entrar"}
              </Button>
              <div className="flex items-center gap-6 mt-4">
                <Separator />
                <span className="text-xs text-muted-foreground">OU</span>
                <Separator />
              </div>
              <Button variant="outline" className="mt-4 w-full">
                Suporte
              </Button>
            </CardContent>
          </form>
          <CardFooter>
            <p className="text-muted-foreground text-center text-xs md:text-sm">
              Ao entrar em nossa plataforma você concorda com nossos Termos de
              Uso e Política de Privacidade.
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
