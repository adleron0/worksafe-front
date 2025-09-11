import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { MergedStep, LessonDataWithSteps } from '../types';

interface UseStepNavigationProps {
  lessonData: LessonDataWithSteps | undefined;
  startStep: (stepId: number) => void;
}

export function useStepNavigation({ lessonData, startStep }: UseStepNavigationProps) {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<MergedStep | null>(null);
  const startedStepsRef = useRef<Set<number>>(new Set());

  // Definir step inicial quando os dados carregarem
  useEffect(() => {
    if (!lessonData || lessonData.steps.length === 0) return;
    if (currentStep) return; // Já tem step selecionado
    
    // Encontrar o primeiro step disponível ou em progresso
    const firstAvailable = lessonData.steps.find(
      s => s.status === 'in_progress' || s.status === 'available'
    ) || lessonData.steps[0];
    
    setCurrentStep(firstAvailable);
    const index = lessonData.steps.findIndex(s => s.id === firstAvailable.id);
    setCurrentStepIndex(index >= 0 ? index : 0);
  }, [lessonData]);

  // Iniciar step quando mudar o currentStep
  useEffect(() => {
    if (!currentStep) return;
    
    // Verificar se já iniciamos este step nesta sessão
    if (startedStepsRef.current.has(currentStep.id)) {
      return;
    }
    
    // Iniciar se status for 'available' ou se nunca foi iniciado
    if (currentStep.status === 'available' || currentStep.status === 'in_progress') {
      startStep(currentStep.id);
      startedStepsRef.current.add(currentStep.id);
    } else if (currentStep.status === 'completed') {
      // Para steps completos, ainda podemos querer rastrear visualizações
      startStep(currentStep.id);
      startedStepsRef.current.add(currentStep.id);
    }
  }, [currentStep?.id, startStep]);

  // Função para navegar para um step específico
  const navigateToStep = (index: number) => {
    if (!lessonData) return;
    
    const targetStep = lessonData.steps[index];
    if (!targetStep) return;

    // Verificar se o modo é sequencial e se permite pular
    const progressConfig = lessonData.lesson?.progressConfig;
    const isSequential = progressConfig?.mode === 'sequential' || progressConfig?.requireSequential;
    const allowSkip = progressConfig?.allowSkip;
    
    // Se está tentando pular para um step posterior
    if (index > currentStepIndex) {
      // Se modo sequencial sem skip, verificar se todos os steps anteriores foram completados
      if (isSequential && !allowSkip) {
        // Verificar se o step atual foi completado
        const currentStepData = lessonData.steps[currentStepIndex];
        if (currentStepData?.status !== 'completed') {
          toast({
            title: 'Complete o step atual',
            description: 'Você precisa completar o step atual antes de prosseguir',
            variant: 'destructive'
          });
          return;
        }
        
        // Verificar se todos os steps entre o atual e o desejado foram completados
        for (let i = currentStepIndex; i < index; i++) {
          if (lessonData.steps[i]?.status !== 'completed') {
            toast({
              title: 'Complete os steps anteriores',
              description: 'Você precisa completar todos os steps anteriores primeiro',
              variant: 'destructive'
            });
            return;
          }
        }
      }
    }
    
    if (targetStep.status === 'locked') {
      toast({
        title: 'Step bloqueado',
        description: 'Complete o step anterior primeiro',
        variant: 'destructive'
      });
      return;
    }

    if (!targetStep.hasContent) {
      toast({
        title: 'Conteúdo não disponível',
        description: 'Este conteúdo ainda não está disponível',
        variant: 'destructive'
      });
      return;
    }

    // Iniciar step se ainda não foi iniciado
    if (targetStep.status === 'available') {
      startStep(targetStep.id);
    }

    setCurrentStep(targetStep);
    setCurrentStepIndex(index);
  };

  // Navegação para o próximo step
  const goToNextStep = () => {
    if (!lessonData || currentStepIndex >= lessonData.steps.length - 1) return;
    
    const nextIndex = currentStepIndex + 1;
    const currentStepData = lessonData.steps[currentStepIndex];
    
    // Verificar se o modo é sequencial e se permite pular
    const progressConfig = lessonData.lesson.progressConfig;
    const isSequential = progressConfig?.mode === 'sequential' || progressConfig?.requireSequential;
    const allowSkip = progressConfig?.allowSkip;
    
    // Se modo sequencial sem skip, verificar se o step atual foi completado
    if (isSequential && !allowSkip && currentStepData.status !== 'completed') {
      toast({
        title: 'Complete o step atual',
        description: 'Você precisa completar este step antes de prosseguir',
        variant: 'destructive'
      });
      return;
    }
    
    navigateToStep(nextIndex);
  };

  // Navegação para o step anterior
  const goToPreviousStep = () => {
    if (!lessonData || currentStepIndex <= 0) return;
    
    const prevIndex = currentStepIndex - 1;
    const prevStep = lessonData.steps[prevIndex];
    
    // Verificar se o step anterior está disponível
    if (prevStep.status === 'locked') {
      toast({
        title: 'Step bloqueado',
        description: 'Este conteúdo não está disponível',
        variant: 'destructive'
      });
      return;
    }
    
    navigateToStep(prevIndex);
  };

  return {
    currentStep,
    currentStepIndex,
    setCurrentStep,
    setCurrentStepIndex,
    navigateToStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext: currentStepIndex < (lessonData?.steps.length ?? 0) - 1,
    canGoPrevious: currentStepIndex > 0
  };
}