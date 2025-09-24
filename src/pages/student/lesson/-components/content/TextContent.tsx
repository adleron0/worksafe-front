import { memo, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Loader2 } from 'lucide-react';
import RichTextViewer from '@/components/general-components/RichTextViewer';
import type { ContentComponentProps } from '../../types';

// Declarar tipo para a função global
declare global {
  interface Window {
    resumeTimersAfterPause?: () => void;
  }
}

// Map global para rastrear componentes montados e seus timers
// Usa WeakMap para permitir garbage collection automática
const mountedComponents = new Map<number, {
  minReadingTimer?: NodeJS.Timeout;
  progressInterval?: NodeJS.Timeout;
  isMounted: boolean;
  lastActivity: number;
}>();

// Função para limpar componentes antigos (não ativos há mais de 5 minutos)
const cleanupOldComponents = () => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  mountedComponents.forEach((data, instanceId) => {
    if (!data.isMounted && (now - data.lastActivity) > fiveMinutes) {
      // Limpar timers de componentes antigos
      if (data.minReadingTimer) clearTimeout(data.minReadingTimer);
      if (data.progressInterval) clearInterval(data.progressInterval);
      mountedComponents.delete(instanceId);
    }
  });
};

export const TextContent = memo(({
  step,
  onUpdateProgress,
  onCompleteStep,
  progressConfig,
  completedStepIds,
  isCompletingStep
}: ContentComponentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastProgressRef = useRef(0);
  const progressTimerRef = useRef<NodeJS.Timeout>();
  const completionTimerRef = useRef<NodeJS.Timeout>();
  const hasCompletedRef = useRef(false);
  const minReadingTimeRef = useRef<NodeJS.Timeout>();
  const hasInitializedRef = useRef(false);
  const hasStartedProcessingRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const activeTimersRef = useRef<Set<string>>(new Set());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const componentInstanceRef = useRef(Math.random()); // ID único para esta instância
  const pausedTimeRef = useRef<number>(0); // Tempo acumulado quando pausado
  const lastPauseRef = useRef<number>(0); // Momento da última pausa
  const isPausedRef = useRef(false); // Se está pausado
  
  // Refs para manter referências estáveis das callbacks e valores
  const onCompleteStepRef = useRef(onCompleteStep);
  const stepIdRef = useRef(step.id);
  const textCompletePercentRef = useRef(progressConfig?.textCompletePercent || 90);
  
  // Atualizar refs quando props mudarem
  useEffect(() => {
    onCompleteStepRef.current = onCompleteStep;
  }, [onCompleteStep]);
  
  useEffect(() => {
    stepIdRef.current = step.id;
  }, [step.id]);
  
  useEffect(() => {
    textCompletePercentRef.current = progressConfig?.textCompletePercent || 90;
  }, [progressConfig?.textCompletePercent]);
  
  // Estados para controle de leitura
  const [readingProgress, setReadingProgress] = useState(0);
  const [canComplete, setCanComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  
  // Guardar o ID do step atual para detectar mudanças reais
  const currentStepIdRef = useRef(step.id);
  
  // Reset refs quando step muda
  useEffect(() => {
    // Só resetar se mudou de step
    if (currentStepIdRef.current !== step.id) {
      currentStepIdRef.current = step.id;

      // Scroll para o topo do ScrollArea quando mudar de step
      // O scrollElementRef é definido mais tarde pelo useEffect do scroll
      setTimeout(() => {
        if (scrollElementRef.current) {
          scrollElementRef.current.scrollTop = 0;
        }
      }, 50); // Pequeno delay para garantir que o elemento está montado

      // Limpar timers antigos EXCETO o timer de conclusão se ainda não completou
      clearTimeout(progressTimerRef.current);
      clearTimeout(completionTimerRef.current);
      
      // Limpar apenas timers do step anterior, não todos
      const oldTimerKey = `timer_${currentStepIdRef.current}`;
      if (activeTimersRef.current.has(oldTimerKey)) {
        clearTimeout(minReadingTimeRef.current);
        activeTimersRef.current.delete(oldTimerKey);
      }
      
      // Limpar interval de progresso visual se existir
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Reset refs para novo step
      hasCompletedRef.current = false;
      hasInitializedRef.current = false;
      hasStartedProcessingRef.current = false; // Reset o flag de processamento
      lastProgressRef.current = 0;
      startTimeRef.current = Date.now();
      
      // Reset estados visuais
      setReadingProgress(0);
      setCanComplete(false);
    }
    
    // Só enviar progresso inicial se ainda não foi inicializado para este step
    if (!hasInitializedRef.current && step.status !== 'locked' && step.status !== 'completed' && step.progress === 0) {
      hasInitializedRef.current = true;
      
      // Enviar progresso inicial após delay maior para evitar conflitos
      const initTimer = setTimeout(() => {
        // Verificar novamente antes de enviar
        if (!hasCompletedRef.current && onUpdateProgress) {
          onUpdateProgress({
            stepId: step.id,
            progress: 1,
            data: { action: 'opened', timestamp: new Date().toISOString() }
          });
        }
      }, 2000); // Aumentado para 2 segundos
      
      return () => {
        clearTimeout(initTimer);
      };
    }
    
    return () => {};
  }, [step.id, step.status, step.progress, onUpdateProgress]);
  
  useEffect(() => {
    // Se já está processando ou não tem conteúdo, ignorar
    const hasTextContent = step.content?.content || step.content?.text || step.content?.html;
    if (hasCompletedRef.current || !hasTextContent || step.status === 'completed' || step.status === 'COMPLETED') {
      // Se o step já está completo, marcar como já processado
      if (step.status === 'completed' || step.status === 'COMPLETED') {
        hasCompletedRef.current = true;
        setCanComplete(true);
        setReadingProgress(100);
      }
      return;
    }
    
    // Verificar se o status mudou de available/locked para in_progress
    const isNowActive = step.status === 'in_progress' || step.status === 'IN_PROGRESS';
    
    // Se já iniciou o processamento para este step E o status não mudou, não reiniciar
    if (hasStartedProcessingRef.current && currentStepIdRef.current === step.id && !isNowActive) {
      return;
    }
    
    // Se o status mudou para in_progress, resetar o flag para permitir reprocessamento
    if (isNowActive && !hasStartedProcessingRef.current) {
      hasStartedProcessingRef.current = false;
    }
    hasStartedProcessingRef.current = true;
    
    // Capturar valores necessários para as closures
    const stepId = step.id;
    const stepDuration = step.duration || 1;
    const textCompletePercent = progressConfig?.textCompletePercent || 90;
    const onUpdateCallback = onUpdateProgress;
    
    const handleScroll = () => {
      if (!contentRef.current || hasCompletedRef.current) return;

      // Pegar o viewport interno do ScrollArea
      const scrollViewport = contentRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      const element = scrollViewport || contentRef.current;

      const scrollHeight = element.scrollHeight - element.clientHeight;

      // Se não há scroll (conteúdo pequeno), não processar aqui
      if (scrollHeight <= 0) {
        return;
      }

      const scrollPercentage = (element.scrollTop / scrollHeight) * 100;
      
      
      // Enviar progresso parcial a cada 10% de scroll
      const currentBlock = Math.floor(scrollPercentage / 10);
      const lastBlock = Math.floor(lastProgressRef.current / 10);
      
      if (currentBlock > lastBlock) {
        lastProgressRef.current = scrollPercentage;
        
        // Debounce para não enviar muitas requisições
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = setTimeout(() => {
          if (!hasCompletedRef.current && onUpdateCallback) {
            onUpdateCallback({
              stepId: stepId,
              progress: Math.min(scrollPercentage, 95),
              data: { 
                scrollPercentage, 
                action: 'reading',
                timestamp: new Date().toISOString()
              }
            });
          }
        }, 1500);
      }
      
      // Atualizar progresso visual
      setReadingProgress(scrollPercentage);

      // Se chegou ao final (90% ou mais), marcar como pode completar
      if (scrollPercentage >= textCompletePercent && !canComplete) {
        // Usar um pequeno delay para evitar triggers muito rápidos
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = setTimeout(() => {
          setCanComplete(true);
          setReadingProgress(100);
        }, 300); // Delay menor para resposta mais rápida
      }
    };
    
    // Aguardar o elemento estar pronto
    let checkAttempts = 0;

    const checkElement = () => {
      checkAttempts++;
      const contentElement = contentRef.current;

      if (!contentElement) {
        // Se o elemento não está pronto, tentar novamente em 100ms (máximo 10 tentativas)
        if (checkAttempts < 10) {
          setTimeout(checkElement, 100);
        }
        return;
      }

      // IMPORTANTE: ScrollArea do Radix UI tem estrutura especial
      // Precisamos pegar o viewport interno que realmente tem o scroll
      const scrollViewport = contentElement.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      const actualScrollElement = scrollViewport || contentElement;
      const hasScroll = actualScrollElement.scrollHeight > actualScrollElement.clientHeight + 10;
      
      if (!hasScroll) {
        // Para conteúdo pequeno, usar tempo baseado na duração do step
        const minReadingTime = stepDuration * 60 * 1000; // Converter para ms
        const requiredTime = (minReadingTime * textCompletePercent) / 100;
        
        // Timer para completar baseado no tempo mínimo
        // Função para criar/recriar o timer de conclusão
        const createCompletionTimer = (remainingTime: number) => {
          const timerKey = `timer_${stepId}`;

          const timerId = setTimeout(() => {
            
            // IMPORTANTE: Verificar se o componente ainda está montado
            if (!isMountedRef.current) {
              activeTimersRef.current.delete(timerKey);
              return;
            }
            
            // Usar refs para valores atualizados
            // Quando este timer executar, já passou o tempo necessário
            // Marcar como pode completar - o useEffect cuidará do envio
            if (!hasCompletedRef.current && isMountedRef.current) {
              setCanComplete(true);
              setReadingProgress(100);
            }
            
            // Remover do set de timers ativos
            activeTimersRef.current.delete(timerKey);
          }, remainingTime);
          
          // Guardar o timer ID e adicionar ao set de timers ativos
          minReadingTimeRef.current = timerId;
          activeTimersRef.current.add(timerKey);
          
          // Salvar no Map global também
          const componentData = mountedComponents.get(componentInstanceRef.current) || {
            isMounted: true,
            lastActivity: Date.now()
          };
          componentData.minReadingTimer = timerId;
          componentData.lastActivity = Date.now();
          mountedComponents.set(componentInstanceRef.current, componentData);
          return timerId;
        };
        
        // Verificar se já existe um timer para este step específico
        const timerKey = `timer_${stepId}`;

        if (!activeTimersRef.current.has(timerKey)) {
          createCompletionTimer(requiredTime);
        }
        
        // Timer visual para mostrar progresso - atualizar a cada 100ms para ser mais preciso
        let lastLoggedProgress = 0;
        const intervalId = setInterval(() => {
          // Parar se o componente foi desmontado ou pausado
          if (!isMountedRef.current || isPausedRef.current) {
            return;
          }
          
          // Calcular tempo decorrido excluindo pausas
          const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
          const progress = Math.min((elapsed / requiredTime) * 100, 100);
          
          // Forçar atualização do estado
          setReadingProgress(progress);

          // Log a cada 10% de progresso
          if (Math.floor(progress / 10) > Math.floor(lastLoggedProgress / 10)) {
            lastLoggedProgress = progress;
          }

          // Quando atingir 100% do progresso visual, marcar como pode completar
          if (progress >= 100) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            setCanComplete(true);
            // O useEffect irá cuidar de enviar o complete
          }
        }, 100); // Atualizar a cada 100ms para precisão visual
        
        // Salvar o interval
        progressIntervalRef.current = intervalId;
        
        // Salvar no Map global
        const componentData = mountedComponents.get(componentInstanceRef.current) || {
          isMounted: true,
          lastActivity: Date.now()
        };
        componentData.progressInterval = intervalId;
        componentData.lastActivity = Date.now();
        mountedComponents.set(componentInstanceRef.current, componentData);
        
        // Função para retomar timers após pausa
        window.resumeTimersAfterPause = () => {
          if (!hasCompletedRef.current && !minReadingTimeRef.current) {
            // Calcular tempo restante
            const elapsedTime = Date.now() - startTimeRef.current - pausedTimeRef.current;
            const remainingTime = Math.max(0, requiredTime - elapsedTime);

            if (remainingTime > 0) {
              // Recriar timer de conclusão com tempo restante
              createCompletionTimer(remainingTime);
              
              // Reiniciar interval de progresso
              if (!progressIntervalRef.current) {
                progressIntervalRef.current = setInterval(() => {
                  if (!isMountedRef.current || isPausedRef.current) {
                    return;
                  }
                  
                  const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
                  const progress = Math.min((elapsed / requiredTime) * 100, 100);
                  setReadingProgress(progress);
                  
                  if (progress >= 100) {
                    clearInterval(progressIntervalRef.current!);
                    progressIntervalRef.current = null;
                    setCanComplete(true);
                  }
                }, 100);
              }
            } else {
              // Se o tempo já passou, marcar como pode completar
              if (!hasCompletedRef.current) {
                setCanComplete(true);
                setReadingProgress(100);
              }
            }
          }
        };
        
        // NÃO retornar cleanup aqui pois sobrescreve o cleanup geral
      } else {
        // Para conteúdo com scroll

        // Adicionar event listener no elemento correto
        actualScrollElement.addEventListener('scroll', handleScroll);
        scrollElementRef.current = actualScrollElement;

        // Configurar timer baseado na duração mesmo com scroll
        // Isso permite sincronizar o progresso visual
        const minReadingTime = stepDuration * 60 * 1000;
        const requiredTime = (minReadingTime * textCompletePercent) / 100;
        // Estimated time calculated

        // Timer visual híbrido (combina tempo e scroll)
        let lastScrollPercent = 0;
        const hybridIntervalId = setInterval(() => {
          if (!isMountedRef.current || isPausedRef.current || hasCompletedRef.current) {
            return;
          }

          // Calcular progresso baseado em tempo
          const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
          const timeProgress = Math.min((elapsed / requiredTime) * 100, 100);

          // Pegar progresso de scroll atual
          const scrollViewport = contentRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          const element = scrollViewport || contentRef.current;
          if (element) {
            const scrollHeight = element.scrollHeight - element.clientHeight;
            if (scrollHeight > 0) {
              lastScrollPercent = (element.scrollTop / scrollHeight) * 100;
            }
          }

          // Usar o MAIOR entre tempo e scroll (quem estiver mais avançado)
          const combinedProgress = Math.max(timeProgress, lastScrollPercent);
          setReadingProgress(combinedProgress);

          // Se atingiu 100% por tempo OU scroll
          if (combinedProgress >= 100) {
            clearInterval(hybridIntervalId);
            progressIntervalRef.current = null;
            setCanComplete(true);
            // O useEffect irá cuidar de enviar o complete
          }
        }, 100);

        progressIntervalRef.current = hybridIntervalId;

        // NÃO retornar cleanup aqui - será feito no cleanup geral
      }
    };
    
    // Iniciar verificação do elemento
    checkElement();
    
    return () => {
      // Este cleanup só deve executar quando o componente desmontar ou o step mudar
      // No React StrictMode, o cleanup é chamado imediatamente, então precisamos proteger

      // Limpar event listener de scroll se existir
      if (scrollElementRef.current) {
        // Remover usando a mesma função que foi adicionada
        scrollElementRef.current.removeEventListener('scroll', handleScroll);
        scrollElementRef.current = null;
      }

      // Não limpar timers aqui - serão limpos quando o step mudar ou componente desmontar
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, step.status]); // Executar quando mudar de step ou quando o status mudar
  
  // Detectar quando o usuário sair da página ou mudar de aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Marcar como pausado e salvar o momento da pausa
        if (!isPausedRef.current) {
          isPausedRef.current = true;
          lastPauseRef.current = Date.now();
        }
        
        // Pausar o interval de progresso visual
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Cancelar o timer de conclusão atual
        const componentData = mountedComponents.get(componentInstanceRef.current);
        if (componentData?.minReadingTimer) {
          clearTimeout(componentData.minReadingTimer);
          componentData.minReadingTimer = undefined;
        }
        if (minReadingTimeRef.current) {
          clearTimeout(minReadingTimeRef.current);
          minReadingTimeRef.current = undefined;
        }
      } else {
        // Calcular tempo pausado e retomar
        if (isPausedRef.current) {
          const pauseDuration = Date.now() - lastPauseRef.current;
          pausedTimeRef.current += pauseDuration;
          isPausedRef.current = false;

          // Recalcular e reiniciar timers se necessário
          if (window.resumeTimersAfterPause) {
            window.resumeTimersAfterPause();
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      // Limpar todos os timers ao sair
      if (minReadingTimeRef.current) {
        clearTimeout(minReadingTimeRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Gerenciar montagem e desmontagem
  useEffect(() => {
    const instanceId = componentInstanceRef.current;
    isMountedRef.current = true;

    // Registrar ou atualizar componente como montado
    const existingData = mountedComponents.get(instanceId) || {};
    mountedComponents.set(instanceId, {
      ...existingData,
      isMounted: true,
      lastActivity: Date.now()
    });
    
    // Limpar componentes antigos periodicamente
    cleanupOldComponents();

    return () => {
      // NO STRICTMODE: Este cleanup é chamado e o componente remonta imediatamente
      // Então NÃO vamos limpar os timers aqui!
      
      // Apenas marcar como desmontado
      isMountedRef.current = false;
      
      // Atualizar o Map para indicar que não está mais montado
      const componentData = mountedComponents.get(instanceId);
      if (componentData) {
        componentData.isMounted = false;
        componentData.lastActivity = Date.now();
        
        // Agendar limpeza real após um delay
        // Se o componente remontar (StrictMode), os timers continuam
        // Se não remontar (mudança de rota real), os timers são limpos
        setTimeout(() => {
          const data = mountedComponents.get(instanceId);
          if (data && !data.isMounted) {
            if (data.minReadingTimer) {
              clearTimeout(data.minReadingTimer);
            }
            if (data.progressInterval) {
              clearInterval(data.progressInterval);
            }
            
            // Remover do Map
            mountedComponents.delete(instanceId);
          }
        }, 500); // Aguardar 500ms para verificar se é StrictMode ou desmontagem real
      }
      
      // Limpar apenas refs de controle (não os timers principais)
      clearTimeout(progressTimerRef.current);
      clearTimeout(completionTimerRef.current);
    };
  }, []); // Não depende de nada - executa uma vez
  
  // Handler para conclusão manual
  const handleManualComplete = async () => {
    if (!onCompleteStep || isCompleting || hasCompletedRef.current || step.status === 'completed' || step.status === 'COMPLETED') return;

    setIsCompleting(true);
    hasCompletedRef.current = true;

    try {
      const element = scrollElementRef.current || contentRef.current;
      let completionType = 'completed_manually';
      let scrollPercentage = readingProgress;

      if (element) {
        const scrollHeight = element.scrollHeight - element.clientHeight;
        if (scrollHeight > 0) {
          scrollPercentage = (element.scrollTop / scrollHeight) * 100;
        }
      }

      const completePromise = onCompleteStep({
        stepId: step.id,
        contentType: 'TEXT',
        progressData: {
          completedPercent: 100,
          action: completionType,
          timestamp: new Date().toISOString(),
          timeSpent: Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000),
          scrollPercentage,
          readingTime: Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000),
          completedManually: true,
          allowSkipUsed: true
        }
      });

      if (completePromise && typeof completePromise.finally === 'function') {
        await completePromise;
      }
    } finally {
      setIsCompleting(false);
    }
  };

  // UseEffect para garantir que complete seja enviado quando atingir 100%
  useEffect(() => {
    // Se allowSkip = true, não completar automaticamente
    if (progressConfig?.allowSkip) {
      return;
    }

    // Se já está marcado como pode completar E ainda não completou
    if (canComplete && !hasCompletedRef.current && onCompleteStep) {
      // Aguardar um pouco para evitar chamadas duplicadas
      const completeTimer = setTimeout(() => {
        if (!hasCompletedRef.current && isMountedRef.current) {
          hasCompletedRef.current = true;
          setIsCompleting(true);

          // Determinar se foi por scroll ou tempo
          const element = scrollElementRef.current || contentRef.current;
          let completionType = 'completed_by_progress';

          if (element) {
            const scrollHeight = element.scrollHeight - element.clientHeight;
            if (scrollHeight > 0) {
              const scrollPercentage = (element.scrollTop / scrollHeight) * 100;
              if (scrollPercentage >= (progressConfig?.textCompletePercent || 90)) {
                completionType = 'completed_by_scroll';
              }
            }
          }

          // Chamar onCompleteStep e tratar como Promise se retornar uma
          const completePromise = onCompleteStep({
            stepId: step.id,
            contentType: 'TEXT',
            progressData: {
              completedPercent: 100,
              action: completionType,
              timestamp: new Date().toISOString(),
              timeSpent: Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000),
              scrollPercentage: readingProgress,
              readingTime: Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000)
            }
          });

          // Se retornar uma Promise, aguardar e limpar loading
          if (completePromise && typeof completePromise.finally === 'function') {
            completePromise.finally(() => {
              setIsCompleting(false);
            });
          } else {
            // Se não for Promise, limpar após um delay
            setTimeout(() => setIsCompleting(false), 2000);
          }
        }
      }, 500); // Aguarda 500ms para evitar duplicação

      return () => clearTimeout(completeTimer);
    }
  }, [canComplete, onCompleteStep, step.id, readingProgress, progressConfig?.textCompletePercent]);

  // UseEffect adicional para monitorar quando readingProgress atinge 100%
  useEffect(() => {
    // Se o progresso visual atingiu 100% mas ainda não está marcado como pode completar
    if (readingProgress >= 100 && !canComplete && !hasCompletedRef.current) {
      // Forçar marcação como pode completar após um pequeno delay
      const forceCompleteTimer = setTimeout(() => {
        if (!hasCompletedRef.current && isMountedRef.current) {
          setCanComplete(true);
        }
      }, 1000); // Aguarda 1 segundo antes de forçar

      return () => clearTimeout(forceCompleteTimer);
    }
  }, [readingProgress, canComplete]);

  // WORKAROUND: Também mostrar se o progresso começou (readingProgress > 0) mesmo que o status não tenha atualizado
  const shouldShowProgress = step.status === 'in_progress' ||
                            step.status === 'IN_PROGRESS' ||
                            completedStepIds?.has(step.id.toString()) ||
                            readingProgress > 0;
  
  return (
    <Card>
      {(step.status === 'completed' || step.status === 'COMPLETED') && (
        <div className="m-4 mb-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Este conteúdo já foi concluído
          </p>
        </div>
      )}
      <CardHeader className="p-4 md:p-6 pb-3 relative">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-base md:text-lg leading-tight pr-12">{step.title}</CardTitle>
          
          {/* Progresso Circular - Canto superior direito */}
          {shouldShowProgress && (
            <div className="absolute top-4 right-4">
              <div className="relative">
                <svg className="w-10 h-10 transform -rotate-90">
                  {/* Círculo de fundo */}
                  <circle
                    cx="20"
                    cy="20"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {/* Círculo de progresso */}
                  <circle
                    cx="20"
                    cy="20"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={`${readingProgress * 0.88} 88`}
                    strokeLinecap="round"
                    className={`transition-all duration-300 ease-out ${
                      (isCompleting || isCompletingStep) ? 'text-primary/50 animate-pulse' : 'text-primary'
                    }`}
                  />
                </svg>
                {/* Porcentagem no centro */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-medium text-muted-foreground">
                    {Math.round(readingProgress)}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Status de conclusão */}
          {canComplete && (
            <div className="flex items-center gap-1.5 text-xs">
              {(isCompleting || isCompletingStep) ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-primary">Salvando progresso...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">Leitura concluída!</span>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea
          className="h-[500px] w-full pr-4"
          ref={contentRef}
        >
          <RichTextViewer 
            content={step.content?.content || step.content?.text || step.content?.html || ''}
            className="px-2"
          />
        </ScrollArea>

        {/* Botão Concluir Etapa quando allowSkip = true */}
        {progressConfig?.allowSkip && step.status !== 'completed' && step.status !== 'COMPLETED' && onCompleteStep && (
          <div className="p-4 border-t">
            <Button
              onClick={handleManualComplete}
              disabled={isCompleting || isCompletingStep}
              className="w-full"
              variant={canComplete ? "default" : "outline"}
            >
              {(isCompleting || isCompletingStep) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Concluir Etapa
                </>
              )}
            </Button>
            {!canComplete && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Você pode concluir a etapa a qualquer momento
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});