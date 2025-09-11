import { memo, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';
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
  completedStepIds 
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
  const [isSmallContent, setIsSmallContent] = useState(false);
  const [estimatedReadTime, setEstimatedReadTime] = useState(0);
  
  // Guardar o ID do step atual para detectar mudanças reais
  const currentStepIdRef = useRef(step.id);
  
  // Reset refs quando step muda
  useEffect(() => {
    // Só resetar se mudou de step
    if (currentStepIdRef.current !== step.id) {
      currentStepIdRef.current = step.id;
      
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
        console.log('🧹 Limpando interval de progresso visual do step anterior');
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
      setIsSmallContent(false);
      setEstimatedReadTime(0);
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
    console.log('🔄 TextContent useEffect - Step:', step.id, 'Status:', step.status, 'Progress:', step.progress);
    
    // Se já está processando ou não tem conteúdo, ignorar
    const hasTextContent = step.content?.content || step.content?.text || step.content?.html;
    if (hasCompletedRef.current || !hasTextContent || step.status === 'completed' || step.status === 'COMPLETED') {
      // Se o step já está completo, marcar como já processado
      if (step.status === 'completed' || step.status === 'COMPLETED') {
        console.log('✅ Step já completo, marcando visual');
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
      console.log('⏸️ Já iniciou processamento para este step');
      return;
    }
    
    // Se o status mudou para in_progress, resetar o flag para permitir reprocessamento
    if (isNowActive && !hasStartedProcessingRef.current) {
      console.log('🔄 Status mudou para IN_PROGRESS, iniciando processamento');
      hasStartedProcessingRef.current = false;
    }
    console.log('▶️ Iniciando processamento do step:', step.id);
    hasStartedProcessingRef.current = true;
    
    // Capturar valores necessários para as closures
    const stepId = step.id;
    const stepDuration = step.duration || 1;
    const textCompletePercent = progressConfig?.textCompletePercent || 90;
    const onCompleteCallback = onCompleteStep;
    const onUpdateCallback = onUpdateProgress;
    
    const handleScroll = () => {
      if (!contentRef.current || hasCompletedRef.current) return;
      
      const element = contentRef.current;
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
      
      // Se chegou ao final (95% ou mais), marcar como completo após delay
      if (scrollPercentage >= textCompletePercent && !hasCompletedRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = setTimeout(() => {
          if (!hasCompletedRef.current && onCompleteCallback) {
            console.log('📚 TextContent: Completando por scroll - Step:', stepId, 'Percent:', scrollPercentage);
            hasCompletedRef.current = true;
            onCompleteCallback({
              stepId: stepId,
              data: {
                completedPercent: scrollPercentage,
                action: 'completed_by_scroll',
                timestamp: new Date().toISOString(),
                timeSpent: Math.round((Date.now() - startTimeRef.current) / 1000)
              }
            });
          } else {
            console.log('📚 TextContent: Não pode completar - hasCompleted:', hasCompletedRef.current, 'onCompleteStep:', !!onCompleteCallback);
          }
        }, 2000);
      }
    };
    
    // Aguardar o elemento estar pronto
    let checkAttempts = 0;
    
    const checkElement = () => {
      checkAttempts++;
      const contentElement = contentRef.current;
      console.log(`📋 ContentElement (tentativa ${checkAttempts}):`, !!contentElement);
      
      if (!contentElement) {
        // Se o elemento não está pronto, tentar novamente em 100ms (máximo 10 tentativas)
        if (checkAttempts < 10) {
          setTimeout(checkElement, 100);
        } else {
          console.log('❌ Elemento não encontrado após 10 tentativas');
        }
        return;
      }
      const hasScroll = contentElement.scrollHeight > contentElement.clientHeight + 10;
      
      if (!hasScroll) {
        setIsSmallContent(true);
        
        // Para conteúdo pequeno, usar tempo baseado na duração do step
        const minReadingTime = stepDuration * 60 * 1000; // Converter para ms
        const requiredTime = (minReadingTime * textCompletePercent) / 100;
        
        // IMPORTANTE: O timer deve executar no tempo configurado (90% = 54s), não em 100%
        
        console.log('📚 TextContent configurado:', {
          tipo: 'Sem scroll (tempo)',
          duration: stepDuration + ' min',
          textCompletePercent: textCompletePercent + '%',
          tempoTotal: minReadingTime / 1000 + 's',
          tempoParaCompletar: requiredTime / 1000 + 's',
          stepId: stepId
        });
        
        setEstimatedReadTime(requiredTime / 1000); // Para exibição em segundos
        
        // Timer para completar baseado no tempo mínimo
        // Função para criar/recriar o timer de conclusão
        const createCompletionTimer = (remainingTime: number) => {
          const timerKey = `timer_${stepId}`;
          
          console.log('⏰ Criando timer de conclusão para', remainingTime / 1000, 'segundos');
          
          const timerId = setTimeout(() => {
            console.log('🔔 Timer de conclusão EXECUTADO após', remainingTime / 1000, 'segundos');
            
            // IMPORTANTE: Verificar se o componente ainda está montado
            if (!isMountedRef.current) {
              console.log('⚠️ Componente foi desmontado, cancelando conclusão');
              activeTimersRef.current.delete(timerKey);
              return;
            }
            
            // Usar refs para valores atualizados
            const currentStepId = stepIdRef.current;
            const currentTextCompletePercent = textCompletePercentRef.current;
            const currentOnCompleteStep = onCompleteStepRef.current;
            
            console.log('🔍 Estado atual:', {
              hasCompleted: hasCompletedRef.current,
              hasCallback: !!currentOnCompleteStep,
              stepId: currentStepId,
              textCompletePercent: currentTextCompletePercent,
              isMounted: isMountedRef.current
            });
            
            // Quando este timer executar, já passou o tempo necessário
            // Não precisa verificar porcentagem, pode completar diretamente
            if (!hasCompletedRef.current && currentOnCompleteStep && isMountedRef.current) {
              console.log('⏱️ TextContent: Completando por tempo - Step:', currentStepId, 'Required time:', requiredTime / 1000, 's', 'Percent:', currentTextCompletePercent + '%');
              hasCompletedRef.current = true;
              setCanComplete(true);
              setReadingProgress(100);
              
              console.log('📤 Chamando onCompleteCallback com dados:', {
                stepId: currentStepId,
                completedPercent: currentTextCompletePercent
              });
              
              currentOnCompleteStep({
                stepId: currentStepId,
                contentType: 'TEXT',
                progressData: {
                  readingTime: Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000),
                  scrollPercentage: 100,
                  completedPercent: currentTextCompletePercent,
                  action: 'completed_by_time'
                }
              });
              
              console.log('✔️ onCompleteCallback chamado com sucesso');
            } else {
              console.log('❌ TextContent: Não pode completar por tempo - hasCompleted:', hasCompletedRef.current, 'onCompleteStep:', !!currentOnCompleteStep);
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
          
          console.log('📌 Timer adicionado ao Set. Total de timers ativos:', activeTimersRef.current.size);
          return timerId;
        };
        
        // Verificar se já existe um timer para este step específico
        const timerKey = `timer_${stepId}`;
        
        if (!activeTimersRef.current.has(timerKey)) {
          createCompletionTimer(requiredTime);
        } else {
          console.log('⚠️ Timer de conclusão já existe para step', stepId, ', não criando novo')
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
            console.log(`📊 Progresso: ${progress.toFixed(1)}% - Tempo decorrido: ${(elapsed/1000).toFixed(1)}s de ${(requiredTime/1000).toFixed(1)}s`);
            console.log(`⏲️ Timer ainda ativo? ${activeTimersRef.current.has(timerKey)} - Total timers: ${activeTimersRef.current.size}`);
            lastLoggedProgress = progress;
          }
          
          // Quando atingir 100% do progresso visual, marcar como pode completar
          if (progress >= 100) {
            console.log('✅ Progresso visual 100% atingido');
            console.log(`⏲️ Timer de conclusão ainda ativo? ${activeTimersRef.current.has(timerKey)}`);
            console.log(`📍 Timer ID: ${minReadingTimeRef.current}`);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            setCanComplete(true);
            
            // Forçar execução se o timer falhou
            if (!hasCompletedRef.current && isMountedRef.current) {
              console.log('⚠️ Timer pode ter falhado, aguardando mais 2 segundos...');
              setTimeout(() => {
                // Verificar novamente se ainda está montado
                if (!hasCompletedRef.current && isMountedRef.current) {
                  console.log('🚨 Timer definitivamente falhou! Executando manualmente...');
                  const currentOnCompleteStep = onCompleteStepRef.current;
                  const currentStepId = stepIdRef.current;
                  const currentTextCompletePercent = textCompletePercentRef.current;
                  
                  if (currentOnCompleteStep && isMountedRef.current) {
                    hasCompletedRef.current = true;
                    currentOnCompleteStep({
                      stepId: currentStepId,
                      data: {
                        completedPercent: currentTextCompletePercent,
                        action: 'completed_by_time_fallback',
                        timestamp: new Date().toISOString(),
                        timeSpent: Math.round((Date.now() - startTimeRef.current) / 1000),
                        minReadingTime: minReadingTime / 1000,
                        configuredPercent: currentTextCompletePercent
                      }
                    });
                  }
                }
              }, 2000);
            }
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
              console.log('🔄 Retomando timer de conclusão - Tempo restante:', remainingTime / 1000, 's');
              
              // Recriar timer de conclusão com tempo restante
              createCompletionTimer(remainingTime);
              
              // Reiniciar interval de progresso
              if (!progressIntervalRef.current) {
                console.log('🔄 Retomando progresso visual');
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
              console.log('⏰ Tempo já expirou durante a pausa - completando agora');
              // Se o tempo já passou, completar imediatamente
              if (!hasCompletedRef.current && onCompleteStepRef.current) {
                hasCompletedRef.current = true;
                setCanComplete(true);
                setReadingProgress(100);
                onCompleteStepRef.current({
                  stepId: stepIdRef.current,
                  contentType: 'TEXT',
                  progressData: {
                    readingTime: Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000),
                    scrollPercentage: 100,
                    completedPercent: textCompletePercentRef.current,
                    action: 'completed_by_time_after_pause'
                  }
                });
              }
            }
          }
        };
        
        // NÃO retornar cleanup aqui pois sobrescreve o cleanup geral
      } else {
        // Para conteúdo com scroll, adicionar event listener
        contentElement.addEventListener('scroll', handleScroll);
        
        // Guardar cleanup para executar depois
        return () => {
          contentElement.removeEventListener('scroll', handleScroll);
        };
      }
    };
    
    // Iniciar verificação do elemento
    checkElement();
    
    return () => {
      // Este cleanup só deve executar quando o componente desmontar ou o step mudar
      // No React StrictMode, o cleanup é chamado imediatamente, então precisamos proteger
      console.log('🧹 Cleanup do useEffect principal chamado');
      
      // Não fazer nada no cleanup - deixar os timers rodarem
      // Os timers serão limpos quando o step realmente mudar (no outro useEffect)
      // ou quando o componente desmontar (no useEffect de cleanup final)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, step.status]); // Executar quando mudar de step ou quando o status mudar
  
  // Detectar quando o usuário sair da página ou mudar de aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Página ficou oculta (mudou de aba ou minimizou)');
        
        // Marcar como pausado e salvar o momento da pausa
        if (!isPausedRef.current) {
          isPausedRef.current = true;
          lastPauseRef.current = Date.now();
          console.log('⏸️ Pausando timers - Tempo decorrido até agora:', 
            Math.round((lastPauseRef.current - startTimeRef.current - pausedTimeRef.current) / 1000), 's');
        }
        
        // Pausar o interval de progresso visual
        if (progressIntervalRef.current) {
          console.log('⏸️ Pausando progresso visual');
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Cancelar o timer de conclusão atual
        const componentData = mountedComponents.get(componentInstanceRef.current);
        if (componentData?.minReadingTimer) {
          console.log('⏸️ Pausando timer de conclusão');
          clearTimeout(componentData.minReadingTimer);
          componentData.minReadingTimer = undefined;
        }
        if (minReadingTimeRef.current) {
          clearTimeout(minReadingTimeRef.current);
          minReadingTimeRef.current = undefined;
        }
      } else {
        console.log('📱 Página ficou visível novamente');
        
        // Calcular tempo pausado e retomar
        if (isPausedRef.current) {
          const pauseDuration = Date.now() - lastPauseRef.current;
          pausedTimeRef.current += pauseDuration;
          isPausedRef.current = false;
          
          console.log('▶️ Retomando timers - Tempo pausado:', Math.round(pauseDuration / 1000), 's');
          console.log('⏱️ Tempo total pausado acumulado:', Math.round(pausedTimeRef.current / 1000), 's');
          
          // Recalcular e reiniciar timers se necessário
          if (window.resumeTimersAfterPause) {
            window.resumeTimersAfterPause();
          }
        }
      }
    };
    
    const handleBeforeUnload = () => {
      console.log('🚪 Usuário está saindo da página');
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
    console.log('✅ TextContent montado - Instance:', instanceId);
    
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
      console.log('⚠️ TextContent cleanup chamado - Instance:', instanceId);
      
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
            console.log('🛑 Componente não remontou após 500ms - limpando timers');
            
            if (data.minReadingTimer) {
              console.log('🛑 Limpando timer de conclusão:', data.minReadingTimer);
              clearTimeout(data.minReadingTimer);
            }
            if (data.progressInterval) {
              console.log('🛑 Limpando interval de progresso:', data.progressInterval);
              clearInterval(data.progressInterval);
            }
            
            // Remover do Map
            mountedComponents.delete(instanceId);
          } else if (data && data.isMounted) {
            console.log('✅ Componente remontou (StrictMode) - mantendo timers');
          }
        }, 500); // Aguardar 500ms para verificar se é StrictMode ou desmontagem real
      }
      
      // Limpar apenas refs de controle (não os timers principais)
      clearTimeout(progressTimerRef.current);
      clearTimeout(completionTimerRef.current);
    };
  }, []); // Não depende de nada - executa uma vez
  
  // Log para debug da barra de progresso
  // WORKAROUND: Também mostrar se o progresso começou (readingProgress > 0) mesmo que o status não tenha atualizado
  const shouldShowProgress = step.status === 'in_progress' || 
                            step.status === 'IN_PROGRESS' || 
                            completedStepIds?.has(step.id.toString()) ||
                            readingProgress > 0;
  
  // Log apenas quando mudar significativamente
  useEffect(() => {
    const statusLower = step.status?.toLowerCase();
    console.log('🎯 Debug barra de progresso:', {
      statusOriginal: step.status,
      statusLower,
      isInProgress: statusLower === 'in_progress',
      shouldShowProgress,
      readingProgress: Math.round(readingProgress),
      isSmallContent,
      hasCompletedStepId: completedStepIds?.has(step.id.toString()),
      completedStepIdsSize: completedStepIds?.size
    });
  }, [step.status, Math.floor(readingProgress / 10), shouldShowProgress]); // Log a cada 10%
  
  return (
    <Card>
      {step.status === 'completed' && (
        <div className="m-4 mb-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Este conteúdo já foi concluído
          </p>
        </div>
      )}
      <CardHeader className="p-4 md:p-6 pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-base md:text-lg leading-tight">{step.title}</CardTitle>
          {shouldShowProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                <span className="truncate mr-2">
                  {isSmallContent 
                    ? `Tempo: ${Math.ceil((estimatedReadTime || 60) / 60)} min`
                    : 'Progresso'
                  }
                </span>
                <span className="font-medium">{Math.round(readingProgress)}%</span>
              </div>
              <Progress value={readingProgress} className="h-1.5 md:h-2" />
              {canComplete && (
                <div className="flex items-center gap-1.5 text-xs md:text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>Leitura concluída!</span>
                </div>
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
      </CardContent>
    </Card>
  );
});