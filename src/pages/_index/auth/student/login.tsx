import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, User, Lock, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { studentAuthService } from '@/services/auth/studentAuthService';
import { setStudentToken, getStudentToken, isTokenValid } from '@/utils/studentAuth';
import { StudentAuthModal } from '@/pages/student/-components/StudentAuthModal';
import { ThemeToggle } from '@/components/general-components/ThemeToggle';

const loginSchema = z.object({
  emailOrCpf: z.string()
    .min(1, 'Campo obrigatório')
    .refine((value) => {
      // Verifica se é email válido ou CPF (11 dígitos)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cpfRegex = /^\d{11}$/;
      const cpfWithMaskRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
      
      return emailRegex.test(value) || cpfRegex.test(value.replace(/\D/g, '')) || cpfWithMaskRegex.test(value);
    }, 'Digite um email ou CPF válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Route = createFileRoute('/_index/auth/student/login')({
  component: StudentLoginPage,
});

function StudentLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputType, setInputType] = useState<'email' | 'cpf' | 'unknown'>('unknown');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'first_access' | 'reset_password' | null>(null);
  const [modalCredential, setModalCredential] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrCpf: '',
      password: '',
    },
  });

  // Verifica se já tem token válido ao carregar a página
  useEffect(() => {
    const token = getStudentToken();
    if (token && isTokenValid(token)) {
      navigate({ to: '/student' });
    }
  }, [navigate]);

  // Formata CPF enquanto digita e detecta tipo de input
  const handleEmailOrCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove espaços extras
    value = value.trim();
    
    // Remove caracteres não numéricos para verificar se é CPF
    const numbers = value.replace(/\D/g, '');
    
    // Detecta se é email (tem @ ou letras que não sejam parte da máscara do CPF)
    const hasEmailChars = value.includes('@') || /[a-zA-Z]/.test(value);
    
    if (hasEmailChars) {
      // É email
      setInputType('email');
      form.setValue('emailOrCpf', value);
    } else if (numbers.length > 0) {
      // É CPF - limita a 11 dígitos
      if (numbers.length <= 11) {
        setInputType('cpf');
        
        // Aplica máscara de CPF
        let maskedValue = '';
        if (numbers.length <= 3) {
          maskedValue = numbers;
        } else if (numbers.length <= 6) {
          maskedValue = `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
        } else if (numbers.length <= 9) {
          maskedValue = `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
        } else {
          maskedValue = `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
        }
        
        form.setValue('emailOrCpf', maskedValue);
      }
      // Se tem mais de 11 dígitos, não atualiza (bloqueia)
    } else {
      // Campo vazio ou apenas caracteres especiais
      setInputType('unknown');
      form.setValue('emailOrCpf', value);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      
      // Remove máscara do CPF se houver
      const credential = data.emailOrCpf.replace(/\D/g, '').length === 11 
        ? data.emailOrCpf.replace(/\D/g, '') 
        : data.emailOrCpf;

      const response = await studentAuthService.loginStudent(credential, data.password);
      
      // Salva o token
      setStudentToken(response.accessToken);
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${response.trainee.name}!`,
        variant: "default",
      });
      
      // Redireciona para dashboard do aluno
      await navigate({ to: '/student' });
      
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais e tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      {/* Botão de troca de tema */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Portal do Aluno</h1>
          <p className="text-muted-foreground">Acesse sua área exclusiva</p>
        </div>

        <Card className="shadow-lg backdrop-blur-sm bg-card/95 border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Login
            </CardTitle>
            <CardDescription className="text-center">
              Entre com seu email ou CPF e senha
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailOrCpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Email ou CPF</span>
                        {inputType !== 'unknown' && (
                          <span className="text-xs font-normal text-muted-foreground">
                            {inputType === 'cpf' ? 'CPF detectado' : 'Email detectado'}
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            {...field}
                            placeholder="email@exemplo.com ou 000.000.000-00"
                            className="pl-10"
                            onChange={handleEmailOrCpfChange}
                            disabled={isLoading}
                            autoComplete="username"
                            type={inputType === 'email' ? 'email' : 'text'}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Digite sua senha"
                            className="pl-10 pr-10"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between text-sm">
                  <a 
                    href="#" 
                    className="text-primary hover:text-primary/80 hover:underline transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      const currentCredential = form.getValues('emailOrCpf');
                      setModalCredential(currentCredential);
                      setAuthModalMode('reset_password');
                      setAuthModalOpen(true);
                    }}
                  >
                    Esqueceu sua senha?
                  </a>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 text-center">
            <div className="text-sm text-muted-foreground">
              Primeira vez aqui?{' '}
              <button
                type="button"
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                onClick={() => {
                  const currentCredential = form.getValues('emailOrCpf');
                  setModalCredential(currentCredential);
                  setAuthModalMode('first_access');
                  setAuthModalOpen(true);
                }}
              >
                Ativar minha conta
              </button>
            </div>
          </CardFooter>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          © 2024 WorkSafe. Todos os direitos reservados.
        </div>
      </div>

      {/* Modal de Autenticação */}
      <StudentAuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthModalMode(null);
          setModalCredential('');
        }}
        mode={authModalMode}
        initialCredential={modalCredential}
      />
    </div>
  );
}