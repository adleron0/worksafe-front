import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

export type ActiveAction = "activate" | "deactivate";
type Message = { title: string; description: string };

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "response" in error
      ? (error as ApiError).response?.data?.message || fallback
      : fallback;

/**
 * Inativar/reativar um item (PATCH `modelo/inactive|active/:id`) com o carregando,
 * os avisos e a atualização da lista que as telas de treinamentos já usavam.
 */
export function useActiveToggle(entity: IDefaultEntity, messages: Record<ActiveAction, Message>, model = entity.model, listKey = `list${entity.pluralName}`) {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const { mutate } = useMutation({
    mutationFn: ({ id, action }: { id: number; action: ActiveAction }) => {
      showLoader(`${action === "activate" ? "Ativando" : "Inativando"} ${entity.name}...`);
      return patch(model, `${action === "activate" ? "active" : "inactive"}/${id}`);
    },
    onSuccess: (_data, { action }) => {
      hideLoader();
      toast({ ...messages[action], variant: "success" });
      queryClient.invalidateQueries({ queryKey: [listKey] });
    },
    onError: (error: unknown, { action }) => {
      hideLoader();
      const fallback = `Erro ao ${action === "activate" ? "reativar" : "inativar"} ${entity.name}`;
      toast({ title: fallback, description: errorMessage(error, fallback), variant: "destructive" });
    },
  });
  return (id: number | undefined, action: ActiveAction) => { if (id) mutate({ id, action }); };
}
