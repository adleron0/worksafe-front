import { useMutation, useQueryClient } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/context/GeneralContext";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import HeaderRow from "@/components/general-components/HeaderRow";
import { ApiError } from "@/general-interfaces/api.interface";
import { ITaxonomy, TaxonomyEntity } from "./types";

interface ItemProps {
  item: ITaxonomy;
  index: number;
  entity: TaxonomyEntity;
  setFormData: (data: ITaxonomy) => void;
  setOpenForm: (open: boolean) => void;
}

const TaxonomyItem = ({ item, index, entity, setFormData, setOpenForm }: ItemProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const done = entity.article;

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (action: "active" | "inactive") => {
      showLoader(`${action === "active" ? "Reativando" : "Inativando"}...`);
      return patch(`${entity.model}/${action}/${item.id}`, "");
    },
    onSuccess: (_, action) => {
      hideLoader();
      toast({ title: `${entity.name} ${action === "active" ? "reativad" : "inativad"}${done}!`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      queryClient.invalidateQueries({ queryKey: [`options${entity.model}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao alterar status", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const products = item._count?.products ?? 0;

  return (
    <>
      <HeaderRow show={index === 0}>
        <div className="w-6/12">{entity.name}</div>
        <div className="w-3/12">Produtos</div>
        <div className="w-2/12">Status</div>
        <div className="w-1/12 text-right">Ações</div>
      </HeaderRow>

      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        <div className="w-full lg:w-6/12 pr-10 lg:pr-2">
          <h2 className="text-sm font-semibold">{item.name}</h2>
        </div>

        <div className="lg:w-3/12 flex items-baseline gap-2">
          <p className="lg:hidden text-sm font-medium">Produtos: </p>
          <Badge variant="secondary">{products}</Badge>
        </div>

        <div className="flex flex-col lg:w-2/12">
          <p className="text-xs text-muted-foreground lg:hidden">Status</p>
          <Status status={!item.inactiveAt ? "online" : "offline"} className="w-fit">
            <StatusIndicator />
            <StatusLabel>{!item.inactiveAt ? "Ativ" + done : "Inativ" + done}</StatusLabel>
          </Status>
        </div>

        <div className="absolute top-2 right-2 lg:static lg:w-1/12 flex justify-end">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8 rounded-full p-0 text-gray-700 cursor-pointer" variant="outline" size="sm">
                <Icon name="ellipsis-vertical" className="text-foreground dark:text-primary w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {can(`update_${entity.ability}`) && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    className="flex justify-start gap-2 p-0 items-baseline w-full h-fit"
                    onClick={() => { setFormData(item); setOpenForm(true); }}
                  >
                    <Icon name="edit-3" className="w-3 h-3" />
                    <p>Editar</p>
                  </Button>
                </DropdownMenuItem>
              )}
              {!item.inactiveAt
                ? can(`inactive_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title={`Inativar ${item.name}?`}
                      description={
                        products > 0
                          ? `${products} produto(s) usam ess${done === "a" ? "a" : "e"} ${entity.name.toLowerCase()}. Ela deixa de aparecer nos filtros da loja e nas opções do cadastro; os produtos continuam na loja.`
                          : `Ela deixa de aparecer nas opções do cadastro de produtos.`
                      }
                      onConfirm={() => toggleStatus("inactive")}
                      titleBttn="Inativar"
                      iconBttn="power-off"
                    />
                  </DropdownMenuItem>
                )
                : can(`activate_${entity.ability}`) && (
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <ConfirmDialog
                      title={`Reativar ${item.name}?`}
                      description="Volta a aparecer nos filtros da loja e nas opções do cadastro."
                      onConfirm={() => toggleStatus("active")}
                      titleBttn="Reativar"
                      iconBttn="power"
                    />
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default TaxonomyItem;
