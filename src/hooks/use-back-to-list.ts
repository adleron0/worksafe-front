import { useNavigate, useRouter } from "@tanstack/react-router";

/**
 * Volta para a lista de onde a pessoa veio (mantém filtros e página); se a tela foi
 * aberta direto pelo link, vai para a lista sem filtros.
 */
export function useBackToList(to: string) {
  const router = useRouter();
  const navigate = useNavigate();
  return () => {
    const index = (window.history.state as { __TSR_index?: number } | null)?.__TSR_index ?? 0;
    if (index > 0) router.history.back();
    else navigate({ to: to as never });
  };
}
