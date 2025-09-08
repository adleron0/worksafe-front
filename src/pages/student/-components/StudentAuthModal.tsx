import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { studentAuthService } from '@/services/auth/studentAuthService';
import { Mail, Lock, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

type AuthModalMode = 'first_access' | 'reset_password' | null;
type Step = 'request_code' | 'verify_code' | 'set_password' | 'success';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AuthModalMode;
  initialCredential?: string;
}

// Schemas para cada etapa
const requestCodeSchema = z.object({
  credential: z.string()
    .min(1, 'Campo obrigatório')
    .refine((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cpfRegex = /^\d{11}$/;
      const cleanValue = value.replace(/\D/g, '');
      return emailRegex.test(value) || cpfRegex.test(cleanValue);
    }, 'Digite um email ou CPF válido'),
});

const verifyCodeSchema = z.object({
  code: z.string()
    .min(6, 'O código deve ter 6 dígitos')
    .max(6, 'O código deve ter 6 dígitos')
    .regex(/^\d+$/, 'O código deve conter apenas números'),
});

const setPasswordSchema = z.object({
  newPassword: z.string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export function StudentAuthModal({ isOpen, onClose, mode, initialCredential = '' }: StudentAuthModalProps) {
  const [step, setStep] = useState<Step>('request_code');
  const [credential, setCredential] = useState(initialCredential);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep('request_code');
      setCredential(initialCredential);
      setCode('');
      setCanResend(false);
      setResendTimer(0);
    }
  }, [isOpen, initialCredential]);

  // Timer para reenvio
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0 && step === 'verify_code') {
      setCanResend(true);
    }
  }, [resendTimer, step]);

  // Form para solicitar código
  const requestCodeForm = useForm({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: { credential: initialCredential },
  });

  // Form para verificar código
  const verifyCodeForm = useForm({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  // Form para definir senha
  const setPasswordForm = useForm({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const handleRequestCode = async (data: z.infer<typeof requestCodeSchema>) => {
    setIsLoading(true);
    try {
      const cleanCredential = data.credential.replace(/\D/g, '').length === 11 
        ? data.credential.replace(/\D/g, '') 
        : data.credential;
      
      await studentAuthService.requestCode(cleanCredential, mode === 'first_access' ? 'first_access' : 'reset');
      
      setCredential(cleanCredential);
      setStep('verify_code');
      setResendTimer(10); // 2 minutos
      
      toast({
        title: 'Código enviado!',
        description: 'Verifique seu email para o código de verificação.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar código',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (data: z.infer<typeof verifyCodeSchema>) => {
    setIsLoading(true);
    try {
      await studentAuthService.verifyCode(credential, data.code);
      
      setCode(data.code);
      setStep('set_password');
      
      toast({
        title: 'Código verificado!',
        description: 'Agora defina sua senha.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (data: z.infer<typeof setPasswordSchema>) => {
    setIsLoading(true);
    try {
      await studentAuthService.setPassword(credential, code, data.newPassword);
      
      setStep('success');
      
      toast({
        title: 'Senha definida com sucesso!',
        description: 'Agora você pode fazer login com sua nova senha.',
        variant: 'default',
      });
      
      // Fecha o modal após 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Erro ao definir senha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      await studentAuthService.resendCode(credential);
      
      setResendTimer(120); // 2 minutos
      setCanResend(false);
      
      toast({
        title: 'Código reenviado!',
        description: 'Verifique seu email novamente.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar código',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getModalTitle = () => {
    if (mode === 'first_access') return 'Primeiro Acesso';
    if (mode === 'reset_password') return 'Recuperar Senha';
    return '';
  };

  const getModalDescription = () => {
    switch (step) {
      case 'request_code':
        return mode === 'first_access' 
          ? 'Digite seu email ou CPF para receber o código de ativação'
          : 'Digite seu email ou CPF para recuperar sua senha';
      case 'verify_code':
        return 'Digite o código de 6 dígitos enviado para seu email';
      case 'set_password':
        return mode === 'first_access'
          ? 'Crie uma senha para acessar sua conta'
          : 'Digite sua nova senha';
      case 'success':
        return 'Processo concluído com sucesso!';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>{getModalDescription()}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Request Code */}
        {step === 'request_code' && (
          <Form {...requestCodeForm}>
            <form onSubmit={requestCodeForm.handleSubmit(handleRequestCode)} className="space-y-4">
              <FormField
                control={requestCodeForm.control}
                name="credential"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email ou CPF</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          {...field}
                          placeholder="email@exemplo.com ou 000.000.000-00"
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </form>
          </Form>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify_code' && (
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Código enviado para o email cadastrado
              </AlertDescription>
            </Alert>

            <Form {...verifyCodeForm}>
              <form onSubmit={verifyCodeForm.handleSubmit(handleVerifyCode)} className="space-y-4">
                <FormField
                  control={verifyCodeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Verificação</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000000"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Não recebeu o código?
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={!canResend || isLoading}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    {resendTimer > 0 ? `Reenviar em ${resendTimer}s` : 'Reenviar'}
                  </Button>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verificando...' : 'Verificar Código'}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Step 3: Set Password */}
        {step === 'set_password' && (
          <Form {...setPasswordForm}>
            <form onSubmit={setPasswordForm.handleSubmit(handleSetPassword)} className="space-y-4">
              <FormField
                control={setPasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
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
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={setPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirme sua senha"
                          className="pl-10 pr-10"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A senha deve ter no mínimo 6 caracteres, com letras e números
                </AlertDescription>
              </Alert>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Definir Senha'}
              </Button>
            </form>
          </Form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-center text-lg font-medium">
              {mode === 'first_access' 
                ? 'Conta ativada com sucesso!' 
                : 'Senha redefinida com sucesso!'}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Você já pode fazer login com sua nova senha
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}