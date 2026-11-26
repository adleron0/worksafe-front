import { createFileRoute, redirect } from "@tanstack/react-router";
import { takeAfterLogin } from "@/lib/after-login";
import Loader from "@/components/general-components/Loader";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  GOOGLE_ERRORS,
  exchangeGoogleTicket,
  googleEnabled,
  googleStartUrl,
  pendingToken,
} from "@/services/auth/googleService";
import GoogleIcon from "@/components/general-components/GoogleIcon";

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
  const [googleBusy, setGoogleBusy] = useState(false);
  // Última resposta guardada: na próxima visita a tela já abre certa, sem o
  // formulário aparecer e sumir enquanto a API responde.
  const { data: googleOn, isPending: googleChecking } = useQuery({
    queryKey: ["google-login-enabled"],
    queryFn: async () => {
      const on = await googleEnabled();
      try { localStorage.setItem("ws_google_on", on ? "1" : "0"); } catch { /* sem armazenamento */ }
      return on;
    },
    placeholderData: () => {
      try {
        const v = localStorage.getItem("ws_google_on");
        return v === null ? undefined : v === "1";
      } catch { return undefined; }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  // sem resposta guardada e ainda perguntando: reserva o espaço em vez de mostrar o formulário
  const waitingGoogle = googleChecking && googleOn === undefined;
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

  const enterWith = (token: string) => {
    pendingToken.clear();
    setAccessTokenState(token);
    localStorage.removeItem("secretWord");
    localStorage.setItem("accessToken", token);
    setIsLogged(true);
    reloadUser();
    const next = takeAfterLogin();
    if (next) window.location.assign(next);
    else navigate({ to: "/home" });
  };

  // Volta do Google: #gt=<ticket> (uso único) ou #ge=<motivo da recusa>.
  // O fragmento é apagado na hora, antes de qualquer outra coisa.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const ticket = hash.get("gt");
    const error = hash.get("ge");
    if (!ticket && !error) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (error) {
      // no próximo ciclo: este efeito roda antes de o <Toaster> começar a escutar
      setTimeout(() =>
        toast({
          title: "Não foi possível entrar",
          description: GOOGLE_ERRORS[error] ?? "Tente de novo.",
          variant: "destructive",
          duration: 7000,
        }), 50);
      return;
    }
    setGoogleBusy(true);
    exchangeGoogleTicket(ticket!)
      .then((res) => {
        if (res.status === "ok") enterWith(res.accessToken);
        else {
          pendingToken.set(res.pendingToken);
          navigate({ to: "/acesso" });
        }
      })
      .catch(() => {
        setGoogleBusy(false);
        toast({
          title: "Não foi possível entrar",
          description: GOOGLE_ERRORS.estado_invalido,
          variant: "destructive",
          duration: 7000,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { mutate: executeLogin, isPending } = useMutation<
    { accessToken: string },
    Error,
    LoginData
  >({
    mutationFn: postLogin,
    onSuccess: (data) => {
      enterWith(data.accessToken);
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
      {/* Painel da marca: grafite liso, institucional */}
      <aside className="relative isolate flex w-full flex-col justify-between overflow-hidden bg-[#111413] px-6 py-7 text-white md:min-h-screen md:w-[44%] md:px-14 md:py-12">
        {/* grade fina e brilho suave da cor da marca, quase imperceptíveis */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]"
        />
        <div aria-hidden className="absolute -bottom-40 -left-40 -z-10 h-96 w-96 rounded-full bg-[#149E5E]/15 blur-3xl" />

        <div className="flex items-center justify-between gap-4">
          <DynamicLogo width={160} height={44} forceWhite />
          <a
            href="https://worksafebrasil.com.br"
            className="hidden items-center gap-1.5 text-xs text-white/60 transition hover:text-white md:inline-flex"
          >
            worksafebrasil.com.br <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-8 max-w-md md:mt-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#3FC488]">Sistema de gestão</p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
            Gestão integrada da WorkSafe Brasil
          </h1>
          <p className="mt-3 hidden text-sm leading-relaxed text-white/65 md:block md:text-base">
            Treinamentos e certificados, comercial, obras e serviços, estoque, financeiro e pessoas em um só lugar.
          </p>
          <ul className="mt-8 hidden space-y-3 text-sm text-white/75 md:block">
            {[
              "Entrada com a conta Google da empresa",
              "Cada pessoa vê só o que a sua função exige",
              "Acessos registrados e protegidos",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#149E5E]/20 text-[#3FC488]">
                  <ShieldCheck className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 hidden border-t border-white/10 pt-6 md:block">
          <p className="flex items-center gap-2 text-xs text-white/55">
            <Lock className="h-3.5 w-3.5" /> Acesso exclusivo para colaboradores e convidados.
          </p>
          <p className="mt-2 text-xs text-white/55">
            Procurando validar um certificado?{" "}
            <a href="/certificados" className="text-white underline-offset-4 hover:underline">
              Consulte aqui
            </a>
            .
          </p>
          <p className="mt-4 text-[11px] text-white/35">
            © {new Date().getFullYear()} Worksafe Serviços Ltda ·{" "}
            <a href="https://www.worksafebrasil.com.br/privacidade" className="hover:text-white/70">Privacidade</a> ·{" "}
            <a href="https://www.worksafebrasil.com.br/termos" className="hover:text-white/70">Termos</a>
          </p>
        </div>
      </aside>

      {/* Formulário */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 md:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Acesso seguro
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Entrar no sistema</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {waitingGoogle
                ? "Carregando…"
                : googleOn
                  ? "Entre com a sua conta Google da empresa."
                  : "Use seu e-mail de acesso, sua senha e o CNPJ da empresa."}
            </p>
          </div>

          {waitingGoogle && <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />}

          {googleOn && (
            <>
              <Button
                asChild={!googleBusy}
                disabled={googleBusy}
                size="lg"
                variant="outline"
                className="h-11 w-full gap-3 rounded-xl text-[15px]"
              >
                {googleBusy ? (
                  <span><VscLoading className="animate-spin" /> Entrando…</span>
                ) : (
                  <a href={googleStartUrl()}>
                    <GoogleIcon className="h-5 w-5" /> Entrar com Google
                  </a>
                )}
              </Button>
            </>
          )}

          {/* senha só existe com o login do Google desligado (base local/demo ou emergência) */}
          {!waitingGoogle && !googleOn && (
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
          )}

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">sem acesso?</span>
            <Separator className="flex-1" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Entre com a conta Google da empresa e peça o seu perfil: um gestor recebe o pedido e libera o acesso.
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ao entrar você concorda com os{" "}
            <a href="https://www.worksafebrasil.com.br/termos" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Termos de Uso</a>{" "}
            e a{" "}
            <a href="https://www.worksafebrasil.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Política de Privacidade</a>.
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
