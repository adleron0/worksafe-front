import { createFileRoute, redirect } from "@tanstack/react-router";
import { takeAfterLogin } from "@/lib/after-login";
import Loader from "@/components/general-components/Loader";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { postLogin } from "@/services/auth/loginService";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { VscLoading } from "react-icons/vsc";
import { LoginData } from "@/general-interfaces/auth.interface";
import { useAuth } from "@/context/AuthContext";
import { formatCNPJ, unformatCNPJ } from "@/utils/cpnj-mask";
import DynamicLogo from "@/components/general-components/DynamicLogo";
import { ArrowUpRight, Building2, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";

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
      const next = takeAfterLogin();
      if (next) window.location.assign(next);
      else navigate({
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
      const next = takeAfterLogin();
      if (next) window.location.assign(next);
      else navigate({
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
    <main className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      {/* Painel da marca: sempre grafite, com as faixas diagonais da identidade */}
      <aside className="relative isolate flex w-full flex-col justify-between overflow-hidden bg-[#141312] px-6 py-8 text-white md:min-h-screen md:w-[46%] md:px-14 md:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-1/4 -z-10 h-[150%] w-2/3 -skew-x-[24deg] bg-[linear-gradient(90deg,rgb(229_33_39/0.12)_0_62%,rgb(240_196_25/0.1)_62%_100%)]" />
        <div className="flex items-center justify-between gap-4">
          <DynamicLogo width={170} height={56} forceWhite />
          <a
            href="https://worksafebrasil.com.br"
            className="hidden items-center gap-1.5 text-xs text-white/60 transition hover:text-white md:inline-flex"
          >
            Ir para o site <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-8 max-w-md md:mt-0">
          <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <span aria-hidden className="ws-cut" />
            Intranet WorkSafe
          </span>
          <h1 className="mt-4 font-condensed text-5xl uppercase leading-[0.92] md:text-7xl">
            Área restrita à <span className="text-ws-yellow-400">equipe</span>
          </h1>
          <p className="mt-4 text-sm text-white/70 md:text-base">
            Sistema interno de gestão: turmas e certificados, comercial, obras e serviços, estoque, financeiro e
            pessoas.
          </p>
          <ul className="mt-6 hidden flex-wrap gap-2 md:flex">
            {[
              ["Resgate", "bg-ws-red-500"],
              ["Treinamentos", "bg-emerald-500"],
              ["Serviços", "bg-ws-yellow-500"],
              ["Loja e locações", "bg-ws-blue-500"],
            ].map(([label, dot]) => (
              <li key={label} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/80">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 hidden md:block">
          <p className="flex items-center gap-2 text-xs text-white/50">
            <Lock className="h-3.5 w-3.5" /> Acesso exclusivo para colaboradores. Os acessos são registrados.
          </p>
          <p className="mt-2 text-xs text-white/50">
            Procurando validar um certificado?{" "}
            <a href="/certificados" className="text-white/80 underline-offset-4 hover:text-white hover:underline">
              Consulte aqui
            </a>
            .
          </p>
        </div>
        {/* assinatura das quatro frentes */}
        <div aria-hidden className="ws-fita absolute inset-x-0 bottom-0" />
      </aside>

      {/* Formulário */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 md:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Acesso seguro
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Entrar na intranet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use seu e-mail de acesso, sua senha e o CNPJ da empresa.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input id="email" placeholder="voce@empresa.com.br" type="email" autoComplete="username" className="h-11 rounded-xl pl-10" {...field} />
                  )}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="password"
                      placeholder="Sua senha"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-11 rounded-xl pl-10 pr-11"
                      {...field}
                    />
                  )}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOpenIcon className="h-4 w-4" /> : <EyeClosedIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ da empresa</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      type="text"
                      inputMode="numeric"
                      className="h-11 rounded-xl pl-10"
                      value={formatCNPJ(field.value || "")} // Exibe o CNPJ formatado
                      onChange={(e) => field.onChange(unformatCNPJ(e.target.value))} // Envia o valor sem formatação
                    />
                  )}
                />
              </div>
            </div>

            <Button disabled={isPending} type="submit" size="lg" className="mt-2 h-11 w-full rounded-xl text-[15px]">
              {isPending ? <VscLoading className="animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">sem acesso?</span>
            <Separator className="flex-1" />
          </div>
          <Button variant="outline" className="h-11 w-full rounded-xl">
            Falar com o suporte
          </Button>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ao entrar você concorda com os Termos de Uso e a Política de Privacidade.
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">
            Validar um certificado?{" "}
            <a href="/certificados" className="text-foreground underline underline-offset-4">
              Consulte aqui
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
